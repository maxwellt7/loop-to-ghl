# GHL-LoopMessage Integration

Webhook-based AI agent system that integrates GoHighLevel (GHL) with LoopMessage for intelligent iMessage automation.

## 🎯 Features

- **Webhook-Based Architecture**: Receive triggers from GHL automations and send results back
- **AI-Powered Decisions**: Uses Anthropic Claude for intelligent message generation and decision-making
- **Context-Aware Responses**: Integrates with Pinecone for relevant context retrieval
- **Conversation Management**: Tracks and manages conversation history
- **iMessage Automation**: Send and receive iMessages via LoopMessage API
- **Comprehensive Logging**: Winston-based logging for debugging and monitoring
- **Rate Limiting**: Built-in protection against abuse
- **Auto-Response**: Automatically responds to inbound messages with AI-generated replies

## 🏗️ Architecture

```
GHL Automation → Webhook → AI Agent → LoopMessage → iMessage
       ↓                                                ↓
   Callback ← Results ← Processing ← Response ← Inbound Message
```

## 📋 Prerequisites

- Node.js v18+ and npm
- MongoDB (or MongoDB Atlas)
- LoopMessage account with API credentials
- Anthropic API key
- (Optional) Pinecone account for context retrieval
- Domain with HTTPS for webhook endpoints

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ghl-loopmessage-integration.git
cd ghl-loopmessage-integration
npm install
```

### 2. Configure Environment

Copy `env.example.txt` to `.env` and fill in your credentials:

```bash
cp env.example.txt .env
nano .env
```

Required environment variables:
- `LOOPMESSAGE_AUTH_KEY` - Your LoopMessage Authorization Key
- `LOOPMESSAGE_SECRET_KEY` - Your LoopMessage Secret Key
- `LOOPMESSAGE_SENDER_NAME` - Your sender name (e.g., `your.name@imsg.co`)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `WEBHOOK_SECRET` - Create a strong random token for webhook authentication
- `DATABASE_URL` - MongoDB connection string

### 3. Set Up Database

```bash
npm run db:setup
```

### 4. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will start on port 3000 (or your configured PORT).

## 📡 API Endpoints

### Webhook Endpoints

**GHL Inbound Webhook**
```
POST /webhook/ghl-inbound
```
Receives triggers from GHL automations. Requires `Authorization: Bearer {WEBHOOK_SECRET}` header.

**LoopMessage Callback**
```
POST /webhook/loopmessage-callback
```
Receives inbound messages and status updates from LoopMessage.

### Utility Endpoints

**Health Check**
```
GET /health
```
Returns server health status and database connection status.

**Get Conversation History**
```
GET /api/conversation/:phone?limit=20
```
Retrieves conversation history for a specific phone number.

**Get Webhook Logs**
```
GET /api/logs?limit=50
```
Retrieves recent webhook logs.

## ⚙️ GHL Configuration

### 1. Create Automation in GHL

1. Go to **Automations** → **Workflows**
2. Create new workflow
3. Add your desired trigger (e.g., "Contact Tag Added")

### 2. Add Webhook Action

**URL:**
```
https://your-domain.com/webhook/ghl-inbound
```

**Method:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your_webhook_secret_here"
}
```

**Body:**
```json
{
  "event_type": "{{trigger_type}}",
  "contact": {
    "id": "{{contact.id}}",
    "first_name": "{{contact.first_name}}",
    "last_name": "{{contact.last_name}}",
    "phone": "{{contact.phone}}",
    "email": "{{contact.email}}"
  },
  "metadata": {
    "trigger": "{{workflow.trigger}}",
    "workflow_id": "{{workflow.id}}"
  },
  "callback_url": "{{webhook.url}}"
}
```

### 3. Add Webhook Response Action

Add a "Webhook Response" action after your webhook to receive the AI processing results.

### 4. Use Response Data

Access the response data in subsequent actions:
- `{{webhook.response.status}}` - Processing status
- `{{webhook.response.ai_response.intent_detected}}` - Detected intent
- `{{webhook.response.ai_response.sentiment}}` - Customer sentiment
- `{{webhook.response.data.message_sent}}` - Whether message was sent
- `{{webhook.response.data.message_id}}` - LoopMessage message ID

## 📱 LoopMessage Configuration

### 1. Set Webhook URL

1. Log in to [LoopMessage Dashboard](https://dashboard.loopmessage.com/)
2. Go to **Settings** → **Webhooks**
3. Set Webhook URL to: `https://your-domain.com/webhook/loopmessage-callback`
4. Save settings

### 2. Get API Credentials

1. Go to **Settings** → **API Credentials**
2. Copy your Authorization Key and Secret Key
3. Add them to your `.env` file

## 🧠 AI Customization

### Modify AI Prompts

Edit prompts in `src/services/ai-decision.js`:

- **`buildDecisionPrompt()`** - Controls AI decision-making for GHL webhooks
- **`buildResponsePrompt()`** - Controls AI responses to inbound messages

### Example Customization

```javascript
buildDecisionPrompt(data, context, conversationHistory) {
    return {
        model: config.anthropic.model,
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: `You are a friendly sales assistant for [YOUR COMPANY].
            
            // Your custom instructions here
            
            Always be professional and helpful...`
        }]
    };
}
```

## 🗄️ Database Models

### Conversation

Stores all inbound and outbound messages:
- `contactPhone` - Contact's phone number
- `messageId` - Unique message ID from LoopMessage
- `direction` - 'inbound' or 'outbound'
- `content` - Message text
- `status` - Message delivery status
- `aiInsights` - AI-generated insights (intent, sentiment, confidence)

### WebhookLog

Stores all webhook requests and responses:
- `requestId` - Unique request identifier
- `source` - 'ghl' or 'loopmessage'
- `type` - Webhook type
- `payload` - Request payload
- `timestamp` - When webhook was received

## 🚢 Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set LOOPMESSAGE_AUTH_KEY=your_key
heroku config:set LOOPMESSAGE_SECRET_KEY=your_secret
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set WEBHOOK_SECRET=your_secret

# Deploy
git push heroku main
```

### Railway

1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Docker

```bash
# Build image
docker build -t ghl-loopmessage-integration .

# Run container
docker run -p 3000:3000 --env-file .env ghl-loopmessage-integration
```

## 📊 Monitoring

### Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

### Health Check

Monitor server health:
```bash
curl https://your-domain.com/health
```

### Database Queries

Check conversation stats:
```javascript
const Conversation = require('./src/models/Conversation');
const stats = await Conversation.getStats('+13231112233');
```

## 🔒 Security Best Practices

1. **Use Strong Webhook Secret**: Generate a cryptographically strong random token
2. **HTTPS Only**: Always use HTTPS for webhook endpoints
3. **Validate All Input**: Server validates all webhook payloads
4. **Rate Limiting**: Built-in rate limiting protects against abuse
5. **Secure Credentials**: Never commit `.env` file to version control
6. **Monitor Logs**: Regularly review logs for suspicious activity

## 🐛 Troubleshooting

### Webhook Not Received

- Check URL is correct and uses HTTPS
- Verify `Authorization` header matches `WEBHOOK_SECRET`
- Check server logs for incoming requests
- Ensure firewall allows incoming connections

### Messages Not Sending

- Verify LoopMessage API credentials
- Check sender name is active in LoopMessage dashboard
- Ensure phone number is in correct format (+1XXXXXXXXXX)
- Review LoopMessage webhook logs for delivery status

### AI Not Responding

- Verify `ANTHROPIC_API_KEY` is valid
- Check API quota/limits
- Review logs for API errors
- Test with simpler prompts

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check MongoDB server is running
- Ensure IP whitelist includes your server (for MongoDB Atlas)
- Review database logs

## 📚 Documentation

- [LoopMessage API Documentation](https://docs.loopmessage.com/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [GHL API Documentation](https://highlevel.stoplight.io/)
- [Pinecone Documentation](https://docs.pinecone.io/)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
- Check the documentation in `Build Plan/` directory
- Review logs for error details
- Create an issue on GitHub
- Contact support@yourdomain.com

## 🔄 Updates

### Version 2.0.0
- Initial release with webhook-based architecture
- AI-powered decision making
- Conversation management
- Auto-response to inbound messages

---

**Built with ❤️ for seamless GHL-iMessage integration**

