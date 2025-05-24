from dotenv import load_dotenv
import os
import asyncio
from typing import Optional
from browserbase import Browserbase
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig, BrowserSession
from langchain_anthropic import ChatAnthropic
from playwright.async_api import Page, BrowserContext as PlaywrightContext

class ExtendedBrowserSession(BrowserSession):
    """Extended version of BrowserSession that includes current_page"""
    def __init__(
        self,
        context: PlaywrightContext,
        cached_state: Optional[dict] = None,
        current_page: Optional[Page] = None
    ):
        super().__init__(context=context, cached_state=cached_state)
        self.current_page = current_page

class UseBrowserbaseContext(BrowserContext):
    async def _initialize_session(self) -> ExtendedBrowserSession:
        """Initialize a browser session using existing Browserbase page.

        Returns:
            ExtendedBrowserSession: The initialized browser session with current page.
        """
        playwright_browser = await self.browser.get_playwright_browser()
        context = await self._create_context(playwright_browser)
        self._add_new_page_listener(context)

        self.session = ExtendedBrowserSession(
            context=context,
            cached_state=None,
        )

        # Get existing page or create new one
        self.session.current_page = context.pages[0] if context.pages else await context.new_page()

        # Initialize session state
        self.session.cached_state = await self._update_state()

        return self.session

async def setup_browser() -> tuple[Browser, UseBrowserbaseContext]:
    """Set up browser and context configurations.

    Returns:
        tuple[Browser, UseBrowserbaseContext]: Configured browser and context.
    """
    bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
    bb_session = bb.sessions.create(
        project_id=os.environ["BROWSERBASE_PROJECT_ID"],
    )

    browser = Browser(config=BrowserConfig(cdp_url=bb_session.connect_url))
    context = UseBrowserbaseContext(
        browser,
        BrowserContextConfig(
            wait_for_network_idle_page_load_time=10.0,
            highlight_elements=True,
        )
    )

    return browser, context

async def setup_agent(browser: Browser, context: UseBrowserbaseContext) -> Agent:
    """Set up the browser automation agent.

    Args:
        browser: Configured browser instance
        context: Browser context for the agent

    Returns:
        Agent: Configured automation agent
    """
    llm = ChatAnthropic(
        model_name="claude-3-5-sonnet-20240620",
        temperature=0.0,
        timeout=100,
    )

    return Agent(
        task="go to https://www.macrumors.com/contact.php and fill in the form. Make sure to use the selectors and submit the form",
        llm=llm,
        browser=browser,
        browser_context=context,
    )


async def main():
    load_dotenv()

    browser, context = await setup_browser()
    session = await context.get_session()

    print("Session:", session)

    try:
        agent = await setup_agent(browser, context)
        await agent.run()
    finally:
        # Simplified cleanup - just close the browser
        # This will automatically close all contexts and pages
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())