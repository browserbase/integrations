<div align="center">

# 🌐 Browserbase Integrations

### Production-Ready Integrations for AI-Powered Web Automation

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.9.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![Documentation](https://img.shields.io/badge/docs-browserbase.com-purple.svg)](https://docs.browserbase.com)

**Transform your AI agents and automation workflows with reliable, scalable browser infrastructure.**

[🚀 Get Started](#-getting-started) • [📚 Documentation](https://docs.browserbase.com) • [🔧 Integrations](#-available-integrations) • [💬 Support](#-community--support)

</div>

---

## 🎯 About This Repository

Welcome to the **official Browserbase integrations monorepo** — your one-stop resource for integrating powerful headless browser capabilities into your favorite frameworks and platforms. Whether you're building AI agents, web scrapers, automation workflows, or data pipelines, you'll find production-ready examples and comprehensive guides to accelerate your development.

This repository contains **15+ officially maintained integrations** spanning:

- 🤖 **AI Agent Frameworks** (CrewAI, AgentKit, LangChain, Mastra, Agno, Browser-Use, Portia AI, Temporal)
- 🏗️ **Development Platforms** (Vercel AI, Trigger.dev)
- 💳 **E-commerce & Payments** (Stripe Issuing)
- 📊 **Data & Analytics** (MongoDB)
- 🧪 **Evaluation & Testing** (Braintrust)

Each integration includes complete setup instructions, working code examples, best practices, and troubleshooting guides.

---

## 🚀 What is Browserbase?

[**Browserbase**](https://browserbase.com) is the headless browser infrastructure designed specifically for AI agents and web automation at scale. Built to solve the challenges of modern web automation, Browserbase provides:

| Feature                      | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| 🔄 **Auto-Scaling Sessions** | Browser sessions that scale automatically to meet demand |
| 🛡️ **Anti-Detection**        | Advanced stealth technology to bypass bot protection     |
| 📹 **Visual Debugging**      | Session recordings, screenshots, and live debugging      |
| 🌍 **Global Infrastructure** | Low-latency access from anywhere in the world            |
| ⚡ **Reliable Execution**    | Production-grade reliability for mission-critical tasks  |
| 🤖 **AI-Optimized**          | Purpose-built for AI agent workflows and automation      |

Browserbase removes the complexity of managing browser infrastructure so you can focus on building amazing products.

## 🔧 Available Integrations

Explore our comprehensive collection of integrations organized by use case. Each integration includes complete documentation, working examples, and best practices.

---

### 🤖 AI Agent Frameworks

Build intelligent agents that can browse, extract, and interact with the web autonomously.

<table>
<tr>
<td width="50%">

#### [**CrewAI**](./examples/integrations/crewai/)

Enable CrewAI agent crews to browse the web with the `BrowserbaseLoadTool`.

**Perfect for:**

- Multi-agent web research tasks
- Real-time data gathering
- JavaScript-heavy site extraction
- Visual content capture

**Variants:** Quickstart, Tutorial, Stagehand

</td>
<td width="50%">

#### [**AgentKit**](./examples/integrations/agentkit/)

Integrate Browserbase into AgentKit workflows for autonomous web browsing.

**Perfect for:**

- Inngest workflow automation
- Event-driven web tasks
- Scalable agent orchestration

**Variants:** [Browserbase](./examples/integrations/agentkit/browserbase/) • [Stagehand](./examples/integrations/agentkit/stagehand/)

</td>
</tr>
<tr>
<td>

#### [**LangChain**](./examples/integrations/langchain/)

Connect LangChain's AI ecosystem with real-world web browsing capabilities.

**Perfect for:**

- LLM-powered web agents
- Complex chain workflows
- Document retrieval from web

**Variants:** [Browserbase](./examples/integrations/langchain/browserbase/) • [Stagehand](./examples/integrations/langchain/stagehand/)

</td>
<td>

#### [**Mastra**](./examples/integrations/mastra/)

AI-powered web automation with natural language commands.

**Perfect for:**

- Natural language web navigation
- Smart data extraction
- OpenAI-driven automation
- Session-based workflows

</td>
</tr>
<tr>
<td>

#### [**Agno**](./examples/integrations/agno/)

Natural language web scraping with AI agents that adapt to page changes.

**Perfect for:**

- Market research automation
- Content monitoring
- Visual analysis
- Structured data extraction

</td>
<td>

#### [**Browser-Use**](./examples/integrations/browser-use/)

Simplified browser automation SDK for AI applications.

**Perfect for:**

- Quick prototyping
- Streamlined workflows
- Reliable automation

</td>
</tr>
<tr>
<td>

#### [**Portia AI**](./examples/integrations/portia/)

Multi-agent framework with persistent authentication and human-in-the-loop control.

**Perfect for:**

- LinkedIn automation
- Authenticated e-commerce tasks
- Dashboard data extraction
- Multi-user agent systems

**Features:** Persistent sessions, human feedback, multi-user support

</td>
<td>

#### [**Temporal**](./examples/integrations/temporal/)

Resilient browser automation with durable execution and automatic recovery.

**Perfect for:**

- Mission-critical tasks
- Long-running workflows
- Fault-tolerant automation
- Guaranteed completion

**Features:** Auto-retry, crash recovery, visual monitoring

</td>
</tr>
<tr>
<td colspan="2">

#### [**Cartesia**](./examples/integrations/cartesia/)

Voice agent integration with real-time web form filling capabilities.

**Perfect for:**

- Voice-to-form automation
- Real-time conversational UI
- Async web interactions
- Gemini API integration

**Tech Stack:** Cartesia Line, Stagehand, Gemini API, Python

</td>
</tr>
</table>

---

### 🏗️ Development & Deployment Platforms

Deploy browser automation at scale with modern development platforms.

<table>
<tr>
<td width="50%">

#### [**Vercel AI SDK**](./examples/integrations/vercel/)

Build Generative UIs with real-time web browsing capabilities.

**Examples:**

- **[BrowseGPT](./examples/integrations/vercel/BrowseGPT/)** - Chat interface with live web search
- **[Vercel + Puppeteer](./examples/integrations/vercel/vercel-puppeteer/)** - Server-side automation on Fluid Compute

**Perfect for:**

- AI-powered chat applications
- Real-time data integration
- Dynamic user experiences
- Serverless browser automation

</td>
<td width="50%">

#### [**Trigger.dev**](./examples/integrations/trigger/)

Background jobs and workflow orchestration for web automation.

**Perfect for:**

- Scheduled web scraping
- PDF processing pipelines
- AI content workflows
- Task hierarchies
- Production reliability

**Features:** Cron scheduling, retries, observability, batch processing

</td>
</tr>
</table>

---

### 💳 E-commerce & Payments

Automate online commerce with virtual payment capabilities.

<table>
<tr>
<td>

#### [**Stripe Issuing**](./examples/integrations/stripe/)

Agentic credit card automation with virtual cards and programmatic purchases.

**Perfect for:**

- AI shopping agents
- Payment flow testing
- Programmatic commerce
- Automated purchasing

**Variants:** [Node.js](./examples/integrations/stripe/node/) • [Python](./examples/integrations/stripe/python/) • [Stagehand](./examples/integrations/stripe/stagehand/)

**Features:** Virtual cards, spending controls, secure automation

</td>
</tr>
</table>

---

### 📊 Data Storage & Analysis

Extract, transform, and store web data at scale.

<table>
<tr>
<td>

#### [**MongoDB**](./examples/integrations/mongodb/)

Intelligent web scraping with structured data storage and analysis.

**Perfect for:**

- E-commerce data pipelines
- Market research
- Competitive analysis
- Vector search integration
- Real-time stream processing

**Variants:** [Python](./examples/integrations/mongodb/python/) • [TypeScript](./examples/integrations/mongodb/typescript/)

**Features:** Schema validation (Pydantic/Zod), AI extraction, data analysis

</td>
</tr>
</table>

---

### 🧪 Evaluation & Testing

Monitor and improve your AI agent performance.

<table>
<tr>
<td>

#### [**Braintrust**](./examples/integrations/braintrust/)

Evaluate and test AI agent performance in web automation workflows.

**Perfect for:**

- LLM prototyping
- Performance monitoring
- Agent improvement
- Tool calling evaluation

**Features:** API & SDK implementations, comprehensive metrics

</td>
</tr>
</table>

---

## 📁 Repository Structure

```
browserbase-integrations/
├── .github/
│   └── workflows/           # CI/CD pipelines
├── examples/
│   ├── community/           # Community contributions (WIP)
│   └── integrations/
│       ├── agentkit/        # AgentKit implementations
│       ├── agno/            # AI-powered scraping agents
│       ├── braintrust/      # Evaluation & testing
│       ├── browser-use/     # Simplified automation
│       ├── cartesia/        # Voice agent integration
│       ├── crewai/          # CrewAI framework
│       ├── langchain/       # LangChain integration
│       ├── mastra/          # Mastra AI agents
│       ├── mongodb/         # Data extraction & storage
│       ├── portia/          # Multi-agent framework
│       ├── stripe/          # Payment automation
│       ├── temporal/        # Workflow orchestration
│       ├── trigger/         # Background jobs
│       └── vercel/          # Vercel AI SDK
├── package.json             # Monorepo configuration
├── pnpm-workspace.yaml      # Workspace definition
├── tsconfig.json            # TypeScript config
├── eslint.config.js         # Linting rules
├── .prettierrc.json         # Code formatting
└── README.md                # You are here
```

---

## 🚀 Getting Started

### Quick Start

1️⃣ **Create a Browserbase Account**

```bash
# Sign up at https://browserbase.com
# Get your API key from the dashboard
```

2️⃣ **Choose Your Integration**

- Browse the [integrations above](#-available-integrations)
- Select based on your framework or use case
- Navigate to the integration directory

3️⃣ **Follow the Setup Guide**

- Each integration has a comprehensive README
- Install dependencies (Node.js or Python)
- Configure environment variables
- Run the example code

4️⃣ **Explore and Customize**

- Review working code samples
- Adapt to your specific needs
- Deploy to production

### What's Included

Each integration provides:

| Component                     | Description                          |
| ----------------------------- | ------------------------------------ |
| 📖 **Complete Documentation** | Step-by-step setup and usage guides  |
| ⚙️ **Environment Setup**      | Configuration templates and examples |
| 💻 **Working Examples**       | Production-ready code samples        |
| 🎯 **Best Practices**         | Performance tips and recommendations |
| 🔧 **Troubleshooting**        | Common issues and solutions          |

### Prerequisites

Most integrations require:

- ✅ [**Browserbase Account**](https://browserbase.com) — Sign up for free and get your API key
- ✅ **Runtime Environment** — Node.js 18+ or Python 3.8+ (check specific integration)
- ✅ **Package Manager** — npm/pnpm/yarn for Node.js or pip for Python
- ✅ **Framework Dependencies** — Detailed in each integration's README

### Monorepo Development

This repository uses **pnpm workspaces** for managing multiple packages:

```bash
# Install all dependencies
pnpm install

# Run all integrations in dev mode
pnpm dev

# Build all TypeScript integrations
pnpm build

# Lint all code
pnpm lint

# Format all code
pnpm format

# Type check all TypeScript code
pnpm typecheck
```

---

## 📖 Documentation & Resources

### Official Documentation

- 📚 **[Browserbase Docs](https://docs.browserbase.com)** — Comprehensive guides and API references
- 🎓 **[Tutorials](https://docs.browserbase.com/tutorials)** — Step-by-step learning resources
- 🔍 **[API Reference](https://docs.browserbase.com/api-reference)** — Complete API documentation
- 🎥 **[Video Guides](https://browserbase.com/videos)** — Visual tutorials and demos

### Helpful Links

- 🌐 **[Browserbase Homepage](https://browserbase.com)** — Learn about the platform
- 💬 **[Community Discord](https://discord.gg/browserbase)** — Connect with other developers
- 📰 **[Blog](https://browserbase.com/blog)** — Latest updates and use cases
- 🐦 **[Twitter](https://twitter.com/browserbase)** — Follow for announcements

---

## 🤝 Community & Support

### Need Help?

We're here to support you:

- 📧 **Email Support** — [support@browserbase.com](mailto:support@browserbase.com)
- 💬 **Discord Community** — Join our [Discord server](https://discord.gg/browserbase) for discussions
- 📚 **Documentation** — Check our [comprehensive docs](https://docs.browserbase.com)
- 🐛 **Bug Reports** — Open an issue in this repository
- 💡 **Feature Requests** — Share your ideas via GitHub Issues

### Contributing

We welcome contributions from the community! Here's how you can help:

#### 🔧 Code Contributions

- 🐛 **Fix bugs** — Submit pull requests for bug fixes
- ✨ **Add features** — Enhance existing integrations
- 📝 **Improve docs** — Help make documentation clearer
- 🧪 **Add tests** — Increase code coverage and reliability

#### 💡 Share Your Work

- 🌟 **Community integrations** — Build integrations for new frameworks
- 📖 **Write tutorials** — Share your learning experiences
- 🎥 **Create videos** — Show others how to use Browserbase
- 💬 **Answer questions** — Help others in Discord or GitHub

#### Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-integration`)
3. Make your changes with clear commit messages
4. Test your changes thoroughly
5. Submit a pull request with a detailed description

For major changes, please open an issue first to discuss your ideas.

---

## 🗺️ Roadmap

We're constantly expanding our integration ecosystem. Upcoming integrations:

- 🔄 **More AI frameworks** — Additional agent platforms and tools
- 🌐 **Cloud platforms** — AWS Lambda, Google Cloud Functions, Azure
- 📊 **Data platforms** — More databases and analytics tools
- 🧪 **Testing frameworks** — Playwright, Puppeteer, Selenium integrations
- 🤖 **Voice & vision** — More multimodal AI integrations

Have a suggestion? [Open an issue](https://github.com/browserbase/integrations/issues/new) or join our [Discord](https://discord.gg/browserbase)!

---

## 📊 Integration Stats

| Category                 | Count   | Languages             |
| ------------------------ | ------- | --------------------- |
| 🤖 AI Agent Frameworks   | 8       | Python, TypeScript    |
| 🏗️ Development Platforms | 2       | TypeScript            |
| 💳 E-commerce & Payments | 1       | Python, TypeScript    |
| 📊 Data & Analytics      | 1       | Python, TypeScript    |
| 🧪 Evaluation & Testing  | 1       | TypeScript            |
| **Total Integrations**   | **15+** | **Multiple variants** |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Individual integrations may have additional licensing requirements. Please check each integration's directory for specific information.

---

## 🙏 Acknowledgments

Built with care by the **Browserbase team** and our amazing community contributors.

Special thanks to all the framework and platform maintainers who make these integrations possible.

---

<div align="center">

**[⬆ Back to Top](#-browserbase-integrations)**

Made with ❤️ by [Browserbase](https://browserbase.com)

[Get Started](https://browserbase.com) • [Documentation](https://docs.browserbase.com) • [Discord](https://discord.gg/browserbase) • [Twitter](https://twitter.com/browserbase)

</div>
