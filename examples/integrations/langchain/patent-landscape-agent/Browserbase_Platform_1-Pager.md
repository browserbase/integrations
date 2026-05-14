# Browserbase Platform 1 Pager (shareable version)

<aside>
🔒

**This is an internal-only document.**

</aside>

- Table of contents

## What is the Browserbase Platform?

Browserbase is the complete platform to build and deploy agents that browse and interact with the web like humans:

- **Browsers:** give agents complete control over fleets of headless browsers to interact with websites
- [**Fetch and Search APIs**](https://www.notion.so/Fetch-API-Search-API-Sales-Enablement-7e92ce90bb9349c5b03f70f9ca9c4d07?pvs=21): agents can quickly search and fetch LLM context from the web for quick and token-efficient decisions
- [**Agent Identity](https://www.notion.so/Showing-up-on-the-web-with-agent-identity-32f3c11b6614808ba0a4e0923b492613?pvs=21):** enable agents to access any website with a combination of strategic partnerships (*ex: Cloudflare*) and a dedicated stealth research team
- [**Functions**](https://www.notion.so/Browser-Functions-Sales-Enablement-2fe3c11b6614803f93c1eb6cc4da7146?pvs=21): deploy and run agents on Browserbase for faster & more secure execution
- [**Model Gateway**](https://www.notion.so/Model-Gateway-1-Pager-2ea3c11b66148024b26df7099ebedae3?pvs=21): your Browserbase API key gives access to major models via Stagehand and unified billing.

![Graphic.png](Browserbase%20Platform%201%20Pager%20(shareable%20version)/Graphic.png)

All the above, powered by Browserbase’s best-in-class observability with rich logs, live view and replay and its scalable and secure infrastructure layer running 35m+ monthly browser sessions across 10,000 customers, including Ramp, Shopify and Lovable.

## Why this matters

### **Market context**

AI agents are everywhere. Coding agents, assistants, support bots, deep research tools. All of them need web access, and the market has responded by creating higher-level primitives beyond headless browsers: search APIs (Parallel, Exa), fetch and crawl APIs (Firecrawl, Cloudflare). These are faster and cheaper than a full browser session for simple read-only use cases.
This is an expansion of the market, not a shrinking of it. More agents accessing the web means more demand across every layer: search, fetch, and browsers. But it also means customers now expect a complete toolkit, not just one primitive. The teams building browser agents today are stitching together 5+ vendors (search, fetch, browsers, models, deployment) before writing a single prompt.
Browserbase has already won the browser layer. The platform move **extends that position** into the adjacent primitives our customers are already buying from other vendors, **under one API key, with the browser at the center**.

### The problems

#### **Problems that we already solve with headless browsers**

- **Agents fail because the web wasn't built for AI**: agents accessing the web face blocked requests, CAPTCHA walls, and anti-bot detection at every turn. Most websites return huge blobs of HTML that are expensive to parse and hard to reason about.
- **Legacy automation frameworks are brittle and require time and headcount to build and maintain**: traditional tools like Selenium and Puppeteer scripts break constantly when websites change. Teams end up maintaining a whole stack of app servers, queues, retries, schedulers, and browser infrastructure.
- **Most agents are slow and expensive**: browser agents repeat the same work over and over, extracting data from similar websites and burning through tokens. Scripts on similar pages don't share cached results, and every new script starts from scratch with no shared knowledge across runs.
- **Self-hosting browser infrastructure is a trap**: high round-trip latency kills performance, scaling means paying separately for compute and browser infra, and teams end up managing 10-15 providers across observability, networking, storage, orchestration, and deployment. Running browsers one at a time creates bottlenecks at scale, and poor visibility makes issues hard to debug.

#### **Problems that our Platform offering addresses**

- **Your AI Agent stack is 5+ vendors before you write a single prompt**: the AI Agent stack market is fragmented and customers need to bundle multiple vendors.
    
    ![If you have to zoom in on the market map, it’s a fragmented market. ](Browserbase%20Platform%201%20Pager%20(shareable%20version)/image.png)
    
    If you have to zoom in on the market map, it’s a fragmented market. 
    
- **APIs see 15% of the web. Agents need the other 85%**: As more agents get access to the web through web search, gaining access to private or complex websites becomes a strong moat than ever (*ex: Ramp's agent*)

### The (unified) solution

One API key, everything your agent needs to browse the web:

- **Browsers that work where APIs can't**: programmatic access to fleets of headless browsers at scale. Spin up as many concurrent sessions as your agents need, with globally distributed infrastructure, 2 vCPUs per browser, isolated sessions, and SOC-2 Type II compliance. Browsers are the core of the platform.
- **One platform, one vendor**: Browsers, Search, Fetch, Functions, Model Gateway (one API key, every model, zero friction), and Agent Identity under a single account. One bill, one place to debug (*rich logs, live view, and session replay across every step*), fewer integrations to maintain.
- **Unrestricted access to the web**: Agent Identity is a global passport for your agents. Strategic partnerships (*Cloudflare, Stytch, Fingerprint, Vercel*) and secure credential management (*1Password*) get agents past anti-bot systems, CAPTCHAs, and authentication walls.
- **Deploy instantly, zero infrastructure**: Functions run your code next to the browser with <5ms latency. No Temporal, no job schedulers, no headaches. Just `bb function deploy` and you're live, with built-in observability (session recordings, logs, metrics in one place).
- **Stagehand, the SDK for browser agents**: Stagehand replaces rigid selector with natural language browser interactions that self-heal when pages change. Its automatic action caching eliminates redundant LLM calls across runs (*up to 2x faster, ~30% cost reduction on repeated actions*).

### The opportunity

- **Be the first mover at solving the ["impossible triangles of AI Web Infra"](https://youtu.be/XwNQvOxJ0IU?t=164):**  define and lead the browser agent platform category.
    
    
- **Double down into the maturing market of (browser) agents:** more use cases and more winning arguments for our sales team (*ex: vendor bundling*).
- **APIs are high-margin products**: enabling us to lower the price of our browsers offering over time and compete aggressively on browser pricing where needed.

## How to write/talk about Browserbase

**Dos**

- **Use "Browser Agent"** or "Agent … the web." instead of "Web Agent"
[**“Browser Agent”**: A browser agent is an AI system (agent) that can autonomously navigate and interact with web browsers much like a human user would, but directed by natural language instructions. Essentially, it bridges the gap between an AI's reasoning capabilities and the visual, interactive world of the web.](https://www.notion.so/Browser-Agent-A-browser-agent-is-an-AI-system-agent-that-can-autonomously-navigate-and-interact--35e3c11b66148013983ffc34f5ce1c5a?pvs=21)
- **Replace "AI" with "Agents"** in most external copy.
Works for high-level positioning and vision. Keep "AI" or "automation" wording in deeper-dive sales materials and case studies where the customer uses that language.
    - Same for **"Agentic workflows" → "Agents"** (*simpler, more direct*)
- When listing our platform primitives, **always put browsers first**.

**Don’ts**

- "**Serverless** browsers" → "Headless browsers"
- "Browser **automation** framework" (for Stagehand) → "SDK for browser agents"
- **“Stealth”** → "Agent Identity" (we're moving from sneaky/undetected to upfront/credential-first)
- **No direct reference to automation or scraping** in public positioning. Paul is hesitant about "scraping" anywhere in positioning. Don't lead with "best search or fetch API" either, that's easy to disprove.
- Don't lead with Search or Fetch as standalone products. They're side dishes, the browser is the draw.
- Don't position around benchmarks we can't defend ("best search API," "fastest fetch")

## Appendixes

### Glossary

- **“Browser Agent”**: A browser agent is an AI system (agent) that can autonomously navigate and interact with web browsers much like a human user would, but directed by natural language instructions. Essentially, it bridges the gap between an AI's reasoning capabilities and the visual, interactive world of the web.
    
    *Why no “Web Agent”? → [“Browser Agent” vs. “Web Agent”](https://www.notion.so/Browser-Agent-vs-Web-Agent-3293c11b66148062bfbacfa56b0e0503?pvs=21)*