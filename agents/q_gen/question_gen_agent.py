from typing import Dict, List, Any, Generator
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
import json
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuestionGenerationSystem:
    def __init__(self, llm_factory, llm_provider="openai", model=None):
        """Initialize the question generation system
        
        Args:
            llm_factory: Factory to create LLM instances
            llm_provider: The LLM provider to use
            model: Specific model to use
        """
        self.llm_factory = llm_factory
        self.llm_provider = llm_provider
        self.model = model
        self.orchestrator_llm = llm_factory.create_llm(
            provider=llm_provider, 
            model=model
        )
        self.worker_llm = llm_factory.create_llm(
            provider=llm_provider,
            model=model
        )
        
    def _create_summarization_chain(self):
        """Create a chain to summarize chunks"""
        prompt = ChatPromptTemplate.from_template(
            """Summarize the following text to capture the key concepts, facts, and ideas:
            
            {chunk_content}
            
            Provide a concise summary that would be useful for generating MCQ questions."""
        )
        
        return prompt | self.worker_llm
        
    def _create_question_generation_chain(self):
        """Create a chain to generate questions from summaries"""
        prompt = ChatPromptTemplate.from_template(
            """Generate {num_questions} multiple-choice questions based on the following content:
            
            {content}
            
            For each question, provide:
            1. Question text
            2. Four options (A, B, C, D), with only one correct answer
            3. The letter of the correct answer
            4. Three helpful hints of increasing specificity
            5. Difficulty level (Easy, Medium, Hard)
            
            Format each question as a JSON object. The entire response should be a valid JSON array.
            
            Example format:
            ```json
            [
              {{
                "id": "q-123456",
                "question": "What is the capital of France?",
                "options": {{
                  "A": "London",
                  "B": "Berlin",
                  "C": "Paris",
                  "D": "Madrid"
                }},
                "answer": "C",
                "hints": [
                  "It's located in Western Europe",
                  "It's known as the 'City of Light'",
                  "The Eiffel Tower is located there"
                ],
                "difficulty": "Easy"
              }}
            ]
            ```
            
            Generate only valid, well-formed JSON that can be parsed. Add a unique ID for each question.
            """
        )
        
        return prompt | self.worker_llm
    
    def _process_chunk(self, state: dict) -> dict:
        """Process a single chunk to generate questions"""
        try:
            chunk = state["current_chunk"]
            logger.info(f"Processing chunk: {chunk.metadata.get('chunk_id', 'unknown')} of {chunk.metadata.get('total_chunks', 'unknown')}")
            
            summarization_chain = self._create_summarization_chain()
            
            # First summarize the chunk
            summary = summarization_chain.invoke({"chunk_content": chunk.page_content})
            
            # Then generate questions from the summary
            question_chain = self._create_question_generation_chain()
            
            questions_response = question_chain.invoke({
                "content": summary.content,
                "num_questions": state.get("questions_per_chunk", 3)
            })
            
            # Extract JSON from response
            try:
                questions = self._extract_json(questions_response.content)
                
                # Add unique IDs to questions if not already present
                for q in questions:
                    if "id" not in q:
                        q["id"] = f"q-{uuid.uuid4().hex[:8]}"
                
                return {
                    **state,
                    "chunk_results": {
                        "chunk_id": chunk.metadata.get("chunk_id", "unknown"),
                        "questions": questions
                    }
                }
            except Exception as e:
                logger.error(f"JSON extraction failed: {str(e)}")
                return {
                    **state,
                    "chunk_results": {
                        "chunk_id": chunk.metadata.get("chunk_id", "unknown"),
                        "error": str(e)
                    }
                }
        except Exception as e:
            logger.error(f"Error in _process_chunk: {str(e)}")
            chunk_id = "unknown"
            if "current_chunk" in state and hasattr(state["current_chunk"], "metadata"):
                chunk_id = state["current_chunk"].metadata.get("chunk_id", "unknown")
            return {
                **state,
                "chunk_results": {
                    "chunk_id": chunk_id,
                    "error": f"Critical error in _process_chunk: {str(e)}"
                }
            }
    
    def _extract_json(self, text):
        """Extract JSON from LLM response text"""
        if not isinstance(text, str):
            logger.warning(f"_extract_json expected string but got {type(text)}")
            if hasattr(text, 'content'): 
                text = text.content
            elif isinstance(text, dict) and 'content' in text: 
                text = text['content']
            else: 
                text = str(text)

        try:
            # Try finding ```json blocks first
            json_match = None
            if "```json" in text:
                match = text.split("```json", 1)
                if len(match) > 1 and "```" in match[1]:
                    json_match = match[1].split("```", 1)[0].strip()
            # Fallback to finding plain ``` blocks
            elif "```" in text:
                match = text.split("```", 1)
                if len(match) > 1 and "```" in match[1]:
                    json_match = match[1].split("```", 1)[0].strip()

            if json_match:
                json_str = json_match
            else:
                # Fallback: Try to find the first '[' or '{' and parse from there
                first_bracket = -1
                first_curly = -1
                try: first_bracket = text.index('[')
                except ValueError: pass
                try: first_curly = text.index('{')
                except ValueError: pass

                if first_bracket != -1 and (first_curly == -1 or first_bracket < first_curly):
                    json_str = text[first_bracket:]
                elif first_curly != -1:
                    json_str = text[first_curly:]
                else:
                    json_str = text

            return json.loads(json_str)

        except json.JSONDecodeError:
            # Attempt cleanup
            cleaned_json = ''.join(c for c in text if ord(c) < 128)  # Basic ASCII clean
            cleaned_json = cleaned_json.replace("'", '"').replace("\\'", "'").replace('\\"', '"')  # Handle quotes
            
            try:
                return json.loads(cleaned_json)
            except json.JSONDecodeError:
                # Last resort: return a single dummy question to avoid breaking the flow
                return [{"id": f"q-error-{uuid.uuid4().hex[:8]}",
                       "question": "Error extracting questions from this section", 
                       "options": {"A": "Error", "B": "Error", "C": "Error", "D": "Error"}, 
                       "answer": "A",
                       "hints": ["Error processing this content"],
                       "difficulty": "Medium"}]
        except Exception as e:
            logger.error(f"Unexpected error during JSON extraction: {e}")
            # Return minimal valid result as fallback
            return [{"id": f"q-error-{uuid.uuid4().hex[:8]}",
                   "question": "Error processing this section", 
                   "options": {"A": "Error", "B": "Error", "C": "Error", "D": "Error"}, 
                   "answer": "A",
                   "hints": ["Error processing this content"],
                   "difficulty": "Medium"}]
    
    def _should_process_or_end(self, state: dict) -> str:
        """Decide whether to process the next chunk or end the workflow."""
        if "chunks" not in state or "current_chunk_index" not in state:
            return END

        current_index = state["current_chunk_index"]
        total_chunks = len(state["chunks"])

        if current_index < total_chunks:
            return "process_chunk"
        else:
            return END
    
    def _setup_next_chunk(self, state: dict) -> dict:
        """Prepare the next chunk for processing"""
        next_index = state.get("current_chunk_index", 0)

        if "chunks" not in state or not isinstance(state["chunks"], list):
            return {**state, "error": "Chunks missing in state"}

        if next_index < len(state["chunks"]):
            current_chunk = state["chunks"][next_index]
            # Ensure metadata exists
            if not hasattr(current_chunk, 'metadata') or not isinstance(current_chunk.metadata, dict):
                current_chunk.metadata = getattr(current_chunk, 'metadata', {}) or {}
                current_chunk.metadata["chunk_id"] = current_chunk.metadata.get("chunk_id", next_index)
                current_chunk.metadata["total_chunks"] = len(state["chunks"])

            return {
                **state,
                "current_chunk": current_chunk,
                "current_chunk_index": next_index + 1,
                "progress": {
                    "current": next_index + 1,
                    "total": len(state["chunks"])
                }
            }
        else:
            return state
    
    def _collect_results(self, state: dict) -> dict:
        """Collect and organize all generated questions"""
        results = state.get("all_results", [])
        chunk_result = state.get("chunk_results", {})

        if chunk_result:
            results.append(chunk_result)

        # Clean up chunk_results for the next iteration
        updated_state = {k: v for k, v in state.items() if k != "chunk_results"}
        updated_state["all_results"] = results
        
        return updated_state

    def build_graph(self):
        """Build the workflow graph for question generation"""
        workflow = StateGraph(dict)

        # Add nodes for the workflow
        workflow.add_node("setup_next_chunk", self._setup_next_chunk)
        workflow.add_node("process_chunk", self._process_chunk)
        workflow.add_node("collect_results", self._collect_results)

        # Set entry point
        workflow.set_entry_point("setup_next_chunk")
        
        # Define edges for the main loop
        workflow.add_edge("setup_next_chunk", "process_chunk")
        workflow.add_edge("process_chunk", "collect_results")

        # After collecting results, check if we should continue
        workflow.add_conditional_edges(
            "collect_results",
            self._should_process_or_end,
            {
                "process_chunk": "setup_next_chunk",
                END: END
            }
        )

        # Compile graph
        logger.info("Compiling question generation workflow graph")
        compiled_graph = workflow.compile()
        return compiled_graph
    
    def generate_questions(self, chunks, questions_per_chunk=3):
        """Generate questions from document chunks using stream"""
        logger.info(f"Starting question generation with {len(chunks)} chunks, {questions_per_chunk} questions per chunk")
        if not chunks:
            yield {
                "status": "complete",
                "questions": [],
                "total_questions": 0,
                "message": "No content chunks to process."
            }
            return

        workflow = self.build_graph()

        initial_state = {
            "chunks": chunks,
            "current_chunk_index": 0,
            "questions_per_chunk": questions_per_chunk,
            "all_results": [],
            "progress": {"current": 0, "total": len(chunks)}
        }

        recursion_limit = len(chunks) * 5 + 20  # Adjusted limit + buffer

        final_state = None
        try:
            # Stream the execution
            for i, state_update in enumerate(workflow.stream(initial_state, {"recursion_limit": recursion_limit})):
                # Get the actual state dictionary
                last_node = list(state_update.keys())[-1]
                current_state = state_update[last_node]

                # Yield progress update to the client
                progress_yield = {
                    "status": "in_progress",
                    "progress": current_state.get("progress", {"current": 0, "total": len(chunks)}),
                    "current_chunk_display": min(current_state.get("current_chunk_index", 0), len(chunks)),
                    "total_chunks": len(chunks),
                    "results_count": len(current_state.get("all_results", []))
                }
                yield progress_yield

                final_state = current_state  # Keep track of the latest state

            # Process the final state after the stream completes
            all_results = final_state.get("all_results", [])

            all_questions = []
            errors = []
            for chunk_result in all_results:
                if "questions" in chunk_result and isinstance(chunk_result["questions"], list):
                    all_questions.extend(chunk_result["questions"])
                elif "error" in chunk_result:
                    errors.append(f"Chunk {chunk_result.get('chunk_id', 'N/A')}: {chunk_result['error']}")

            final_output = {
                "status": "complete" if not errors else "complete_with_errors",
                "questions": all_questions,
                "total_questions": len(all_questions),
                "errors": errors,
                "message": f"Generated {len(all_questions)} questions." + (f" Encountered {len(errors)} errors." if errors else "")
            }
            yield final_output

        except Exception as e:
            logger.error(f"Workflow stream failed: {str(e)}")
            yield {
                "status": "error",
                "message": f"Error during question generation workflow: {str(e)}",
                "questions": [],
                "total_questions": 0
            }