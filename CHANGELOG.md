# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-16

### Added
- Webhook-based architecture for GHL integration
- AI-powered decision making using Anthropic Claude
- LoopMessage API integration for iMessage sending/receiving
- Conversation history tracking and management
- Auto-response to inbound messages
- Pinecone integration for context retrieval
- Comprehensive logging with Winston
- Rate limiting for webhook endpoints
- Health check and utility endpoints
- MongoDB models for data persistence
- Docker support with docker-compose
- Detailed documentation and setup guides
- Environment-based configuration
- Error handling and retry logic

### Features
- `/webhook/ghl-inbound` - Receives GHL automation triggers
- `/webhook/loopmessage-callback` - Receives LoopMessage events
- `/health` - Server health check
- `/api/conversation/:phone` - Get conversation history
- `/api/logs` - View webhook logs

### Documentation
- Comprehensive README with setup instructions
- Detailed SETUP_GUIDE for step-by-step configuration
- API documentation
- Deployment guides (Heroku, Railway, Docker)
- Troubleshooting section

## [1.0.0] - Initial Concept
- Basic idea and architecture planning

---

## Template for Future Changes

### [Unreleased]

#### Added
- New features

#### Changed
- Changes in existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security updates

