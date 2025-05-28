# Cloudflare Workers Integration

Utilize Browserbase with Cloudflare Workers for advanced browser automation.

## Overview

Cloudflare Workers are a serverless compute platform that allows you to run your code in the cloud.

They are widely known for being extremely cost effective, scalable, and secure.

Most recently, Cloudflare's fork of Puppeteer has allowed integration with Browserbase's APIs and SDKs.

Using Cloudflare Workers, developers can leverage the full capabilities of the Puppeteer API as they would in a traditional environment, enhanced with additional developer tools from Browserbase.

## Example Structure

```
cloudflare/
├── src/
│   └── index.ts              # Main Worker script with Puppeteer integration
├── package.json              # Dependencies and project metadata
├── wrangler.toml            # Cloudflare Workers configuration
└── tsconfig.json            # TypeScript configuration
```

### Key Files

**`src/index.ts`** - The main Worker script that:
- Imports Cloudflare's Puppeteer fork
- Connects to Browserbase using WebSocket endpoint
- Performs browser automation tasks
- Returns JSON responses

**`package.json`** - Defines project dependencies:
- `@cloudflare/puppeteer` - Cloudflare's optimized Puppeteer fork
- TypeScript support for development

## Wrangler Configuration (`wrangler.toml`)

The `wrangler.toml` file is the **source of truth** for your Cloudflare Worker configuration. This file is essential because it:

### Core Configuration
```toml
name = "browserbase-cloudflare-workers"
main = "src/index.ts"
compatibility_date = "2024-06-10"
compatibility_flags = ["nodejs_compat"]
```

- **`name`** - Unique identifier for your Worker
- **`main`** - Entry point to your Worker script
- **`compatibility_date`** - Ensures consistent runtime behavior
- **`nodejs_compat`** - Enables Node.js compatibility for Puppeteer

### Environment Variables
```toml
[vars]
BROWSERBASE_API_KEY = "<your-api-key>"
BROWSERBASE_PROJECT_ID = "<your-project-id>"
```

**Critical for Browserbase Integration:**
- Securely stores API credentials
- Accessible in Worker runtime via `env` parameter
- Managed through Wrangler CLI or dashboard

### Why Wrangler.toml Matters

1. **Deployment Configuration** - Controls how your Worker is deployed and configured
2. **Environment Management** - Handles secrets and variables securely
3. **Runtime Settings** - Defines compatibility flags and Node.js support needed for Puppeteer
4. **Source of Truth** - Cloudflare recommends treating this as the authoritative configuration

According to [Cloudflare's documentation](https://developers.cloudflare.com/workers/wrangler/configuration/), the wrangler.toml file should be your primary configuration method to avoid conflicts between dashboard and CLI deployments.

## Getting Started

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Configure your credentials:**
   ```bash
   wrangler secret put BROWSERBASE_API_KEY
   wrangler secret put BROWSERBASE_PROJECT_ID
   ```

3. **Deploy your Worker:**
   ```bash
   wrangler deploy
   ```

The integration leverages Cloudflare's global edge network for low-latency browser automation while maintaining the full power of Browserbase's anti-detection capabilities.