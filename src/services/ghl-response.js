const axios = require('axios');
const logger = require('../utils/logger');
const { sleep } = require('../utils/helpers');

class GHLResponseService {
    /**
     * Format response data for GHL
     */
    formatResponse(data) {
        const {
            requestId,
            status = 'success',
            aiDecision,
            messageResult,
            actionsResults = [],
            error
        } = data;

        if (status === 'error') {
            return {
                request_id: requestId,
                status: 'error',
                error: error || 'Unknown error occurred'
            };
        }

        return {
            request_id: requestId,
            status: 'success',
            actions_taken: actionsResults,
            ai_response: {
                intent_detected: aiDecision?.intent || 'unknown',
                confidence: aiDecision?.confidence || 0,
                next_recommended_action: aiDecision?.nextAction || 'none'
            },
            data: {
                conversation_status: aiDecision?.conversationStatus || 'unknown',
                sentiment: aiDecision?.sentiment || 'neutral',
                message_sent: messageResult?.success || false,
                message_id: messageResult?.messageId || null
            }
        };
    }

    /**
     * Send webhook to GHL
     */
    async sendWebhook(callbackUrl, payload, requestId) {
        try {
            logger.info('Sending webhook to GHL', { 
                requestId, 
                callbackUrl,
                status: payload.status
            });

            const response = await axios.post(
                callbackUrl,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LoopMessage-GHL-Integration/2.0'
                    },
                    timeout: 10000
                }
            );

            logger.info('Webhook sent to GHL successfully', {
                requestId,
                statusCode: response.status
            });

            return {
                success: true,
                statusCode: response.status,
                data: response.data
            };
        } catch (error) {
            logger.error('Error sending webhook to GHL', {
                requestId,
                error: error.message,
                statusCode: error.response?.status || 0
            });

            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status || 0
            };
        }
    }

    /**
     * Retry webhook delivery with exponential backoff
     */
    async retryWebhook(callbackUrl, payload, requestId, maxRetries = 3) {
        let retries = 0;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                // Exponential backoff delay
                if (retries > 0) {
                    const delay = Math.pow(2, retries) * 1000; // 2s, 4s, 8s
                    logger.info('Retrying webhook', { 
                        requestId, 
                        attempt: retries + 1,
                        delay
                    });
                    await sleep(delay);
                }

                const result = await this.sendWebhook(callbackUrl, payload, requestId);
                
                if (result.success) {
                    return result;
                }

                lastError = result.error;
            } catch (error) {
                lastError = error.message;
            }

            retries++;
        }

        logger.error('Webhook delivery failed after all retries', {
            requestId,
            maxRetries,
            lastError
        });

        return {
            success: false,
            error: `Failed after ${maxRetries} retries. Last error: ${lastError}`
        };
    }

    /**
     * Send success response to GHL
     */
    async sendSuccess(data) {
        const { callbackUrl, requestId, aiDecision, messageResult, actionsResults } = data;

        const payload = this.formatResponse({
            requestId,
            status: 'success',
            aiDecision,
            messageResult,
            actionsResults
        });

        return await this.retryWebhook(callbackUrl, payload, requestId);
    }

    /**
     * Send error response to GHL
     */
    async sendError(data) {
        const { callbackUrl, requestId, error } = data;

        const payload = this.formatResponse({
            requestId,
            status: 'error',
            error
        });

        return await this.sendWebhook(callbackUrl, payload, requestId);
    }
}

module.exports = new GHLResponseService();

