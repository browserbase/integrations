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

### 🎙️ Voice & Audio

#### [**Cartesia Integration**](./examples/integrations/cartesia/README.md)

**Voice-Powered Web Automation** - Build voice-controlled agents that can fill out forms and interact with websites using natural speech. Combines Cartesia's voice AI with Browserbase's browser automation for hands-free web interactions.

**Key Features:**

- Voice-to-action web automation
- Natural language form filling
- Stagehand integration for intelligent element detection
- Workflow orchestration with Cartesia nodes
- Real-time voice processing and feedback

**Perfect for:**

- Accessibility-focused web automation
- Voice-controlled data entry
- Hands-free web form completion
- Interactive voice-driven applications

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

### 📊 Evaluation & Testing

#### [**Braintrust Integration**](./examples/integrations/braintrust/README.md)

Integrate Browserbase with Braintrust for evaluation and testing of AI agent performance in web environments. Monitor, measure, and improve your browser automation workflows.

## 🏗️ Monorepo Structure

```
integrations/
├── examples/
|   |
│   └── community/               # WIP
│   └── integrations/
│       ├── agentkit/            # AgentKit implementations
│       ├── agno/                # AI-powered web scraping agents
│       ├── braintrust/          # Evaluation and testing tools
│       ├── browser-use/         # Simplified browser automation
│       ├── cartesia/            # Voice-powered web automation
│       ├── crewai/              # CrewAI framework integration
│       ├── langchain/           # LangChain framework integration
│       ├── mastra/              # Mastra AI agent integration
│       ├── mongodb/             # MongoDB data extraction & storage
│       ├── portia/              # Portia AI multi-agent framework
│       ├── stripe/              # Stripe Issuing + automation
│       ├── temporal/            # Temporal workflow orchestration
│       ├── trigger/             # Trigger.dev background jobs & automation
│       └── vercel/              # Vercel AI SDK integration
└── README.md                    # This file
```

### Integration Organization

This repository follows clear organizational patterns to help you navigate and understand the codebase:

#### Multi-Implementation Pattern

Some integrations provide multiple implementations in different languages or approaches:

- **Stripe** - Three implementations: `node/`, `python/`, and `stagehand/`
- **MongoDB** - Two implementations: `python/` and `typescript/`
- **AgentKit** - Two variants: `browserbase/` and `stagehand/`
- **LangChain** - Two variants: `browserbase/` and `stagehand/`

#### Next.js Application Pattern

Full-stack web applications with standard Next.js structure:

- **Vercel** - `BrowseGPT/` and `vercel-puppeteer/` applications
- **Trigger.dev** - Next.js app with background job integration

#### Self-Contained Pattern

Single-directory integrations with all code in one place:

- **Agno**, **Browser-Use**, **Portia**, **Braintrust** - Single package/application

Each integration includes its own comprehensive README with setup instructions, code examples, and best practices.

## 📚 Understanding the Codebase

### Repository Overview

This is a **TypeScript/JavaScript and Python monorepo** built with modern development practices:

- **Package Manager**: PNPM with workspaces for efficient dependency management
- **Languages**: TypeScript (primary), JavaScript, Python
- **Module System**: ES Modules throughout
- **Build Tools**: TypeScript compiler, Next.js, Vite
- **Code Quality**: ESLint (flat config), Prettier, strict TypeScript settings

### Technology Stack

**AI & Browser Automation:**

- Browserbase SDK, Stagehand, Playwright, Puppeteer
- OpenAI, Anthropic, LangChain, CrewAI, AgentKit, Mastra

**Workflow & Orchestration:**

- Temporal, Trigger.dev, Inngest

**Frontend & Backend:**

- Next.js, React, Vercel AI SDK
- MongoDB, Stripe

### File and Directory Conventions

**TypeScript/JavaScript Naming:**

- Entry points: `index.ts`, `main.ts`, `demo.ts`
- Components: PascalCase (e.g., `UrlExporter.tsx`)
- Utilities: `utils.ts`, `helpers.ts`
- Configuration: `*.config.{ts,js,mjs}` (e.g., `next.config.ts`, `stagehand.config.ts`)
- API routes: `route.ts` (Next.js convention)
- Sequential steps: `1-create-cardholder.ts`, `2-create-card.ts`, etc.

**Python Naming:**

- Entry points: `main.py`
- Snake case: `create_cardholder.py`, `form_filling_node.py`
- Configuration: `config.py`

**Common Configuration Files:**

- Environment: `.env.example`, `.env.template` (templates), `.env` (local, gitignored)
- Package management: `package.json`, `requirements.txt`, `pyproject.toml`
- TypeScript: `tsconfig.json` (root + per-integration)
- Linting: `eslint.config.js` (flat config), `.prettierrc.json`
- Git: `.gitignore`

### Standard Directory Structure

Most Next.js integrations follow this pattern:

```
app/
├── api/            # API routes (route.ts files)
├── fonts/          # Font files
├── page.tsx        # Main page component
├── layout.tsx      # Layout wrapper
└── globals.css     # Global styles
components/         # React components
├── ui/            # Reusable UI components (when present)
lib/               # Utility functions
public/            # Static assets
```

Workflow-based integrations (Temporal, Trigger.dev):

```
src/
├── workflows.ts    # Workflow definitions
├── activities.ts   # Activity functions
├── worker.ts       # Worker process
└── demo.ts        # Demo/client
```

### Environment Variables

Most integrations use these standard environment variables:

```bash
# Required for most integrations
BROWSERBASE_API_KEY=        # Your Browserbase API key
BROWSERBASE_PROJECT_ID=     # Your Browserbase project ID

# AI Models (one or more required depending on integration)
OPENAI_API_KEY=            # OpenAI API key
ANTHROPIC_API_KEY=         # Anthropic API key

# Integration-specific
STRIPE_API_KEY=            # For Stripe integration
MONGO_URI=                 # For MongoDB integration
TEMPORAL_ADDRESS=          # For Temporal integration
```

Each integration includes a `.env.example` file with the specific variables needed.

### Architectural Patterns

**1. Monorepo with PNPM Workspaces**

- Centralized dependency management
- Shared tooling and configurations
- Easy cross-package references

**2. Progressive Complexity**

- Quickstart examples for beginners
- Intermediate examples (most integrations)
- Advanced tutorials with multiple files

**3. Multi-Language Support**

- TypeScript for web and Node.js applications
- Python for AI/ML-focused integrations
- Choose the language that fits your stack

**4. Environment-First Configuration**

- All sensitive data via environment variables
- No hardcoded credentials
- `.env.example` files as documentation

**5. Production-Ready Code**

- Comprehensive error handling
- Retry logic (especially in Temporal)
- Resource cleanup (browser session management)
- Data validation (Pydantic, Zod)

### Code Quality Standards

This repository maintains high code quality through:

- **Strict TypeScript** - Enabled strict mode, unused parameter detection
- **ESLint** - Modern flat config with TypeScript integration
- **Prettier** - Consistent formatting (single quotes, 2-space indent, 80 char width)
- **Type Safety** - Full type coverage in TypeScript projects
- **Schema Validation** - Pydantic (Python) and Zod (TypeScript) for runtime validation

### How to Navigate the Codebase

**For New Contributors:**

1. **Start with the integration README** - Each integration has comprehensive documentation
2. **Look for entry points** - `index.ts`, `main.py`, `page.tsx` are good starting points
3. **Check `.env.example`** - Understand what credentials and configuration are needed
4. **Review the file structure** - Most integrations follow predictable patterns
5. **Read the code comments** - Important context and explanations are included

**Common Entry Points:**

- **TypeScript**: `src/index.ts`, `app/page.tsx`, `src/demo.ts`
- **Python**: `main.py`, `simple-agent.py`
- **API Routes**: `app/api/**/route.ts`
- **Workflows**: `src/workflows.ts`, `src/trigger/*.tsx`

**Finding Functionality:**

- **Browser automation** → Look for Browserbase SDK, Playwright, or Stagehand imports
- **AI/LLM calls** → Look for OpenAI, Anthropic, or framework-specific clients
- **Data storage** → Check for MongoDB, database connections in `utils.ts`
- **API endpoints** → Next.js: `app/api/`, standalone: `src/api.ts`

### Integration Categories Quick Reference

| Category       | Integrations                                                   | Best For                                |
| -------------- | -------------------------------------------------------------- | --------------------------------------- |
| **AI Agents**  | AgentKit, Agno, Browser-Use, CrewAI, LangChain, Mastra, Portia | Building intelligent web automation     |
| **Workflow**   | Temporal, Trigger.dev                                          | Orchestration, scheduled tasks, retries |
| **Payments**   | Stripe                                                         | Automated purchasing, payment testing   |
| **Data**       | MongoDB                                                        | Web scraping with persistence           |
| **Testing**    | Braintrust                                                     | Evaluation and performance monitoring   |
| **Deployment** | Vercel                                                         | Full-stack web applications             |
| **Voice**      | Cartesia                                                       | Voice-powered automation                |

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

### Development Setup

**For TypeScript/JavaScript integrations:**

```bash
# Install PNPM if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Navigate to an integration
cd examples/integrations/[integration-name]

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Then run the integration (check package.json scripts)
pnpm dev    # or pnpm start, pnpm build, etc.
```

**For Python integrations:**

```bash
# Navigate to an integration
cd examples/integrations/[integration-name]

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Then run the integration
python main.py
```

### Common Development Commands

Most TypeScript integrations support these npm scripts:

- `pnpm dev` - Start development server (Next.js apps)
- `pnpm build` - Build for production
- `pnpm start` - Run production build or start the application
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Check TypeScript types

Check each integration's `package.json` for specific scripts available.

## 📖 Documentation

For comprehensive documentation, tutorials, and API references, visit:

**🔗 [Official Browserbase Documentation](https://docs.browserbase.com)**

## 🤝 Community & Support

### Get Help

- **📧 Email Support**: [support@browserbase.com](mailto:support@browserbase.com)
- **📚 Documentation**: [docs.browserbase.com](https://docs.browserbase.com)

### Patterns & Best Practices in This Codebase

This repository demonstrates several production-ready patterns you can learn from:

**1. Numbered Steps Pattern** (Stripe integration)

- Sequential execution: `1-create-cardholder.ts` → `2-create-card.ts` → `3-get-card.ts` → `4-make-payment.ts`
- Main orchestrator file (`index.ts`) coordinates the workflow
- Clear, linear progression through complex processes

**2. Tool-Based Architecture** (AgentKit, Mastra)

- Tools defined separately from agents for reusability
- Composable tool definitions that can be mixed and matched
- Type-safe tool interfaces with validation

**3. Config File Pattern** (Stagehand integrations)

- Dedicated `stagehand.config.ts` for framework settings
- Centralized configuration separate from application logic
- Environment-aware setup (local vs. Browserbase)

**4. Retry & Resilience Pattern** (Temporal)

- Granular retry policies per activity
- Exponential backoff strategies
- Durable execution that survives crashes

**5. Schema-First Data Extraction** (MongoDB Python)

- Pydantic models define expected data structure
- Type-safe extraction with validation
- Clear data contracts between scraping and storage

**6. Component Library Pattern** (Vercel BrowseGPT)

- Dedicated `components/ui/` for reusable UI elements
- Separation of UI components from business logic
- Shadcn/ui-inspired organization

**7. Multi-Step Workflow Pattern** (Trigger.dev)

- Parent-child task hierarchies
- Batch processing capabilities
- Complex orchestration with checkpoints

**8. Session Management Pattern** (Multiple integrations)

- Automatic browser session cleanup
- Timeout handling
- Resource pooling and reuse

### Contributing

We welcome contributions! Each integration has its own contribution guidelines. Feel free to:

- Report bugs and request features
- Submit pull requests with improvements
- Share your own integration examples
- Help improve documentation

**When contributing:**

1. Follow the existing code style (ESLint and Prettier configurations)
2. Add/update tests where applicable
3. Update documentation to reflect your changes
4. Ensure all environment variables are documented in `.env.example`
5. Follow TypeScript strict mode requirements
6. Include error handling and logging

## 📄 License

This project is licensed under the MIT License. See individual integration directories for any additional licensing information.

---

**Built with ❤️ by the Browserbase team**
