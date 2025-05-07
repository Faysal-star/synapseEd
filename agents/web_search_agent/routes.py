from flask import Blueprint, request, jsonify, current_app
from flask_restx import Api, Resource, fields, Namespace
from flask_cors import CORS
import os
import uuid
import logging
import traceback
import inspect
from datetime import datetime
from . import service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
web_search_bp = Blueprint('web_search', __name__)

# Enable CORS for all routes in this blueprint
CORS(web_search_bp)

# Create a namespace for the API
ns = Namespace('web-search', description='Web search operations')

# Define request models for API documentation
chat_input = ns.model('WebSearchInput', {
    'message': fields.String(required=True, description='User message'),
    'conversation_id': fields.String(required=False, description='Conversation identifier'),
    'context': fields.Raw(required=False, description='Additional context parameters')
})

reasoning_step = ns.model('ReasoningStep', {
    'type': fields.String(description='Type of reasoning step'),
    'content': fields.String(description='Content of the reasoning step')
})

chat_output = ns.model('WebSearchOutput', {
    'response': fields.String(description='AI response'),
    'conversation_id': fields.String(description='Conversation identifier'),
    'message_id': fields.String(description='Unique message identifier for feedback'),
    'reasoning': fields.List(fields.Nested(reasoning_step)),
    'searched_websites': fields.List(fields.String(description='Websites searched during execution'))
})

feedback_model = ns.model('WebSearchFeedback', {
    'conversation_id': fields.String(required=True, description='Conversation identifier'),
    'message_id': fields.String(required=True, description='Message identifier'),
    'rating': fields.Integer(required=True, description='Rating (1-5)'),
    'feedback_text': fields.String(required=False, description='Additional feedback text')
})

memory_stats_model = ns.model('MemoryStatsRequest', {
    'conversation_id': fields.String(required=True, description='Conversation identifier')
})

memory_stats_response = ns.model('MemoryStatsResponse', {
    'stats': fields.Raw(description='Memory statistics'),
    'user_profile': fields.Raw(description='User profile information'),
    'topics': fields.List(fields.String(description='Knowledge topics')),
    'main_memory_size': fields.Integer(description='Number of exchanges in main memory'),
    'external_memory_size': fields.Integer(description='Number of exchanges in external memory'),
    'attention_sinks': fields.Integer(description='Number of attention sink memories')
})

# Initialize web search service instance
web_search_service = None

def get_web_search_service():
    """Get or initialize the web search service"""
    global web_search_service
    
    if web_search_service is None:
        try:
            # Get necessary components from app context
            llm_factory = current_app.config.get('LLM_FACTORY')
            if not llm_factory:
                logger.warning("LLM_FACTORY not found in app config, service may not work correctly")
                
            groq_api_key = os.getenv('GROQ_API_KEY')
            tavily_api_key = os.getenv('TAVILY_API_KEY')
            
            # Log API key availability (without revealing the keys)
            logger.info(f"GROQ_API_KEY available: {bool(groq_api_key)}")
            logger.info(f"TAVILY_API_KEY available: {bool(tavily_api_key)}")
            
            # Initialize the service
            web_search_service = service.WebSearchService(
                llm_factory=llm_factory,
                groq_api_key=groq_api_key,
                tavily_api_key=tavily_api_key
            )
            
            logger.info("Web search service initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing web search service: {str(e)}")
            logger.error(traceback.format_exc())
            # Return a minimal service that won't crash but will return error messages
            class FallbackService:
                def search(self, query, conversation_id=None, context=None):
                    return {
                        "status": "error",
                        "response": f"Service initialization failed: {str(e)}",
                        "conversation_id": conversation_id or str(uuid.uuid4()),
                        "message_id": str(uuid.uuid4()),
                        "reasoning": [],
                        "searched_websites": []
                    }
                
                def get_memory_stats(self, conversation_id):
                    return {
                        "stats": {},
                        "user_profile": {},
                        "topics": [],
                        "main_memory_size": 0,
                        "external_memory_size": 0,
                        "attention_sinks": 0
                    }
                
                def store_feedback(self, **kwargs):
                    return False
                
                def cleanup_old_memories(self, **kwargs):
                    return 0
                
            web_search_service = FallbackService()
    
    return web_search_service

# Simple test endpoint to verify routing
@web_search_bp.route('/test', methods=['GET', 'POST'])
def test_endpoint():
    """Simple test endpoint to verify routing"""
    if request.method == 'POST':
        return jsonify({
            'status': 'success',
            'message': 'Web search test endpoint working (POST)',
            'received_data': request.json or {}
        })
    else:
        return jsonify({
            'status': 'success',
            'message': 'Web search test endpoint working (GET)'
        })

@ns.route('/search')
class WebSearchAPI(Resource):
    @ns.expect(chat_input)
    @ns.marshal_with(chat_output, code=200, description='Search results')
    @ns.response(500, 'Internal Server Error')
    def post(self):
        """Perform a web search and get an AI-generated response with citations"""
        try:
            logger.info("Received search request")
            data = request.json or {}
            query = data.get('message', '')
            conversation_id = data.get('conversation_id')
            context = data.get('context', {})
            
            logger.info(f"Processing search query: '{query[:50]}...' for conversation: {conversation_id}")
            
            if not query:
                logger.warning("Empty query received")
                return {
                    'response': 'Please provide a search query',
                    'conversation_id': conversation_id or str(uuid.uuid4()),
                    'message_id': str(uuid.uuid4()),
                    'reasoning': [],
                    'searched_websites': []
                }, 400
            
            # Get the web search service
            search_service = get_web_search_service()
            
            # Perform the search
            result = search_service.search(query, conversation_id, context)
            logger.info(f"Search completed successfully for conversation: {result.get('conversation_id')}")
            
            # Return the response
            response_data = {
                'response': result.get('response', 'No response generated'),
                'conversation_id': result.get('conversation_id', ''),
                'message_id': result.get('message_id', ''),
                'reasoning': result.get('reasoning', []),
                'searched_websites': result.get('searched_websites', [])
            }
            
            logger.debug(f"Search response: {response_data['response'][:100]}...")
            logger.debug(f"Found {len(response_data['searched_websites'])} websites")
            return response_data, 200
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error in web search API: {error_message}")
            logger.error(traceback.format_exc())
            
            return {
                'response': f"I'm sorry, I encountered an error while searching. Please try again later. Technical details: {error_message[:100]}...",
                'conversation_id': data.get('conversation_id', 'error'),
                'message_id': str(uuid.uuid4()),
                'reasoning': [{"type": "error", "content": error_message}],
                'searched_websites': []
            }, 500

@ns.route('/feedback')
class FeedbackAPI(Resource):
    @ns.expect(feedback_model)
    @ns.response(200, 'Feedback received')
    @ns.response(400, 'Invalid input')
    def post(self):
        """Submit feedback for a response"""
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            message_id = data.get('message_id')
            rating = data.get('rating')
            feedback_text = data.get('feedback_text', '')
            
            logger.info(f"Received feedback for message {message_id} in conversation {conversation_id}")
            
            if not conversation_id or not message_id or rating is None:
                return {"message": "Missing required parameters"}, 400
            
            # Get the web search service
            search_service = get_web_search_service()
            
            # Store feedback
            success = search_service.store_feedback(
                conversation_id=conversation_id,
                message_id=message_id,
                rating=rating,
                feedback_text=feedback_text
            )
            
            if success:
                logger.info(f"Feedback stored successfully for message {message_id}")
                return {"message": "Feedback received", "status": "success"}, 200
            else:
                logger.warning(f"Failed to store feedback for message {message_id}")
                return {"message": "Failed to store feedback", "status": "error"}, 500
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error processing feedback: {error_message}")
            logger.error(traceback.format_exc())
            return {"message": f"Error processing feedback", "status": "error", "error": error_message}, 500

@ns.route('/memory-stats')
class MemoryStatsAPI(Resource):
    @ns.expect(memory_stats_model)
    @ns.marshal_with(memory_stats_response)
    @ns.response(200, 'Memory statistics')
    @ns.response(404, 'Conversation not found')
    def post(self):
        """Get memory statistics for a conversation"""
        try:
            data = request.json or {}
            conversation_id = data.get('conversation_id')
            
            logger.info(f"Fetching memory stats for conversation {conversation_id}")
            
            if not conversation_id:
                return {"message": "Missing conversation_id parameter"}, 400
            
            # Get the web search service
            search_service = get_web_search_service()
            
            # Get memory stats
            stats = search_service.get_memory_stats(conversation_id)
            logger.info(f"Memory stats retrieved for conversation {conversation_id}")
            
            return stats
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error retrieving memory stats: {error_message}")
            logger.error(traceback.format_exc())
            return {"message": f"Error retrieving memory statistics", "error": error_message}, 500

# Debug and health check endpoints
@web_search_bp.route('/debug', methods=['GET'])
@web_search_bp.route('/debug', methods=['GET'])  # Also register without the prefix for flexibility
def debug_endpoint():
    """Debug endpoint to check service initialization"""
    try:
        llm_factory = current_app.config.get('LLM_FACTORY')
        groq_api_key = os.getenv('GROQ_API_KEY')
        tavily_api_key = os.getenv('TAVILY_API_KEY')
        
        # Also check service
        service_initialized = web_search_service is not None
        
        if service_initialized:
            service_has_agent = hasattr(web_search_service, 'agent') and web_search_service.agent is not None
            service_has_graph = hasattr(web_search_service, 'graph') and web_search_service.graph is not None
        else:
            service_has_agent = False
            service_has_graph = False
        
        return jsonify({
            'llm_factory_exists': llm_factory is not None,
            'groq_api_key_exists': groq_api_key is not None,
            'tavily_api_key_exists': tavily_api_key is not None,
            'service_initialized': service_initialized,
            'service_has_agent': service_has_agent,
            'service_has_graph': service_has_graph
        })
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error in debug endpoint: {error_message}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': error_message,
            'traceback': traceback.format_exc()
        }), 500


@web_search_bp.route('/health', methods=['GET'])  # Also register without the prefix for flexibility
def health_check():
    """Health check endpoint"""
    try:
        search_service = get_web_search_service()
        
        if search_service:
            has_agent = hasattr(search_service, 'agent') and search_service.agent is not None
            has_graph = hasattr(search_service, 'graph') and search_service.graph is not None
            
            if has_agent and has_graph:
                status = "healthy"
                message = "Web search agent is running"
            else:
                status = "degraded"
                message = "Web search agent is running with limited functionality"
        else:
            status = "unavailable"
            message = "Web search agent is not initialized"
        
        return jsonify({
            'status': status,
            'message': message
        })
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error in health check: {error_message}")
        return jsonify({
            'status': 'error',
            'message': f"Error checking health: {error_message}"
        }), 500

def register_socketio_handlers(socketio):
    """Register Socket.IO event handlers"""
    try:
        @socketio.on('connect', namespace='/web-search')
        def handle_connect():
            logger.info(f"Client connected to web-search namespace: {request.sid}")
            socketio.emit('connection_status', {'status': 'connected'}, room=request.sid, namespace='/web-search')

        @socketio.on('disconnect', namespace='/web-search')
        def handle_disconnect():
            logger.info(f"Client disconnected from web-search namespace: {request.sid}")

        @socketio.on('join', namespace='/web-search')
        def handle_join(data):
            try:
                from flask_socketio import join_room
                room = data.get('conversation_id')
                if room:
                    join_room(room)
                    logger.info(f"Client {request.sid} joined room {room}")
                    socketio.emit('joined', {'message': f'Joined room {room}'}, room=room, namespace='/web-search')
            except Exception as e:
                logger.error(f"Error in socket join handler: {str(e)}")
                socketio.emit('error', {'message': f'Error joining room: {str(e)}'}, room=request.sid, namespace='/web-search')
                
        logger.info("Successfully registered Socket.IO handlers for web-search namespace")
    except Exception as e:
        logger.error(f"Failed to register Socket.IO handlers: {str(e)}")
        logger.error(traceback.format_exc())

# Clean up tasks
def cleanup_task():
    """Periodic cleanup task for web search memory"""
    try:
        service_instance = web_search_service
        if service_instance and hasattr(service_instance, 'cleanup_old_memories'):
            cleaned = service_instance.cleanup_old_memories(max_age_hours=24)
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} old memory files")
        else:
            logger.debug("Skipping memory cleanup - service not initialized")
    except Exception as e:
        logger.error(f"Error during memory cleanup: {str(e)}")