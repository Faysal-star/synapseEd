import os
import uuid
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

# LangChain and tool imports
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_groq import ChatGroq
from langchain_community.tools import WikipediaQueryRun, ArxivQueryRun
from langchain_community.utilities import WikipediaAPIWrapper, ArxivAPIWrapper
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.tools import Tool

# Import our custom agent components
from .agent import WebSearchAgent, URLTracker, HierarchicalMemory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Memory storage directory
MEMORY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memory_store")
os.makedirs(MEMORY_DIR, exist_ok=True)

# Active conversations and tracking
active_conversations = {}
url_tracker = URLTracker()
hierarchical_memories = {}

class TavilyExtraction:
    """Tool for extracting content from a specific URL"""
    def __init__(self, api_key):
        self.api_key = api_key
        
    def run(self, url, conversation_id=None):
        """Extract the content from a specific URL."""
        # In a production implementation, this would call Tavily's API
        # For now, we'll return a placeholder message
        if conversation_id:
            url_tracker.track_url(conversation_id, url, "tavily_extract")
        
        return f"Content extracted from {url}. This is a placeholder for the Tavily extraction service."

class WebSearchService:
    """Service layer for web search functionality"""
    
    def __init__(self, llm_factory, groq_api_key=None, tavily_api_key=None):
        """Initialize the web search service"""
        self.llm_factory = llm_factory
        self.groq_api_key = groq_api_key
        self.tavily_api_key = tavily_api_key
        self.tools = self._initialize_tools()
        self.llm = self._initialize_llm()
        self.agent = None
        
        if self.llm:
            self.agent = WebSearchAgent(self.llm, self.tools)
        
        # Create graph for agent workflow
        if self.agent:
            self.graph = self.agent.create_graph()
        else:
            self.graph = None
    
    def _initialize_tools(self) -> List:
        """Initialize search tools for the agent"""
        tools = []
        
        # Set up Wikipedia tool
        try:
            wiki_wrapper = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=4000)
            wiki_tool = WikipediaQueryRun(
                api_wrapper=wiki_wrapper,
                description="Search Wikipedia for explanations of academic concepts, historical events, scientific theories, and general knowledge topics."
            )
            tools.append(wiki_tool)
            logger.info("Wikipedia tool initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing Wikipedia tool: {str(e)}")
        
        # Set up ArXiv tool for academic papers
        try:
            arxiv_wrapper = ArxivAPIWrapper(top_k_results=3, doc_content_chars_max=4000)
            arxiv_tool = ArxivQueryRun(
                api_wrapper=arxiv_wrapper,
                description="Search for academic papers and scientific research on arXiv. Use this for finding scholarly information on advanced topics."
            )
            tools.append(arxiv_tool)
            logger.info("ArXiv tool initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing ArXiv tool: {str(e)}")
        
        # Set up Tavily search tools if API key is available
        if self.tavily_api_key:
            try:
                # General web search tool
                class TavilySearchResultsWithTracking(TavilySearchResults):
                    def invoke(self, query, conversation_id=None, **kwargs):
                        # Extract conversation_id if not provided
                        if not conversation_id:
                            try:
                                frame = inspect.currentframe()
                                while frame:
                                    if 'conversation_id' in frame.f_locals:
                                        conversation_id = frame.f_locals['conversation_id']
                                        break
                                    frame = frame.f_back
                            except:
                                pass
                        
                        logger.debug(f"Tavily search query: '{query}' for conversation: {conversation_id}")
                            
                        # Call the original method
                        result = super().invoke(query, **kwargs)
                        
                        # Track URLs from results
                        if conversation_id and result:
                            if isinstance(result, list):
                                for item in result:
                                    if isinstance(item, dict) and 'url' in item:
                                        url = item['url']
                                        title = item.get('title', '')
                                        content = item.get('content', '')
                                        metadata = {
                                            "title": title,
                                            "snippet": content[:100] if content else '',
                                            "query": query
                                        }
                                        url_tracker.track_url(conversation_id, url, "tavily_search", metadata)
                        
                        return result
                
                # Use our tracking class
                tavily_search_tool = TavilySearchResultsWithTracking(
                    max_results=3,
                    api_key=self.tavily_api_key,
                    description="Search the web for current information on academic topics, general knowledge, and recent events."
                )
                tools.append(tavily_search_tool)
                
                # Create extraction tool
                tavily_extract = TavilyExtraction(self.tavily_api_key)
                tavily_extract_tool = Tool(
                    name="tavily_extract",
                    func=tavily_extract.run,
                    description="Extract and summarize content from a specific URL. Use this when you want to get detailed information from a webpage."
                )
                tools.append(tavily_extract_tool)
                
                logger.info("Tavily search tools initialized successfully.")
            except Exception as e:
                logger.error(f"Error initializing Tavily tools: {str(e)}")
        
        if not tools:
            logger.warning("No search tools initialized. Web search functionality will be limited.")
        
        return tools
    
    def _initialize_llm(self):
        """Initialize the LLM for the web search agent"""
        try:
            if self.groq_api_key:
                # Initialize Groq model
                llm = ChatGroq(
                    groq_api_key=self.groq_api_key, 
                    model_name="meta-llama/llama-4-maverick-17b-128e-instruct"
                )
                
                # Bind tools
                llm_with_tools = llm.bind_tools(tools=self.tools)
                
                logger.info("LLM initialized successfully with Groq's Llama-4-Maverick model.")
                return llm_with_tools
            else:
                # Use the LLM factory as fallback
                llm = self.llm_factory.create_llm(provider='openai', model='gpt-4')
                llm_with_tools = llm.bind_tools(tools=self.tools)
                
                logger.info("LLM initialized from factory.")
                return llm_with_tools
        except Exception as e:
            logger.error(f"Failed to initialize the LLM: {str(e)}")
            return None
    
    def search(self, query: str, conversation_id: str = None, context: Dict = None) -> Dict:
        """Perform a web search query and return results"""
        if not self.agent or not self.graph:
            return {
                "status": "error",
                "message": "Web search agent is not properly initialized",
                "response": "I'm sorry, but the web search system is currently unavailable. Please try again later."
            }
        
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            
        # Clear URL tracking for this conversation if starting fresh
        self.agent.clear_url_tracking(conversation_id)
        
        # Update context with conversation ID
        if not context:
            context = {}
        context["conversation_id"] = conversation_id
        
        # Get or create memory for this conversation
        memory = self.get_or_create_memory(conversation_id)
        
        # Retrieve relevant context from memory
        relevant_context = memory.retrieve_relevant_context(query)
        memory_summary = memory.get_memory_summary()
        
        # Store conversation
        if conversation_id not in active_conversations:
            active_conversations[conversation_id] = []
        
        # Add user message to conversation history
        active_conversations[conversation_id].append(("user", query))
        
        try:
            # Prepare state with messages, context and memory
            state = {
                "messages": active_conversations[conversation_id],
                "context": context,
                "memory": relevant_context,
                "memory_summary": memory_summary,
                "reasoning": []
            }
            
            # Process with LangGraph
            events = list(self.graph.stream(
                state,
                stream_mode="values"
            ))
            
            # Extract the AI response and reasoning steps from the last event
            ai_responses = []
            reasoning_steps = []
            
            for event in events:
                # Add each message to the history (except internal verification queries)
                if "messages" in event and event["messages"]:
                    message = event["messages"][-1]
                    
                    # Check if this is an AI message to add to responses
                    if hasattr(message, 'type') and message.type == "ai":
                        if hasattr(message, 'content') and message.content:
                            ai_responses.append(message.content)
                            
                            # Add AI message to conversation history
                            active_conversations[conversation_id].append(("ai", message.content))
                
                # Collect reasoning steps
                if "reasoning" in event:
                    for step in event["reasoning"]:
                        reasoning_steps.append(step)
            
            # Use the final AI response
            if ai_responses:
                response = ai_responses[-1]
            else:
                response = "I couldn't generate a response for your query. Please try again with a different question."
            
            # Add the exchange to memory
            memory.add_exchange(
                user_message=query,
                ai_message=response,
                user_metadata=context
            )
            
            # Save memory periodically
            self.save_memory(conversation_id)
            

            searched_websites = self.agent.extract_searched_websites(conversation_id)
            
            return {
                "status": "success",
                "response": response,
                "conversation_id": conversation_id,
                "message_id": str(uuid.uuid4()),
                "reasoning": reasoning_steps,
                "searched_websites": searched_websites
            }
            
        except Exception as e:
            logger.error(f"Error during search processing: {str(e)}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "response": "I encountered an error while searching for information. Please try again later.",
                "conversation_id": conversation_id,
                "message_id": str(uuid.uuid4()),
                "reasoning": [{"type": "error", "content": str(e)}],
                "searched_websites": []
            }
    
    def get_conversation_history(self, conversation_id: str) -> List:
        """Get conversation history for a specific conversation"""
        return active_conversations.get(conversation_id, [])
    
    def get_memory_stats(self, conversation_id: str) -> Dict:
        """Get memory statistics for a conversation"""
        memory = self.get_or_create_memory(conversation_id)
        
        # Count total exchanges in external memory
        external_count = sum(len(exchanges) for exchanges in memory.external_memory.values())
        
        return {
            'stats': memory.stats,
            'user_profile': memory.user_profile,
            'topics': list(memory.external_memory.keys()),
            'main_memory_size': len(memory.main_memory),
            'external_memory_size': external_count,
            'attention_sinks': len(memory.attention_sinks)
        }
    
    def get_or_create_memory(self, conversation_id: str) -> HierarchicalMemory:
        """Get or create hierarchical memory for a conversation"""
        if conversation_id in hierarchical_memories:
            return hierarchical_memories[conversation_id]
        
        # Try to load from file first
        memory_file = os.path.join(MEMORY_DIR, f"{conversation_id}.json")
        
        if os.path.exists(memory_file):
            try:
                hierarchical_memories[conversation_id] = HierarchicalMemory.load_from_file(memory_file)
                logger.info(f"Loaded memory from {memory_file}")
            except Exception as e:
                logger.error(f"Error loading memory from {memory_file}: {str(e)}")
                hierarchical_memories[conversation_id] = HierarchicalMemory()
        else:
            hierarchical_memories[conversation_id] = HierarchicalMemory()
        
        return hierarchical_memories[conversation_id]
    
    def save_memory(self, conversation_id: str) -> bool:
        """Save memory to disk"""
        if conversation_id in hierarchical_memories:
            memory = hierarchical_memories[conversation_id]
            try:
                memory_file = os.path.join(MEMORY_DIR, f"{conversation_id}.json")
                memory.save_to_file(memory_file)
                return True
            except Exception as e:
                logger.error(f"Error saving memory: {str(e)}")
                return False
        return False
    
    def cleanup_old_memories(self, max_age_hours: int = 24) -> int:
        """Clean up memory files older than the specified hours"""
        cleaned = 0
        try:
            current_time = time.time()
            for filename in os.listdir(MEMORY_DIR):
                if filename.endswith('.json'):
                    file_path = os.path.join(MEMORY_DIR, filename)
                    file_age_hours = (current_time - os.path.getmtime(file_path)) / 3600
                    
                    if file_age_hours > max_age_hours:
                        os.remove(file_path)
                        
                        # Also remove from in-memory storage
                        conversation_id = filename.replace('.json', '')
                        if conversation_id in hierarchical_memories:
                            del hierarchical_memories[conversation_id]
                        if conversation_id in active_conversations:
                            del active_conversations[conversation_id]
                            
                        cleaned += 1
                        logger.info(f"Removed old memory file: {filename}")
            return cleaned
        except Exception as e:
            logger.error(f"Error cleaning up memories: {str(e)}")
            return cleaned
    
    def store_feedback(self, conversation_id: str, message_id: str, rating: int, feedback_text: str = None) -> bool:
        """Store user feedback for a message"""
        try:
            memory = self.get_or_create_memory(conversation_id)
            
            if not hasattr(memory, 'feedback'):
                memory.feedback = []
                
            memory.feedback.append({
                "message_id": message_id,
                "rating": rating,
                "feedback_text": feedback_text,
                "timestamp": datetime.now().isoformat()
            })
            
            # Save memory with feedback
            self.save_memory(conversation_id)
            return True
        except Exception as e:
            logger.error(f"Error storing feedback: {str(e)}")
            return False