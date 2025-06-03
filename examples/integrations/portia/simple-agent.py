# type: ignore
# ruff: noqa
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

my_config = Config.from_default(storage_class=StorageClass.MEMORY,
                                llm_provider=LLMProvider.ANTHROPIC)

portia = Portia(config=my_config,
                tools=PortiaToolRegistry(my_config) + [BrowserTool(infrastructure_option=BrowserInfrastructureOption.REMOTE)],
                execution_hooks=CLIExecutionHooks())

plan_run = portia.run(task, end_user="end_user1")