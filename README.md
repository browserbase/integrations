# Browserbase Integrations

**Production-ready integrations for Browserbase -- the complete platform to build and deploy agents that browse and interact with the web like humans.**

Browserbase provides the infrastructure and developer primitives to power the next generation of browser agents. This repository contains officially maintained integrations with popular frameworks, libraries, and platforms.

## What is Browserbase?

Browserbase is the browser agent platform -- one API key, everything your agent needs to browse the web:

- **Headless Browsers**: programmatic access to fleets of headless browsers at scale with globally distributed infrastructure, isolated sessions, and rich observability
- **Fetch and Search APIs**: agents can quickly search and fetch LLM context from the web for fast, token-efficient decisions
- **Agent Identity**: enable agents to access any website through strategic partnerships and a dedicated research team
- **Functions**: deploy and run agents on Browserbase for faster, more secure execution
- **Model Gateway**: access major models via Stagehand with unified billing under your Browserbase API key
- **Stagehand**: the AI SDK for browser agents -- replaces rigid selectors with natural language browser interactions that self-heal when pages change

## Monorepo Structure

```
integrations/
├── examples/
│   ├── community/                # Community-contributed examples
│   └── integrations/
│       ├── agentkit/             # AgentKit implementations
│       ├── agno/                 # Agno agent framework integration
│       ├── braintrust/           # Evaluation and testing tools
│       ├── box/                  # Box AI document Q&A, OCR, and metadata extraction
│       ├── browser-use/          # Browser Use automation
│       ├── cartesia/             # Cartesia integration
│       ├── cloudflare/           # Cloudflare integration
│       ├── crewai/               # CrewAI framework integration
│       ├── langchain/            # LangChain framework integration
│       ├── logs/                 # Logging utilities
│       ├── mastra/               # Mastra AI agent integration
│       ├── mongodb/              # MongoDB data extraction & storage
│       ├── stripe/               # Stripe Issuing + automation
│       ├── temporal/             # Temporal workflow orchestration
│       ├── trigger/              # Trigger.dev background jobs & automation
│       └── vercel/               # Vercel integrations
├── packages/                     # Published npm packages
└── README.md
```

## Getting Started

1. **Choose your integration** based on your framework or use case
2. **Navigate to the specific integration directory** for detailed setup instructions
3. **Follow the README** in each integration for environment setup and examples
4. **Review the code samples** to understand implementation patterns

Each integration includes:
- Complete setup instructions
- Environment configuration guides
- Working code examples
- Best practices and tips
- Troubleshooting guides

## Prerequisites

Most integrations require:
- A [Browserbase account](https://browserbase.com) and API key
- Node.js 18+ or Python 3.8+ (depending on implementation)
- Framework-specific dependencies (detailed in each integration)

## Documentation

For comprehensive documentation, tutorials, and API references, visit:

[Official Browserbase Documentation](https://docs.browserbase.com)

## Community & Support

### Get Help
- **Email Support**: [support@browserbase.com](mailto:support@browserbase.com)
- **Documentation**: [docs.browserbase.com](https://docs.browserbase.com)

### Contributing
We welcome contributions! Each integration has its own contribution guidelines. Feel free to:
- Report bugs and request features
- Submit pull requests with improvements
- Share your own integration examples
- Help improve documentation

## License

This project is licensed under the MIT License. See individual integration directories for any additional licensing information.

---

**Built with ❤️ by the Browserbase team**
