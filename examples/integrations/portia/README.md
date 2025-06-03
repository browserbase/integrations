# Browserbase x Portia AI Integration

**Build intelligent web agents with persistent authentication using Portia AI's multi-agent framework and Browserbase's headless browser infrastructure.**

Portia AI is an open-source, multi-agent framework for running reliable production-grade agents ([**github repo here↗**](https://github.com/portiaAI/portia-sdk-python)). Its core tenets are to enable both multi-agent task planning with human feedback and stateful multi-agent task execution with human control.

## 🚀 What Makes This Integration Special

Portia AI offers an open-source browser agent implementation using Browserbase to **enable persistent authentication**. When the browser agent needs to authenticate to achieve a task, it leverages Portia's structured human:agent abstraction called a [`clarification`](https://docs.portialabs.ai/understand-clarifications) and presents the end user with a [browserbase live session URL](https://docs.browserbase.com/guides/authentication#use-the-session-live-view-to-login) that they can use to sign in.

Portia incorporates the concept of end users with the [`EndUser`](https://docs.portialabs.ai/manage-end-users) abstraction into the framework to delineate the Browserbase sessions associated with them. This enables developers to create powerful applications that can be used by anyone.

> **Note:** `clarifications` and end-users in the Portia framework can also be used to implement OAuth for API-based tools.

## 🎯 Use Cases

Here are some examples of the kinds of queries that can be handled in 20 lines of code with the Portia / Browserbase integration:

- Send a message to Bob Smith on LinkedIn asking him if he's free on Tuesday for a meeting
- Get my Google Doc shopping list and add all items in it to my shopping trolley on the Walmart website  
- Book me unto the 8am hot yoga class
- Star a GitHub repository after authenticating
- Extract data from authenticated dashboards

## 🎥 Demo Video

Watch how you can make a LinkedIn agent with Browserbase and Portia AI:

[![LinkedIn Agent Demo](https://img.youtube.com/vi/hSq8Ww-hagg/0.jpg)](https://www.youtube.com/watch?v=hSq8Ww-hagg)

## 🔧 Prerequisites

- **Browserbase Account**: Get your API key from the [Dashboard's Settings tab](https://www.browserbase.com/settings)
- **LLM API Key**: Anthropic (ANTHROPIC_API_KEY), OpenAI (OPENAI_API_KEY), Google (GOOGLE_API_KEY), or [local LLM](https://docs.portialabs.ai/manage-config#api-keys)
- **Python 3.8+**
- **Paid Browserbase subscription** (required for authentication features)

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
export BROWSERBASE_API_KEY="your_browserbase_api_key"
export BROWSERBASE_PROJECT_ID="your_project_id"
export ANTHROPIC_API_KEY="your_anthropic_api_key"  # or OPENAI_API_KEY, GOOGLE_API_KEY
```

### 2. Install Portia with Browserbase

```bash
pip install portia-sdk-python[tools-browser-browserbase]
```

### 3. Basic Agent (No Authentication)

This example works with the free trial version of Browserbase:

```python
from dotenv import load_dotenv

from portia import (
    Config,
    LLMProvider,
    Portia,
    PortiaToolRegistry,
    StorageClass,
)
from portia.cli import CLIExecutionHooks
from portia.open_source_tools.browser_tool import BrowserTool, BrowserInfrastructureOption

load_dotenv(override=True)

task = "Go to https://www.npr.org and get the headline news story"

my_config = Config.from_default(
    storage_class=StorageClass.MEMORY,
    llm_provider=LLMProvider.ANTHROPIC
)

portia = Portia(
    config=my_config,
    tools=PortiaToolRegistry(my_config) + [
        BrowserTool(infrastructure_option=BrowserInfrastructureOption.REMOTE)
    ],
    execution_hooks=CLIExecutionHooks()
)

plan_run = portia.run(task, end_user="end_user1")
```

### 4. Advanced Agent with Authentication

This example demonstrates persistent authentication capabilities:

```python
from dotenv import load_dotenv

from portia import (
    Config,
    LLMProvider,
    Portia,
    PortiaToolRegistry,
    StorageClass,
)
from portia.cli import CLIExecutionHooks
from portia.open_source_tools.browser_tool import BrowserToolForUrl, BrowserInfrastructureOption

load_dotenv(override=True)

# The task that you want the agent to do
task = "Find the github repo for portia-sdk-python and star it if it's not already starred."

my_config = Config.from_default(
    storage_class=StorageClass.MEMORY,
    llm_provider=LLMProvider.ANTHROPIC
)

# Requires a paid browserbase subscription for authentication handling
portia = Portia(
    config=my_config,
    tools=PortiaToolRegistry(my_config) + [
        BrowserToolForUrl(
            url="https://www.github.com",
            infrastructure_option=BrowserInfrastructureOption.REMOTE
        )
    ],
    # CLI execution hooks mean authentication requests will be output to the CLI
    execution_hooks=CLIExecutionHooks()
)

plan_run = portia.run(task, end_user="end_user")
```

## 🔐 How Authentication Works

When a browser tool encounters a page that requires authentication, it will raise a clarification request to the user. The authentication flow works as follows:

![Browser authentication with clarifications](../../../images/integrations/portia/browser_auth.png)

1. **Agent encounters authentication requirement**
2. **Clarification request is raised** with a Browserbase live session URL
3. **User authenticates** through the live session
4. **Cookies are persisted** for future agent runs until they expire
5. **Agent continues** with the authenticated session

## 🛠️ Advanced Configuration

### Custom Execution Hooks

You can customize how clarifications are handled in your application:

```python
from portia.execution_hooks import ExecutionHooks

class CustomExecutionHooks(ExecutionHooks):
    def on_clarification_request(self, clarification):
        # Custom logic for handling authentication requests
        # e.g., send notification, log to database, etc.
        pass

portia = Portia(
    config=my_config,
    tools=tools,
    execution_hooks=CustomExecutionHooks()
)
```

### Multiple End Users

Manage sessions for different users:

```python
# Different users get isolated browser sessions
plan_run_user1 = portia.run(task, end_user="user1")
plan_run_user2 = portia.run(task, end_user="user2")
```

### Storage Options

Choose different storage backends for persistence:

```python
# In-memory (default)
config = Config.from_default(storage_class=StorageClass.MEMORY)

# File-based storage
config = Config.from_default(storage_class=StorageClass.FILE)

# Database storage (requires additional setup)
config = Config.from_default(storage_class=StorageClass.DATABASE)
```

## 📚 Additional Resources

- **[Portia AI Documentation](https://docs.portialabs.ai/)**
- **[Portia SDK Python GitHub](https://github.com/portiaAI/portia-sdk-python)**
- **[Browserbase Documentation](https://docs.browserbase.com)**
- **[Understanding Clarifications](https://docs.portialabs.ai/understand-clarifications)**
- **[Managing End Users](https://docs.portialabs.ai/manage-end-users)**

## 🤝 Support

- **Portia AI**: [GitHub Issues](https://github.com/portiaAI/portia-sdk-python/issues)
- **Browserbase**: [support@browserbase.com](mailto:support@browserbase.com)

## 📄 License

This integration example is licensed under the MIT License. See the main repository LICENSE file for details.
