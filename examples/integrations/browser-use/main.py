import asyncio
import os
from dotenv import load_dotenv

from browserbase import Browserbase
from browser_use import Agent, Browser

load_dotenv()


async def main():
    bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
    session = bb.sessions.create(project_id=os.environ["BROWSERBASE_PROJECT_ID"])

    print(f"Session ID: {session.id}")
    print(f"Debug URL: https://www.browserbase.com/sessions/{session.id}")

    browser = Browser(cdp_url=session.connect_url)

    agent = Agent(
        task=(
            "Go to https://www.macrumors.com/contact.php and fill in the form. "
            "Make sure to use the selectors and submit the form"
        ),
        browser=browser,
    )

    result = await agent.run()
    print(f"Result: {result}")

    await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
