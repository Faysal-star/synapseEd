from flask import Blueprint, request, jsonify, send_file, current_app
from flask_restx import Api, Resource, fields, Namespace
import os
import json
import uuid
import logging
from threading import Thread
from . import service

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create blueprint for VIVA generation
viva_gen_bp = Blueprint('viva_gen', __name__)

# Create a Namespace for the VIVA API
ns = Namespace('viva', description='VIVA examination operations')

# Define models for the API documentation
viva_request = ns.model('VivaStartRequest', {
    'subject': fields.String(required=True, description='Subject for the examination'),
    'topic': fields.String(required=True, description='Specific topic within the subject'),
    'difficulty': fields.String(default='medium', enum=['easy', 'medium', 'hard'], description='Difficulty level'),
    'voice': fields.String(default='onyx', description='Voice to use for TTS')
})

viva_chat_request = ns.model('VivaChatRequest', {
    'thread_id': fields.String(required=True, description='Thread ID for the conversation'),
    'audio_data': fields.String(description='Base64 encoded audio data'),
    'text': fields.String(description='Text input (alternative to audio)')
})

viva_cleanup_request = ns.model('VivaCleanupRequest', {
    'session_id': fields.String(required=True, description='Session ID to clean up')
})

# OpenAI client and audio directory will be initialized at app startup
client = None
audio_dir = None

@ns.route('/start')
class VivaStartAPI(Resource):
    @ns.expect(viva_request)
    def post(self):
        """Start a new VIVA examination session"""
        try:
            data = request.json
            subject = data.get('subject')
            topic = data.get('topic', 'General Knowledge')
            difficulty = data.get('difficulty', 'medium')
            voice = data.get('voice', service.DEFAULT_VOICE)
            session_id = request.headers.get('X-Session-ID', str(uuid.uuid4()))
            
            if not subject:
                return jsonify({
                    'status': 'error',
                    'message': 'Subject is required'
                }), 400
            
            # Get the current app's socketio instance and audio directory
            socketio = current_app.extensions['socketio']
            audio_dir = current_app.config.get('AUDIO_DIR')
            client = current_app.config.get('OPENAI_CLIENT')
            
            # Start the VIVA session
            response = service.start_viva_session(
                subject, topic, difficulty, voice, session_id, 
                client, audio_dir, socketio
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in start_viva: {str(e)}")
            return {
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            }, 500

@ns.route('/chat')
class VivaChatAPI(Resource):
    @ns.expect(viva_chat_request)
    def post(self):
        """Process user input for VIVA session"""
        try:
            data = request.json
            thread_id = data.get('thread_id')
            audio_data = data.get('audio_data')  # Base64 encoded audio data
            text_input = data.get('text')  # Added text input support
            session_id = request.headers.get('X-Session-ID')
            
            if not thread_id:
                return {
                    'status': 'error',
                    'message': 'Thread ID is required'
                }, 400
            
            if not audio_data and not text_input:
                return {
                    'status': 'error',
                    'message': 'Either audio data or text input is required'
                }, 400
            
            # Get the current app's socketio instance and audio directory
            socketio = current_app.extensions['socketio']
            audio_dir = current_app.config.get('AUDIO_DIR')
            client = current_app.config.get('OPENAI_CLIENT')
            
            # Process the input
            response = service.process_viva_input(
                thread_id, audio_data, text_input, session_id, 
                client, audio_dir, socketio
            )
            
            return response
            
        except ValueError as e:
            logger.error(f"Value error in chat: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }, 404
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            return {
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            }, 500

@viva_gen_bp.route('/progress', methods=['GET'])
def get_progress():
    """Get the current progress of a viva session"""
    try:
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            return jsonify({
                'status': 'error',
                'message': 'Session ID is required'
            }), 400
            
        response = service.get_viva_progress(session_id)
        return jsonify(response)
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred: {str(e)}'
        }), 500

@viva_gen_bp.route('/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """Serve audio files"""
    try:
        audio_dir = current_app.config.get('AUDIO_DIR')
        file_path = os.path.join(audio_dir, filename)
        
        if not os.path.exists(file_path):
            logger.error(f"Audio file not found: {file_path}")
            return jsonify({
                'status': 'error',
                'message': 'Audio file not found'
            }), 404
        
        return send_file(file_path, mimetype='audio/mpeg')
    except Exception as e:
        logger.error(f"Error serving audio file: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error serving audio file: {str(e)}'
        }), 500

@ns.route('/cleanup')
class VivaCleanupAPI(Resource):
    @ns.expect(viva_cleanup_request)
    def post(self):
        """Clean up all audio files associated with a session and remove session data"""
        try:
            data = request.json or {}
            session_id = request.headers.get('X-Session-ID') or data.get('session_id')
            
            if not session_id:
                return {
                    'status': 'error',
                    'message': 'Session ID is required'
                }, 400
            
            audio_dir = current_app.config.get('AUDIO_DIR')
            response = service.cleanup_session_files(session_id, audio_dir)
            
            return response
            
        except Exception as e:
            logger.error(f"Error cleaning up session: {str(e)}")
            return {
                'status': 'error',
                'message': f'An error occurred during cleanup: {str(e)}'
            }, 500

@viva_gen_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint to check if the server is running"""
    return jsonify({
        'status': 'healthy',
        'message': 'Viva server is running'
    })

# Socket.IO handlers
def register_socketio_handlers(socketio):
    @socketio.on('connect')
    def handle_connect():
        session_id = request.sid
        logger.debug(f"Socket connected: {session_id}")
        socketio.emit('connection_status', {'status': 'connected'}, room=session_id)

    @socketio.on('join')
    def handle_join(data):
        from flask_socketio import join_room
        
        session_id = data.get('session_id')
        if session_id:
            # Join the room with the session ID
            join_room(session_id)
            logger.debug(f"Client {request.sid} joined room {session_id}")
            socketio.emit('join_status', {'status': 'joined', 'session_id': session_id}, room=request.sid)

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnect events"""
        session_id = request.sid
        if session_id and session_id in service.active_sessions:
            logger.debug(f"Client disconnected: {session_id}")
            
            # Clean up audio files for this session
            audio_dir = current_app.config.get('AUDIO_DIR')
            try:
                service.cleanup_session_files(session_id, audio_dir)
            except Exception as e:
                logger.error(f"Error cleaning up files on disconnect: {str(e)}")

    @socketio.on('audio_paused')
    def handle_audio_paused(data):
        session_id = data.get('session_id', request.sid)
        logger.debug(f"Audio paused for session: {session_id}")
        if session_id in service.active_sessions:
            service.active_sessions[session_id]['is_ai_speaking'] = False
            socketio.emit('mic_status', {'status': 'enabled'}, room=session_id)

    @socketio.on('audio_resumed')
    def handle_audio_resumed(data):
        session_id = data.get('session_id', request.sid)
        logger.debug(f"Audio resumed for session: {session_id}")
        if session_id in service.active_sessions:
            service.active_sessions[session_id]['is_ai_speaking'] = True
            socketio.emit('mic_status', {'status': 'disabled'}, room=session_id)