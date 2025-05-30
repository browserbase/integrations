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
task = ("Find the github repo for portia-sdk-python and star it if it's not already starred.")

# Requires an anthropic API key, ANTHROPIC_API_KEY or use any other LLM.
my_config = Config.from_default(storage_class=StorageClass.MEMORY,
                                llm_provider=LLMProvider.ANTHROPIC)

# Requires a paid browserbase subscription for authentication handling
portia = Portia(config=my_config,
                tools=PortiaToolRegistry(my_config) + [
                    BrowserToolForUrl(url="https://www.github.com",
                                      infrastructure_option=BrowserInfrastructureOption.REMOTE)],
                # CLI execution hooks mean authentication requests will be output to the CLI. You can customize these in your application.
                execution_hooks=CLIExecutionHooks())

plan_run = portia.run(task, end_user="end_user")