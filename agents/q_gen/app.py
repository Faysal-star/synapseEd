from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room  # Added join_room import
from flask_cors import CORS  # Import Flask-CORS
from werkzeug.utils import secure_filename
import os
import uuid
import json
from pdf_processor import PDFProcessor
from vector_store import VectorStoreManager
from llm_factory import LLMFactory
from question_gen_agent import QuestionGenerationSystem

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['VECTOR_STORE_DIR'] = 'vector_stores'
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['VECTOR_STORE_DIR'], exist_ok=True)

# Create instances
llm_factory = LLMFactory()
pdf_processor = PDFProcessor()
vector_store_manager = VectorStoreManager(embedding_provider="openai")

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Endpoint to upload a PDF file"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.pdf'):
        # Generate a unique ID for this job
        job_id = str(uuid.uuid4())
        
        # Save the uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}_{filename}")
        file.save(file_path)
        
        # Get form data before starting background task
        llm_provider = request.form.get('llm_provider', 'openai')
        model = request.form.get('model', '')
        questions_per_chunk = int(request.form.get('questions_per_chunk', 3))
        
        # Start processing in background
        socketio.start_background_task(
            process_pdf, 
            job_id, 
            file_path, 
            llm_provider,
            model,
            questions_per_chunk
        )
        
        return jsonify({
            "message": "File uploaded successfully",
            "job_id": job_id
        })
    
    return jsonify({"error": "Only PDF files are allowed"}), 400

def process_pdf(job_id, file_path, llm_provider='openai', model='', questions_per_chunk=3):
    """Process the PDF and generate questions (runs in background)"""
    print(f"\n[DEBUG-APP] Starting process_pdf for job_id: {job_id}")
    print(f"[DEBUG-APP] Parameters: llm_provider={llm_provider}, model={model}, questions_per_chunk={questions_per_chunk}")
    try:
        # Emit initial status
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Starting PDF processing',
            'progress': 0
        }, room=job_id)
        
        # Process the PDF
        print(f"[DEBUG-APP] Processing PDF: {file_path}")
        chunks, total_chunks = pdf_processor.process_pdf(file_path)
        print(f"[DEBUG-APP] PDF processing complete, got {total_chunks} chunks")
        
        if not chunks:
            print(f"[DEBUG-APP] ERROR: No chunks generated from PDF")
            socketio.emit('status_update', {
                'job_id': job_id,
                'status': 'error',
                'message': 'Failed to process PDF'
            }, room=job_id)
            return
        
        # Update status
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': f'PDF processed into {total_chunks} chunks',
            'progress': 10
        }, room=job_id)
        
        # Create vector store
        print(f"[DEBUG-APP] Creating vector store for job_id: {job_id}")
        vector_store_dir = os.path.join(app.config['VECTOR_STORE_DIR'], job_id)
        os.makedirs(vector_store_dir, exist_ok=True)
        vector_store = vector_store_manager.create_vector_store(chunks)
        vector_store_manager.save_vector_store(vector_store_dir)
        print(f"[DEBUG-APP] Vector store created and saved to: {vector_store_dir}")
        
        # Update status
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Vector store created',
            'progress': 30
        }, room=job_id)
        
        # Configure the question generation system
        print(f"[DEBUG-APP] Initializing QuestionGenerationSystem with provider: {llm_provider}, model: {model}")
        question_system = QuestionGenerationSystem(
            llm_factory=llm_factory,
            llm_provider=llm_provider,
            model=model
        )
        
        # Generate questions
        print(f"[DEBUG-APP] Starting question generation with {questions_per_chunk} questions per chunk")
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Starting question generation',
            'progress': 40
        }, room=job_id)
        
        # Stream question generation progress
        print(f"[DEBUG-APP] Entering question generation stream loop")
        final_questions = []
        final_status = "error"  # Default to error unless explicitly completed
        final_message = "Question generation did not complete."
        
        for update in question_system.generate_questions(chunks, questions_per_chunk):
            print(f"[DEBUG-APP] Received update with status: {update.get('status')}")
            
            if update["status"] == "in_progress":
                try:
                    prog_dict = update.get("progress", {})
                    current = prog_dict.get("current", 0)
                    total = prog_dict.get("total", total_chunks if total_chunks else 1)  # Avoid division by zero
                    base_progress = 40
                    generation_range = 50  # 40% -> 90%
                    progress_percent = base_progress + (current / total) * generation_range if total > 0 else base_progress
                    
                    socketio.emit('status_update', {
                        'job_id': job_id,
                        'status': 'processing',
                        'message': f'Generating questions: {current}/{total} chunks',
                        'progress': min(progress_percent, 95)  # Cap progress slightly below 100 until final emit
                    }, room=job_id)
                except Exception as e:
                    print(f"[DEBUG-APP] ERROR in progress update: {str(e)}")
                    # Continue processing even if we have an error in the progress update
            
            elif update["status"] == "complete" or update["status"] == "complete_with_errors":
                final_status = update["status"]
                final_message = update.get("message", f"Generated {update.get('total_questions', 0)} questions.")
                final_questions = update.get("questions", [])
                print(f"[DEBUG-APP] Generation complete with status: {final_status}. Questions: {len(final_questions)}")
                
                # Save the generated questions immediately
                questions_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}_questions.json")
                try:
                    with open(questions_path, 'w') as f:
                        json.dump(final_questions, f, indent=2)
                    print(f"[DEBUG-APP] Questions saved to file: {questions_path}")
                except Exception as e:
                    print(f"[DEBUG-APP] ERROR saving questions to file: {str(e)}")
                    final_status = "error"
                    final_message = f"Error saving questions: {str(e)}"
                    # Emit error immediately if save fails
                    socketio.emit('status_update', {
                        'job_id': job_id,
                        'status': 'error',
                        'message': final_message,
                    }, room=job_id)
                
                # Send completion notification
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': final_status,  # 'complete', 'complete_with_errors', or 'error'
                    'message': final_message,
                    'progress': 100,
                    'questions': final_questions,
                    'errors': update.get('errors', [])  # Include any errors encountered
                }, room=job_id)
                print(f"[DEBUG-APP] Final status update sent to client")
                # Break out of the loop after final state is processed
                break
            
            elif update["status"] == "error":
                final_status = "error"
                final_message = update.get("message", "An unknown error occurred during generation.")
                print(f"[DEBUG-APP] Generation failed with error: {final_message}")
                socketio.emit('status_update', {
                    'job_id': job_id,
                    'status': 'error',
                    'message': final_message,
                }, room=job_id)
                # Break out of the loop on error
                break
        
        # Safety net: If loop finishes without a proper final status (shouldn't happen with fixed yield logic)
        if final_status not in ["complete", "complete_with_errors", "error"]:
            print("[DEBUG-APP] WARNING: Loop finished unexpectedly. Emitting generic error.")
            socketio.emit('status_update', {
                'job_id': job_id,
                'status': 'error',
                'message': 'Question generation workflow ended unexpectedly.',
            }, room=job_id)
    
    except Exception as e:
        print(f"[DEBUG-APP] CRITICAL ERROR in process_pdf: {str(e)}")
        import traceback
        print(f"[DEBUG-APP] Traceback: {traceback.format_exc()}")
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'error',
            'message': f'Error: {str(e)}'
        }, room=job_id)

@app.route('/api/questions/<job_id>', methods=['GET'])
def get_questions(job_id):
    """Get the generated questions for a job"""
    questions_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{job_id}_questions.json")
    
    if os.path.exists(questions_path):
        with open(questions_path, 'r') as f:
            questions = json.load(f)
        return jsonify(questions)
    else:
        return jsonify({"error": "Questions not found"}), 404

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('join')
def handle_join(data):
    """Allow clients to join a specific job room"""
    room = data.get('job_id')
    if room:
        join_room(room)  # Using the imported join_room function instead of socketio.join_room
        emit('status_update', {
            'job_id': room,
            'status': 'connected',
            'message': 'Connected to job updates'
        })

if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)