from langchain.tools import Tool
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create placeholder function for search in case import fails
def dummy_search(query: str) -> str:
    return f"Search for '{query}' is not available. Please install duckduckgo-search package."

def dummy_wiki(query: str) -> str:
    return f"Wikipedia search for '{query}' is not available. Please install wikipedia package."

def save_to_txt(data: str, filename: str = "research_output.txt"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_text = f"--- Research Output ---\nTimestamp: {timestamp}\n\n{data}\n\n"

    with open(filename, "a", encoding="utf-8") as f:
        f.write(formatted_text)
    
    return f"Data successfully saved to {filename}"

# Try to import search tools with fallback
try:
    from langchain_community.tools import DuckDuckGoSearchRun
    search = DuckDuckGoSearchRun()
    search_func = search.run
    logger.info("DuckDuckGo search initialized successfully")
except ImportError:
    logger.warning("Could not import DuckDuckGo search. Using dummy search instead.")
    search_func = dummy_search

# Create search tool
search_tool = Tool(
    name="search",
    func=search_func,
    description="Search the web for information",
)

# Try to import Wikipedia tools with fallback
try:
    from langchain_community.tools import WikipediaQueryRun
    from langchain_community.utilities import WikipediaAPIWrapper
    api_wrapper = WikipediaAPIWrapper(top_k_results=1, doc_content_chars_max=100)
    wiki_func = WikipediaQueryRun(api_wrapper=api_wrapper).run
    logger.info("Wikipedia search initialized successfully")
except ImportError:
    logger.warning("Could not import Wikipedia search. Using dummy search instead.")
    wiki_func = dummy_wiki

# Create Wikipedia tool
wiki_tool = Tool(
    name="wikipedia",
    func=wiki_func,
    description="Search Wikipedia for information about a topic",
)

# Create save tool
save_tool = Tool(
    name="save_text_to_file",
    func=save_to_txt,
    description="Saves structured research data to a text file.",
)