const crypto = require('crypto');

/**
 * Generate unique request ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate UUID
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add + prefix if not present
    return cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
}

/**
 * Validate phone number
 */
function isValidPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validate email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

/**
 * Sanitize object for logging (remove sensitive data)
 */
function sanitizeForLogging(obj) {
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'apiKey', 'authorization'];
    
    const sanitize = (item) => {
        if (Array.isArray(item)) {
            return item.map(sanitize);
        }
        
        if (item && typeof item === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(item)) {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    sanitized[key] = '***REDACTED***';
                } else {
                    sanitized[key] = sanitize(value);
                }
            }
            return sanitized;
        }
        
        return item;
    };
    
    return sanitize(obj);
}

/**
 * Parse JSON safely
 */
function safeJSONParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Truncate text to maximum length
 */
function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract JSON from text (useful for parsing AI responses)
 */
function extractJSON(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            return null;
        }
    }
    return null;
}

/**
 * Format error for API response
 */
function formatError(error) {
    return {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
}

module.exports = {
    generateRequestId,
    generateUUID,
    formatPhoneNumber,
    isValidPhoneNumber,
    isValidEmail,
    sleep,
    retryWithBackoff,
    sanitizeForLogging,
    safeJSONParse,
    truncate,
    extractJSON,
    formatError
};

