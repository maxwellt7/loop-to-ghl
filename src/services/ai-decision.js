const Anthropic = require('@anthropic-ai/sdk');
const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('../config');
const logger = require('../utils/logger');
const Conversation = require('../models/Conversation');
const { extractJSON } = require('../utils/helpers');

class AIDecisionService {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: config.anthropic.apiKey
        });

        // Initialize Pinecone if configured
        if (config.pinecone.apiKey) {
            this.initializePinecone();
        }
    }

    async initializePinecone() {
        try {
            this.pinecone = new Pinecone({
                apiKey: config.pinecone.apiKey
            });
            
            if (config.pinecone.indexName) {
                this.index = this.pinecone.index(config.pinecone.indexName);
                logger.info('Pinecone initialized successfully');
            }
        } catch (error) {
            logger.error('Error initializing Pinecone', { error: error.message });
        }
    }

    /**
     * Query Pinecone for relevant context
     */
    async queryContext(data) {
        if (!this.index) {
            logger.warn('Pinecone not configured, skipping context retrieval');
            return [];
        }

        try {
            const { contact, eventType, message, requestId } = data;

            // Create query text based on available data
            let queryText = '';
            if (message) {
                queryText = message;
            } else if (eventType && contact) {
                queryText = `Contact ${contact.firstName} ${contact.lastName} ${eventType}`;
            }

            if (!queryText) {
                return [];
            }

            // Generate embedding (you would need to use an embedding service here)
            // For now, returning empty array as placeholder
            // TODO: Implement embedding generation using Anthropic or OpenAI
            
            logger.info('Context query', { requestId, queryText });
            
            return [];
        } catch (error) {
            logger.error('Error querying Pinecone', { error: error.message });
            return [];
        }
    }

    /**
     * Build prompt for AI decision making (GHL webhook processing)
     */
    buildDecisionPrompt(data, context, conversationHistory) {
        const { contact, eventType, metadata } = data;

        return {
            model: config.anthropic.model,
            max_tokens: config.anthropic.maxTokens,
            messages: [
                {
                    role: "user",
                    content: `You are an AI assistant helping with customer engagement via iMessage.

Contact Information:
- Name: ${contact.firstName} ${contact.lastName}
- Phone: ${contact.phone}
- Email: ${contact.email || 'N/A'}

Event Type: ${eventType}
Metadata: ${JSON.stringify(metadata, null, 2)}

Relevant Context:
${context.length > 0 ? context.join('\n') : 'No additional context available'}

Recent Conversation (most recent first):
${conversationHistory.length > 0 
    ? conversationHistory.map((msg, idx) => `${idx + 1}. ${msg.direction.toUpperCase()}: ${msg.content}`).join('\n')
    : 'No previous conversation'}

Based on this information, determine:
1. Should we send a message? (yes/no)
2. If yes, what message should we send? (Keep it friendly, professional, and conversational for iMessage)
3. What is the detected intent?
4. What is your confidence level in this decision?
5. What is the recommended next action?
6. What is the conversation status?
7. What is the customer sentiment?

Respond ONLY with a JSON object in this exact format:
{
  "sendMessage": true/false,
  "messageContent": "Your message text here (if sendMessage is true)",
  "intent": "intent_name",
  "confidence": 0.85,
  "nextAction": "recommended_action",
  "conversationStatus": "active/pending/closed",
  "sentiment": "positive/neutral/negative"
}`
                }
            ]
        };
    }

    /**
     * Build prompt for responding to inbound messages
     */
    buildResponsePrompt(data, context, conversationHistory) {
        const { inboundMessage, contactPhone } = data;

        return {
            model: config.anthropic.model,
            max_tokens: 512,
            messages: [
                {
                    role: "user",
                    content: `You are a helpful customer service AI assistant responding via iMessage.

Contact Phone: ${contactPhone}

Inbound Message: "${inboundMessage}"

Relevant Context:
${context.length > 0 ? context.join('\n') : 'No additional context available'}

Recent Conversation (most recent first):
${conversationHistory.slice(0, 5).map((msg, idx) => 
    `${idx + 1}. ${msg.direction.toUpperCase()}: ${msg.content}`
).join('\n')}

Generate a helpful, friendly, and professional response to the customer's message.
Keep it concise and conversational (suitable for iMessage - aim for 1-3 sentences).
Respond with ONLY the message text, no JSON or formatting.`
                }
            ]
        };
    }

    /**
     * Generate AI decision for GHL webhook
     */
    async generateDecision(data) {
        const { requestId, contact, eventType, metadata } = data;

        try {
            logger.info('Generating AI decision', { requestId, eventType });

            // Get context and conversation history
            const context = await this.queryContext({
                contact,
                eventType,
                requestId
            });

            const conversationHistory = await Conversation.getConversationHistory(
                contact.phone,
                10
            );

            // Build prompt
            const prompt = this.buildDecisionPrompt(
                { contact, eventType, metadata },
                context,
                conversationHistory
            );

            // Call Anthropic API
            const response = await this.anthropic.messages.create(prompt);
            
            // Parse response
            const decision = this.parseDecisionResponse(response);

            logger.info('AI decision generated', { 
                requestId, 
                sendMessage: decision.sendMessage,
                intent: decision.intent,
                confidence: decision.confidence
            });

            return decision;
        } catch (error) {
            logger.error('Error generating AI decision', { 
                requestId, 
                error: error.message 
            });

            // Return safe default
            return {
                sendMessage: false,
                intent: 'error',
                confidence: 0,
                nextAction: 'manual_review',
                conversationStatus: 'error',
                sentiment: 'neutral'
            };
        }
    }

    /**
     * Generate response to inbound message
     */
    async generateResponse(data) {
        const { requestId, inboundMessage, contactPhone } = data;

        try {
            logger.info('Generating AI response to inbound message', { requestId });

            // Get context and conversation history
            const context = await this.queryContext({
                message: inboundMessage,
                requestId
            });

            const conversationHistory = await Conversation.getConversationHistory(
                contactPhone,
                10
            );

            // Build prompt
            const prompt = this.buildResponsePrompt(
                { inboundMessage, contactPhone },
                context,
                conversationHistory
            );

            // Call Anthropic API
            const response = await this.anthropic.messages.create(prompt);

            // Extract text response
            const responseText = response.content[0].text.trim();

            logger.info('AI response generated', { 
                requestId,
                responseLength: responseText.length
            });

            return responseText;
        } catch (error) {
            logger.error('Error generating AI response', { 
                requestId, 
                error: error.message 
            });

            // Return fallback response
            return "Thank you for your message. We'll get back to you shortly!";
        }
    }

    /**
     * Parse AI decision response
     */
    parseDecisionResponse(aiResponse) {
        try {
            const content = aiResponse.content[0].text;

            // Try to extract JSON from response
            const jsonData = extractJSON(content);
            
            if (jsonData) {
                return {
                    sendMessage: jsonData.sendMessage || false,
                    messageContent: jsonData.messageContent || '',
                    intent: jsonData.intent || 'unknown',
                    confidence: jsonData.confidence || 0.5,
                    nextAction: jsonData.nextAction || 'review',
                    conversationStatus: jsonData.conversationStatus || 'pending',
                    sentiment: jsonData.sentiment || 'neutral'
                };
            }

            // Fallback default
            return {
                sendMessage: false,
                intent: 'unknown',
                confidence: 0.5,
                nextAction: 'review',
                conversationStatus: 'pending',
                sentiment: 'neutral'
            };
        } catch (error) {
            logger.error('Error parsing AI response', { error: error.message });
            
            return {
                sendMessage: false,
                intent: 'error',
                confidence: 0,
                nextAction: 'review',
                conversationStatus: 'error',
                sentiment: 'neutral'
            };
        }
    }
}

module.exports = new AIDecisionService();

