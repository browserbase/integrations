# n8n-nodes-browserbase

This is an n8n community node that lets you automate browsers using [Browserbase](https://browserbase.com) powered by [Stagehand](https://stagehand.dev) in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Development / Testing with Docker

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Run n8n with your node in Docker
docker-compose up --build

# Open http://localhost:5678 and search for "Browserbase" node
```

To rebuild after changes:
```bash
npm run build && docker-compose up --build
```

## Operations

### Session
- **Start** - Start a new Browserbase session with Stagehand
- **End** - End an existing browser session

### Browser
- **Navigate** - Navigate the browser to a specific URL
- **Screenshot** - Capture a screenshot of the current page (placeholder)

### AI
- **Act** - Perform browser actions using natural language (e.g., "Click the login button")
- **Observe** - Observe and find elements on the page based on instructions
- **Extract** - Extract structured data from the page using a JSON schema
- **Agent Execute** - Execute multi-step tasks using an AI agent

## Credentials

You need three credentials to use this node:

1. **Browserbase API Key** - Your Browserbase API key
2. **Browserbase Project ID** - Your Browserbase project ID
3. **Model API Key** - API key for the AI model (e.g., OpenAI API key)

### Getting your credentials

1. Sign up at [Browserbase](https://browserbase.com)
2. Navigate to your dashboard to find your API key and Project ID
3. Get an API key from your AI provider (e.g., [OpenAI](https://platform.openai.com/api-keys))

## Example Workflow

1. **Start Session** - Initialize a browser session with your preferred AI model
2. **Navigate** - Go to the target website
3. **Act/Observe/Extract** - Perform AI-powered browser automation
4. **End Session** - Clean up the browser session

```
[Start Session] → [Navigate to URL] → [Act: Fill login form] → [Extract: Get data] → [End Session]
```

## Compatibility

Compatible with n8n@1.60.0 or later

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Browserbase Documentation](https://docs.browserbase.com)
- [Stagehand Documentation](https://docs.stagehand.dev)
