import os
import uuid
import json
import logging
from .vector_store import VectorStoreManager
from .question_gen_agent import QuestionGenerationSystem
from common.pdf_processor import PDFProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Storage for active jobs
active_jobs = {}

class QuestionGenService:
    def __init__(self, llm_factory, output_dir, vector_store_dir):
        self.llm_factory = llm_factory
        self.output_dir = output_dir
        self.vector_store_dir = vector_store_dir
        self.pdf_processor = PDFProcessor()
        
    def process_pdf(self, job_id, file_path, llm_provider='openai', model=None, questions_per_chunk=3, socketio=None):
        """Process the PDF and generate questions"""
        try:
            # Update job status
            if socketio:
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'processing',
                    'message': 'Starting PDF processing',
                    'progress': 0
                }, room=job_id)
                
            # Process the PDF
            chunks, total_chunks = self.pdf_processor.process_pdf(file_path)
            
            if not chunks:
                if socketio:
                    socketio.emit('status_update', {
                        'job_id': job_id,
                        'status': 'error',
                        'message': 'Failed to process PDF. No content extracted.'
                    }, room=job_id)
                return None
            
            # Update status
            if socketio:
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'processing',
                    'message': f'PDF processed into {total_chunks} chunks',
                    'progress': 10
                }, room=job_id)
            
            # Create vector store
            vector_store_manager = VectorStoreManager(embedding_provider=llm_provider)
            vector_store_dir = os.path.join(self.vector_store_dir, job_id)
            os.makedirs(vector_store_dir, exist_ok=True)
            vector_store = vector_store_manager.create_vector_store(chunks)
            vector_store_manager.save_vector_store(vector_store_dir)
            
            # Update status
            if socketio:
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'processing',
                    'message': 'Vector store created, beginning question generation',
                    'progress': 30
                }, room=job_id)
            
            # Configure the question generation system
            question_system = QuestionGenerationSystem(
                llm_factory=self.llm_factory,
                llm_provider=llm_provider,
                model=model
            )
            
            # Generate questions
            final_questions = []
            final_status = "error"
            final_message = "Question generation did not complete."
            
            for update in question_system.generate_questions(chunks, questions_per_chunk):
                if update["status"] == "in_progress" and socketio:
                    progress_data = update.get("progress", {})
                    current = progress_data.get("current", 0)
                    total = progress_data.get("total", 1)
                    
                    base_progress = 30
                    generation_range = 60  # 30% -> 90%
                    progress_percent = base_progress + (current / total) * generation_range if total > 0 else base_progress
                    
                    socketio.emit('status_update', {
                        'job_id': job_id,
                        'status': 'processing',
                        'message': f'Generating questions: {current}/{total} chunks',
                        'progress': min(progress_percent, 90)  # Cap at 90% until complete
                    }, room=job_id)
                
                elif update["status"] == "complete" or update["status"] == "complete_with_errors":
                    final_status = update["status"]
                    final_message = update.get("message", f"Generated {update.get('total_questions', 0)} questions.")
                    final_questions = update.get("questions", [])
                    
                    # Save questions to file
                    questions_path = os.path.join(self.output_dir, f"{job_id}_questions.json")
                    with open(questions_path, 'w') as f:
                        json.dump(final_questions, f, indent=2)
                    
                    # Final emission with complete questions
                    if socketio:
                        socketio.emit('status_update', {
                            'job_id': job_id,
                            'status': final_status,
                            'message': final_message,
                            'progress': 100,
                            'questions': final_questions,
                            'errors': update.get('errors', [])
                        }, room=job_id)
                    
                    # Store final result in active_jobs
                    active_jobs[job_id] = {
                        'status': final_status,
                        'message': final_message,
                        'questions': final_questions,
                        'file_path': file_path,
                        'questions_path': questions_path
                    }
                    
                    return final_questions
                
                elif update["status"] == "error" and socketio:
                    error_message = update.get("message", "An unknown error occurred during generation.")
                    socketio.emit('status_update', {
                        'job_id': job_id,
                        'status': 'error',
                        'message': error_message,
                    }, room=job_id)
                    return None
            
            # If we exit the loop without returning, something went wrong
            if socketio:
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'error',
                    'message': 'Question generation ended unexpectedly.',
                }, room=job_id)
            
            return None
            
        except Exception as e:
            logger.error(f"Error in process_pdf: {e}")
            if socketio:
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'error',
                    'message': f'Error: {str(e)}'
                }, room=job_id)
            return None

    def get_job_status(self, job_id):
        """Get the status of a job"""
        return active_jobs.get(job_id)
    
    def get_questions(self, job_id):
        """Get questions for a job"""
        job = active_jobs.get(job_id)
        if not job:
            return None
        
        return job.get('questions', [])