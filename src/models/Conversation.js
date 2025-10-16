const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    contactPhone: {
        type: String,
        required: true,
        index: true
    },
    contactId: {
        type: String,
        index: true
    },
    contactName: {
        type: String
    },
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    requestId: {
        type: String,
        index: true
    },
    replyToId: {
        type: String
    },
    status: {
        type: String,
        enum: ['processing', 'scheduled', 'sent', 'failed', 'timeout', 'delivered'],
        default: 'processing'
    },
    metadata: {
        type: Object
    },
    aiInsights: {
        intent: String,
        sentiment: String,
        confidence: Number
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
ConversationSchema.index({ contactPhone: 1, timestamp: -1 });
ConversationSchema.index({ messageId: 1 });
ConversationSchema.index({ status: 1, timestamp: -1 });

// Static methods
ConversationSchema.statics.findByContact = function(contactPhone, options = {}) {
    const limit = options.limit || 10;
    return this.find({ contactPhone })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
};

ConversationSchema.statics.updateStatus = function(messageId, status, additionalData = {}) {
    return this.updateOne(
        { messageId },
        { $set: { status, ...additionalData } }
    ).exec();
};

ConversationSchema.statics.getConversationHistory = function(contactPhone, limit = 20) {
    return this.find({ contactPhone })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('direction content timestamp aiInsights')
        .lean()
        .exec();
};

ConversationSchema.statics.getStats = function(contactPhone) {
    return this.aggregate([
        { $match: { contactPhone } },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                inbound: {
                    $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] }
                },
                outbound: {
                    $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] }
                },
                lastInteraction: { $max: '$timestamp' }
            }
        }
    ]).exec();
};

module.exports = mongoose.model('Conversation', ConversationSchema);

