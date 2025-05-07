from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_restx import Api
from dotenv import load_dotenv
import os
from openai import OpenAI
from common.llm_factory import LLMFactory
import logging
from logging.handlers import RotatingFileHandler

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'storage', 'uploads')
app.config['VECTOR_STORE_DIR'] = os.path.join(os.path.dirname(__file__), 'storage', 'vector_stores')
app.config['OUTPUT_FOLDER'] = os.path.join(os.path.dirname(__file__), 'storage', 'generated_pdfs')
app.config['AUDIO_DIR'] = os.path.join(os.path.dirname(__file__), 'storage', "audio_files")

# Production settings
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'

# Configure CORS properly for production
if app.config['ENV'] == 'production':
    # Only allow specific origins in production
    allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http:localhost:3000').split(',')
    CORS(app, origins=allowed_origins, supports_credentials=True)
else:
    # Allow all origins in development
    CORS(app)

# Ensure all directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['VECTOR_STORE_DIR'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
os.makedirs(app.config['AUDIO_DIR'], exist_ok=True)

# Set up logging
if not app.debug:
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')
        
    # Configure file handler for logging
    file_handler = RotatingFileHandler('logs/synapseED.log', maxBytes=10*1024*1024, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('SynapseED startup')

# Initialize SocketIO with proper CORS settings for production
if app.config['ENV'] == 'production':
    # Only allow specific origins in production
    socketio = SocketIO(app, cors_allowed_origins=allowed_origins, async_mode='eventlet')
else:
    # Allow all origins in development
    socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Flask-RESTX API
api = Api(
    app,
    version='1.0',
    title='SynapseED AI Agents API',
    description='Unified API for all SynapseED AI agents',
    doc='/swagger/',
)

# Initialize OpenAI client
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

app.config['OPENAI_CLIENT'] = OpenAI(api_key=api_key)

# Initialize LLM Factory and add to app config
app.config['LLM_FACTORY'] = LLMFactory()

# Schedule background tasks for cleanup
def schedule_cleanup_tasks():
    """Schedule background tasks for periodic cleanup operations"""
    from threading import Thread
    import time
    
    def run_cleanup():
        while True:
            time.sleep(600)  # Every 10 minutes
            try:
                # Import services here to avoid circular imports
                from viva_gen.service import cleanup_old_files
                from web_search_agent.routes import cleanup_task
                
                # Clean up old audio files
                files_removed = cleanup_old_files(app.config['AUDIO_DIR'])
                if files_removed > 0:
                    app.logger.info(f"Cleaned up {files_removed} old audio files")
                
                # Run web search agent cleanup
                cleanup_task()
                    
            except Exception as e:
                app.logger.error(f"Error in scheduled cleanup: {str(e)}")
    
    # Start cleanup thread
    cleanup_thread = Thread(target=run_cleanup, daemon=True)
    cleanup_thread.start()

# Register blueprints and namespaces from different agents
def register_blueprints_and_namespaces(app, api, socketio):
    # Import content_gen module
    from content_gen.routes import content_gen_bp, ns as content_gen_ns, register_socketio_handlers
    
    # Register the Flask blueprint
    app.register_blueprint(content_gen_bp, url_prefix='/api/content-gen')
    
    # Add namespace to the API
    api.add_namespace(content_gen_ns, path='/api/content-gen')
    
    # Register Socket.IO handlers
    register_socketio_handlers(socketio)
    
    # Import and register VIVA generator module
    from viva_gen.routes import viva_gen_bp, ns as viva_gen_ns, register_socketio_handlers as register_viva_socketio_handlers
    
    # Register the VIVA Flask blueprint
    app.register_blueprint(viva_gen_bp, url_prefix='/api/viva')
    
    # Add VIVA namespace to the API
    api.add_namespace(viva_gen_ns, path='/api/viva')
    
    # Register VIVA Socket.IO handlers
    register_viva_socketio_handlers(socketio)
    
    # Import and register lecture planner module
    from lecture_planner.routes import lecture_planner_bp, ns as lecture_planner_ns
    
    # Register the lecture planner Flask blueprint
    app.register_blueprint(lecture_planner_bp, url_prefix='/api/lecture-planner')
    
    # Add lecture planner namespace to the API
    api.add_namespace(lecture_planner_ns, path='/api/lecture-planner')
    
    # Import and register question generator module
    from q_gen.routes import q_gen_bp, ns as q_gen_ns, register_socketio_handlers as register_q_gen_socketio_handlers
    
    # Register the question generator Flask blueprint
    app.register_blueprint(q_gen_bp, url_prefix='/api/q-gen')
    
    # Add question generator namespace to the API
    api.add_namespace(q_gen_ns, path='/api/q-gen')
    
    # Register question generator Socket.IO handlers
    register_q_gen_socketio_handlers(socketio)
    
    # Import and register web search agent module
    from web_search_agent.routes import web_search_bp, ns as web_search_ns, register_socketio_handlers as register_web_search_socketio_handlers
    
    # Register the web search agent Flask blueprint
    app.register_blueprint(web_search_bp, url_prefix='/api/web-search')
    
    # Add web search namespace to the API
    api.add_namespace(web_search_ns, path='/api/web-search')
    
    # Register web search Socket.IO handlers
    register_web_search_socketio_handlers(socketio)

# Register all blueprints and namespaces
register_blueprints_and_namespaces(app, api, socketio)

# Start cleanup task scheduler
schedule_cleanup_tasks()

# Add a health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'SynapseED Agent Server is running',
        'active_modules': ['content_gen', 'viva_gen', 'lecture_planner', 'q_gen', 'web_search']
    })

# Required for direct execution
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    print(f"Starting SynapseED Agent Server on port {port}...")
    socketio.run(app, debug=debug_mode, host='0.0.0.0', port=port, allow_unsafe_werkzeug=debug_mode)
