from typing import Dict, List, Any
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END, START  # Added START import
from langchain_core.messages import HumanMessage
import json

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
            
            Generate only valid, well-formed JSON that can be parsed.
            """
        )
        
        return prompt | self.worker_llm
    
    def _process_chunk(self, state: dict) -> dict:  # Explicitly type hint state as dict
        """Process a single chunk to generate questions"""
        # Remove the initial string check if the graph logic is fixed
        # if isinstance(state, str): ...

        print(f"\n[DEBUG] Starting _process_chunk with state keys: {list(state.keys())}")

        # Add defensive checks for expected keys
        if "current_chunk" not in state:
            print("[DEBUG ERROR] _process_chunk: 'current_chunk' not found in state.")
            return {**state, "chunk_results": {"error": "Missing current_chunk in state"}}
        if "questions_per_chunk" not in state:
             print("[DEBUG ERROR] _process_chunk: 'questions_per_chunk' not found in state.")
             # Provide a default or handle error
             state["questions_per_chunk"] = 3  # Example default

        try:
            chunk = state["current_chunk"]
            print(f"[DEBUG] Processing chunk: {chunk.metadata.get('chunk_id', 'unknown')} of {chunk.metadata.get('total_chunks', 'unknown')}")
            print(f"[DEBUG] Chunk content length: {len(chunk.page_content)} characters")
            print(f"[DEBUG] Chunk content preview: {chunk.page_content[:200]}...")
            
            summarization_chain = self._create_summarization_chain()
            print(f"[DEBUG] Created summarization chain")
            
            # First summarize the chunk
            print(f"[DEBUG] Invoking summarization chain with LLM: {self.llm_provider}, model: {self.model}")
            summary = summarization_chain.invoke({"chunk_content": chunk.page_content})
            print(f"[DEBUG] Summarization complete. Summary type: {type(summary)}")
            print(f"[DEBUG] FULL SUMMARY: {summary.content}")
            
            # Then generate questions from the summary
            question_chain = self._create_question_generation_chain()
            print(f"[DEBUG] Created question generation chain")
            print(f"[DEBUG] Invoking question chain with num_questions={state.get('questions_per_chunk', 3)}")
            
            questions_response = question_chain.invoke({
                "content": summary.content,
                "num_questions": state.get("questions_per_chunk", 3)
            })
            print(f"[DEBUG] Question generation complete. Response type: {type(questions_response)}")
            
            if hasattr(questions_response, 'content'):
                print(f"[DEBUG] Response content type: {type(questions_response.content)}")
                print(f"[DEBUG] FULL RESPONSE CONTENT: {questions_response.content}")
            else:
                print(f"[DEBUG] Response has no content attribute. Full response: {questions_response}")
            
            # Enhanced JSON extraction with better error handling
            try:
                print(f"[DEBUG] Attempting to extract JSON from response content: {str(questions_response.content)[:500]}...")
                questions = self._extract_json(questions_response.content)
                print(f"[DEBUG] JSON extraction successful. Extracted {len(questions)} questions")
                print(f"[DEBUG] QUESTIONS JSON: {json.dumps(questions, indent=2)}")
                return {
                    **state,
                    "chunk_results": {
                        "chunk_id": chunk.metadata.get("chunk_id", "unknown"),
                        "questions": questions
                    }
                }
            except Exception as e:
                print(f"[DEBUG ERROR] JSON extraction failed: {str(e)}")
                print(f"[DEBUG ERROR] Error type: {type(e).__name__}")
                import traceback
                print(f"[DEBUG ERROR] Traceback: {traceback.format_exc()}")
                return {
                    **state,
                    "chunk_results": {
                        "chunk_id": chunk.metadata.get("chunk_id", "unknown"),
                        "error": str(e)
                    }
                }
        except Exception as e:
            print(f"[DEBUG CRITICAL ERROR] _process_chunk failed: {str(e)}")
            print(f"[DEBUG CRITICAL ERROR] Error type: {type(e).__name__}")
            import traceback
            print(f"[DEBUG CRITICAL ERROR] Traceback: {traceback.format_exc()}")
            # Ensure chunk_id exists if possible
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
        """Extract JSON from LLM response text (enhanced logging)"""
        if not isinstance(text, str):
            print(f"[DEBUG WARN] _extract_json expected string but got {type(text)}")
            if hasattr(text, 'content'): text = text.content
            elif isinstance(text, dict) and 'content' in text: text = text['content']
            else: text = str(text)

        print(f"[DEBUG] Raw text for JSON extraction: {text[:500]}...")  # Log the raw text

        try:
            # Try finding ```json blocks first
            json_match = None
            if "```json" in text:
                match = text.split("```json", 1)
                if len(match) > 1 and "```" in match[1]:
                    json_match = match[1].split("```", 1)[0].strip()
                    print("[DEBUG] Found ```json block.")
            # Fallback to finding plain ``` blocks
            elif "```" in text:
                match = text.split("```", 1)
                if len(match) > 1 and "```" in match[1]:
                    json_match = match[1].split("```", 1)[0].strip()
                    print("[DEBUG] Found ``` block.")

            if json_match:
                json_str = json_match
            else:
                # Fallback: Try to find the first '[' or '{' and parse from there
                # This is less reliable but can help with non-markdown responses
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
                    json_str = text  # Give up and try parsing the whole thing
                print("[DEBUG] No ``` blocks found, attempting direct parse.")

            print(f"[DEBUG] Attempting to parse JSON string: {json_str[:500]}...")
            return json.loads(json_str)

        except json.JSONDecodeError as e:
            print(f"[DEBUG ERROR] Initial JSON parsing failed: {e}. Raw string was: {json_str[:200]}...")
            # Attempt cleanup
            cleaned_json = ''.join(c for c in json_str if ord(c) < 128)  # Basic ASCII clean
            cleaned_json = cleaned_json.replace("'", '"').replace("\\'", "'").replace('\\"', '"')  # Handle quotes
            
            try:
                print(f"[DEBUG] Attempting parsing cleaned JSON: {cleaned_json[:200]}...")
                return json.loads(cleaned_json)
            except json.JSONDecodeError as e2:
                print(f"[DEBUG ERROR] Cleaned JSON parsing failed: {e2}")
                # Last resort: return a single dummy question to avoid breaking the flow
                return [{"question": "Error extracting questions from this section", 
                       "options": {"A": "Error", "B": "Error", "C": "Error", "D": "Error"}, 
                       "answer": "A",
                       "hints": ["Error processing this content"],
                       "difficulty": "Medium"}]

        except Exception as e:
            print(f"[DEBUG ERROR] Unexpected error during JSON extraction: {e}")
            import traceback
            print(f"[DEBUG ERROR] Traceback: {traceback.format_exc()}")
            # Return minimal valid result as fallback
            return [{"question": "Error processing this section", 
                   "options": {"A": "Error", "B": "Error", "C": "Error", "D": "Error"}, 
                   "answer": "A",
                   "hints": ["Error processing this content"],
                   "difficulty": "Medium"}]
    
    def _orchestrator_decide(self, state):
        """Decide the next step in the workflow"""
        # Handle case when state is a string (from conditional edge routing)
        if isinstance(state, str):
            print(f"[DEBUG] _orchestrator_decide received state as string: {state}")
            return state
            
        if state.get("current_chunk_index", 0) >= len(state["chunks"]):
            print(f"[DEBUG] Orchestrator deciding to END: chunk {state.get('current_chunk_index', 0)} >= {len(state['chunks'])}")
            return END  # Using END constant instead of "complete" string
        else:
            print(f"[DEBUG] Orchestrator deciding to process_chunk: chunk {state.get('current_chunk_index', 0)} < {len(state['chunks'])}")
            return "process_chunk"
    
    def _setup_next_chunk(self, state: dict) -> dict:  # Explicitly type hint
        """Prepare the next chunk for processing"""
        # Remove string check if graph logic is fixed
        # if isinstance(state, str): ...

        print(f"[DEBUG] Entering _setup_next_chunk with state keys: {list(state.keys())}")
        next_index = state.get("current_chunk_index", 0)

        # Ensure chunks list exists in state
        if "chunks" not in state or not isinstance(state["chunks"], list):
            print(f"[DEBUG ERROR] _setup_next_chunk: 'chunks' key missing or not a list in state.")
            # Handle error appropriately, maybe return state with an error flag or raise exception
            return {**state, "error": "Chunks missing in state"}

        if next_index < len(state["chunks"]):
            print(f"[DEBUG] Setting up chunk index {next_index}")
            current_chunk = state["chunks"][next_index]
            # Add metadata check
            if not hasattr(current_chunk, 'metadata') or not isinstance(current_chunk.metadata, dict):
                 print(f"[DEBUG WARN] Chunk {next_index} missing or has invalid metadata.")
                 # Ensure metadata exists to avoid errors later
                 current_chunk.metadata = getattr(current_chunk, 'metadata', {}) or {}
                 current_chunk.metadata["chunk_id"] = current_chunk.metadata.get("chunk_id", next_index)
                 current_chunk.metadata["total_chunks"] = len(state["chunks"])

            return {
                **state,
                "current_chunk": current_chunk,
                "current_chunk_index": next_index + 1,  # Increment *after* getting current
                "progress": {
                    "current": next_index + 1,  # Displaying 1-based index for progress
                    "total": len(state["chunks"])
                }
            }
        else:
            # This case should ideally be handled by the conditional edge,
            # but returning state unmodified is safe.
            print(f"[DEBUG] No more chunks to set up (index {next_index} >= {len(state['chunks'])}).")
            return state
    
    def _collect_results(self, state: dict) -> dict:  # Explicitly type hint
        """Collect and organize all generated questions"""
        # Remove string check if graph logic is fixed
        # if isinstance(state, str): ...

        print(f"[DEBUG] Entering _collect_results with state keys: {list(state.keys())}")

        results = state.get("all_results", [])
        chunk_result = state.get("chunk_results", {})  # Get the results from the last processed chunk

        if chunk_result:  # Only append if there are results (or errors) for the chunk
             results.append(chunk_result)
             print(f"[DEBUG] Appended chunk result. Total results: {len(results)}")
             if "error" in chunk_result:
                 print(f"[DEBUG WARN] Collected result with error: {chunk_result['error']}")
        else:
            print("[DEBUG] No chunk_results found in state to collect.")

        # Important: Clean up chunk_results for the next iteration
        # to avoid collecting the same result multiple times if an error occurs
        # somewhere else in the loop.
        updated_state = {k: v for k, v in state.items() if k != "chunk_results"}

        updated_state["all_results"] = results
        print(f"[DEBUG] Exiting _collect_results. State has {len(updated_state['all_results'])} results.")
        return updated_state

    # NEW conditional routing function
    def _should_process_or_end(self, state: dict) -> str:
        """Decide whether to process the next chunk or end the workflow."""
        print("[DEBUG] Entering _should_process_or_end")
        if "chunks" not in state or "current_chunk_index" not in state:
             print("[DEBUG ERROR] State missing 'chunks' or 'current_chunk_index' for routing decision.")
             return END # End if state is malformed

        current_index = state["current_chunk_index"]
        total_chunks = len(state["chunks"])

        if current_index < total_chunks:
            print(f"[DEBUG] Routing to 'process_chunk' (index {current_index} < {total_chunks})")
            return "process_chunk"
        else:
            print(f"[DEBUG] Routing to END (index {current_index} >= {total_chunks})")
            return END

    def build_graph(self):
        """Build the workflow graph for question generation (Revised)"""
        workflow = StateGraph(dict)

        # Add nodes for the workflow
        workflow.add_node("setup_next_chunk", self._setup_next_chunk)
        workflow.add_node("process_chunk", self._process_chunk)
        workflow.add_node("collect_results", self._collect_results)

        # Set entry point to setup_next_chunk
        workflow.set_entry_point("setup_next_chunk")
        
        # Define edges for the main loop
        workflow.add_edge("setup_next_chunk", "process_chunk")  # After setup, always process
        workflow.add_edge("process_chunk", "collect_results")  # After process, always collect

        # After collecting results, check if we should continue
        workflow.add_conditional_edges(
            "collect_results",
            self._should_process_or_end,  # Use the decision logic
            {
                "process_chunk": "setup_next_chunk",  # If more chunks, loop back to setup
                END: END  # Otherwise, end the graph
            }
        )

        # Compile graph
        print("[DEBUG] Compiling graph...")
        compiled_graph = workflow.compile()
        print("[DEBUG] Graph compiled successfully.")
        return compiled_graph
    
    def generate_questions(self, chunks, questions_per_chunk=3, max_tokens=None):
        """Generate questions from document chunks using stream"""
        print(f"[DEBUG] generate_questions called with {len(chunks)} chunks, {questions_per_chunk} q/chunk")
        if not chunks:
            print("[DEBUG WARN] generate_questions called with empty chunks list.")
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
            "current_chunk_index": 0,  # Start at index 0
            "questions_per_chunk": questions_per_chunk,
            "all_results": [],
            "progress": {"current": 0, "total": len(chunks)}  # Initial progress
            # Initialize current_chunk potentially needed by _should_process_or_end on first run via START
        }
        print(f"[DEBUG] Initial state created: {list(initial_state.keys())}")

        recursion_limit = len(chunks) * 5 + 20  # Adjusted limit (setup -> process -> collect -> check) + buffer
        print(f"[DEBUG] Setting recursion_limit to {recursion_limit}")

        final_state = None
        print("[DEBUG] Starting workflow stream...")
        try:
            # Stream the execution
            for i, state_update in enumerate(workflow.stream(initial_state, {"recursion_limit": recursion_limit})):
                # The state_update dictionary contains the latest state *after* a node has finished execution
                # The keys are the node names that just ran.
                print(f"\n[DEBUG STREAM {i}] Keys in update: {list(state_update.keys())}")

                # Get the actual state dictionary - it's usually the value associated with the last run node's key
                last_node = list(state_update.keys())[-1]
                current_state = state_update[last_node]

                print(f"[DEBUG STREAM {i}] Last node: {last_node}")
                print(f"[DEBUG STREAM {i}] Current state keys: {list(current_state.keys())}")
                print(f"[DEBUG STREAM {i}] Current chunk index in state: {current_state.get('current_chunk_index')}")
                print(f"[DEBUG STREAM {i}] All results count: {len(current_state.get('all_results', []))}")
                print(f"[DEBUG STREAM {i}] Progress: {current_state.get('progress')}")

                # Yield progress update to the client
                progress_yield = {
                    "status": "in_progress",
                    # Use progress dict directly from state if available
                    "progress": current_state.get("progress", {"current": "?", "total": len(chunks)}),
                    # Estimate current chunk based on index (be mindful index increments *after* setup)
                    "current_chunk_display": min(current_state.get("current_chunk_index", 0), len(chunks)),
                    "total_chunks": len(chunks),
                    "results_count": len(current_state.get("all_results", []))
                }
                print(f"[DEBUG] Yielding progress: Chunk {progress_yield['current_chunk_display']}/{progress_yield['total_chunks']}, {progress_yield['results_count']} results collected")
                yield progress_yield

                final_state = current_state  # Keep track of the latest state

            print("[DEBUG] Workflow stream finished.")

            if final_state is None:
                 print("[DEBUG ERROR] Workflow stream finished without producing a final state.")
                 raise ValueError("Workflow execution failed to produce a result.")

            # Process the final state after the stream completes
            print(f"[DEBUG] Final state keys: {list(final_state.keys())}")
            all_results = final_state.get("all_results", [])
            print(f"[DEBUG] Processing final results: {len(all_results)} chunk results.")

            all_questions = []
            errors = []
            for i, chunk_result in enumerate(all_results):
                if "questions" in chunk_result and isinstance(chunk_result["questions"], list):
                    num_q = len(chunk_result.get("questions", []))
                    print(f"[DEBUG] Adding {num_q} questions from chunk result {i+1} (ID: {chunk_result.get('chunk_id', 'N/A')})")
                    all_questions.extend(chunk_result["questions"])
                elif "error" in chunk_result:
                     print(f"[DEBUG WARN] Chunk result {i+1} (ID: {chunk_result.get('chunk_id', 'N/A')}) contains an error: {chunk_result['error']}")
                     errors.append(f"Chunk {chunk_result.get('chunk_id', 'N/A')}: {chunk_result['error']}")
                else:
                     print(f"[DEBUG WARN] Chunk result {i+1} (ID: {chunk_result.get('chunk_id', 'N/A')}) has no 'questions' or 'error' key. Keys: {list(chunk_result.keys())}")

            print(f"[DEBUG] Total questions collected: {len(all_questions)}")
            print(f"[DEBUG] Total errors encountered: {len(errors)}")

            final_output = {
                "status": "complete" if not errors else "complete_with_errors",
                "questions": all_questions,
                "total_questions": len(all_questions),
                "errors": errors,
                "message": f"Generated {len(all_questions)} questions." + (f" Encountered {len(errors)} errors." if errors else "")
            }
            print(f"[DEBUG] Yielding final output: Status '{final_output['status']}', {final_output['total_questions']} questions.")
            yield final_output

        # Handle potential exceptions during the stream itself (e.g., graph validation, recursion)
        except Exception as e:
            print(f"[DEBUG CRITICAL ERROR] Workflow stream failed: {str(e)}")
            import traceback
            print(f"[DEBUG CRITICAL ERROR] Traceback: {traceback.format_exc()}")
            yield {
                "status": "error",
                "message": f"Error during question generation workflow: {str(e)}",
                "questions": [],
                "total_questions": 0
            }