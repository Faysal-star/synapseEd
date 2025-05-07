import uuid
import logging
import re
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import Counter
import inspect
import numpy as np
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict
from typing import Annotated
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, FunctionMessage
from .critic import CriticFramework

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class URLTracker:
    def __init__(self):
        self.conversations = {}
    
    def track_url(self, conversation_id, url, source=None, metadata=None):
        if not conversation_id or not url:
            return
            
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
            
        # Don't add exact duplicates
        for entry in self.conversations[conversation_id]:
            if entry["url"] == url:
                # Update metadata if new information is available
                if metadata:
                    if "metadata" not in entry:
                        entry["metadata"] = {}
                    entry["metadata"].update(metadata)
                return
                
        # Add the URL with metadata
        entry = {
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "source": source or "unknown"
        }
        
        if metadata:
            entry["metadata"] = metadata
            
        self.conversations[conversation_id].append(entry)
    
    def get_urls(self, conversation_id):
        if conversation_id not in self.conversations:
            return []
        return [entry["url"] for entry in self.conversations[conversation_id]]
    
    def get_detailed_urls(self, conversation_id):
        """Return URLs with their metadata"""
        if conversation_id not in self.conversations:
            return []
        return self.conversations[conversation_id]
    
    def clear(self, conversation_id):
        if conversation_id in self.conversations:
            self.conversations[conversation_id] = []

class MemoryPage:
    """A page of memory containing conversation exchanges and metadata"""
    def __init__(self, content, metadata=None):
        self.content = content
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.access_count = 0
        
    def access(self):
        """Mark this page as accessed, updating metadata"""
        self.last_accessed = datetime.now()
        self.access_count += 1
        return self

    def to_dict(self):
        """Convert to dictionary for serialization"""
        return {
            "content": self.content,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "access_count": self.access_count
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create from dictionary (deserialization)"""
        page = cls(data["content"], data["metadata"])
        page.created_at = datetime.fromisoformat(data["created_at"])
        page.last_accessed = datetime.fromisoformat(data["last_accessed"])
        page.access_count = data["access_count"]
        return page

class HierarchicalMemory:
    """MemGPT-inspired hierarchical memory system with main memory and external storage"""
    def __init__(self, config=None):
        # Configuration
        self.config = {
            "main_memory_capacity": 10,  # Number of exchanges to keep in immediate context
            "attention_sink_size": 2,     # Number of important memories to always include
            "recency_weight": 0.6,        # Weight for recency in scoring (vs relevance)
            "relevance_threshold": 0.3,   # Minimum relevance score to retrieve
        }
        if config:
            self.config.update(config)
            
        # Memory structures
        self.main_memory = []               # Short-term/working memory (token context window)
        self.external_memory = {}           # Long-term storage by topic
        self.attention_sinks = []           # Critical memories that should always be accessible
        self.user_profile = {}              # Persistent information about the user
        self.embeddings_cache = {}          # Cache for computed embeddings
        
        # Statistics
        self.stats = {
            "total_exchanges": 0,
            "pages": 0,
            "retrievals": 0,
            "page_ins": 0,
            "page_outs": 0
        }
    
    def add_exchange(self, user_message: str, ai_message: str, user_metadata: Dict = None, ai_metadata: Dict = None):
        """Add a new conversation exchange to memory"""
        # Create memory pages for user and AI messages
        user_page = MemoryPage(
            content=user_message,
            metadata={
                "type": "user_message",
                "timestamp": datetime.now().isoformat(),
                **(user_metadata or {})
            }
        )
        
        ai_page = MemoryPage(
            content=ai_message,
            metadata={
                "type": "ai_message",
                "timestamp": datetime.now().isoformat(),
                **(ai_metadata or {})
            }
        )
        
        # Add to main memory
        self.main_memory.append((user_page, ai_page))
        
        # Check if we need to page out to external memory
        if len(self.main_memory) > self.config["main_memory_capacity"]:
            self._page_out()
            
        # Update memory statistics
        self.stats["total_exchanges"] += 1
        
        # Extract and update user profile information
        self._update_user_profile(user_message, user_metadata)
        
        return len(self.main_memory)
    
    def _page_out(self):
        """Move oldest memory from main memory to external memory"""
        # Remove oldest exchange from main memory (except attention sinks)
        oldest_exchange = self.main_memory.pop(0)
        user_page, ai_page = oldest_exchange
        
        # Extract topics for memory organization
        topics = self._extract_topics(user_page.content)
        
        # Store in external memory under each topic
        for topic in topics:
            if topic not in self.external_memory:
                self.external_memory[topic] = []
            self.external_memory[topic].append(oldest_exchange)
        
        # Update statistics
        self.stats["pages"] += 1
        self.stats["page_outs"] += 1
        
        # Check if this exchange should be an attention sink
        self._check_attention_sink_candidate(oldest_exchange)
    
    def _check_attention_sink_candidate(self, exchange):
        """Evaluate if an exchange should become an attention sink"""
        user_page, ai_page = exchange
        
        # Criteria for attention sinks:
        # 1. Message contains personal information about student
        # 2. Message defines learning goals or preferences
        # 3. Message contains important context for the tutoring relationship
        
        important_keywords = [
            "my name is", "i am", "i'm", "my goal", "my learning", 
            "i want to", "i need to", "i prefer", "my background",
            "my major", "my field", "remember this", "important"
        ]
        
        is_important = any(keyword in user_page.content.lower() for keyword in important_keywords)
        
        if is_important:
            # Only keep top N attention sinks
            self.attention_sinks.append(exchange)
            if len(self.attention_sinks) > self.config["attention_sink_size"]:
                self.attention_sinks.pop(0)  # Remove oldest attention sink
    
    def _update_user_profile(self, message, metadata=None):
        """Extract and update information about the user"""
        # This would be more sophisticated in production
        # Simple extraction of education level
        education_patterns = [
            (r"i'?m in (elementary|middle|high) school", "education_level"),
            (r"i'?m a (freshman|sophomore|junior|senior|college|university|graduate|phd) student", "education_level"),
            (r"i'?m studying ([a-zA-Z\s]+) at ([a-zA-Z\s]+)", "field_of_study"),
            (r"i want to learn about ([a-zA-Z\s]+)", "learning_interests"),
            (r"i'?m interested in ([a-zA-Z\s]+)", "interests"),
            (r"my name is ([a-zA-Z\s]+)", "name"),
            (r"call me ([a-zA-Z\s]+)", "name")
        ]
        
        # Extract information using patterns
        message_lower = message.lower()
        for pattern, key in education_patterns:
            match = re.search(pattern, message_lower)
            if match:
                # For capturing specific fields identified in the patterns
                if key in ["field_of_study", "learning_interests", "interests"]:
                    if key not in self.user_profile:
                        self.user_profile[key] = []
                    # Add to list, avoiding duplicates
                    value = match.group(1).strip()
                    if value not in self.user_profile[key]:
                        self.user_profile[key].append(value)
                else:
                    # For single-value fields
                    self.user_profile[key] = match.group(1).strip()
        
        # Update from metadata if provided
        if metadata:
            for key, value in metadata.items():
                if key.startswith("user_"):  # Only store user-related metadata
                    profile_key = key[5:]  # Remove 'user_' prefix
                    self.user_profile[profile_key] = value
    
    def _extract_topics(self, message):
        """Extract topic keywords from a message for memory organization"""
        # Core academic subjects
        academic_subjects = [
            "math", "mathematics", "algebra", "calculus", "geometry", "statistics",
            "physics", "chemistry", "biology", "anatomy", "ecology", "genetics",
            "history", "geography", "civics", "political science", "economics",
            "literature", "writing", "grammar", "language", "linguistics",
            "computer science", "programming", "coding", "algorithms",
            "psychology", "sociology", "anthropology", "philosophy",
            "art", "music", "theater", "film", "design"
        ]
        
        # Find matches in the message
        message_lower = message.lower()
        found_topics = []
        
        # Match core academic subjects
        for subject in academic_subjects:
            if subject in message_lower:
                found_topics.append(subject)
        
        # If no specific topics found, use general categories
        if not found_topics:
            # Try to categorize into general areas
            if any(term in message_lower for term in ["math", "equation", "number", "calculation"]):
                found_topics.append("mathematics")
            elif any(term in message_lower for term in ["science", "experiment", "theory", "natural"]):
                found_topics.append("science")
            elif any(term in message_lower for term in ["history", "past", "century", "ancient", "war", "civilization"]):
                found_topics.append("history")
            elif any(term in message_lower for term in ["book", "novel", "story", "author", "write", "essay"]):
                found_topics.append("literature")
            else:
                found_topics.append("general")
        
        return found_topics
    
    def retrieve_relevant_context(self, query, limit=3):
        """Retrieve relevant context from memory using semantic search"""
        # Start with attention sinks (always included)
        relevant_exchanges = []
        
        # Add attention sinks
        attention_content = []
        for exchange in self.attention_sinks:
            user_page, ai_page = exchange
            attention_content.append(f"Attention Sink - Student: {user_page.content}")
            attention_content.append(f"Attention Sink - Response: {ai_page.content}")
        
        # Compute query embedding for semantic search
        query_embedding = self._get_embedding(query)
        
        # Search in main memory first
        from_main = self._search_memory_segment(query, query_embedding, self.main_memory)
        
        # Then search in external memory
        from_external = []
        query_topics = self._extract_topics(query)
        
        # Collect all potentially relevant exchanges from external memory
        candidate_exchanges = []
        for topic in query_topics:
            if topic in self.external_memory:
                candidate_exchanges.extend(self.external_memory[topic])
        
        if candidate_exchanges:
            from_external = self._search_memory_segment(query, query_embedding, candidate_exchanges)
        
        # Combine results - first attention sinks, then main memory, then external
        combined = []
        
        # Add attention sink content
        if attention_content:
            combined.append("\n## Important Context\n" + "\n".join(attention_content))
        
        # Format and add main memory exchanges
        if from_main:
            main_content = [f"## Recent Conversation\n"]
            for score, exchange in from_main[:limit]:
                user_page, ai_page = exchange
                main_content.append(f"Student: {user_page.content}")
                main_content.append(f"Study Buddy: {ai_page.content[:200]}...")
            combined.append("\n".join(main_content))
        
        # Format and add external memory exchanges
        if from_external:
            external_content = [f"## Related Previous Exchanges\n"]
            for score, exchange in from_external[:limit]:
                user_page, ai_page = exchange
                external_content.append(f"Student previously asked: {user_page.content}")
                external_content.append(f"You answered: {ai_page.content[:200]}...")
            combined.append("\n".join(external_content))
        
        # Update statistics
        self.stats["retrievals"] += 1
        
        return "\n\n".join(combined)
    
    def _search_memory_segment(self, query, query_embedding, memory_segment):
        """Search within a specific memory segment using semantic similarity"""
        if not memory_segment:
            return []
            
        scored_exchanges = []
        
        # If embeddings are available, use semantic search
        if query_embedding is not None and embedding_model is not None:
            for exchange in memory_segment:
                user_page, _ = exchange
                
                # Get or compute embedding for this exchange
                page_embedding = self._get_embedding(user_page.content)
                
                if page_embedding is not None:
                    # Compute semantic similarity
                    similarity = np.dot(query_embedding, page_embedding)
                    
                    # Skip if below relevance threshold
                    if similarity < self.config["relevance_threshold"]:
                        continue
                    
                    # Calculate recency score (normalized by time decay)
                    time_diff = (datetime.now() - user_page.last_accessed).total_seconds() / 3600  # hours
                    recency_score = 1.0 / (1.0 + time_diff/24)  # decay over days
                    
                    # Combined score (weighted sum of similarity and recency)
                    combined_score = (1-self.config["recency_weight"]) * similarity + self.config["recency_weight"] * recency_score
                    
                    scored_exchanges.append((combined_score, exchange))
        else:
            # Fallback to keyword matching if embeddings unavailable
            keywords = self._extract_keywords(query)
            
            for exchange in memory_segment:
                user_page, _ = exchange
                
                # Count keyword matches
                match_count = sum(1 for kw in keywords if kw in user_page.content.lower())
                if match_count == 0:
                    continue
                    
                # Normalize by total keywords
                similarity = match_count / len(keywords) if keywords else 0
                
                # Calculate recency score
                time_diff = (datetime.now() - user_page.last_accessed).total_seconds() / 3600
                recency_score = 1.0 / (1.0 + time_diff/24)
                
                # Combined score
                combined_score = (1-self.config["recency_weight"]) * similarity + self.config["recency_weight"] * recency_score
                
                scored_exchanges.append((combined_score, exchange))
        
        # Sort by score (descending)
        scored_exchanges.sort(reverse=True, key=lambda x: x[0])
        
        # Mark accessed pages
        for _, exchange in scored_exchanges:
            user_page, ai_page = exchange
            user_page.access()
            ai_page.access()
        
        return scored_exchanges
    
    def _get_embedding(self, text):
        """Get embedding for text, using cache to avoid recomputation"""
        # In our simplified implementation, let's just return None
        # In a real implementation, this would use sentence-transformers
        return None
            
    def _extract_keywords(self, text):
        """Extract keywords from text for basic relevance matching"""
        # Remove common stopwords
        stopwords = {"a", "an", "the", "and", "or", "but", "is", "are", "in", "to", "for", "with", "on", "at"}
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [word for word in words if word not in stopwords and len(word) > 2]
        return keywords
    
    def get_memory_summary(self):
        """Generate a summary of memory state and user profile"""
        summary = []
        
        # User profile summary
        if self.user_profile:
            summary.append("## Student Profile")
            for key, value in self.user_profile.items():
                if isinstance(value, list):
                    summary.append(f"- {key.replace('_', ' ').title()}: {', '.join(value)}")
                else:
                    summary.append(f"- {key.replace('_', ' ').title()}: {value}")
        
        # Memory statistics
        summary.append("## Memory Statistics")
        summary.append(f"- Current session exchanges: {len(self.main_memory)}")
        summary.append(f"- Total knowledge areas: {len(self.external_memory)}")
        summary.append(f"- Total stored exchanges: {self.stats['total_exchanges']}")
        
        # Topics with stored knowledge
        if self.external_memory:
            topics = list(self.external_memory.keys())
            topics_str = ", ".join(topics[:5])
            if len(topics) > 5:
                topics_str += f" and {len(topics) - 5} more"
            summary.append(f"- Knowledge areas: {topics_str}")
        
        return "\n".join(summary)
    
    def save_to_file(self, filepath):
        """Serialize memory to file"""
        memory_data = {
            "main_memory": [
                (user.to_dict(), ai.to_dict())
                for user, ai in self.main_memory
            ],
            "external_memory": {
                topic: [
                    (user.to_dict(), ai.to_dict())
                    for user, ai in exchanges
                ]
                for topic, exchanges in self.external_memory.items()
            },
            "attention_sinks": [
                (user.to_dict(), ai.to_dict())
                for user, ai in self.attention_sinks
            ],
            "user_profile": self.user_profile,
            "stats": self.stats,
            "config": self.config
        }
        
        with open(filepath, 'w') as f:
            json.dump(memory_data, f)
    
    @classmethod
    def load_from_file(cls, filepath):
        """Load memory from serialized file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        memory = cls(config=data.get("config"))
        
        # Restore main memory
        memory.main_memory = [
            (MemoryPage.from_dict(user), MemoryPage.from_dict(ai))
            for user, ai in data.get("main_memory", [])
        ]
        
        # Restore external memory
        memory.external_memory = {
            topic: [
                (MemoryPage.from_dict(user), MemoryPage.from_dict(ai))
                for user, ai in exchanges
            ]
            for topic, exchanges in data.get("external_memory", {}).items()
        }
        
        # Restore attention sinks
        memory.attention_sinks = [
            (MemoryPage.from_dict(user), MemoryPage.from_dict(ai))
            for user, ai in data.get("attention_sinks", [])
        ]
        
        # Restore user profile and stats
        memory.user_profile = data.get("user_profile", {})
        memory.stats = data.get("stats", {})
        
        return memory

# Define state type for LangGraph with additional context fields
class State(TypedDict):
    messages: Annotated[list, add_messages]
    context: dict  # Store persistent context like academic level, topics of interest, etc.
    memory: str    # Store conversation summary
    reasoning: List[Dict[str, str]]  # Store reasoning steps

class WebSearchAgent:
    """Main agent class for web search functionality"""
    
    def __init__(self, llm, tools):
        """Initialize the agent with LLM and tools"""
        self.llm = llm
        self.tools = tools
        self.url_tracker = URLTracker()
        self.critic_framework = CriticFramework(llm)
        self.conversations = {}
        self.conversation_contexts = {}
        self.hierarchical_memories = {}
        self.memory_dir = "memory_store"
        
    def chatbot(self, state: State):
        """Main chatbot node function"""
        try:
            # Get context and memory information
            context = state.get("context", {})
            memory_content = state.get("memory", "")
            memory_summary = state.get("memory_summary", "")
            
            # Initialize reasoning steps
            reasoning_steps = []
            
            # Convert messages to proper message types with better error handling
            lc_messages = []
            for message in state["messages"]:
                # Check if message is a tuple (expected format: (role, content))
                if isinstance(message, tuple) and len(message) == 2:
                    msg_type, content = message
                    if msg_type == "user":
                        # Add initial reasoning step
                        reasoning_steps.append({
                            "type": "thought",
                            "content": "I need to understand the user's query and determine the best approach to answer it."
                        })
                        
                        # Check if we have relevant memory content
                        if memory_content:
                            reasoning_steps.append({
                                "type": "memory",
                                "content": "Retrieving relevant context from hierarchical memory system"
                            })
                        
                        lc_messages.append(HumanMessage(content=content))
                    elif msg_type == "ai":
                        lc_messages.append(AIMessage(content=content))
                elif hasattr(message, 'type'):
                    lc_messages.append(message)
                else:
                    logger.warning(f"Skipping message with unexpected format: {message}")
            
            # Build a dynamic system prompt that includes context and memory
            dynamic_system_prompt = self._build_system_prompt(context, memory_content, memory_summary)
            
            # Add system message at the beginning
            system_message = SystemMessage(content=dynamic_system_prompt)
            lc_messages.insert(0, system_message)
            
            # Call the LLM with properly formatted messages
            result = self.llm.invoke(lc_messages)
            
            # Add final reasoning step
            reasoning_steps.append({
                "type": "action",
                "content": "Generated response with citations and references"
            })
            
            # Validate reasoning steps to ensure all keys and values are strings
            validated_reasoning = []
            for step in reasoning_steps:
                validated_step = {}
                for k, v in step.items():
                    # Ensure keys are strings
                    key = str(k) if not isinstance(k, str) else k
                    # Ensure values are strings
                    value = str(v) if not isinstance(v, str) else v
                    validated_step[key] = value
                validated_reasoning.append(validated_step)
            
            # Return updated state with all fields preserved
            return {
                "messages": state["messages"] + [result],
                "context": state.get("context", {}),
                "memory": state.get("memory", ""),
                "memory_summary": state.get("memory_summary", ""),
                "reasoning": validated_reasoning
            }
        except Exception as e:
            logger.error(f"Error in chatbot node: {str(e)}")
            # Return a generic error message as a fallback, preserving state
            error_message = AIMessage(content="I'm sorry, I encountered an error processing your request. Please try again.")
            return {
                "messages": state["messages"] + [error_message],
                "context": state.get("context", {}),
                "memory": state.get("memory", ""),
                "memory_summary": state.get("memory_summary", ""),
                "reasoning": [{"type": "error", "content": str(e)}]
            }
    
    def _build_system_prompt(self, context, memory_content, memory_summary):
        """Build a dynamic system prompt incorporating context and memory"""
        system_prompt = """You are **Study Buddy**, a knowledgeable and friendly AI assistant built to help students excel in learning and research.

🎯 Your goals:
- Provide **clear, well-structured, and academically sound** responses.
- Support students across **all education levels**, adapting complexity accordingly.
- Use **available tools** (Wikipedia, ArXiv, Tavily search, URL extractor) to back up answers with verified sources.
- Apply the **CRITIC framework** to verify information and self-correct when necessary.

🧠 When answering:
1. Break down complex concepts into **digestible parts**.
2. Synthesize insights from **multiple tools** and **cross-reference** if needed.
3. Include **diagrams, tables, or step-by-step explanations** if helpful.
4. When using search tools, explain briefly **what was searched** and **why the tool was selected**.
5. Add **insightful follow-up questions** or suggestions to encourage deeper thinking.

FORMAT FOR REFERENCES:
Always end your response with a "References" section that lists your sources using one of these citation styles:

For websites:
- [Website Title]. (Year if available). Retrieved from [URL]
  Example: Khan Academy. (2022). Retrieved from https://www.khanacademy.org/science/biology/photosynthesis

For books:
- [Author Last Name, Initials]. (Year). [Book Title]. [Publisher]
  Example: Campbell, N.A. & Reece, J.B. (2005). Biology (7th ed.). Benjamin Cummings

For academic papers (when using ArXiv):
- [Author(s)]. (Year). [Paper Title]. arXiv:[ID]
  Example: Smith, J. & Jones, T. (2021). Advances in Machine Learning. arXiv:2101.12345

For Wikipedia:
- Wikipedia. (n.d.). [Article Title]. Retrieved [current date]
  Example: Wikipedia. (n.d.). Photosynthesis. Retrieved April 23, 2023

Remember, your job is not just to **answer**, but to **empower students to learn deeply**.
EVERY RESPONSE MUST INCLUDE A REFERENCES SECTION.
"""
        
        # Add memory content if available
        if memory_content:
            system_prompt += f"\n\n{memory_content}\n"
            
        # Add memory summary if available
        if memory_summary:
            system_prompt += f"\n\nMEMORY SUMMARY:\n{memory_summary}\n"
        
        # Add context information if available
        if context:
            context_info = "\n\nCONVERSATION CONTEXT:\n"
            if "academic_level" in context:
                context_info += f"- Student Academic Level: {context['academic_level']}\n"
            if "interests" in context:
                context_info += f"- Topics of Interest: {', '.join(context['interests'])}\n"
            if "preferred_style" in context:
                context_info += f"- Preferred Learning Style: {context['preferred_style']}\n"
            if "stem_focus" in context:
                context_info += f"- STEM Focus: {context['stem_focus']}\n"
            
            system_prompt += context_info
        
        return system_prompt
    
    def tool_router(self, state):
        """Route to appropriate tools based on the most recent user message"""
        try:
            # Extract the most recent user message
            user_messages = [msg for msg in state["messages"] if isinstance(msg, tuple) and msg[0] == "user"]
            if not user_messages:
                # Return full state with tool_choice = None
                return {
                    "tool_choice": None,
                    "messages": state.get("messages", []),
                    "context": state.get("context", {}),
                    "memory": state.get("memory", ""),
                    "memory_summary": state.get("memory_summary", ""),
                    "reasoning": state.get("reasoning", [])
                }
                
            latest_user_message = user_messages[-1][1]
            
            # Get preferred tools based on message content
            preferred_tools = self._select_tools(latest_user_message)
            
            # Get STEM focus from context if available
            context = state.get("context", {})
            stem_focus = context.get("stem_focus", False)
            
            # Further adjust tool preference based on context
            if stem_focus and "arxiv" in preferred_tools:
                # Move ArXiv to first position for STEM-focused students
                preferred_tools.remove("arxiv")
                preferred_tools.insert(0, "arxiv")
            
            # Return full state with updated tool_choice
            return {
                "tool_choice": preferred_tools[0] if preferred_tools else None,
                "messages": state.get("messages", []),
                "context": state.get("context", {}),
                "memory": state.get("memory", ""),
                "memory_summary": state.get("memory_summary", ""),
                "reasoning": state.get("reasoning", [])
            }
        except Exception as e:
            logger.error(f"Error in tool router: {str(e)}")
            # Return full state with tool_choice = None
            return {
                "tool_choice": None,
                "messages": state.get("messages", []),
                "context": state.get("context", {}),
                "memory": state.get("memory", ""),
                "memory_summary": state.get("memory_summary", ""),
                "reasoning": [{"type": "error", "content": str(e)}]
            }
    
    def _select_tools(self, query):
        """Select appropriate tools based on query content"""
        query_lower = query.lower()
        
        # STEM topic detection
        stem_keywords = ["math", "physics", "chemistry", "biology", "engineering", 
                        "quantum", "algorithm", "molecule", "protein", "theorem"]
        
        # Academic paper indicators                
        paper_keywords = ["paper", "research", "publication", "journal", "study", 
                         "experiment", "findings", "published", "arxiv"]
        
        # Current events indicators
        current_keywords = ["recent", "latest", "new", "current", "today", "this year", 
                           "2023", "2024", "2025", "news"]
        
        # URL indicators
        url_indicators = ["http", "https", "www.", ".com", ".org", ".edu"]
        
        # Determine the correct tool priorities
        if any(keyword in query_lower for keyword in stem_keywords) and any(keyword in query_lower for keyword in paper_keywords):
            # STEM research papers - prioritize ArXiv
            return ["arxiv", "wikipedia", "tavily"]
        elif any(indicator in query_lower for indicator in url_indicators):
            # URL extraction request
            return ["tavily_extract", "tavily"]
        elif any(keyword in query_lower for keyword in current_keywords):
            # Current events - prioritize Tavily web search
            return ["tavily", "wikipedia", "arxiv"]
        else:
            # General knowledge - start with Wikipedia
            return ["wikipedia", "tavily", "arxiv"]
    
    def create_graph(self):
        """Create and return the workflow graph for the agent"""
        try:
            # Define a wrapper function to integrate critic framework with LangGraph
            def critic_node(state):
                return self.critic_framework.reflect_on_tool_output(state)
    
            # Create a custom tool executor that tracks URLs
            def tool_node_wrapper(state):
                # Extract conversation_id from context if available
                conversation_id = None
                try:
                    if "context" in state and "conversation_id" in state["context"]:
                        conversation_id = state["context"]["conversation_id"]
                except Exception as e:
                    logger.error(f"Error extracting conversation_id: {str(e)}")
                    
                # Execute the original tool node
                tool_name = state.get("tool_choice", "")
                logger.info(f"Executing tool: {tool_name} for conversation: {conversation_id}")
                
                # Call the underlying tool
                tool_node = ToolNode(
                    tools=self.tools,
                    name="tool_executor",
                    handle_tool_errors=True
                )
                result = tool_node.invoke(state)
                
                # Track URLs by examining tool outputs
                if conversation_id:
                    # Track URLs from function message outputs
                    try:
                        for message in result.get("messages", []):
                            if hasattr(message, 'type') and message.type == "function":
                                content = message.content
                                # Extract URLs from content
                                urls = re.findall(r'https?://[^\s)"]+', content)
                                for url in urls:
                                    self.url_tracker.track_url(conversation_id, url, tool_name)
                    except Exception as e:
                        logger.error(f"Error processing tool output for URL tracking: {str(e)}")
                
                return result
            
            # Build the graph
            graph_builder = StateGraph(State)
            graph_builder.add_node("chatbot", self.chatbot)
            graph_builder.add_node("tool_router", self.tool_router)
            graph_builder.add_node("critic", critic_node)  # Add CRITIC reflection node
            
            # Use our custom wrapper instead of direct ToolNode
            graph_builder.add_node("tools", tool_node_wrapper)
    
            # Add conditional edges with tool routing
            graph_builder.add_edge(START, "tool_router")
            graph_builder.add_edge("tool_router", "chatbot")
            
            # Add conditional edges for tool execution
            graph_builder.add_conditional_edges(
                "chatbot",
                tools_condition
            )
            
            # Add CRITIC framework to the workflow
            graph_builder.add_edge("tools", "critic")
            
            # Conditional edge from CRITIC reflection
            graph_builder.add_conditional_edges(
                "critic",
                lambda x: x.get("need_additional_tools", False),
                {
                    True: "tool_router",  # If more info needed, route to another tool
                    False: "chatbot"      # Otherwise proceed to response
                }
            )
    
            return graph_builder.compile()
        except Exception as e:
            logger.error(f"Error creating graph: {str(e)}")
            return None
    
    def extract_searched_websites(self, conversation_id):
        """Extract websites searched during the conversation"""
        return self.url_tracker.get_urls(conversation_id)
    
    def get_detailed_websites(self, conversation_id):
        """Get detailed information about websites searched during the conversation"""
        return self.url_tracker.get_detailed_urls(conversation_id)
    
    def clear_url_tracking(self, conversation_id):
        """Clear URL tracking for a conversation"""
        self.url_tracker.clear(conversation_id)
    
    # Memory-related methods
    def get_or_create_memory(self, conversation_id, memory_dir=None):
        """Get or create hierarchical memory for a conversation"""
        if conversation_id in self.hierarchical_memories:
            return self.hierarchical_memories[conversation_id]
        
        # Create new memory
        memory = HierarchicalMemory()
        self.hierarchical_memories[conversation_id] = memory
        return memory
    
    def save_memory(self, conversation_id, memory_dir=None):
        """Save memory to disk"""
        if not memory_dir:
            memory_dir = self.memory_dir
            
        if conversation_id in self.hierarchical_memories:
            memory = self.hierarchical_memories[conversation_id]
            try:
                import os
                os.makedirs(memory_dir, exist_ok=True)
                memory_path = os.path.join(memory_dir, f"{conversation_id}.json")
                memory.save_to_file(memory_path)
                return True
            except Exception as e:
                logger.error(f"Error saving memory: {str(e)}")
                return False
        return False