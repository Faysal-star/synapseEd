from flask import Flask, request
from flask_restx import Api, Resource, fields
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain.agents import initialize_agent, AgentType
import json
import logging
import os
import re

# Import tools with error handling
try:
    from tools import search_tool, wiki_tool, save_tool
    tools_available = True
except ImportError as e:
    logging.error(f"Error importing tools: {e}")
    tools_available = False
    search_tool, wiki_tool, save_tool = None, None, None

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found in environment variables. API functionality will be limited.")

# Initialize Flask app
app = Flask(__name__)

# Configure Swagger UI
api = Api(
    app, 
    version='1.0', 
    title='Lecture Planner API',
    description='API for generating and managing detailed lecture plans using LangChain and OpenAI',
    doc='/swagger/',  # Custom Swagger UI endpoint
    contact='SynapseED',
    contact_email='info@example.com',
    contact_url='https://example.com',
    license='MIT',
    license_url='https://opensource.org/licenses/MIT',
    validate=True  # Enable request validation
)

# Define namespaces
lecture_ns = api.namespace('lectures', description='Lecture planning operations')
status_ns = api.namespace('status', description='API status operations')

# Define Pydantic model for lecture response
class LectureResponse(BaseModel):
    title: str
    outline: str
    learning_objectives: list[str]
    topics: list[dict[str, list[str]]]
    teaching_methods: list[str]
    resources: list[str]
    tools_used: list[str]

# Function to convert text explanation to structured JSON
def text_to_lecture_json(text, query):
    """Convert a text explanation to a structured lecture JSON"""
    logger.info("Converting text explanation to JSON format")
    
    # Extract title - use query as fallback
    title_match = re.search(r'(?:title|topic)[\s:]+(.*?)(?:\n|$)', text, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else f"Introduction to {query}"
    
    # Extract or generate outline
    outline = text[:500]  # Use first 500 chars as outline
    
    # Extract learning objectives
    learning_objectives = []
    objectives_match = re.findall(r'\d+\.\s+\*\*([^:]+?):\*\*\s+(.*?)(?=\n\n|\n\d+\.|\Z)', text, re.DOTALL)
    if objectives_match:
        for obj_title, obj_desc in objectives_match[:4]:  # Take first 4 matches
            learning_objectives.append(f"{obj_title}: {obj_desc.strip()}")
    else:
        # Fallback: extract numbered or bulleted items
        objectives = re.findall(r'(?:\d+\.|\*)\s+(.*?)(?=\n\n|\n(?:\d+\.|\*)|\Z)', text)
        learning_objectives = objectives[:4] if objectives else ["Understand basic concepts", "Apply theoretical knowledge", "Analyze real-world examples"]
    
    # Extract or generate topics
    topics = []
    # Try to find structured topics in the text
    topic_matches = re.findall(r'\d+\.\s+\*\*([^:]+?):\*\*\s+(.*?)(?=\n\n|\n\d+\.|\Z)', text, re.DOTALL)
    if topic_matches:
        for topic_title, topic_desc in topic_matches[:3]:  # Take first 3 matches
            subtopics = re.findall(r'(?:[-•*]|\d+\.)\s+(.*?)(?=\n[-•*]|\n\d+\.|\Z)', topic_desc)
            subtopics = subtopics if subtopics else [f"Understanding {topic_title}", f"Applications of {topic_title}"]
            topics.append({topic_title.strip(): [s.strip() for s in subtopics[:3]]})
    
    # If no topics found, create generic ones based on the query
    if not topics:
        topics = [
            {f"Introduction to {query}": ["Basic Concepts", "Historical Context"]},
            {f"Core Principles of {query}": ["Theoretical Framework", "Key Components"]},
            {f"Applications of {query}": ["Real-world Examples", "Case Studies"]}
        ]
    
    # Generate teaching methods
    teaching_methods = ["Interactive Lectures", "Group Discussions", "Practical Demonstrations"]
    
    # Generate resources
    resources = [f"{query} Textbook", "Academic Journal Articles", "Online Resources and Tools"]
    
    # List tools used
    tools_used = ["Search Tool", "Wikipedia Tool"] if tools_available else ["No external tools available"]
    
    # Create structured response
    return {
        "title": title,
        "outline": outline,
        "learning_objectives": learning_objectives,
        "topics": topics,
        "teaching_methods": teaching_methods,
        "resources": resources,
        "tools_used": tools_used
    }

# Define flask-restx models
topic_model = api.model('Topic', {
    'main_topic': fields.String(required=True, description='Main topic name', example='Quantum Computing'),
    'subtopics': fields.List(fields.String, required=True, description='List of subtopics', example=['Quantum Bits', 'Quantum Gates'])
})

lecture_request_model = api.model('LectureRequest', {
    'query': fields.String(required=True, description='Lecture topic or description', example='Introduction to Quantum Computing'),
    'level': fields.String(required=False, description='Student level (beginner, intermediate, advanced)', default='beginner', example='beginner', enum=['beginner', 'intermediate', 'advanced'])
})

lecture_response_model = api.model('LectureResponse', {
    'title': fields.String(required=True, description='Lecture title', example='Introduction to Quantum Computing: Fundamentals and Applications'),
    'outline': fields.String(required=True, description='Lecture outline', example='This lecture introduces the fundamental concepts of quantum computing...'),
    'learning_objectives': fields.List(fields.String, required=True, description='Learning objectives', example=['Understand quantum superposition', 'Apply quantum principles to simple algorithms']),
    'topics': fields.List(fields.Raw, required=True, description='Topics and subtopics', example=[{'Quantum Bits': ['Superposition', 'Entanglement']}, {'Quantum Gates': ['Hadamard Gate', 'CNOT Gate']}]),
    'teaching_methods': fields.List(fields.String, required=True, description='Teaching methods', example=['Interactive Lectures', 'Problem-Based Learning']),
    'resources': fields.List(fields.String, required=True, description='Resources', example=['Quantum Computing Textbook', 'Online Quantum Simulators']),
    'tools_used': fields.List(fields.String, required=True, description='Tools used', example=['search', 'wikipedia'])
})

update_topics_model = api.model('UpdateTopics', {
    'topics': fields.List(fields.Raw, required=True, description='Updated topics and subtopics', example=[{'Quantum Bits': ['Superposition', 'Entanglement']}, {'Quantum Gates': ['Hadamard Gate', 'CNOT Gate']}])
})

update_methods_model = api.model('UpdateMethods', {
    'teaching_methods': fields.List(fields.String, required=True, description='Updated teaching methods', example=['Interactive Lectures', 'Problem-Based Learning', 'Visual Demonstrations'])
})

update_resources_model = api.model('UpdateResources', {
    'resources': fields.List(fields.String, required=True, description='Updated resources', example=['Quantum Computing Textbook', 'Online Quantum Simulators', 'Scientific Articles'])
})

update_objectives_model = api.model('UpdateObjectives', {
    'learning_objectives': fields.List(fields.String, required=True, description='Updated learning objectives', example=['Understand quantum superposition', 'Apply quantum principles to simple algorithms'])
})

status_model = api.model('Status', {
    'status': fields.String(required=True, description='API status', example='operational'),
    'openai_api_key': fields.Boolean(required=True, description='OpenAI API key available', example=True),
    'tools': fields.List(fields.String, description='Available tools', example=['search', 'wikipedia', 'save_text_to_file'])
})

error_model = api.model('Error', {
    'error': fields.String(required=True, description='Error message', example='OpenAI API key not found')
})

# Initialize the agent
def create_agent(level="beginner"):
    # Initialize GPT-4
    try:
        # Use a more structured and explicit prompt to enforce JSON return
        llm = ChatOpenAI(model="gpt-4", temperature=0.2)  # Lower temperature for more structured output
        parser = PydanticOutputParser(pydantic_object=LectureResponse)

        # Create the prompt template with stronger JSON formatting instructions
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are a lecture assistant that will generate a detailed lecture plan in JSON format.
        Please ensure that the content is appropriate for {level} students.
        
        YOU MUST RETURN ONLY A VALID JSON OBJECT without any explanations before or after.
        Do not include markdown formatting, bullet points, or numbered lists outside the JSON structure.
        
        The JSON structure must be:
        ```json
        {{
            "title": "A descriptive and specific title for the lecture",
            "outline": "A comprehensive overview of the lecture content",
            "learning_objectives": ["At least 3-4 specific learning objectives"],
            "topics": [{{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}}, {{"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}}],
            "teaching_methods": ["At least 2-3 specific teaching methods that will be used"],
            "resources": ["At least 2-3 specific resources and materials"],
            "tools_used": ["List of all tools used to generate this response"]
        }}
        ```
        
        IMPORTANT: Your entire response must be a single, valid JSON object. 
        DO NOT include any explanatory text, markdown formatting, or other content outside the JSON.
        If you include ANY text before or after the JSON, it will cause an error.

        {format_instructions}""",
                ),
                ("placeholder", "{chat_history}"),
                ("human", "{query}"),
                ("placeholder", "{agent_scratchpad}"),
            ]
        ).partial(format_instructions=parser.get_format_instructions(), level=level)

        # Check if tools are available
        if tools_available:
            tools = [search_tool, wiki_tool, save_tool]
        else:
            logger.warning("Tools are not available. Using empty tools list.")
            tools = []

        # Initialize the agent
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.OPENAI_FUNCTIONS,
            verbose=True,
            prompt=prompt,
            handle_parsing_errors=True
        )
        
        return agent, parser
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise

@status_ns.route('/')
class StatusResource(Resource):
    @status_ns.doc(description='Get the current status of the API and available tools')
    @status_ns.marshal_with(status_model, code=200)
    def get(self):
        """Get API status"""
        available_tools = []
        if tools_available:
            if search_tool:
                available_tools.append("search")
            if wiki_tool:
                available_tools.append("wikipedia")
            if save_tool:
                available_tools.append("save_text_to_file")
        
        return {
            "status": "operational",
            "openai_api_key": bool(os.getenv("OPENAI_API_KEY")),
            "tools": available_tools
        }

@lecture_ns.route('/')
class LectureResource(Resource):
    @lecture_ns.doc(description='Generate a new lecture plan based on a topic query')
    @lecture_ns.expect(lecture_request_model)
    @lecture_ns.marshal_with(lecture_response_model, code=201, description='Lecture plan successfully generated')
    @lecture_ns.response(400, 'Bad request', error_model)
    @lecture_ns.response(500, 'Internal server error', error_model)
    def post(self):
        """Generate a new lecture plan"""
        if not os.getenv("OPENAI_API_KEY"):
            api.abort(500, "OpenAI API key not found")
            
        try:
            data = request.json
            query = data.get('query')
            level = data.get('level', 'beginner')
            
            if not query:
                api.abort(400, "Query parameter is required")
                
            agent, parser = create_agent(level)
            
            # Invoke the agent
            raw_response = agent.invoke({"input": query})
            
            if isinstance(raw_response, dict) and "output" in raw_response:
                output_text = raw_response["output"]
                
                try:
                    # First attempt: Try to extract JSON if it's embedded in text
                    if not output_text.startswith('{'):
                        # Check if there's a JSON object in the response
                        json_start = output_text.find('{')
                        json_end = output_text.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            # Extract the JSON portion
                            output_text = output_text[json_start:json_end+1]
                        else:
                            # If no JSON found, look for code blocks that might contain JSON
                            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', output_text, re.DOTALL)
                            if json_match:
                                output_text = json_match.group(1)
                    
                    # Try parsing the output
                    structured_response = parser.parse(output_text)
                    return structured_response.dict(), 201
                    
                except Exception as parsing_error:
                    logger.warning(f"Failed to parse JSON response: {parsing_error}")
                    logger.info("Falling back to text-to-JSON conversion")
                    
                    # Fallback: Convert the text explanation to structured JSON
                    structured_data = text_to_lecture_json(output_text, query)
                    
                    # Validate with the parser
                    try:
                        structured_response = LectureResponse(**structured_data)
                        return structured_response.dict(), 201
                    except Exception as validation_error:
                        logger.error(f"Failed to validate converted JSON: {validation_error}")
                        api.abort(500, f"Could not generate a valid lecture plan: {str(validation_error)}")
            else:
                api.abort(500, "Unexpected response format")
        except Exception as e:
            logger.error(f"Error generating lecture plan: {e}")
            api.abort(500, str(e))

@lecture_ns.route('/<string:id>/topics')
@lecture_ns.param('id', 'The lecture identifier')
class TopicsResource(Resource):
    @lecture_ns.doc(description='Update topics for an existing lecture plan')
    @lecture_ns.expect(update_topics_model)
    @lecture_ns.marshal_with(lecture_response_model, code=200, description='Topics successfully updated')
    @lecture_ns.response(400, 'Bad request', error_model)
    @lecture_ns.response(404, 'Lecture not found', error_model)
    @lecture_ns.response(500, 'Internal server error', error_model)
    def put(self, id):
        """Update topics for an existing lecture plan"""
        if not os.getenv("OPENAI_API_KEY"):
            api.abort(500, "OpenAI API key not found")
            
        try:
            data = request.json
            topics = data.get('topics', [])
            
            if not topics:
                api.abort(400, "Topics list is required and cannot be empty")
            
            # This is a simplified version without actual storage
            # In a real implementation, you would retrieve the existing lecture plan from a database
            agent, parser = create_agent()
            
            # Format topics for the agent
            topics_str = ", ".join([list(t.keys())[0] for t in topics])
            
            # Invoke the agent with updated topics
            raw_response = agent.invoke({"input": f"Refine the lecture plan with these main topics: {topics_str}"})
            
            try:
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    
                    # Try to extract JSON if it's embedded in text
                    if not output_text.startswith('{'):
                        json_start = output_text.find('{')
                        json_end = output_text.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            output_text = output_text[json_start:json_end+1]
                        else:
                            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', output_text, re.DOTALL)
                            if json_match:
                                output_text = json_match.group(1)
                    
                    structured_response = parser.parse(output_text)
                    # Override with the user-provided topics
                    structured_response.topics = topics
                    return structured_response.dict()
                else:
                    api.abort(500, "Unexpected response format")
            except Exception as parsing_error:
                logger.warning(f"Failed to parse JSON response: {parsing_error}")
                
                # Fallback: Create a basic response with the provided topics
                structured_data = {
                    "title": f"Updated Lecture on {topics_str}",
                    "outline": f"A lecture covering {topics_str}",
                    "learning_objectives": ["Understand key concepts", "Apply theoretical knowledge", "Analyze applications"],
                    "topics": topics,
                    "teaching_methods": ["Interactive Lectures", "Group Discussions", "Practical Demonstrations"],
                    "resources": ["Academic Textbooks", "Online Resources", "Research Papers"],
                    "tools_used": ["No tools used for this update"]
                }
                
                structured_response = LectureResponse(**structured_data)
                return structured_response.dict()
        except Exception as e:
            logger.error(f"Error updating topics: {e}")
            api.abort(500, str(e))

@lecture_ns.route('/<string:id>/teaching-methods')
@lecture_ns.param('id', 'The lecture identifier')
class TeachingMethodsResource(Resource):
    @lecture_ns.doc(description='Update teaching methods for an existing lecture plan')
    @lecture_ns.expect(update_methods_model)
    @lecture_ns.marshal_with(lecture_response_model, code=200, description='Teaching methods successfully updated')
    @lecture_ns.response(400, 'Bad request', error_model)
    @lecture_ns.response(404, 'Lecture not found', error_model)
    @lecture_ns.response(500, 'Internal server error', error_model)
    def put(self, id):
        """Update teaching methods for an existing lecture plan"""
        if not os.getenv("OPENAI_API_KEY"):
            api.abort(500, "OpenAI API key not found")
            
        try:
            data = request.json
            teaching_methods = data.get('teaching_methods', [])
            
            if not teaching_methods:
                api.abort(400, "Teaching methods list is required and cannot be empty")
            
            agent, parser = create_agent()
            
            # Invoke the agent with updated teaching methods
            raw_response = agent.invoke({"input": f"Refine the lecture plan with these teaching methods: {', '.join(teaching_methods)}"})
            
            try:
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    
                    # Try to extract JSON if it's embedded in text
                    if not output_text.startswith('{'):
                        json_start = output_text.find('{')
                        json_end = output_text.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            output_text = output_text[json_start:json_end+1]
                        else:
                            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', output_text, re.DOTALL)
                            if json_match:
                                output_text = json_match.group(1)
                    
                    structured_response = parser.parse(output_text)
                    # Override with the user-provided teaching methods
                    structured_response.teaching_methods = teaching_methods
                    return structured_response.dict()
                else:
                    api.abort(500, "Unexpected response format")
            except Exception as parsing_error:
                logger.warning(f"Failed to parse JSON response: {parsing_error}")
                
                # Fallback: Create a basic response with the provided teaching methods
                structured_data = {
                    "title": "Updated Lecture Plan",
                    "outline": "A comprehensive lecture with updated teaching methods",
                    "learning_objectives": ["Understand key concepts", "Apply theoretical knowledge", "Analyze applications"],
                    "topics": [{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}, {"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}],
                    "teaching_methods": teaching_methods,
                    "resources": ["Academic Textbooks", "Online Resources", "Research Papers"],
                    "tools_used": ["No tools used for this update"]
                }
                
                structured_response = LectureResponse(**structured_data)
                return structured_response.dict()
        except Exception as e:
            logger.error(f"Error updating teaching methods: {e}")
            api.abort(500, str(e))

@lecture_ns.route('/<string:id>/resources')
@lecture_ns.param('id', 'The lecture identifier')
class ResourcesResource(Resource):
    @lecture_ns.doc(description='Update resources for an existing lecture plan')
    @lecture_ns.expect(update_resources_model)
    @lecture_ns.marshal_with(lecture_response_model, code=200, description='Resources successfully updated')
    @lecture_ns.response(400, 'Bad request', error_model)
    @lecture_ns.response(404, 'Lecture not found', error_model)
    @lecture_ns.response(500, 'Internal server error', error_model)
    def put(self, id):
        """Update resources for an existing lecture plan"""
        if not os.getenv("OPENAI_API_KEY"):
            api.abort(500, "OpenAI API key not found")
            
        try:
            data = request.json
            resources = data.get('resources', [])
            
            if not resources:
                api.abort(400, "Resources list is required and cannot be empty")
            
            agent, parser = create_agent()
            
            # Invoke the agent with updated resources
            raw_response = agent.invoke({"input": f"Refine the lecture plan with these resources: {', '.join(resources)}"})
            
            try:
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    
                    # Try to extract JSON if it's embedded in text
                    if not output_text.startswith('{'):
                        json_start = output_text.find('{')
                        json_end = output_text.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            output_text = output_text[json_start:json_end+1]
                        else:
                            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', output_text, re.DOTALL)
                            if json_match:
                                output_text = json_match.group(1)
                    
                    structured_response = parser.parse(output_text)
                    # Override with the user-provided resources
                    structured_response.resources = resources
                    return structured_response.dict()
                else:
                    api.abort(500, "Unexpected response format")
            except Exception as parsing_error:
                logger.warning(f"Failed to parse JSON response: {parsing_error}")
                
                # Fallback: Create a basic response with the provided resources
                structured_data = {
                    "title": "Updated Lecture Plan",
                    "outline": "A comprehensive lecture with updated resources",
                    "learning_objectives": ["Understand key concepts", "Apply theoretical knowledge", "Analyze applications"],
                    "topics": [{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}, {"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}],
                    "teaching_methods": ["Interactive Lectures", "Group Discussions", "Practical Demonstrations"],
                    "resources": resources,
                    "tools_used": ["No tools used for this update"]
                }
                
                structured_response = LectureResponse(**structured_data)
                return structured_response.dict()
        except Exception as e:
            logger.error(f"Error updating resources: {e}")
            api.abort(500, str(e))

@lecture_ns.route('/<string:id>/learning-objectives')
@lecture_ns.param('id', 'The lecture identifier')
class LearningObjectivesResource(Resource):
    @lecture_ns.doc(description='Update learning objectives for an existing lecture plan')
    @lecture_ns.expect(update_objectives_model)
    @lecture_ns.marshal_with(lecture_response_model, code=200, description='Learning objectives successfully updated')
    @lecture_ns.response(400, 'Bad request', error_model)
    @lecture_ns.response(404, 'Lecture not found', error_model)
    @lecture_ns.response(500, 'Internal server error', error_model)
    def put(self, id):
        """Update learning objectives for an existing lecture plan"""
        if not os.getenv("OPENAI_API_KEY"):
            api.abort(500, "OpenAI API key not found")
            
        try:
            data = request.json
            learning_objectives = data.get('learning_objectives', [])
            
            if not learning_objectives:
                api.abort(400, "Learning objectives list is required and cannot be empty")
            
            agent, parser = create_agent()
            
            # Invoke the agent with updated learning objectives
            raw_response = agent.invoke({"input": f"Refine the lecture plan with these learning objectives: {', '.join(learning_objectives)}"})
            
            try:
                if isinstance(raw_response, dict) and "output" in raw_response:
                    output_text = raw_response["output"]
                    
                    # Try to extract JSON if it's embedded in text
                    if not output_text.startswith('{'):
                        json_start = output_text.find('{')
                        json_end = output_text.rfind('}')
                        
                        if json_start >= 0 and json_end > json_start:
                            output_text = output_text[json_start:json_end+1]
                        else:
                            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', output_text, re.DOTALL)
                            if json_match:
                                output_text = json_match.group(1)
                    
                    structured_response = parser.parse(output_text)
                    # Override with the user-provided learning objectives
                    structured_response.learning_objectives = learning_objectives
                    return structured_response.dict()
                else:
                    api.abort(500, "Unexpected response format")
            except Exception as parsing_error:
                logger.warning(f"Failed to parse JSON response: {parsing_error}")
                
                # Fallback: Create a basic response with the provided learning objectives
                structured_data = {
                    "title": "Updated Lecture Plan",
                    "outline": "A comprehensive lecture with updated learning objectives",
                    "learning_objectives": learning_objectives,
                    "topics": [{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}, {"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}],
                    "teaching_methods": ["Interactive Lectures", "Group Discussions", "Practical Demonstrations"],
                    "resources": ["Academic Textbooks", "Online Resources", "Research Papers"],
                    "tools_used": ["No tools used for this update"]
                }
                
                structured_response = LectureResponse(**structured_data)
                return structured_response.dict()
        except Exception as e:
            logger.error(f"Error updating learning objectives: {e}")
            api.abort(500, str(e))

# Add a redirect from root to Swagger UI
@app.route('/')
def index():
    from flask import redirect
    return redirect('/swagger/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005) 