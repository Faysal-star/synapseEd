from flask import Blueprint, request, jsonify, send_file, current_app
from flask_restx import Api, Resource, fields, Namespace
import uuid
import threading
import os
from . import service

# Create blueprint for content generation
content_gen_bp = Blueprint('content_gen', __name__)

# Create a Namespace for the content gen API
ns = Namespace('content-gen', description='Content Generation operations')

# Dictionary to store active generation jobs
active_jobs = {}

# Register socket events with the global socketio instance - will be imported in app.py
# Define request models for documentation
pdf_request = ns.model('PDFGenerateRequest', {
    'topic': fields.String(required=True, description='Main topic for the lecture'),
    'additional_context': fields.String(description='Additional context/instructions'),
    'sections': fields.List(fields.String, description='Custom sections to include'),
    'llm_provider': fields.String(default='openai', description='LLM provider (openai, google)'),
    'model': fields.String(description='Specific model name (optional)')
})

@ns.route('/pdf/generate')
class PDFGenerateAPI(Resource):
    @ns.expect(pdf_request)
    def post(self):
        """Start PDF generation process"""
        try:
            # Parse JSON data
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            topic = data.get('topic')
            if not topic:
                return jsonify({"error": "Topic is required"}), 400
                
            # Create job ID
            job_id = str(uuid.uuid4())
            
            # Get the current app's socketio instance and output folder
            socketio = current_app.extensions['socketio']
            output_folder = current_app.config['OUTPUT_FOLDER']
            
            # Start the generation process in background
            threading.Thread(
                target=service.generate_pdf_background,
                args=(job_id, topic, data, active_jobs, output_folder, socketio)
            ).start()
            
            return jsonify({
                "message": "PDF generation started",
                "job_id": job_id
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# Use blueprint routes for non-RESTx endpoints
@content_gen_bp.route('/pdf/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of a PDF generation job"""
    job = active_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
        
    return jsonify(job)

@content_gen_bp.route('/pdf/download/<job_id>', methods=['GET'])
def download_pdf(job_id):
    """Download the generated PDF"""
    job = active_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
        
    if job['status'] != 'completed':
        return jsonify({"error": "PDF generation not completed"}), 400
        
    pdf_path = job['pdf_path']
    return send_file(pdf_path, download_name=job['filename'], as_attachment=True)

# Socket.IO handlers
def register_socketio_handlers(socketio):
    @socketio.on('connect')
    def handle_connect():
        print('Client connected to content generation service')

    @socketio.on('join')
    def handle_join(data):
        """Allow clients to join a specific job room"""
        from flask_socketio import join_room, emit
        room = data.get('job_id')
        if room:
            join_room(room)
            emit('status_update', {
                'job_id': room,
                'status': 'connected',
                'message': 'Connected to job updates'
            })