from flask import Blueprint, request, jsonify, current_app
from flask_restx import Api, Resource, fields, Namespace
from werkzeug.utils import secure_filename
import os
import uuid
import threading
import logging
from . import service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint for question generation
q_gen_bp = Blueprint('q_gen', __name__)

# Create a Namespace for the API
ns = Namespace('q-gen', description='Question Generation operations')

# Define request models for documentation
upload_model = ns.model('FileUploadRequest', {
    'file': fields.Raw(required=True, description='PDF file to upload'),
    'llm_provider': fields.String(default='openai', description='LLM provider (openai, google)'),
    'model': fields.String(description='Specific model name (optional)'),
    'questions_per_chunk': fields.Integer(default=3, description='Number of questions to generate per chunk')
})

@ns.route('/upload')
class FileUploadAPI(Resource):
    @ns.expect(upload_model)
    def post(self):
        """Upload a PDF file to generate questions"""
        try:
            if 'file' not in request.files:
                return {"error": "No file part"}, 400
                
            file = request.files['file']
            if file.filename == '':
                return {"error": "No selected file"}, 400
                
            if file and file.filename.endswith('.pdf'):
                # Generate a unique ID for this job
                job_id = str(uuid.uuid4())
                
                # Save the uploaded file
                filename = secure_filename(file.filename)
                upload_folder = current_app.config['UPLOAD_FOLDER']
                file_path = os.path.join(upload_folder, f"{job_id}_{filename}")
                file.save(file_path)
                
                # Get form data
                llm_provider = request.form.get('llm_provider', 'openai')
                model = request.form.get('model', '')
                try:
                    questions_per_chunk = int(request.form.get('questions_per_chunk', 3))
                except ValueError:
                    questions_per_chunk = 3
                
                # Get the current app's socketio instance
                socketio = current_app.extensions['socketio']
                
                # Create the question service
                llm_factory = current_app.config.get('LLM_FACTORY')
                output_folder = current_app.config.get('UPLOAD_FOLDER')
                vector_store_dir = current_app.config.get('VECTOR_STORE_DIR')
                
                question_service = service.QuestionGenService(
                    llm_factory=llm_factory,
                    output_dir=output_folder,
                    vector_store_dir=vector_store_dir
                )
                
                # Start processing in background
                thread = threading.Thread(
                    target=question_service.process_pdf,
                    args=(job_id, file_path, llm_provider, model, questions_per_chunk, socketio)
                )
                thread.daemon = True
                thread.start()
                
                return {
                    "message": "File uploaded successfully",
                    "job_id": job_id
                }
            else:
                return {"error": "Only PDF files are allowed"}, 400
                
        except Exception as e:
            logger.error(f"Error in file upload: {e}")
            return {"error": str(e)}, 500

@ns.route('/questions/<string:job_id>')
@ns.param('job_id', 'The job ID')
class QuestionsAPI(Resource):
    def get(self, job_id):
        """Get the generated questions for a job"""
        try:
            # Get the question service
            llm_factory = current_app.config.get('LLM_FACTORY')
            output_folder = current_app.config.get('UPLOAD_FOLDER')
            vector_store_dir = current_app.config.get('VECTOR_STORE_DIR')
            
            question_service = service.QuestionGenService(
                llm_factory=llm_factory,
                output_dir=output_folder,
                vector_store_dir=vector_store_dir
            )
            
            # Get job status
            job_status = question_service.get_job_status(job_id)
            
            if not job_status:
                return {"error": "Job not found"}, 404
                
            if job_status.get('status') == 'error':
                return {"error": job_status.get('message')}, 500
                
            # Get questions
            questions = question_service.get_questions(job_id)
            
            return {"questions": questions}
            
        except Exception as e:
            logger.error(f"Error getting questions: {e}")
            return {"error": str(e)}, 500

@ns.route('/status/<string:job_id>')
@ns.param('job_id', 'The job ID')
class JobStatusAPI(Resource):
    def get(self, job_id):
        """Check the status of a question generation job"""
        try:
            # Get the question service
            llm_factory = current_app.config.get('LLM_FACTORY')
            output_folder = current_app.config.get('UPLOAD_FOLDER')
            vector_store_dir = current_app.config.get('VECTOR_STORE_DIR')
            
            question_service = service.QuestionGenService(
                llm_factory=llm_factory,
                output_dir=output_folder,
                vector_store_dir=vector_store_dir
            )
            
            # Get job status
            job_status = question_service.get_job_status(job_id)
            
            if not job_status:
                return {"error": "Job not found"}, 404
            
            return {
                "status": job_status.get('status'),
                "message": job_status.get('message'),
                "question_count": len(job_status.get('questions', []))
            }
            
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            return {"error": str(e)}, 500

# Socket.IO handlers
def register_socketio_handlers(socketio):
    @socketio.on('join')
    def handle_join(data):
        from flask_socketio import join_room
        room = data.get('job_id')
        if room:
            join_room(room)
            socketio.emit('joined', {'message': f'Joined room {room}'}, room=room)