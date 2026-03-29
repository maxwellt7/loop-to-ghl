const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const config = require('./config');
const logger = require('./utils/logger');
const { generateRequestId, formatError } = require('./utils/helpers');

// Import models
const WebhookLog = require('./models/WebhookLog');
const Conversation = require('./models/Conversation');

// Import services
const aiDecisionService = require('./services/ai-decision');
const loopmessageService = require('./services/loopmessage');
const ghlResponseService = require('./services/ghl-response');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/webhook/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    req.requestId = generateRequestId();
    logger.info('Incoming request', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
});

// Authentication middleware for GHL webhooks
const authenticateGHLWebhook = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || authHeader !== `Bearer ${config.server.webhookSecret}`) {
        logger.warn('Unauthorized webhook attempt', {
            requestId: req.requestId,
            ip: req.ip
        });
        
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized' 
        });
    }
    
    next();
};

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * GHL Inbound Webhook Endpoint
 * Receives triggers from GHL automations
 */
app.post('/webhook/ghl-inbound', authenticateGHLWebhook, async (req, res) => {
    const requestId = req.requestId;
    
    try {
        logger.info('GHL webhook received', { 
            requestId,
            body: req.body
        });
        
        // Log incoming webhook
        await WebhookLog.createLog({
            requestId,
            source: 'ghl',
            type: 'inbound',
            payload: req.body,
            timestamp: new Date()
        });
        
        // Extract and validate data
        const {
            event_type,
            contact,
            metadata = {},
            callback_url
        } = req.body;
        
        if (!contact || !contact.phone || !callback_url) {
            logger.error('Missing required fields in GHL webhook', { requestId });
            
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: contact.phone or callback_url'
            });
        }
        
        // Respond immediately to GHL (acknowledge receipt)
        res.status(200).json({
            success: true,
            request_id: requestId,
            status: 'processing'
        });
        
        // Process asynchronously
        processGHLWebhook(requestId, {
            event_type,
            contact,
            metadata,
            callback_url
        }).catch(error => {
            logger.error('Error in async processing', { 
                requestId, 
                error: error.message 
            });
        });
        
    } catch (error) {
        logger.error('GHL webhook error', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });
        
        if (!res.headersSent) {
            return res.status(500).json(formatError(error));
        }
    }
});

/**
 * LoopMessage Callback Endpoint
 * Receives inbound messages and status updates from LoopMessage
 */
app.post('/webhook/loopmessage-callback', async (req, res) => {
    const requestId = req.requestId;
    
    try {
        logger.info('LoopMessage callback received', {
            requestId,
            alertType: req.body.alert_type
        });
        
        // Log callback
        await WebhookLog.createLog({
            requestId,
            source: 'loopmessage',
            type: 'callback',
            payload: req.body,
            timestamp: new Date()
        });
        
        const { alert_type, recipient, text, message_id } = req.body;
        
        // Handle different alert types
        switch (alert_type) {
        case 'message_inbound':
            logger.info('Inbound message received', { 
                requestId, 
                recipient,
                textLength: text?.length
            });
                
            // Respond with typing indicator
            res.status(200).json(
                loopmessageService.formatTypingResponse(3, true)
            );
                
            // Process inbound message asynchronously
            processInboundMessage(requestId, req.body).catch(error => {
                logger.error('Error processing inbound message', {
                    requestId,
                    error: error.message
                });
            });
            break;
                
        case 'message_sent':
        case 'message_failed':
        case 'message_timeout':
            // Update message status in database
            await Conversation.updateStatus(message_id, alert_type);
            res.status(200).json({ success: true });
            break;
                
        case 'message_scheduled':
            await Conversation.updateStatus(message_id, 'scheduled');
            res.status(200).json({ success: true });
            break;
                
        default:
            // Acknowledge other webhooks
            res.status(200).json({ success: true });
        }
        
    } catch (error) {
        logger.error('LoopMessage callback error', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json(formatError(error));
    }
});

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process GHL Webhook - Main workflow
 */
async function processGHLWebhook(requestId, data) {
    const { contact, event_type, metadata, callback_url } = data;
    
    try {
        logger.info('Starting GHL webhook processing', { requestId });
        
        // Step 1: Generate AI decision
        const aiDecision = await aiDecisionService.generateDecision({
            requestId,
            contact: {
                id: contact.id,
                phone: contact.phone,
                email: contact.email,
                firstName: contact.first_name || 'there',
                lastName: contact.last_name || ''
            },
            eventType: event_type,
            metadata
        });
        
        // Step 2: Execute actions based on AI decision
        const actionsResults = [];
        let messageResult = null;
        
        if (aiDecision.sendMessage && aiDecision.messageContent) {
            logger.info('AI decided to send message', { requestId });
            
            messageResult = await loopmessageService.sendMessage({
                recipient: contact.phone,
                text: aiDecision.messageContent,
                requestId
            });
            
            if (messageResult.success) {
                actionsResults.push({
                    type: 'message_sent',
                    platform: 'imessage',
                    recipient: contact.phone,
                    message_id: messageResult.messageId,
                    timestamp: new Date().toISOString()
                });
                
                // Save to conversation history
                await Conversation.create({
                    contactPhone: contact.phone,
                    contactId: contact.id,
                    contactName: `${contact.first_name} ${contact.last_name}`.trim(),
                    messageId: messageResult.messageId,
                    direction: 'outbound',
                    content: aiDecision.messageContent,
                    requestId,
                    aiInsights: {
                        intent: aiDecision.intent,
                        sentiment: aiDecision.sentiment,
                        confidence: aiDecision.confidence
                    }
                });
            }
        } else {
            logger.info('AI decided not to send message', { 
                requestId,
                reason: aiDecision.intent
            });
        }
        
        // Step 3: Send results back to GHL
        await ghlResponseService.sendSuccess({
            callbackUrl: callback_url,
            requestId,
            aiDecision,
            messageResult,
            actionsResults
        });
        
        logger.info('GHL webhook processing complete', { requestId });
        
    } catch (error) {
        logger.error('Error processing GHL webhook', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        
        // Send error notification to GHL
        try {
            await ghlResponseService.sendError({
                callbackUrl: callback_url,
                requestId,
                error: error.message
            });
        } catch (webhookError) {
            logger.error('Failed to send error webhook to GHL', {
                requestId,
                error: webhookError.message
            });
        }
    }
}

/**
 * Process Inbound Message from LoopMessage
 */
async function processInboundMessage(requestId, data) {
    const { recipient, text, message_id, sender_name } = data;
    
    try {
        logger.info('Processing inbound message', { requestId, recipient });
        
        // Save inbound message to database
        await Conversation.create({
            contactPhone: recipient,
            messageId: message_id,
            direction: 'inbound',
            content: text,
            requestId
        });
        
        // Generate AI response
        const responseText = await aiDecisionService.generateResponse({
            requestId,
            inboundMessage: text,
            contactPhone: recipient
        });
        
        // Send response via LoopMessage
        const messageResult = await loopmessageService.sendMessage({
            recipient: recipient,
            text: responseText,
            senderName: sender_name,
            replyToId: message_id,
            requestId
        });
        
        // Save outbound message
        if (messageResult.success) {
            await Conversation.create({
                contactPhone: recipient,
                messageId: messageResult.messageId,
                direction: 'outbound',
                content: responseText,
                requestId,
                replyToId: message_id
            });
        }
        
        logger.info('Inbound message processed successfully', { requestId });
        
    } catch (error) {
        logger.error('Error processing inbound message', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    }
}

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.env,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

/**
 * Get conversation history
 */
app.get('/api/conversation/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        
        const history = await Conversation.getConversationHistory(phone, limit);
        
        res.json({
            success: true,
            phone,
            count: history.length,
            history
        });
    } catch (error) {
        logger.error('Error fetching conversation history', {
            error: error.message
        });
        
        res.status(500).json(formatError(error));
    }
});

/**
 * Get webhook logs
 */
app.get('/api/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await WebhookLog.findRecent(limit);
        
        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        logger.error('Error fetching logs', {
            error: error.message
        });
        
        res.status(500).json(formatError(error));
    }
});

// Error handling middleware
app.use((err, req, res, _next) => {
    logger.error('Unhandled error', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack
    });
    
    res.status(500).json(formatError(err));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
    try {
        // Connect to database
        await mongoose.connect(config.database.url);
        
        logger.info('✅ Connected to MongoDB');
        
        // Start Express server
        const PORT = config.server.port;
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📥 GHL Webhook: POST http://localhost:${PORT}/webhook/ghl-inbound`);
            logger.info(`📨 LoopMessage Callback: POST http://localhost:${PORT}/webhook/loopmessage-callback`);
            logger.info(`🏥 Health Check: GET http://localhost:${PORT}/health`);
            logger.info(`Environment: ${config.server.env}`);
        });
        
    } catch (error) {
        logger.error('Failed to start server', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await mongoose.connection.close();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;

