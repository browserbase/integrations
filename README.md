<div align="center">

# Browserbase Integrations

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A comprehensive monorepo of production-ready integrations for Browserbase - the headless browser infrastructure for AI agents and web automation.**

[Documentation](https://docs.browserbase.com) • [Get API Key](https://www.browserbase.com) • [Support](mailto:support@browserbase.com)

</div>

---

## 🎯 Why Browserbase Integrations?

Building AI agents and web automation solutions shouldn't require wrestling with browser infrastructure. This repository provides **battle-tested integrations** that combine Browserbase's powerful headless browser platform with your favorite frameworks and tools—so you can focus on building features, not managing browsers.

Whether you're building an AI agent that needs to browse the web, automating complex workflows, or extracting data from modern JavaScript-heavy websites, these integrations provide the foundation you need to succeed.

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

#### [**Agno Integration**](./examples/integrations/agno/README.md)

**Intelligent Web Scraping with AI Agents** - Natural language web scraping using Agno's AI agents powered by Browserbase's cloud browser infrastructure. Perfect for complex data extraction, market research, and automated content monitoring.

**Key Features:**

- Natural language scraping instructions
- AI agents that adapt to page changes
- Visual analysis and screenshot capabilities
- Structured data extraction (JSON, CSV)
- Automatic error recovery and retries

#### [**LangChain Integration**](./examples/integrations/langchain/README.md)

Integrate Browserbase with LangChain's ecosystem for advanced AI applications. Build chains that can browse, extract, and interact with web content as part of larger AI workflows.

#### [**Mastra Integration**](./examples/integrations/mastra/README.md)

Powerful web automation combining Browserbase's Stagehand with Mastra's AI agent framework. Enable your Mastra agents to navigate websites, extract data, and perform complex web interactions through natural language commands.

**Key Features:**

- AI-powered web navigation and interaction
- Smart element observation and data extraction
- Session management with automatic timeouts
- Natural language interface to web automation
- Integration with OpenAI models for intelligent decision-making

#### [**Browser-Use Integration**](./examples/integrations/browser-use/README.md)

Streamlined browser automation for AI applications with a focus on simplicity and reliability.

#### [**Temporal Integration**](./examples/integrations/temporal/README.md)

**Resilient Browser Automation with Workflow Orchestration** - Build fault-tolerant web automation that automatically recovers from failures using Temporal's durable execution engine. Perfect for mission-critical browser tasks that need guaranteed completion.

**Key Features:**

- Automatic retry logic with exponential backoff
- Durable execution that survives crashes and restarts
- Visual workflow monitoring and debugging
- Clean separation of business logic from retry concerns
- Production-ready error handling and recovery

#### [**Portia AI Integration**](./examples/integrations/portia/README.md)

Build intelligent web agents with **persistent authentication** using Portia AI's multi-agent framework. Portia enables both multi-agent task planning with human feedback and stateful multi-agent task execution with human control.

**Key Features:**

- **Persistent Authentication** - Agents can authenticate once and reuse sessions
- **Human-in-the-Loop** - Structured clarification system for authentication requests
- **Multi-User Support** - Isolated browser sessions per end user
- **Production-Ready** - Open-source framework designed for reliable agent deployment

**Perfect for:**

- LinkedIn automation with user authentication
- E-commerce agents that need to log into shopping sites
- Data extraction from authenticated dashboards
- Any web task requiring persistent user sessions

### 🏗️ Development & Deployment Platforms

#### [**Vercel AI Integration**](./examples/integrations/vercel/README.md)

Enhance your Vercel applications with web-browsing capabilities. Build Generative User Interfaces that can access real-time web data and create dynamic, AI-powered experiences.

**Examples Include:**

- **BrowseGPT** - A chat interface with real-time web search capabilities
- **Vercel + Puppeteer** - Server-side browser automation on Fluid Compute

#### [**Trigger.dev Integration**](./examples/integrations/trigger/README.md)

**Background Jobs & Web Automation** - Build robust background task workflows with Trigger.dev's job orchestration platform. Combine Browserbase's web automation capabilities with scheduled tasks, retry logic, and complex multi-step workflows.

**Key Features:**

- **Scheduled Web Scraping** - Automated data collection with cron-based scheduling
- **PDF Processing Pipelines** - Convert documents and upload to cloud storage
- **AI-Powered Content Workflows** - Scrape, summarize, and distribute content via email
- **Task Hierarchies** - Complex parent-child job relationships with batch processing
- **Production-Grade Reliability** - Built-in retries, error handling, and observability

**Perfect for:**

- Automated market research and competitive analysis
- Document processing and content generation workflows
- Scheduled reporting and email automation
- Complex web automation pipelines that require orchestration

### 💳 E-commerce & Payments

#### [**Stripe Integration**](./examples/integrations/stripe/README.md)

**Agentic Credit Card Automation** - Create virtual cards with Stripe Issuing and automate online purchases with Browserbase. Perfect for programmatic commerce, testing payment flows, and building AI shopping agents.

**Capabilities:**

- Create virtual cards with spending controls
- Automate secure online purchases
- Available in Node.js, Python, and Stagehand implementations
- Production-ready with comprehensive examples

### 📊 Data Storage, Searching and Analysis

#### [**MongoDB Integration**](./examples/integrations/mongodb/README.md)

**Intelligent Web Scraping & Data Storage** - Extract semi-structured data from e-commerce websites using Stagehand and store it in MongoDB for analysis. Perfect for building data pipelines, market research, and competitive analysis workflows.

**Capabilities:**

- Document-based model and advanced features like Vector Search and Real-Time Stream Processing make it the perfect foundation for advanced search and data pipelines
- AI-powered web scraping with Stagehand
- Structured data extraction with schema validation
- MongoDB storage for persistence and querying
- Built-in data analysis and reporting
- Robust error handling for production use

### 🎙️ Voice & Real-Time Interactions

#### [**Cartesia Integration**](./examples/integrations/cartesia/README.md)

**Voice Agent with Real-Time Web Form Filling** - Build conversational voice agents that can fill out web forms in real-time as users speak. Perfect for voice-driven data entry, customer onboarding, and automated form submission workflows.

**Key Features:**

- Voice conversations using Cartesia Line
- Real-time form filling as answers are collected
- AI-powered field mapping and validation
- Asynchronous processing for smooth conversations
- Auto-submission when form is complete
- Screenshot capture for debugging and verification

**Perfect for:**

- Voice-driven customer onboarding
- Automated phone surveys with web integration
- Hands-free data entry applications
- Accessibility-focused form filling

### 📊 Evaluation & Testing

#### [**Braintrust Integration**](./examples/integrations/braintrust/README.md)

Integrate Browserbase with Braintrust for evaluation and testing of AI agent performance in web environments. Monitor, measure, and improve your browser automation workflows.

## 🏗️ Monorepo Structure

```
integrations/
├── examples/
│   ├── community/               # WIP - Community contributions welcome
│   └── integrations/
│       ├── agentkit/            # AgentKit implementations (browserbase + stagehand)
│       ├── agno/                # AI-powered web scraping agents
│       ├── braintrust/          # Evaluation and testing tools
│       ├── browser-use/         # Simplified browser automation
│       ├── cartesia/            # Voice agent with real-time form filling
│       ├── crewai/              # CrewAI framework integration (3 variants)
│       ├── langchain/           # LangChain framework integration (2 variants)
│       ├── mastra/              # Mastra AI agent integration
│       ├── mongodb/             # MongoDB data extraction & storage
│       ├── portia/              # Portia AI multi-agent framework
│       ├── stripe/              # Stripe Issuing + automation (3 variants)
│       ├── temporal/            # Temporal workflow orchestration
│       ├── trigger/             # Trigger.dev background jobs (8 examples)
│       └── vercel/              # Vercel AI SDK integration (2 examples)
└── README.md                    # This file
```

## 🚀 Quick Start

### 1️⃣ Get Your API Key

Sign up for a [Browserbase account](https://www.browserbase.com) and grab your API key from the dashboard.

### 2️⃣ Choose Your Integration

Browse the [Available Integrations](#-available-integrations) section and pick the one that matches your stack:

- **Building AI agents?** → Try [CrewAI](#-crewai-integration), [LangChain](#-langchain-integration), or [Mastra](#-mastra-integration)
- **Need web scraping?** → Check out [Agno](#-agno-integration) or [MongoDB](#-mongodb-integration)
- **Background jobs?** → Explore [Trigger.dev](#-triggerdev-integration) or [Temporal](#-temporal-integration)
- **E-commerce automation?** → See [Stripe](#-stripe-integration)
- **Voice interactions?** → Try [Cartesia](#-cartesia-integration)

### 3️⃣ Run Your First Example

Each integration includes ready-to-run examples:

```bash
# Navigate to your chosen integration
cd examples/integrations/<integration-name>

# Install dependencies
npm install  # or: pip install -r requirements.txt

# Set up your environment variables
cp .env.example .env
# Add your BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID

# Run the example
npm run dev  # or: python main.py
```

### 4️⃣ Customize and Build

Each integration includes:

- ✅ Complete setup instructions
- ✅ Environment configuration guides
- ✅ Multiple working code examples
- ✅ Best practices and production tips
- ✅ Troubleshooting guides

Dive into the integration's README for detailed documentation and advanced usage patterns.

## 🔧 Prerequisites

Most integrations require:

- A [Browserbase account](https://browserbase.com) and API key
- Node.js 18+ or Python 3.8+ (depending on implementation)
- Framework-specific dependencies (detailed in each integration)

## 💡 What's Stagehand?

You'll notice **Stagehand** featured prominently throughout these integrations. [Stagehand](https://docs.stagehand.dev) is Browserbase's open-source AI-powered browser automation SDK that makes web automation feel like magic:

- **Natural language interactions** - Tell your browser what to do in plain English
- **Core primitives**: `act()`, `extract()`, `observe()`, `navigate()`
- **Built on Playwright** with intelligent DOM interactions
- **Works locally or in the cloud** with Browserbase

Stagehand is featured in 8+ integrations across this repository, powering everything from AI agents to voice-driven form filling.

## 📖 Documentation & Resources

### Official Documentation

- **🔗 [Browserbase Docs](https://docs.browserbase.com)** - Complete API reference and guides
- **🔗 [Stagehand Docs](https://docs.stagehand.dev)** - AI automation SDK documentation
- **🔗 [API Reference](https://docs.browserbase.com/api-reference)** - REST API documentation

### Learning Resources

- **📚 [Integration Guides](./examples/integrations/)** - Step-by-step tutorials for each integration
- **🎥 [Video Tutorials](https://www.youtube.com/@browserbase)** - Watch and learn
- **💬 [Stagehand Community Slack](https://stagehand.dev/slack)** - Get help from the community

## 🤝 Community & Support

### Get Help

- **📧 Email Support**: [support@browserbase.com](mailto:support@browserbase.com)
- **📚 Documentation**: [docs.browserbase.com](https://docs.browserbase.com)
- **💬 Stagehand Slack**: [Join the community](https://stagehand.dev/slack)
- **🐛 Issues**: [Report bugs or request features](https://github.com/browserbase/integrations/issues)

### Contributing

We ❤️ contributions! Whether you're:

- 🐛 Reporting bugs or requesting features
- 🔧 Submitting pull requests with improvements
- 📝 Adding new integration examples
- 📖 Improving documentation
- 💡 Sharing use cases and ideas

Check out each integration's README for specific contribution guidelines, or reach out to us directly.

## 🌟 Featured Use Cases

Here's what teams are building with Browserbase integrations:

- **🤖 AI Research Agents** - Autonomous agents that browse the web, extract insights, and compile reports
- **📊 Competitive Intelligence** - Automated monitoring of competitor websites and pricing
- **🛒 E-commerce Automation** - Price tracking, inventory monitoring, and automated purchasing
- **✅ QA & Testing** - End-to-end browser testing with AI-powered validation
- **📧 Lead Generation** - Extract contact information and company data from websites
- **📱 Social Media Automation** - Automated posting, monitoring, and engagement
- **🎙️ Voice-Driven Forms** - Conversational interfaces for data entry and onboarding
- **💳 Payment Testing** - Automated payment flow testing with virtual cards

## 🔄 Monorepo Management

This repository uses **pnpm workspaces** for efficient dependency management:

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint all code
pnpm lint

# Format all code
pnpm format
```

Each integration is a separate workspace package and can be developed independently.

## 📊 Integration Overview

| Category          | Integration                                         | Languages          | Key Features                            |
| ----------------- | --------------------------------------------------- | ------------------ | --------------------------------------- |
| 🤖 **AI Agents**  | [AgentKit](./examples/integrations/agentkit/)       | TypeScript         | Browserbase + Stagehand implementations |
| 🤖 **AI Agents**  | [Agno](./examples/integrations/agno/)               | Python             | Natural language scraping               |
| 🤖 **AI Agents**  | [Browser-Use](./examples/integrations/browser-use/) | Python             | Screenshot-based automation             |
| 🤖 **AI Agents**  | [CrewAI](./examples/integrations/crewai/)           | Python             | BrowserbaseLoadTool, 3 variants         |
| 🤖 **AI Agents**  | [LangChain](./examples/integrations/langchain/)     | Python, TypeScript | LangGraph integration, 2 variants       |
| 🤖 **AI Agents**  | [Mastra](./examples/integrations/mastra/)           | TypeScript         | Session management with Stagehand       |
| 🤖 **AI Agents**  | [Portia](./examples/integrations/portia/)           | Python             | Persistent authentication               |
| 🤖 **AI Agents**  | [Temporal](./examples/integrations/temporal/)       | TypeScript         | Workflow orchestration, auto-retry      |
| 🏗️ **Platforms**  | [Vercel](./examples/integrations/vercel/)           | TypeScript         | BrowseGPT, Fluid Compute                |
| 🏗️ **Platforms**  | [Trigger.dev](./examples/integrations/trigger/)     | TypeScript         | Background jobs, 8 examples             |
| 💳 **E-commerce** | [Stripe](./examples/integrations/stripe/)           | TypeScript, Python | Virtual cards, 3 implementations        |
| 📊 **Data**       | [MongoDB](./examples/integrations/mongodb/)         | TypeScript, Python | Web scraping + storage                  |
| 🎙️ **Voice**      | [Cartesia](./examples/integrations/cartesia/)       | Python             | Voice agent with form filling           |
| 📊 **Testing**    | [Braintrust](./examples/integrations/braintrust/)   | TypeScript         | Evaluation and monitoring               |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Individual integrations may have additional licensing information in their respective directories.

---

<div align="center">

**Built with ❤️ by the [Browserbase](https://www.browserbase.com) team**

[Get Started](https://www.browserbase.com) • [Documentation](https://docs.browserbase.com) • [Support](mailto:support@browserbase.com)

</div>
