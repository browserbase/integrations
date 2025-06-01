from langchain_community.document_loaders import BrowserbaseLoader
import os 
from dotenv import load_dotenv

load_dotenv()

BROWSERBASE_API_KEY = os.getenv("BROWSERBASE_API_KEY")
BROWSERBASE_PROJECT_ID = os.getenv("BROWSERBASE_PROJECT_ID")

loader = BrowserbaseLoader(
    api_key=BROWSERBASE_API_KEY,
    project_id=BROWSERBASE_PROJECT_ID,
    urls=[
        # load multiple pages
        "https://www.espn.com",
        "https://lilianweng.github.io/posts/2023-06-23-agent/"
    ],
    text_content=True,
)

documents = loader.load()
print(documents)