from crewai_tools import BrowserbaseLoadTool
from crewai import Agent

# See https://github.com/joaomdmoura/crewAI-examples/blob/main/instagram_post/tools/search_tools.py
from tools.search_tools import SearchTools


browserbase_tool = BrowserbaseLoadTool()

# Extract the text from the site
text = browserbase_tool.run()
print(text)


# Use the BrowserbaseLoadTool for travel planning
agent = Agent(
    role='Local Expert at this city',
    goal='Provide the BEST insights about the selected city',
    backstory="""A knowledgeable local guide with extensive information
    about the city, it's attractions and customs""",
    tools=[
        SearchTools.search_internet,
        browserbase_tool,
    ],
    verbose=True
)