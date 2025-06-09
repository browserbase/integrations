# n8n-nodes-Browserbase

This is an n8n community node. It lets you use Browserbase cloud browsers in your n8n workflows.

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
- **Create Session** - Create a new browser session with configurable options
- **Get Sessions** - List all browser sessions for your project
- **Get Session** - Get details of a specific session by ID
- **Delete Session** - Delete a browser session by ID

### Browser Actions (Coming Soon)
- **Navigate** - Navigate to a specific URL within a session
- **Take Screenshot** - Capture screenshots of pages or elements
- **Get Page Content** - Extract text content from page elements
- **Click Element** - Click on page elements using CSS selectors
- **Type Text** - Type text into input fields

## Credentials

To use this node, you need:

1. **Browserbase Account**: Sign up at [browserbase.com](https://browserbase.com)
2. **API Key**: Get your API key from the Browserbase dashboard
3. **Project ID**: Create a project and note the Project ID

### Setting up credentials in n8n:
1. In n8n, go to **Settings** → **Credentials**
2. Click **Add Credential** and search for "Browserbase"
3. Enter your:
   - **Browserbase API Key**: Your API key from the dashboard
   - **Browserbase Project ID**: Your project ID from the dashboard
4. Test the connection and save

## Compatibility

- **Minimum n8n version**: 0.227.0
- **Tested against**: n8n v1.0+
- **Node.js version**: 18+ (required for Browserbase SDK)

## Usage

### Session Management Example

1. **Create Session**
   - Resource: `Browser Session`
   - Operation: `Create Session`
   - Configure session options like:
     - Keep Alive: `true` to maintain the session
     - Proxies: `true` to use rotating proxies
     - Fingerprint: `true` for browser fingerprinting
     - Viewport dimensions

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

### Advanced Configuration

When creating sessions, you can configure:

- **Keep Alive**: Whether to keep the session active after operations
- **Browser Settings**: 
  - Viewport Width/Height for consistent rendering
- **Proxies**: Enable rotating proxies for IP diversity
- **Fingerprinting**: Enable browser fingerprinting for stealth

### Browser Actions (Implementation Required)

The Browser Action resource provides operations that require additional implementation using the Browserbase SDK. Each operation returns instructions for executing the action:

1. **Navigate to URL**
   - Session ID: Use an existing session
   - URL: Target website
   - Wait for Load: Optional page load waiting

2. **Take Screenshot**
   - Session ID: Use an existing session  
   - Screenshot Options: Full page or element-specific

3. **Interact with Elements**
   - Session ID: Use an existing session
   - Selector: CSS selector for target elements
   - Text: For typing operations

### Error Handling

The node provides detailed error information including:
- Status codes from the Browserbase API
- Error descriptions
- Additional debugging details

Enable "Continue on Error" in the node settings to handle failures gracefully.

### Tips for Production Use

1. **Session Management**: Create sessions at the start of workflows and reuse them for multiple operations
2. **Error Handling**: Always implement error handling for network and browser issues
3. **Rate Limiting**: Be mindful of Browserbase rate limits for session creation
4. **Cleanup**: Delete sessions when workflows complete to manage costs

## Declarative Style Implementation

This node follows n8n's declarative style pattern similar to the HttpBin node:

- Uses `requestDefaults` for base API configuration
- Leverages routing for API endpoint definitions
- Provides structured parameter validation
- Implements proper authentication flow

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Browserbase Documentation](https://docs.browserbase.com/)
* [Browserbase API Reference](https://docs.browserbase.com/reference/)
* [Browserbase SDK Documentation](https://docs.browserbase.com/reference/sdk/)
* [CSS Selector Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
