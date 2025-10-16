# Contributing to GHL-LoopMessage Integration

Thank you for considering contributing to this project! Here are some guidelines to help you get started.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Server logs if available
- Environment details (Node version, OS, etc.)

### Suggesting Features

Feature requests are welcome! Please:
- Describe the feature and use case
- Explain how it would benefit users
- Provide examples if possible

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

## Development Guidelines

### Code Style

- Follow the existing code style
- Use ESLint for linting (`npm run lint`)
- Write clear, self-documenting code
- Add comments for complex logic

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues when applicable

### Testing

- Test all changes locally
- Ensure existing functionality still works
- Add tests for new features when applicable

## Project Structure

```
src/
├── config/          # Configuration
├── models/          # Database models
├── services/        # Business logic
│   ├── ai-decision.js
│   ├── loopmessage.js
│   └── ghl-response.js
├── utils/           # Utility functions
└── server.js        # Main application
```

## Questions?

Feel free to open an issue for questions or join our discussions.

Thank you for contributing! 🙌

