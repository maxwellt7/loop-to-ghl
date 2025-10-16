const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/helpers');

class LoopMessageService {
    constructor() {
        this.apiUrl = config.loopmessage.apiUrl;
        this.authKey = config.loopmessage.authKey;
        this.secretKey = config.loopmessage.secretKey;
        this.senderName = config.loopmessage.senderName;
    }

    /**
     * Get headers for LoopMessage API requests
     */
    getHeaders() {
        return {
            'Authorization': this.authKey,
            'Loop-Secret-Key': this.secretKey,
            'Content-Type': 'application/json',
            'User-Agent': 'GHL-LoopMessage-Integration/2.0'
        };
    }

    /**
     * Send message via LoopMessage API
     */
    async sendMessage(data) {
        const {
            recipient,
            text,
            senderName,
            requestId,
            attachments,
            effect,
            subject,
            replyToId,
            timeout
        } = data;

        try {
            const payload = {
                recipient: recipient,
                text: text,
                sender_name: senderName || this.senderName,
                passthrough: JSON.stringify({ requestId })
            };

            // Add optional parameters
            if (attachments && attachments.length > 0) payload.attachments = attachments;
            if (effect) payload.effect = effect;
            if (subject) payload.subject = subject;
            if (replyToId) payload.reply_to_id = replyToId;
            if (timeout) payload.timeout = timeout;

            logger.info('Sending message via LoopMessage', { 
                requestId, 
                recipient,
                textLength: text.length 
            });

            const response = await axios.post(
                `${this.apiUrl}/message/send/`,
                payload,
                {
                    headers: this.getHeaders(),
                    timeout: 30000
                }
            );

            if (response.data.success) {
                logger.info('Message sent successfully', {
                    requestId,
                    messageId: response.data.message_id,
                    recipient: response.data.recipient
                });

                return {
                    success: true,
                    messageId: response.data.message_id,
                    recipient: response.data.recipient
                };
            } else {
                logger.error('Message send failed', {
                    requestId,
                    error: response.data.message
                });

                return {
                    success: false,
                    error: response.data.message,
                    errorCode: response.data.code || 0
                };
            }
        } catch (error) {
            logger.error('Error sending message via LoopMessage', {
                requestId,
                error: error.message,
                errorCode: error.response?.data?.code || 0
            });

            return {
                success: false,
                error: error.message,
                errorCode: error.response?.data?.code || 0
            };
        }
    }

    /**
     * Get message status
     */
    async getMessageStatus(messageId, requestId) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/message/status/${messageId}/`,
                {
                    headers: this.getHeaders(),
                    timeout: 10000
                }
            );

            logger.info('Message status retrieved', {
                requestId,
                messageId,
                status: response.data.status
            });

            return {
                success: true,
                status: response.data.status,
                errorCode: response.data.error_code || null,
                lastUpdate: response.data.last_update
            };
        } catch (error) {
            logger.error('Error getting message status', {
                requestId,
                messageId,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send reaction to a message
     */
    async sendReaction(data) {
        const { recipient, messageId, reaction, senderName, requestId } = data;

        try {
            const payload = {
                recipient: recipient,
                text: '', // Required but empty for reactions
                message_id: messageId,
                reaction: reaction,
                sender_name: senderName || this.senderName,
                passthrough: JSON.stringify({ requestId, type: 'reaction' })
            };

            const response = await axios.post(
                `${this.apiUrl}/message/send/`,
                payload,
                {
                    headers: this.getHeaders(),
                    timeout: 30000
                }
            );

            return {
                success: response.data.success,
                messageId: response.data.message_id
            };
        } catch (error) {
            logger.error('Error sending reaction', {
                requestId,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send typing indicator (done via webhook response)
     * This is a helper to format the response
     */
    formatTypingResponse(seconds = 3, markAsRead = true) {
        return {
            typing: Math.min(seconds, 60), // Max 60 seconds
            read: markAsRead
        };
    }
}

module.exports = new LoopMessageService();

