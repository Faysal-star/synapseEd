import os
import uuid
import logging
import time
import base64
import random
from io import BytesIO
from threading import Thread
from openai import OpenAI
from .agent import VivaExam, check_repeat_request

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Default voice settings
DEFAULT_VOICE = "onyx"
DEFAULT_MODEL = "gpt-4o"
TTS_MODEL = "tts-1"
STT_MODEL = "whisper-1"

# Store active sessions
active_sessions = {}

def initialize_service(api_key, audio_dir):
    """Initialize the service with the OpenAI API key and audio directory"""
    if not api_key:
        raise ValueError("OpenAI API key is required")
    
    # Create OpenAI client
    client = OpenAI(api_key=api_key)
    
    # Ensure audio directory exists
    os.makedirs(audio_dir, exist_ok=True)
    
    return client

def save_audio_file(audio_data, session_id, audio_dir):
    """Save audio data to a file in the audio_dir directory and return the relative path"""
    # Generate a unique filename
    filename = f"{session_id}_{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(audio_dir, filename)
    
    # Save the audio data to the file
    with open(filepath, 'wb') as f:
        f.write(audio_data)
    
    # Return the relative path to the audio file
    return f"/api/viva/audio/{filename}"

def check_user_presence(session_id, socketio):
    """Check if user is still present after a period of silence"""
    time.sleep(30)  # Wait for 30 seconds
    if session_id in active_sessions and active_sessions[session_id].get('last_activity'):
        last_activity = active_sessions[session_id]['last_activity']
        if time.time() - last_activity > 30:
            socketio.emit('user_presence_check', {'message': 'Are you still there?'}, room=session_id)

def start_viva_session(subject, topic, difficulty, voice, session_id, client, audio_dir, socketio):
    """Start a new VIVA examination session"""
    try:
        logger.debug(f"Starting viva session for subject: {subject}, topic: {topic}")
        
        # Create a new exam instance
        exam = VivaExam(subject, topic, difficulty, client=client)
        
        # Generate questions
        exam.generate_questions()
        
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
        audio_path = save_audio_file(speech_data, session_id, audio_dir)
        
        # Store session information
        active_sessions[session_id] = {
            'exam': exam,
            'voice': voice,
            'last_activity': time.time(),
            'is_ai_speaking': True
        }
        
        # Start presence check thread
        Thread(target=check_user_presence, args=(session_id, socketio), daemon=True).start()
        
        return {
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
        }
    except Exception as e:
        logger.error(f"Error in start_viva: {str(e)}")
        raise

def process_viva_input(thread_id, audio_data, text_input, session_id, client, audio_dir, socketio):
    """Process user input (audio or text) for VIVA session"""
    try:
        # Check if session exists
        if session_id not in active_sessions:
            raise ValueError('Session not found or expired')
        
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
                elaboration = exam.elaborate_question()
                
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
                audio_path = save_audio_file(speech_data, session_id, audio_dir)
                
                # Emit socket event for real-time updates
                socketio.emit('ai_response', {
                    'response': assistant_response,
                    'audio_path': audio_path,
                    'transcription': user_message,
                    'is_repeat': True
                }, room=session_id)
                
                return {
                    'status': 'success',
                    'response': assistant_response,
                    'audio_path': audio_path,
                    'transcription': user_message,
                    'is_repeat': True
                }
        
        # If not a repeat request, evaluate the answer
        evaluation = exam.evaluate_answer(user_message)
        
        # Prepare response based on evaluation
        if exam.status == "completed":
            # Generate final report
            final_report = exam.generate_final_report()
            
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
        audio_path = save_audio_file(speech_data, session_id, audio_dir)
        
        # Emit socket event for real-time updates
        socketio.emit('ai_response', {
            'response': assistant_response,
            'audio_path': audio_path,
            'transcription': user_message,
            'evaluation': evaluation
        }, room=session_id)
        
        return {
            'status': 'success',
            'response': assistant_response,
            'audio_path': audio_path,
            'transcription': user_message,
            'evaluation': evaluation
        }
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise

def get_viva_progress(session_id):
    """Get the current progress of a viva session"""
    if not session_id or session_id not in active_sessions:
        raise ValueError('Session not found or expired')
    
    session = active_sessions[session_id]
    exam = session.get('exam')
    
    if not exam:
        raise ValueError('Exam not found in session')
    
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
        final_report = exam.generate_final_report()
        if final_report:
            progress_data['final_report'] = final_report
    
    return {
        'status': 'success',
        'progress': progress_data
    }

def cleanup_session_files(session_id, audio_dir):
    """Clean up all audio files associated with a session and remove session data"""
    files_deleted = 0
    try:
        # Clean up audio files associated with this session
        for filename in os.listdir(audio_dir):
            if filename.startswith(f"{session_id}_"):
                file_path = os.path.join(audio_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    files_deleted += 1
                    logger.debug(f"Removed file for session {session_id}: {filename}")
        
        # Remove session data
        if session_id in active_sessions:
            active_sessions.pop(session_id)
            logger.debug(f"Removed session data for {session_id}")
        
        return {
            'status': 'success',
            'message': f'Session cleanup completed. Deleted {files_deleted} audio files.',
            'files_deleted': files_deleted
        }
    except Exception as e:
        logger.error(f"Error cleaning up session: {str(e)}")
        raise

def cleanup_old_files(audio_dir):
    """Remove audio files older than 1 hour"""
    files_deleted = 0
    try:
        current_time = time.time()
        for filename in os.listdir(audio_dir):
            file_path = os.path.join(audio_dir, filename)
            # If the file is older than 1 hour, delete it
            if os.path.isfile(file_path) and (current_time - os.path.getmtime(file_path)) > 3600:
                os.remove(file_path)
                files_deleted += 1
                logger.debug(f"Removed old file: {filename}")
        return files_deleted
    except Exception as e:
        logger.error(f"Error cleaning up files: {str(e)}")
        return 0