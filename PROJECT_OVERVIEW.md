# Project Overview - GHL-LoopMessage Integration

## 🎯 What This Project Does

This is a **webhook-based AI agent system** that connects GoHighLevel (GHL) with LoopMessage to enable intelligent, automated iMessage communication. The system acts as a middleware that:

1. Receives webhook triggers from GHL automations
2. Uses AI (Anthropic Claude) to make intelligent decisions
3. Sends iMessages via LoopMessage API
4. Returns results back to GHL automations
5. Auto-responds to inbound iMessages with AI-generated replies

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│          GHL Automation (Trigger Event)             │
│     Tag Added | Form Submit | Stage Change          │
└────────────────────┬────────────────────────────────┘
                     │
                     │ 1. HTTP POST Webhook
                     │    (contact data + callback URL)
                     ▼
┌─────────────────────────────────────────────────────┐
│               Your Backend Server                    │
│         Endpoint: /webhook/ghl-inbound               │
│                                                       │
│    2. AI Agent Processing:                           │
│       ├─ Query Pinecone for context                  │
│       ├─ Call Anthropic AI for decision              │
│       ├─ Send iMessage via LoopMessage               │
│       └─ Prepare results                             │
│                                                       │
│    3. Send Results via Outbound Webhook              │
└────────────────────┬────────────────────────────────┘
                     │
                     │ 4. HTTP POST Webhook
                     │    (results + AI insights)
                     ▼
┌─────────────────────────────────────────────────────┐
│         GHL Automation (Continues Workflow)          │
│    • Update contact fields                           │
│    • Add/remove tags                                 │
│    • Trigger next steps                              │
└─────────────────────────────────────────────────────┘
                     ▲
                     │
                     │ 5. Inbound iMessages
                     │
┌─────────────────────────────────────────────────────┐
│           Contact Sends iMessage                     │
│             ↓                                        │
│         LoopMessage                                  │
│             ↓                                        │
│    Webhook to /webhook/loopmessage-callback          │
│             ↓                                        │
│    AI generates response                             │
│             ↓                                        │
│    Auto-reply sent via LoopMessage                   │
└─────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
ghl-loopmessage-integration/
│
├── src/
│   ├── config/
│   │   └── index.js                 # Configuration management
│   │
│   ├── models/
│   │   ├── WebhookLog.js            # Webhook logging model
│   │   └── Conversation.js          # Conversation history model
│   │
│   ├── services/
│   │   ├── ai-decision.js           # AI decision-making logic
│   │   ├── loopmessage.js           # LoopMessage API client
│   │   └── ghl-response.js          # GHL webhook responses
│   │
│   ├── utils/
│   │   ├── logger.js                # Winston logging setup
│   │   ├── helpers.js               # Utility functions
│   │   └── db-setup.js              # Database initialization
│   │
│   └── server.js                    # Main Express application
│
├── logs/                            # Log files (generated)
│   ├── combined.log
│   └── error.log
│
├── .env                             # Environment variables (create from template)
├── env.example.txt                  # Environment template
├── package.json                     # Dependencies and scripts
├── Dockerfile                       # Docker configuration
├── docker-compose.yml               # Docker Compose setup
├── README.md                        # Main documentation
├── SETUP_GUIDE.md                   # Step-by-step setup
├── CONTRIBUTING.md                  # Contribution guidelines
├── CHANGELOG.md                     # Version history
└── LICENSE                          # MIT License
```

## 🔄 How It Works

### Outbound Flow (GHL → Contact)

1. **Trigger**: Event happens in GHL (e.g., "Follow Up" tag added)
2. **Webhook Sent**: GHL sends POST request to your server
3. **Processing**: 
   - Server validates request
   - AI analyzes contact data and conversation history
   - Pinecone provides relevant context
   - AI decides whether to send message and what to say
4. **Action**: If AI decides to send, iMessage sent via LoopMessage
5. **Response**: Results sent back to GHL via callback webhook
6. **GHL Continues**: Automation updates fields, adds tags, triggers next steps

### Inbound Flow (Contact → GHL)

1. **Contact Sends iMessage**: Customer replies to your sender name
2. **Webhook Received**: LoopMessage sends callback to your server
3. **Processing**:
   - Server saves message to database
   - AI generates contextual response
   - Response sent back via LoopMessage
4. **Optional**: Server can notify GHL via API or webhook

## 🛠️ Key Components

### 1. Webhook Handler (`server.js`)

- Receives webhooks from GHL and LoopMessage
- Validates authentication
- Routes to appropriate processing functions
- Provides utility endpoints (health check, logs, conversation history)

### 2. AI Decision Service (`ai-decision.js`)

- Integrates with Anthropic Claude API
- Queries Pinecone for relevant context
- Generates intelligent decisions and responses
- Customizable prompts for different scenarios

### 3. LoopMessage Service (`loopmessage.js`)

- Sends iMessages to contacts
- Tracks message delivery status
- Handles reactions and typing indicators
- Error handling and retries

### 4. GHL Response Service (`ghl-response.js`)

- Formats response data for GHL
- Sends webhooks back to GHL automations
- Implements retry logic for failed deliveries

### 5. Database Models

**Conversation Model:**
- Stores all inbound/outbound messages
- Tracks conversation history per contact
- Saves AI insights (intent, sentiment, confidence)

**WebhookLog Model:**
- Logs all incoming webhooks
- Helps with debugging and monitoring
- Tracks request/response cycles

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp env.example.txt .env
   # Edit .env with your credentials
   ```

3. **Set Up Database**:
   ```bash
   npm run db:setup
   ```

4. **Start Server**:
   ```bash
   npm run dev
   ```

5. **Configure LoopMessage**:
   - Set webhook URL to your server's `/webhook/loopmessage-callback`

6. **Configure GHL**:
   - Create automation with webhook action
   - Point to your server's `/webhook/ghl-inbound`
   - Add webhook response action to receive results

## 🔑 Environment Variables

### Required

- `LOOPMESSAGE_AUTH_KEY` - LoopMessage Authorization Key
- `LOOPMESSAGE_SECRET_KEY` - LoopMessage Secret Key
- `LOOPMESSAGE_SENDER_NAME` - Your sender name (e.g., `name@imsg.co`)
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `WEBHOOK_SECRET` - Strong random token for webhook auth
- `DATABASE_URL` - MongoDB connection string

### Optional

- `PINECONE_API_KEY` - For context retrieval
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX_NAME` - Pinecone index name
- `GHL_API_KEY` - For direct GHL API calls
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 📊 API Endpoints

### Webhooks

**POST /webhook/ghl-inbound**
- Receives GHL automation triggers
- Requires: `Authorization: Bearer {WEBHOOK_SECRET}`
- Returns: `{ success: true, request_id, status }`

**POST /webhook/loopmessage-callback**
- Receives LoopMessage events
- Returns: `{ typing: 3, read: true }` for inbound messages

### Utilities

**GET /health**
- Server health check
- Returns: Database status, uptime, environment

**GET /api/conversation/:phone**
- Get conversation history for a phone number
- Query param: `limit` (default: 20)

**GET /api/logs**
- Get recent webhook logs
- Query param: `limit` (default: 50)

## 🎨 Customization

### AI Prompts

Edit `src/services/ai-decision.js`:

```javascript
buildDecisionPrompt(data, context, conversationHistory) {
    return {
        model: config.anthropic.model,
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: `You are [YOUR CUSTOM PERSONA].
            
            [YOUR CUSTOM INSTRUCTIONS]
            
            Contact: ${contact.firstName} ${contact.lastName}
            ...`
        }]
    };
}
```

### Message Logic

Modify decision logic in `processGHLWebhook()` function to:
- Change when messages are sent
- Add custom validations
- Implement business rules
- Add additional actions

## 📈 Monitoring

### Logs

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Errors only

Log format includes:
- Timestamp
- Log level
- Request ID (for tracking)
- Message
- Additional metadata

### Health Monitoring

Check server health:
```bash
curl https://your-domain.com/health
```

Monitor key metrics:
- Database connection status
- Server uptime
- Processing time (check logs)
- Error rates

## 🔒 Security Features

- **Authentication**: Webhook secret validation
- **HTTPS**: All webhooks require HTTPS
- **Rate Limiting**: Protection against abuse
- **Input Validation**: All webhook data validated
- **Sanitized Logging**: Sensitive data redacted
- **Error Handling**: Graceful error recovery

## 🚢 Deployment Options

1. **Heroku**: One-click deploy with add-ons
2. **Railway**: GitHub integration, auto-deploy
3. **Docker**: Containerized deployment
4. **VPS**: Self-hosted on any server

See `SETUP_GUIDE.md` for detailed deployment instructions.

## 📚 Documentation

- **README.md** - Main documentation
- **SETUP_GUIDE.md** - Step-by-step setup instructions
- **Build Plan/** - Original architecture documents
- **CONTRIBUTING.md** - How to contribute
- **CHANGELOG.md** - Version history

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not received**: Check URL, HTTPS, firewall
2. **Messages not sending**: Verify LoopMessage credentials
3. **AI errors**: Check Anthropic API key and quotas
4. **Database issues**: Verify MongoDB connection

See `SETUP_GUIDE.md` → Troubleshooting section for detailed help.

## 🔮 Future Enhancements

Potential features for future versions:
- Multi-language support
- Sentiment analysis dashboard
- A/B testing for messages
- Voice message processing
- Integration with additional AI models
- Advanced analytics and reporting
- SMS fallback support
- Group message support

## 📞 Support

For help:
1. Check documentation
2. Review logs for errors
3. Test individual components
4. Create GitHub issue
5. Contact support

## 📄 License

MIT License - See LICENSE file

---

**Version**: 2.0.0  
**Last Updated**: October 16, 2025  
**Status**: Production Ready ✅

