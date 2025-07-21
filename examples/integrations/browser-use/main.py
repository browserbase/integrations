import asyncio
import os
from dotenv import load_dotenv

from browserbase import Browserbase
from browser_use import Agent
from browser_use.browser.session import BrowserSession
from browser_use.browser import BrowserProfile
from browser_use.llm import ChatOpenAI

class ManagedBrowserSession:
    """Context manager for proper BrowserSession lifecycle management"""
    
    def __init__(self, cdp_url: str, browser_profile: BrowserProfile):
        self.cdp_url = cdp_url
        self.browser_profile = browser_profile
        self.browser_session = None
        
    async def __aenter__(self) -> BrowserSession:
        try:
            self.browser_session = BrowserSession(
                cdp_url=self.cdp_url,
                browser_profile=self.browser_profile,
                keep_alive=False,  # Essential for proper cleanup
                initialized=False,
            )
            
            await self.browser_session.start()
            print("✅ Browser session initialized successfully")
            return self.browser_session
            
        except Exception as e:
            print(f"❌ Failed to initialize browser session: {e}")
            await self._emergency_cleanup()
            raise
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session_properly()
    
    async def _close_session_properly(self):
        playwright_instance = None
        
        try:
            if self.browser_session:
                # Get playwright instance before closing session
                if hasattr(self.browser_session, 'playwright'):
                    playwright_instance = self.browser_session.playwright
                
                # Close browser session first
                if self.browser_session.initialized:
                    await self.browser_session.stop()
                    print("✅ Browser session closed successfully")
                    
        except Exception as e:
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                print("ℹ️  Browser session was already closed (expected behavior)")
            else:
                print(f"⚠️  Error during browser session closure: {e}")
        
        finally:
            # Stop playwright instance - critical for preventing hanging processes
            if playwright_instance:
                try:
                    await playwright_instance.stop()
                    print("✅ Playwright instance stopped successfully")
                except Exception as e:
                    print(f"⚠️  Error stopping Playwright: {e}")
            
            await self._final_cleanup()
    
    async def _emergency_cleanup(self):
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    await self.browser_session.playwright.stop()
                if self.browser_session.initialized:
                    await self.browser_session.stop()
        except Exception as e:
            print(f"⚠️  Emergency cleanup error: {e}")
        finally:
            await self._final_cleanup()
    
    async def _final_cleanup(self):
        self.browser_session = None

async def create_browserbase_session():
    load_dotenv()
    
    bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
    session = bb.sessions.create(project_id=os.environ["BROWSERBASE_PROJECT_ID"])
    
    print(f"Session ID: {session.id}")
    print(f"Debug URL: https://www.browserbase.com/sessions/{session.id}")
    
    return session


def create_browser_profile() -> BrowserProfile:
    return BrowserProfile(
        keep_alive=False,  # Essential for proper cleanup
        wait_between_actions=2.0,
        default_timeout=30000,
        default_navigation_timeout=30000,
    )


async def run_automation_task(browser_session: BrowserSession, task: str) -> str:
    llm = ChatOpenAI(model="gpt-4o", temperature=0.0)
    
    agent = Agent(
        task=task,
        llm=llm,
        browser_session=browser_session,
        enable_memory=False,
        max_failures=5,
        retry_delay=5,
        max_actions_per_step=1,
    )
    
    try:
        print("🚀 Starting agent task...")
        result = await agent.run(max_steps=20)
        print("🎉 Task completed successfully!")
        return str(result)
        
    except Exception as e:
        # Handle expected browser disconnection after successful completion
        error_msg = str(e).lower()
        if "browser is closed" in error_msg or "disconnected" in error_msg:
            print("✅ Task completed - Browser session ended normally")
            return "Task completed successfully (session ended normally)"
        else:
            print(f"❌ Agent execution error: {e}")
            raise
            
    finally:
        del agent

async def main():
    try:
        session = await create_browserbase_session()
        browser_profile = create_browser_profile()
        
        task = ("Go to https://www.macrumors.com/contact.php and fill in the form. "
                "Make sure to use the selectors and submit the form")
        
        async with ManagedBrowserSession(session.connect_url, browser_profile) as browser_session:
            result = await run_automation_task(browser_session, task)
            print(f"Final result: {result}")
            
    except KeyboardInterrupt:
        print("\n⏹️  Process interrupted by user")
    except Exception as e:
        print(f"💥 Fatal error: {e}")
        raise
    finally:
        print("🏁 Application shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())