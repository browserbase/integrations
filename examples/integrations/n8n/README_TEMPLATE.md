# n8n-nodes-Browserbase

This is an n8n community node. It lets you use Browserbase cloud browsers in your n8n workflows with both traditional browser automation and AI-powered operations.

Browserbase is a platform for running headless browsers in the cloud. It provides a simple API for controlling browsers, useful features for managing browser sessions, and scalable infrastructure for web automation tasks like scraping, testing, and user interaction simulation.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

This node supports two main resources:

### Browser Session Management
- **Create Session** - Create a new browser session with configurable options (keep-alive, proxies, viewport settings)
- **Get Sessions** - List all browser sessions for your project
- **Get Session** - Get details of a specific session by ID
- **Delete Session** - Delete a browser session by ID

### Browser Actions
The node provides both traditional browser automation and AI-powered operations:

#### Traditional Browser Operations
- **Navigate** - Navigate to a specific URL within a session
- **Take Screenshot** - Capture full page or element screenshots
- **Get Page Content** - Extract text content from page elements using CSS selectors
- **Click Element** - Click on page elements using CSS selectors
- **Type Text** - Type text into input fields using CSS selectors

#### AI-Powered Operations (Stagehand Integration)
- **Act** - Perform actions using natural language instructions (e.g., "click the login button", "fill out the contact form")
- **Observe** - Get insights about the page using natural language queries (e.g., "what products are available?", "is the user logged in?")
- **Extract** - Extract structured data using natural language instructions and Zod schemas

## Credentials

To use this node, you need:

1. **Browserbase Account**: Sign up at [browserbase.com](https://browserbase.com)
2. **API Key**: Get your API key from the Browserbase dashboard
3. **Project ID**: Create a project and note the Project ID
4. **AI API Key** (for Stagehand operations): OpenAI or Anthropic API key

### Setting up credentials in n8n:
1. In n8n, go to **Settings** → **Credentials**
2. Click **Add Credential** and search for "Browserbase"
3. Enter your:
   - **Browserbase API Key**: Your API key from the dashboard
   - **Browserbase Project ID**: Your project ID from the dashboard
   - **AI API Key**: Your OpenAI or Anthropic API key (for AI operations)
4. Test the connection and save

## Compatibility

- **Minimum n8n version**: 0.227.0
- **Tested against**: n8n v1.0+
- **Node.js version**: 18+ (required for Playwright and Stagehand dependencies)

## Usage

### Session Management Example

1. **Create Session**
   - Resource: `Browser Session`
   - Operation: `Create Session`
   - Configure session options like:
     - Keep Alive: `true` to maintain the session
     - Proxies: `true` to use rotating proxies
     - Fingerprint: `true` for browser fingerprinting
     - Viewport dimensions (width/height)

2. **List Sessions**
   - Resource: `Browser Session`
   - Operation: `Get Sessions`
   - Returns all active sessions for your project

3. **Get Specific Session**
   - Resource: `Browser Session`
   - Operation: `Get Session`
   - Session ID: `ses_1234567890` (from previous create operation)

4. **Delete Session**
   - Resource: `Browser Session`
   - Operation: `Delete Session`
   - Session ID: `ses_1234567890`

### Traditional Browser Automation

#### Navigate to a Page
```
Resource: Browser Action
Operation: Navigate
Session ID: ses_1234567890
URL: https://example.com
```

#### Take Screenshot
```
Resource: Browser Action
Operation: Screenshot
Session ID: ses_1234567890
Screenshot Options:
  - Full Page: true/false
  - Format: png/jpeg
```

#### Extract Content
```
Resource: Browser Action
Operation: Get Content
Session ID: ses_1234567890
Selector: .product-title (CSS selector)
```

#### Click Elements
```
Resource: Browser Action
Operation: Click
Session ID: ses_1234567890
Selector: button[type="submit"]
```

#### Type Text
```
Resource: Browser Action
Operation: Type
Session ID: ses_1234567890
Selector: input[name="email"]
Text: user@example.com
```

### AI-Powered Operations (Stagehand)

#### Act with Natural Language
```
Resource: Browser Action
Operation: Act
Session ID: ses_1234567890
Instructions: "Click the login button and fill in the email field with test@example.com"
AI Options:
  - Model: gpt-4o
  - API Key: (from credentials)
```

#### Observe Page State
```
Resource: Browser Action
Operation: Observe
Session ID: ses_1234567890
Instructions: "What products are currently displayed on this page?"
AI Options:
  - Model: claude-3-5-sonnet-20241022
  - API Key: (from credentials)
```

#### Extract Structured Data
```
Resource: Browser Action
Operation: Extract
Session ID: ses_1234567890
Instructions: "Extract all product information from this page"
Schema: {
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "price": {"type": "string"},
          "description": {"type": "string"}
        }
      }
    }
  }
}
AI Options:
  - Model: gpt-4o-mini
```

### Session Flow Between Operations

The node automatically handles session IDs between operations:

1. **Create Session** → Returns `sessionId`
2. **Use sessionId** in subsequent Browser Action operations
3. **Session persists** across multiple operations
4. **Delete Session** when workflow completes

### AI Model Support

Supported AI models for Stagehand operations:
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`
- **Anthropic**: `claude-3-5-sonnet-20241022`

### Error Handling

The node provides comprehensive error handling:
- Detailed error messages for API failures
- Browser automation error context
- AI operation error details
- Session management error handling

Enable "Continue on Error" in node settings for graceful failure handling.

### Tips for Production Use

1. **Session Management**: Create sessions at workflow start and reuse across operations
2. **AI Operations**: Use specific, clear instructions for better AI performance
3. **Traditional vs AI**: Use traditional operations for precise control, AI operations for complex interactions
4. **Error Handling**: Always implement error handling for network and browser issues
5. **Rate Limiting**: Be mindful of both Browserbase and AI API rate limits
6. **Cleanup**: Delete sessions when workflows complete to manage costs
7. **Schema Design**: For extract operations, design clear Zod schemas for consistent data structure

## Implementation Architecture

This node uses a programmatic approach with:

- **Playwright Integration**: Real browser automation via Chrome DevTools Protocol
- **Stagehand AI**: Natural language browser interactions
- **Session Management**: Automatic session ID flow between operations
- **Error Handling**: Comprehensive error catching and reporting
- **Flexible Configuration**: Support for various browser and AI options

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Browserbase Documentation](https://docs.browserbase.com/)
* [Browserbase API Reference](https://docs.browserbase.com/reference/)
* [Stagehand Documentation](https://docs.browserbase.com/stagehand)
* [Playwright Documentation](https://playwright.dev/)
* [Zod Schema Documentation](https://zod.dev/)
* [OpenAI API Documentation](https://platform.openai.com/docs/)
* [Anthropic API Documentation](https://docs.anthropic.com/)
