from flask import Flask, request, jsonify, send_file, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import openai
import os
from dotenv import load_dotenv
import logging
import tempfile
import base64
from io import BytesIO
import soundfile as sf
import numpy as np
import time
from threading import Thread
import uuid
import shutil
import json
import random
import signal
import atexit
import sys

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "X-Session-ID"]}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Create a directory for storing audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_files")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Validate OpenAI API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

# Initialize OpenAI client
client = openai.OpenAI(api_key=api_key)

# Store active sessions
active_sessions = {}

# Default voice settings
DEFAULT_VOICE = "onyx"
DEFAULT_MODEL = "gpt-4o"
TTS_MODEL = "tts-1"
STT_MODEL = "whisper-1"

def save_audio_file(audio_data, session_id):
    """Save audio data to a file in the AUDIO_DIR directory and return the relative path"""
    # Generate a unique filename
    filename = f"{session_id}_{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    # Save the audio data to the file
    with open(filepath, 'wb') as f:
        f.write(audio_data)
    
    # Return the relative path to the audio file
    return f"/api/viva/audio/{filename}"

def check_user_presence(session_id):
    """Check if user is still present after a period of silence"""
    time.sleep(30)  # Wait for 30 seconds
    if session_id in active_sessions and active_sessions[session_id].get('last_activity'):
        last_activity = active_sessions[session_id]['last_activity']
        if time.time() - last_activity > 30:
            socketio.emit('user_presence_check', {'message': 'Are you still there?'}, room=session_id)

def check_repeat_request(message):
    """Check if the message is asking for a question to be repeated or explained further."""
    # Convert to lowercase for case-insensitive matching
    message_lower = message.lower()
    
    # List of common phrases indicating a repeat request
    repeat_phrases = [
        "repeat the question",
        "say that again",
        "could you repeat",
        "what was the question",
        "i didn't hear",
        "i don't understand",
        "please explain",
        "clarify",
        "explain the question",
        "what do you mean",
        "can you elaborate",
        "can you explain",
        "didn't get that",
        "pardon",
        "sorry, what"
    ]
    
    # Check if any of the repeat phrases are in the message
    for phrase in repeat_phrases:
        if phrase in message_lower:
            return True
    
    # More sophisticated detection for ambiguous cases
    if len(message_lower.split()) < 6:  # Short responses might be confusion
        confused_indicators = ["what", "how", "why", "question", "mean", "sorry"]
        for indicator in confused_indicators:
            if indicator in message_lower:
                return True
    
    return False

def elaborate_question(question, subject, topic, client):
    """Generate an elaboration for the given question."""
    try:
        system_prompt = f"""You are an examiner in {subject} conducting a viva on {topic}.
        A student has asked for clarification on this question: "{question}"
        
        Provide a brief elaboration to help them understand what's being asked.
        
        Your elaboration should:
        1. Be concise (2-3 sentences)
        2. Clarify the scope or intent of the question
        3. Stay factual and academic in tone
        4. Not provide any answers
        
        Return only the elaboration text without any introductory phrases like "Here's an elaboration" or "To clarify".
        """
        
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Please elaborate on this question: {question}"}
            ],
            max_tokens=100  # Limit response length to ensure conciseness
        )
        
        elaboration = response.choices[0].message.content.strip()
        
        # Add a natural lead-in
        return f"To clarify: {elaboration}"
    except Exception as e:
        logger.error(f"Error generating question elaboration: {str(e)}")
        return "Could you please provide your answer to this question?"

class VivaExam:
    """Class to manage a structured viva exam with questions, scoring, and feedback"""
    
    def __init__(self, subject, topic, difficulty="medium"):
        self.subject = subject
        self.topic = topic
        self.difficulty = difficulty
        self.questions = []
        self.current_question_index = 0
        self.answers = []
        self.scores = []
        self.feedback = []
        self.total_score = 0
        self.max_score = 0
        self.status = "not_started"  # not_started, in_progress, completed
        
    def generate_questions(self, client):
        """Generate 10 questions using OpenAI for the given subject and topic"""
        system_prompt = f"""You are an expert examiner in {self.subject}, specializing in {self.topic}.
        Generate 10 clear, concise questions for a viva voce examination of {self.difficulty} difficulty.
        
        Your questions should:
        - Be direct and concise (15-25 words each)
        - Focus on key concepts, application, and analysis
        - Be clearly articulated without unnecessary words
        - Progress from foundational to more advanced concepts
        - Require specific, focused answers
        - Be suitable for a formal academic examination
        
        Return the questions in a JSON array format with each question as a string."""
        
        try:
            response = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create 10 concise, well-structured viva questions for {self.subject}, topic: {self.topic}, at a {self.difficulty} level."}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            self.questions = result.get("questions", [])
            if len(self.questions) != 10:
                # Ensure we have exactly 10 questions
                raise ValueError(f"Expected 10 questions, got {len(self.questions)}")
            
            self.status = "in_progress"
            return self.questions
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            raise
    
    def get_current_question(self):
        """Get the current question"""
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None
    
    def evaluate_answer(self, answer, client):
        """Evaluate the student's answer to the current question"""
        if self.current_question_index >= len(self.questions):
            return None
        
        current_question = self.questions[self.current_question_index]
        
        system_prompt = f"""You are an examiner in {self.subject} conducting a viva on {self.topic}.
        You asked: "{current_question}"
        
        Evaluate the answer professionally and provide concise feedback. Your response should:
        
        1. Be brief and direct (2-3 sentences maximum)
        2. Clearly indicate if the key points were addressed
        3. Note any important omissions or misconceptions
        4. Be academically rigorous but fair
        
        Score the answer from 0-10:
        - 0-2: Incorrect or irrelevant
        - 3-5: Partially correct with significant gaps
        - 6-8: Mostly correct with minor issues
        - 9-10: Excellent and comprehensive
        
        Return your evaluation in JSON format with:
        - 'score': number from 0-10
        - 'feedback': your concise feedback (20-30 words)
        """
        
        try:
            response = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Question: {current_question}\nStudent's answer: {answer}"}
                ],
                response_format={"type": "json_object"}
            )
            
            evaluation = json.loads(response.choices[0].message.content)
            score = evaluation.get("score", 0)
            feedback = evaluation.get("feedback", "No feedback provided")
            
            # Save the answer, score and feedback
            self.answers.append(answer)
            self.scores.append(score)
            self.feedback.append(feedback)
            
            # Update total score
            self.total_score += score
            self.max_score += 10
            
            # Advance to next question
            self.current_question_index += 1
            
            # Check if exam is completed
            if self.current_question_index >= len(self.questions):
                self.status = "completed"
                
            return {
                "question": current_question,
                "answer": answer,
                "score": score,
                "feedback": feedback,
                "question_number": self.current_question_index,
                "total_questions": len(self.questions),
                "is_completed": self.status == "completed"
            }
        except Exception as e:
            logger.error(f"Error evaluating answer: {str(e)}")
            raise
    
    def generate_final_report(self, client):
        """Generate a comprehensive final report with overall score and feedback"""
        if self.status != "completed":
            return None
        
        percentage = (self.total_score / self.max_score) * 100 if self.max_score > 0 else 0
        
        # Map percentage to letter grade
        grade = "A+" if percentage >= 95 else "A" if percentage >= 90 else "A-" if percentage >= 85 else \
               "B+" if percentage >= 80 else "B" if percentage >= 75 else "B-" if percentage >= 70 else \
               "C+" if percentage >= 65 else "C" if percentage >= 60 else "C-" if percentage >= 55 else \
               "D+" if percentage >= 50 else "D" if percentage >= 45 else "F"
        
        system_prompt = f"""You are an examiner in {self.subject} who has just completed a viva on {self.topic}.
        Provide a concise, factual summary for a student who scored {self.total_score}/{self.max_score} ({percentage:.1f}%, grade {grade}).
        
        Your summary should:
        - Be clear and direct
        - Present objective feedback based on performance
        - List 2-3 specific strengths in bullet points
        - List 2-3 specific areas for improvement in bullet points
        - Provide a brief overall assessment
        - Include 2-3 concrete recommendations for improvement
        
        Return your evaluation in JSON format with:
        - 'grade': Letter grade based on percentage
        - 'percentage': Numerical percentage
        - 'strengths': Key strengths (array of brief points)
        - 'areas_for_improvement': Areas that need work (array of brief points)
        - 'overall_feedback': A concise paragraph of overall assessment (max 50 words)
        - 'next_steps': Recommended actions (array of specific suggestions)"""
        
        # Prepare question-answer-feedback for the model context
        qa_context = ""
        for i, (question, answer, score, feedback) in enumerate(zip(self.questions, self.answers, self.scores, self.feedback)):
            qa_context += f"Q{i+1}. {question}\nAnswer: {answer}\nScore: {score}/10\nFeedback: {feedback}\n\n"
        
        try:
            response = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Provide a final evaluation based on these Q&A:\n\n{qa_context}"}
                ],
                response_format={"type": "json_object"}
            )
            
            final_report = json.loads(response.choices[0].message.content)
            
            # Add the raw scores and calculated data
            final_report["raw_score"] = self.total_score
            final_report["max_score"] = self.max_score
            final_report["calculated_percentage"] = percentage
            final_report["questions"] = self.questions
            final_report["answers"] = self.answers
            final_report["question_scores"] = self.scores
            final_report["question_feedback"] = self.feedback
            
            return final_report
        except Exception as e:
            logger.error(f"Error generating final report: {str(e)}")
            raise

@app.route('/api/viva/start', methods=['POST'])
def start_viva():
    data = request.json
    subject = data.get('subject')
    topic = data.get('topic', 'General Knowledge')
    difficulty = data.get('difficulty', 'medium')
    voice = data.get('voice', DEFAULT_VOICE)
    session_id = request.headers.get('X-Session-ID', str(uuid.uuid4()))
    
    if not subject:
        return jsonify({
            'status': 'error',
            'message': 'Subject is required'
        }), 400
    
    try:
        logger.debug(f"Starting viva session for subject: {subject}, topic: {topic}")
        
        # Create a new exam instance
        exam = VivaExam(subject, topic, difficulty)
        
        # Generate questions
        exam.generate_questions(client)
        
        # Get the first question
        first_question = exam.get_current_question()
        
        # Generate welcome message and first question
        greeting = f"Welcome to your viva examination in {subject}, focusing on {topic}. I'll ask you 10 questions. Please provide clear, concise answers. Let's begin. Question 1: {first_question}"
        
        # Convert greeting to speech
        speech_response = client.audio.speech.create(
            model=TTS_MODEL,
            voice=voice,
            input=greeting
        )
        
        # Get the speech audio data
        speech_data = b''
        for chunk in speech_response.iter_bytes():
            speech_data += chunk
        
        # Save the audio to a file
        audio_path = save_audio_file(speech_data, session_id)
        
        # Store session information
        active_sessions[session_id] = {
            'exam': exam,
            'voice': voice,
            'last_activity': time.time(),
            'is_ai_speaking': True
        }
        
        # Start presence check thread
        Thread(target=check_user_presence, args=(session_id,), daemon=True).start()
        
        return jsonify({
            'status': 'success',
            'session_id': session_id,
            'message': 'Viva session started successfully',
            'greeting': greeting,
            'current_question': {
                'number': 1,
                'total': 10,
                'text': first_question
            },
            'audio_path': audio_path
        })
    
    except Exception as e:
        logger.error(f"Error in start_viva: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred: {str(e)}'
        }), 500

@app.route('/api/viva/chat', methods=['POST'])
def chat():
    data = request.json
    thread_id = data.get('thread_id')
    audio_data = data.get('audio_data')  # Base64 encoded audio data
    text_input = data.get('text')  # Added text input support
    session_id = request.headers.get('X-Session-ID')
    
    if not thread_id:
        return jsonify({
            'status': 'error',
            'message': 'Thread ID is required'
        }), 400
    
    if not audio_data and not text_input:
        return jsonify({
            'status': 'error',
            'message': 'Either audio data or text input is required'
        }), 400
    
    try:
        # Check if session exists
        if session_id not in active_sessions:
            return jsonify({
                'status': 'error',
                'message': 'Session not found or expired'
            }), 404
        
        session = active_sessions[session_id]
        exam = session.get('exam')
        voice = session.get('voice', DEFAULT_VOICE)
        
        # Update last activity
        session['last_activity'] = time.time()
        session['is_ai_speaking'] = False
        
        # Process user input (either audio or text)
        if audio_data:
            # Convert base64 audio to bytes
            audio_bytes = base64.b64decode(audio_data)
            
            # Create a BytesIO object from the audio data
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.webm"  # Set the filename with extension
            
            # Transcribe audio to text
            transcription = client.audio.transcriptions.create(
                model=STT_MODEL,
                file=audio_file
            )
            user_message = transcription.text
            logger.debug(f"Transcribed message: {user_message}")
        else:
            # Use text input directly
            user_message = text_input
            logger.debug(f"Text message received: {user_message}")
        
        # Check if user is asking to repeat or clarify the question
        is_repeat_request = check_repeat_request(user_message)
        
        if is_repeat_request:
            # Get the current question
            current_question_idx = exam.current_question_index
            if current_question_idx < len(exam.questions):
                current_question = exam.questions[current_question_idx]
                
                # Generate elaboration on the question
                elaboration = elaborate_question(current_question, exam.subject, exam.topic, client)
                
                assistant_response = f"Question {current_question_idx + 1}: {current_question} {elaboration}"
                
                # Convert response to speech
                speech_response = client.audio.speech.create(
                    model=TTS_MODEL,
                    voice=voice,
                    input=assistant_response
                )
                
                # Get the speech audio data
                speech_data = b''
                for chunk in speech_response.iter_bytes():
                    speech_data += chunk
                
                # Save the audio to a file
                audio_path = save_audio_file(speech_data, session_id)
                
                # Emit socket event for real-time updates
                socketio.emit('ai_response', {
                    'response': assistant_response,
                    'audio_path': audio_path,
                    'transcription': user_message,
                    'is_repeat': True
                }, room=session_id)
                
                return jsonify({
                    'status': 'success',
                    'response': assistant_response,
                    'audio_path': audio_path,
                    'transcription': user_message,
                    'is_repeat': True
                })
        
        # If not a repeat request, evaluate the answer
        evaluation = exam.evaluate_answer(user_message, client)
        
        # Prepare response based on evaluation
        if exam.status == "completed":
            # Generate final report
            final_report = exam.generate_final_report(client)
            
            # Prepare final message
            final_message = f"Examination complete. Your score: {final_report['raw_score']}/{final_report['max_score']} ({final_report['percentage']}%). Grade: {final_report['grade']}. {final_report['overall_feedback']}"
            
            assistant_response = final_message
            
            # Include full report in the response
            evaluation['final_report'] = final_report
        else:
            # Prepare feedback and next question
            next_question = exam.get_current_question()
            
            # Use direct transitions for viva examination
            transitions = [
                "Question",
                "Next question",
                "Moving to question",
                "For question",
                "Question"
            ]
            
            # Select a random transition phrase
            transition = random.choice(transitions)
            
            # Format the response in a direct way
            assistant_response = f"{evaluation['feedback']} {transition} {evaluation['question_number'] + 1}: {next_question}"
        
        # Update session state
        session['is_ai_speaking'] = True
        
        # Convert response to speech
        speech_response = client.audio.speech.create(
            model=TTS_MODEL,
            voice=voice,
            input=assistant_response
        )
        
        # Get the speech audio data
        speech_data = b''
        for chunk in speech_response.iter_bytes():
            speech_data += chunk
        
        # Save the audio to a file
        audio_path = save_audio_file(speech_data, session_id)
        
        # Emit socket event for real-time updates
        socketio.emit('ai_response', {
            'response': assistant_response,
            'audio_path': audio_path,
            'transcription': user_message,
            'evaluation': evaluation
        }, room=session_id)
        
        return jsonify({
            'status': 'success',
            'response': assistant_response,
            'audio_path': audio_path,
            'transcription': user_message,
            'evaluation': evaluation
        })
    
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred: {str(e)}'
        }), 500

@app.route('/api/viva/progress', methods=['GET'])
def get_progress():
    """Get the current progress of a viva session"""
    session_id = request.headers.get('X-Session-ID')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({
            'status': 'error',
            'message': 'Session not found or expired'
        }), 404
    
    try:
        session = active_sessions[session_id]
        exam = session.get('exam')
        
        if not exam:
            return jsonify({
                'status': 'error',
                'message': 'Exam not found in session'
            }), 404
        
        progress_data = {
            'status': exam.status,
            'current_question_index': exam.current_question_index,
            'total_questions': len(exam.questions),
            'current_score': exam.total_score,
            'max_possible_score': exam.max_score,
            'percentage': (exam.total_score / exam.max_score * 100) if exam.max_score > 0 else 0
        }
        
        if exam.status == "completed":
            # Include final report if available
            final_report = exam.generate_final_report(client)
            if final_report:
                progress_data['final_report'] = final_report
        
        return jsonify({
            'status': 'success',
            'progress': progress_data
        })
    
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred: {str(e)}'
        }), 500

@app.route('/api/viva/audio/<filename>', methods=['GET'])
def get_audio(filename):
    try:
        file_path = os.path.join(AUDIO_DIR, filename)
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

@socketio.on('connect')
def handle_connect():
    session_id = request.sid
    logger.debug(f"Socket connected: {session_id}")
    socketio.emit('connection_status', {'status': 'connected'}, room=session_id)

@socketio.on('join')
def handle_join(data):
    session_id = data.get('session_id')
    if session_id:
        # Join the room with the session ID
        socketio.server.enter_room(request.sid, session_id)
        logger.debug(f"Client {request.sid} joined room {session_id}")
        socketio.emit('join_status', {'status': 'joined', 'session_id': session_id}, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnect events"""
    session_id = request.sid
    if session_id and session_id in active_sessions:
        logger.debug(f"Client disconnected: {session_id}")
        
        # Clean up audio files for this session
        try:
            files_deleted = 0
            for filename in os.listdir(AUDIO_DIR):
                if filename.startswith(f"{session_id}_"):
                    file_path = os.path.join(AUDIO_DIR, filename)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        files_deleted += 1
                        logger.debug(f"Removed file for disconnected session {session_id}: {filename}")
            
            # Remove session data
            active_sessions.pop(session_id, None)
            logger.debug(f"Removed session data for disconnected client {session_id}, deleted {files_deleted} files")
        except Exception as e:
            logger.error(f"Error cleaning up files: {str(e)}")

@socketio.on('audio_paused')
def handle_audio_paused(data):
    session_id = data.get('session_id', request.sid)
    logger.debug(f"Audio paused for session: {session_id}")
    if session_id in active_sessions:
        active_sessions[session_id]['is_ai_speaking'] = False
        socketio.emit('mic_status', {'status': 'enabled'}, room=session_id)

@socketio.on('audio_resumed')
def handle_audio_resumed(data):
    session_id = data.get('session_id', request.sid)
    logger.debug(f"Audio resumed for session: {session_id}")
    if session_id in active_sessions:
        active_sessions[session_id]['is_ai_speaking'] = True
        socketio.emit('mic_status', {'status': 'disabled'}, room=session_id)

@app.route('/api/viva/health', methods=['GET'])
def health_check():
    """Endpoint to check if the server is running"""
    return jsonify({
        'status': 'healthy',
        'message': 'Viva server is running'
    })

@app.route('/api/viva/cleanup', methods=['POST'])
def cleanup_session():
    """Clean up all audio files associated with a session and remove session data"""
    try:
        # Handle both regular JSON requests and sendBeacon which sends as text/plain
        if request.content_type and 'application/json' in request.content_type:
            data = request.json or {}
        else:
            # For sendBeacon, the data comes as text/plain
            try:
                data = json.loads(request.data.decode('utf-8')) if request.data else {}
            except:
                data = {}
        
        session_id = request.headers.get('X-Session-ID') or data.get('session_id')
        
        if not session_id:
            return jsonify({
                'status': 'error',
                'message': 'Session ID is required'
            }), 400
        
        # Clean up audio files associated with this session
        files_deleted = 0
        for filename in os.listdir(AUDIO_DIR):
            if filename.startswith(f"{session_id}_"):
                file_path = os.path.join(AUDIO_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    files_deleted += 1
                    logger.debug(f"Removed file for session {session_id}: {filename}")
        
        # Remove session data
        if session_id in active_sessions:
            active_sessions.pop(session_id)
            logger.debug(f"Removed session data for {session_id}")
        
        return jsonify({
            'status': 'success',
            'message': f'Session cleanup completed. Deleted {files_deleted} audio files.',
            'files_deleted': files_deleted
        })
    except Exception as e:
        logger.error(f"Error cleaning up session: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'An error occurred during cleanup: {str(e)}'
        }), 500

# Clean up function to remove old files
def cleanup_old_files():
    """Remove audio files older than 1 hour"""
    try:
        current_time = time.time()
        for filename in os.listdir(AUDIO_DIR):
            file_path = os.path.join(AUDIO_DIR, filename)
            # If the file is older than 1 hour, delete it
            if os.path.isfile(file_path) and (current_time - os.path.getmtime(file_path)) > 3600:
                os.remove(file_path)
                logger.debug(f"Removed old file: {filename}")
    except Exception as e:
        logger.error(f"Error cleaning up files: {str(e)}")

# Schedule cleanup task
def schedule_cleanup():
    while True:
        time.sleep(600)  # Run every 10 minutes
        cleanup_old_files()

# Function to clean up all audio files on server shutdown
def cleanup_all_files():
    """Clean up all audio files when server shuts down"""
    try:
        logger.info("Server shutting down, cleaning up all audio files...")
        files_deleted = 0
        
        for filename in os.listdir(AUDIO_DIR):
            file_path = os.path.join(AUDIO_DIR, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
                files_deleted += 1
        
        logger.info(f"Cleanup complete. Deleted {files_deleted} audio files.")
    except Exception as e:
        logger.error(f"Error during cleanup on shutdown: {str(e)}")

# Register the cleanup function to run on exit
atexit.register(cleanup_all_files)

# Register signal handlers
for sig in [signal.SIGINT, signal.SIGTERM]:
    signal.signal(sig, lambda sig, frame: [logger.info(f"Received signal {sig}, shutting down..."), sys.exit(0)])

if __name__ == '__main__':
    # Start cleanup thread
    cleanup_thread = Thread(target=schedule_cleanup, daemon=True)
    cleanup_thread.start()
    
    # Run the socketio app
    socketio.run(app, host='0.0.0.0', port=5006, debug=True) 