from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from pdf_generator import PDFGenerator
import os
import uuid
import json
from dotenv import load_dotenv
import tempfile
from flask_restx import Api, Resource, fields
import threading

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['OUTPUT_FOLDER'] = 'generated_pdfs'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Create API documentation
api = Api(app, version='1.0', title='PDF Generator API',
          description='API for generating lecture PDFs')

# Ensure output directory exists
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# Dictionary to store active generation jobs
active_jobs = {}

# Define request models for documentation
pdf_request = api.model('PDFGenerateRequest', {
    'topic': fields.String(required=True, description='Main topic for the lecture'),
    'additional_context': fields.String(description='Additional context/instructions'),
    'sections': fields.List(fields.String, description='Custom sections to include'),
    'llm_provider': fields.String(default='openai', description='LLM provider (openai, google)'),
    'model': fields.String(description='Specific model name (optional)')
})

# Route for PDF generation
@api.route('/api/pdf/generate')
class PDFGenerateAPI(Resource):
    @api.expect(pdf_request)
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
            
            # Create a new PDF generator
            llm_provider = data.get('llm_provider', 'openai')
            model = data.get('model')
            
            # Start the generation process in background
            threading.Thread(
                target=generate_pdf_background,
                args=(job_id, topic, data)
            ).start()
            
            return jsonify({
                "message": "PDF generation started",
                "job_id": job_id
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/pdf/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of a PDF generation job"""
    job = active_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
        
    return jsonify(job)

@app.route('/api/pdf/download/<job_id>', methods=['GET'])
def download_pdf(job_id):
    """Download the generated PDF"""
    job = active_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
        
    if job['status'] != 'completed':
        return jsonify({"error": "PDF generation not completed"}), 400
        
    pdf_path = job['pdf_path']
    return send_file(pdf_path, download_name=job['filename'], as_attachment=True)

def generate_pdf_background(job_id, topic, data):
    """Generate PDF in background thread"""
    try:
        # Update job status
        active_jobs[job_id] = {
            'status': 'processing',
            'message': 'Starting PDF generation',
            'progress': 10,
            'topic': topic
        }
        
        # Emit status update via Socket.IO
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Starting PDF generation',
            'progress': 10
        }, room=job_id)
        
        # Create PDF generator
        llm_provider = data.get('llm_provider', 'openai')
        model = data.get('model')
        generator = PDFGenerator(llm_provider=llm_provider, model=model)
        
        # Update status
        active_jobs[job_id]['progress'] = 30
        active_jobs[job_id]['message'] = 'Generating content'
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Generating content',
            'progress': 30
        }, room=job_id)
        
        # Generate content
        content_data = generator.generate_content(
            topic=topic,
            additional_context=data.get('additional_context', ''),
            sections=data.get('sections')
        )
        
        # Update status
        active_jobs[job_id]['progress'] = 70
        active_jobs[job_id]['message'] = 'Creating PDF document'
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Creating PDF document',
            'progress': 70
        }, room=job_id)
        
        # Create PDF
        filename = f"{topic.replace(' ', '_')[:30]}_{job_id[:8]}.pdf"
        pdf_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        
        generator.create_pdf(content_data, pdf_path)
        
        # Update status with completion information
        active_jobs[job_id] = {
            'status': 'completed',
            'message': 'PDF generation completed',
            'progress': 100,
            'pdf_path': pdf_path,
            'filename': filename,
            'topic': topic,
            'content_summary': {
                'title': content_data.get('title', ''),
                'sections': [s.get('heading', '') for s in content_data.get('sections', [])]
            }
        }
        
        # Emit final status update
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'completed',
            'message': 'PDF generation completed',
            'progress': 100,
            'filename': filename,
            'content_summary': active_jobs[job_id]['content_summary']
        }, room=job_id)
        
    except Exception as e:
        # Update status with error
        active_jobs[job_id] = {
            'status': 'error',
            'message': f'Error: {str(e)}',
            'progress': 0,
            'topic': topic
        }
        
        # Emit error status
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'error',
            'message': f'Error: {str(e)}',
            'progress': 0
        }, room=job_id)

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('join')
def handle_join(data):
    """Allow clients to join a specific job room"""
    room = data.get('job_id')
    if room:
        join_room(room)
        emit('status_update', {
            'job_id': room,
            'status': 'connected',
            'message': 'Connected to job updates'
        })

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)