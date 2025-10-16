const mongoose = require('mongoose');

const WebhookLogSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        index: true
    },
    source: {
        type: String,
        enum: ['ghl', 'loopmessage'],
        required: true
    },
    type: {
        type: String,
        required: true
    },
    payload: {
        type: Object,
        required: true
    },
    response: {
        type: Object
    },
    statusCode: {
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for querying logs
WebhookLogSchema.index({ requestId: 1, timestamp: -1 });
WebhookLogSchema.index({ source: 1, timestamp: -1 });

// Static methods
WebhookLogSchema.statics.createLog = function(data) {
    return this.create(data);
};

WebhookLogSchema.statics.findByRequestId = function(requestId) {
    return this.find({ requestId }).sort({ timestamp: 1 }).exec();
};

WebhookLogSchema.statics.findRecent = function(limit = 50) {
    return this.find().sort({ timestamp: -1 }).limit(limit).exec();
};

module.exports = mongoose.model('WebhookLog', WebhookLogSchema);

