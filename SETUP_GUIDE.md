# Setup Guide - GHL-LoopMessage Integration

This guide will walk you through setting up the complete webhook-based AI agent system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [LoopMessage Configuration](#loopmessage-configuration)
4. [GHL Configuration](#ghl-configuration)
5. [Production Deployment](#production-deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- [x] Node.js v18 or higher installed
- [x] MongoDB installed locally (or MongoDB Atlas account)
- [x] LoopMessage account with active sender name
- [x] Anthropic API account
- [x] GoHighLevel account with automation access
- [x] (Optional) Pinecone account for context retrieval
- [x] Domain with HTTPS for production webhooks

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/ghl-loopmessage-integration.git
cd ghl-loopmessage-integration
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

1. Copy the environment template:
```bash
cp env.example.txt .env
```

2. Edit `.env` and fill in your credentials:

```bash
# Required
LOOPMESSAGE_AUTH_KEY=your_loopmessage_auth_key
LOOPMESSAGE_SECRET_KEY=your_loopmessage_secret_key
LOOPMESSAGE_SENDER_NAME=your.name@imsg.co
ANTHROPIC_API_KEY=sk-ant-api03-your_key
WEBHOOK_SECRET=create_a_strong_random_token

# Database (local development)
DATABASE_URL=mongodb://localhost:27017/ghl_loopmessage

# Optional
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=your_index
```

### Step 4: Set Up Database

```bash
npm run db:setup
```

This will:
- Connect to MongoDB
- Create collections
- Set up indexes

### Step 5: Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Step 6: Test Local Server

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-16T10:30:00.000Z",
  "uptime": 12.345,
  "environment": "development",
  "database": "connected"
}
```

## LoopMessage Configuration

### Step 1: Get API Credentials

1. Log in to [LoopMessage Dashboard](https://dashboard.loopmessage.com/)
2. Navigate to **Settings** → **API Credentials**
3. Copy:
   - **Authorization Key**
   - **API Secret Key**
4. Note your **Sender Name** (e.g., `maxmayes7@a.imsg.co`)

### Step 2: Configure Webhook

**For Local Development (using ngrok):**

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start ngrok tunnel:
```bash
ngrok http 3000
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. In LoopMessage Dashboard:
   - Go to **Settings** → **Webhooks**
   - Set **Webhook URL**: `https://abc123.ngrok.io/webhook/loopmessage-callback`
   - Save

**For Production:**

Use your production domain:
```
https://your-domain.com/webhook/loopmessage-callback
```

### Step 3: Test LoopMessage Integration

Send a test iMessage to your sender name from your iPhone and check server logs for incoming webhook.

## GHL Configuration

### Step 1: Create Workflow

1. In GHL, go to **Automations** → **Workflows**
2. Click **Create Workflow**
3. Name it: "iMessage AI Agent"

### Step 2: Add Trigger

Choose your trigger event:
- Contact Tag Added
- Form Submitted  
- Pipeline Stage Changed
- Appointment Scheduled

Example: Select "Contact Tag Added" → Tag: "Send iMessage"

### Step 3: Add Webhook Action

Click **Add Action** → **Webhook**

**Configuration:**

**Webhook URL:**
- Local: `https://your-ngrok-url.ngrok.io/webhook/ghl-inbound`
- Production: `https://your-domain.com/webhook/ghl-inbound`

**Method:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your_webhook_secret_from_env"
}
```

**Request Body:**
```json
{
  "event_type": "contact_tag_added",
  "contact": {
    "id": "{{contact.id}}",
    "first_name": "{{contact.first_name}}",
    "last_name": "{{contact.last_name}}",
    "phone": "{{contact.phone}}",
    "email": "{{contact.email}}"
  },
  "metadata": {
    "trigger": "{{workflow.trigger}}",
    "tag_added": "{{contact.tags}}",
    "workflow_id": "{{workflow.id}}"
  },
  "callback_url": "{{webhook.url}}"
}
```

**Important:** The `callback_url` field uses `{{webhook.url}}` which creates a unique URL for receiving the response.

### Step 4: Add Webhook Response Action

1. Click **Add Action** → **Webhook Response**
2. Set timeout: **30 seconds**
3. This will wait for your server to send back results

### Step 5: Process Response Data

Add conditional actions based on response:

**Update Custom Field with Sentiment:**
- Action: **Update Contact**
- Field: `ai_sentiment`
- Value: `{{webhook.response.data.sentiment}}`

**Add Tag if Message Sent:**
- Condition: `{{webhook.response.data.message_sent}}` equals `true`
- Action: **Add Tag** → "iMessage Sent"

**Trigger Action Based on Intent:**
- Condition: `{{webhook.response.ai_response.intent_detected}}` equals `interested`
- Action: **Go to another workflow** → "Schedule Call Workflow"

### Step 6: Test Workflow

1. Create a test contact with valid phone number
2. Manually trigger the workflow
3. Check:
   - Server logs show webhook received
   - iMessage is sent to contact
   - GHL receives response webhook
   - Custom fields are updated

## Production Deployment

### Option 1: Heroku

```bash
# Login
heroku login

# Create app
heroku create ghl-loopmessage-integration

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set LOOPMESSAGE_AUTH_KEY=your_key
heroku config:set LOOPMESSAGE_SECRET_KEY=your_secret
heroku config:set LOOPMESSAGE_SENDER_NAME=your.sender@imsg.co
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set WEBHOOK_SECRET=your_strong_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

Your webhook URL will be: `https://your-app-name.herokuapp.com/webhook/ghl-inbound`

### Option 2: Railway

1. Go to [Railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your repository
4. Add environment variables in **Variables** tab
5. Deploy automatically

### Option 3: Docker

```bash
# Build image
docker build -t ghl-loopmessage-integration .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

## Testing

### Test GHL Webhook Endpoint

```bash
curl -X POST https://your-domain.com/webhook/ghl-inbound \
  -H "Authorization: Bearer your_webhook_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "test",
    "contact": {
      "id": "test123",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+13231112233",
      "email": "john@example.com"
    },
    "metadata": {},
    "callback_url": "https://webhook.site/your-test-url"
  }'
```

### Test LoopMessage Callback

Send an iMessage to your sender name and check server logs:

```bash
# Check logs
tail -f logs/combined.log

# Or with npm
npm run logs
```

### Test End-to-End

1. Create test contact in GHL with valid phone number
2. Add trigger tag to contact
3. Monitor server logs
4. Verify iMessage received on phone
5. Check GHL for updated custom fields

## Troubleshooting

### Server Won't Start

**Check:**
- MongoDB is running
- Environment variables are set correctly
- Port 3000 is not in use

```bash
# Check MongoDB
mongosh

# Check port
lsof -i :3000

# View detailed error
NODE_ENV=development npm start
```

### Webhook Not Received from GHL

**Check:**
- URL is correct and uses HTTPS
- Authorization header matches WEBHOOK_SECRET
- Server is accessible from internet
- Firewall allows incoming connections

**Test webhook:**
```bash
curl -I https://your-domain.com/health
```

### Messages Not Sending

**Check:**
- LoopMessage credentials are correct
- Sender name is active
- Phone number format is correct (+1XXXXXXXXXX)
- Check LoopMessage dashboard for sender status

**Test LoopMessage API:**
```bash
curl -X POST https://server.loopmessage.com/api/v1/message/send/ \
  -H "Authorization: your_auth_key" \
  -H "Loop-Secret-Key: your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+13231112233",
    "text": "Test message",
    "sender_name": "your.sender@imsg.co"
  }'
```

### AI Not Responding Correctly

**Check:**
- Anthropic API key is valid
- API usage limits not exceeded
- Prompts are properly formatted

**Test Anthropic API:**
```javascript
const anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: 'your_key' });
// Test basic call
```

### Database Connection Issues

**Check:**
- DATABASE_URL is correct
- MongoDB is running
- Network allows connection

```bash
# Test MongoDB connection
mongosh "your_database_url"
```

## Next Steps

After setup is complete:

1. ✅ Customize AI prompts in `src/services/ai-decision.js`
2. ✅ Set up Pinecone knowledge base (optional)
3. ✅ Configure monitoring and alerts
4. ✅ Test with real contacts
5. ✅ Monitor logs and optimize
6. ✅ Document your specific GHL workflows

## Support

- Review logs: `tail -f logs/combined.log`
- Check health: `curl https://your-domain.com/health`
- View conversation history: `curl https://your-domain.com/api/conversation/+13231112233`
- View webhook logs: `curl https://your-domain.com/api/logs`

For issues, check:
- Server logs
- LoopMessage dashboard
- GHL automation logs
- MongoDB logs

---

**Setup complete! Your AI-powered iMessage automation is ready to go! 🚀**

