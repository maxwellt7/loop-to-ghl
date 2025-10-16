require('dotenv').config();

const config = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        webhookSecret: process.env.WEBHOOK_SECRET || 'change-this-secret'
    },
    
    loopmessage: {
        apiUrl: 'https://server.loopmessage.com/api/v1',
        authKey: process.env.LOOPMESSAGE_AUTH_KEY,
        secretKey: process.env.LOOPMESSAGE_SECRET_KEY,
        senderName: process.env.LOOPMESSAGE_SENDER_NAME
    },
    
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1024
    },
    
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
        indexName: process.env.PINECONE_INDEX_NAME
    },
    
    database: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/ghl_loopmessage'
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },
    
    ghl: {
        apiKey: process.env.GHL_API_KEY,
        locationId: process.env.GHL_LOCATION_ID
    }
};

// Validate required configuration
function validateConfig() {
    const required = [
        'LOOPMESSAGE_AUTH_KEY',
        'LOOPMESSAGE_SECRET_KEY',
        'LOOPMESSAGE_SENDER_NAME',
        'ANTHROPIC_API_KEY',
        'WEBHOOK_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
        console.warn('   Some features may not work correctly.');
    }
}

validateConfig();

module.exports = config;

