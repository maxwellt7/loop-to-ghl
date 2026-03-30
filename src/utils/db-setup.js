const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

async function setupDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.database.url);
        
        logger.info('✅ Connected to MongoDB');
        
        // Import models to create collections
        require('../models/WebhookLog');
        require('../models/Conversation');
        
        logger.info('✅ Database models loaded');
        
        // Create indexes
        const WebhookLog = mongoose.model('WebhookLog');
        const Conversation = mongoose.model('Conversation');
        
        await WebhookLog.createIndexes();
        await Conversation.createIndexes();
        
        logger.info('✅ Database indexes created');
        logger.info('✅ Database setup complete!');
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Database setup error:', error);
        process.exit(1);
    }
}

// Run setup
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;

