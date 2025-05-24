# Browserbase Integrations

**A comprehensive monorepo of production-ready integrations for Browserbase - the headless browser infrastructure for AI agents and web automation.**

Browserbase provides scalable, reliable browser infrastructure that powers the next generation of AI applications. This repository contains officially maintained integrations with popular frameworks, libraries, and platforms to help you build powerful web automation and AI agent solutions.

## 🚀 What is Browserbase?

Browserbase is headless browser infrastructure designed specifically for AI agents and web automation at scale. It provides:

- **Browser sessions** that scale automatically
- **Anti-detection capabilities** to bypass bot protection
- **Visual debugging** with session recordings and screenshots  
- **Global infrastructure** for low-latency access worldwide
- **Stealth technology** to ensure reliable web interaction

## 📦 Available Integrations

Our integrations are organized by platform and use case, each with comprehensive documentation and examples:

### 🤖 AI Agent Frameworks

#### [**CrewAI Integration**](./examples/integrations/crewai/README.md)
Enable your CrewAI agents to browse the web like humans with the `BrowserbaseLoadTool`. Perfect for creating intelligent agent crews that need to gather real-time web data, extract content from complex pages, and interact with modern web applications.

**Key Features:**
- Extract text from JavaScript-heavy websites
- Capture screenshots and visual content  
- Bypass anti-bot mechanisms
- Seamless integration with CrewAI's tool ecosystem

#### [**AgentKit Integration**](./examples/integrations/agentkit/)
Powerful integrations for AgentKit workflows with both Browserbase and Stagehand implementations:

- **[Browserbase Implementation](./examples/integrations/agentkit/browserbase/README.md)** - Direct Browserbase integration for AgentKit
- **[Stagehand Implementation](./examples/integrations/agentkit/stagehand/README.md)** - AI-powered web automation using Stagehand

#### [**LangChain Integration**](./examples/integrations/langchain/README.md)  
Integrate Browserbase with LangChain's ecosystem for advanced AI applications. Build chains that can browse, extract, and interact with web content as part of larger AI workflows.

#### [**Browser-Use Integration**](./examples/integrations/browser-use/README.md)
Streamlined browser automation for AI applications with a focus on simplicity and reliability.

### 🏗️ Development & Deployment Platforms

#### [**Vercel AI Integration**](./examples/integrations/vercel/README.md)
Enhance your Vercel applications with web-browsing capabilities. Build Generative User Interfaces that can access real-time web data and create dynamic, AI-powered experiences.

**Examples Include:**
- **BrowseGPT** - A chat interface with real-time web search capabilities
- **Vercel + Puppeteer** - Server-side browser automation on Fluid Compute

### 💳 E-commerce & Payments

#### [**Stripe Integration**](./examples/integrations/stripe/README.md)
**Agentic Credit Card Automation** - Create virtual cards with Stripe Issuing and automate online purchases with Browserbase. Perfect for programmatic commerce, testing payment flows, and building AI shopping agents.

**Capabilities:**
- Create virtual cards with spending controls
- Automate secure online purchases
- Available in Node.js, Python, and Stagehand implementations
- Production-ready with comprehensive examples

### 📊 Evaluation & Testing

#### [**Braintrust Integration**](./examples/integrations/braintrust/)
Integrate Browserbase with Braintrust for evaluation and testing of AI agent performance in web environments. Monitor, measure, and improve your browser automation workflows.

#### [**MongoDB Integration**](./examples/integrations/mongodb/README.md)
**Intelligent Web Scraping & Data Storage** - Extract structured data from e-commerce websites using Stagehand and store it in MongoDB for analysis. Perfect for building data pipelines, market research, and competitive analysis workflows.

**Capabilities:**
- AI-powered web scraping with Stagehand
- Structured data extraction with schema validation
- MongoDB storage for persistence and querying
- Built-in data analysis and reporting
- Robust error handling for production use

## 🏗️ Monorepo Structure

```
integrations/
├── examples/
|   |
│   └── community/               # WIP
│   └── integrations/
│       ├── crewai/              # CrewAI framework integration
│       ├── vercel/              # Vercel AI SDK integration  
│       ├── stripe/              # Stripe Issuing + automation
│       ├── langchain/           # LangChain framework integration
│       ├── browser-use/         # Simplified browser automation
│       ├── braintrust/          # Evaluation and testing tools
│       ├── mongodb/             # MongoDB data extraction & storage
│       └── agentkit/            # AgentKit implementations
└── README.md                    # This file
```

## 🚀 Getting Started

1. **Choose your integration** based on your framework or use case
2. **Navigate to the specific integration directory** for detailed setup instructions
3. **Follow the README** in each integration for environment setup and examples
4. **Review the code samples** to understand implementation patterns

Each integration includes:
- ✅ Complete setup instructions
- ✅ Environment configuration guides  
- ✅ Working code examples
- ✅ Best practices and tips
- ✅ Troubleshooting guides

## 🔧 Prerequisites

Most integrations require:
- A [Browserbase account](https://browserbase.com) and API key
- Node.js 18+ or Python 3.8+ (depending on implementation)
- Framework-specific dependencies (detailed in each integration)

## 📖 Documentation

For comprehensive documentation, tutorials, and API references, visit:

**🔗 [Official Browserbase Documentation](https://docs.browserbase.com)**

## 🤝 Community & Support

### Get Help
- **📧 Email Support**: [support@browserbase.com](mailto:support@browserbase.com)
- **📚 Documentation**: [docs.browserbase.com](https://docs.browserbase.com)

### Contributing
We welcome contributions! Each integration has its own contribution guidelines. Feel free to:
- Report bugs and request features
- Submit pull requests with improvements
- Share your own integration examples
- Help improve documentation

## 📄 License

This project is licensed under the MIT License. See individual integration directories for any additional licensing information.

---

**Built with ❤️ by the Browserbase team**