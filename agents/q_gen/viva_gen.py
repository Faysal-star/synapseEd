import os
import uuid
import json
import time
from typing import Dict, List, Optional, Any, Union
import requests
import base64
from io import BytesIO

from llm_factory import LLMFactory

class VivaAgent:
    """
    VivaAgent is responsible for conducting voice-based viva examinations.
    It uses OpenAI's APIs for text generation and speech processing.
    """
    
    def __init__(self, subject: str, topic: Optional[str] = None, 
                 difficulty: str = "medium", voice: str = "alloy"):
        """
        Initialize a VivaAgent.
        
        Args:
            subject: The main subject of the viva (e.g., "Computer Science")
            topic: Optional specific topic within the subject (e.g., "Neural Networks")
            difficulty: Difficulty level ("easy", "medium", "hard")
            voice: Voice to use for TTS ("alloy", "echo", "fable", "onyx", "nova", "shimmer")
        """
        self.session_id = str(uuid.uuid4())
        self.subject = subject
        self.topic = topic
        self.difficulty = difficulty
        self.voice = voice
        self.llm_factory = LLMFactory()
        self.conversation_history = []
        self.last_audio = None
        
    def start_viva(self) -> Dict[str, Any]:
        """
        Start a new viva examination session.
        
        Returns:
            Dict containing session_id, text introduction, and audio bytes
        """
        # Build the system prompt
        system_prompt = f"""
        You are a professional academic examiner conducting a viva voce (oral examination).
        You are examining a student on the subject of {self.subject}"""
        
        if self.topic:
            system_prompt += f", specifically focusing on {self.topic}"
        
        system_prompt += f"""
        Your task is to:
        1. Ask challenging but fair questions on the subject at a {self.difficulty} difficulty level
        2. Assess the student's knowledge based on their responses
        3. Follow up with appropriate questions to explore their understanding
        4. Be professional, courteous, and provide encouraging feedback
        5. Start with easier questions and gradually increase in difficulty
        
        Begin by introducing yourself as the examiner and asking the first question.
        Keep responses concise (1-3 sentences max) as they will be converted to speech.
        """
        
        # Add the system message to conversation history
        self.conversation_history.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Get the introduction from the LLM
        llm = self.llm_factory.create_chat_completion_api()
        response = llm.chat.completions.create(
            model="gpt-4-turbo",
            messages=self.conversation_history,
            temperature=0.7,
            max_tokens=150
        )
        
        # Extract the response text
        introduction_text = response.choices[0].message.content
        
        # Add the assistant's message to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": introduction_text
        })
        
        # Convert the text to speech
        audio_data = self._text_to_speech(introduction_text)
        self.last_audio = audio_data
        
        return {
            "session_id": self.session_id,
            "text": introduction_text,
            "audio": audio_data
        }
    
    def process_student_response(self, text: Optional[str] = None, audio_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a student's response, either as text or audio.
        
        Args:
            text: The student's text response
            audio_file: Path to the student's audio response file
            
        Returns:
            Dict containing the examiner's response text and audio
        """
        # Handle audio input if provided
        if audio_file and not text:
            text = self._speech_to_text(audio_file)
        
        # If no valid input, return an error
        if not text:
            return {
                "error": "No valid input provided. Please provide text or audio."
            }
        
        # Add the student's response to the conversation history
        self.conversation_history.append({
            "role": "user",
            "content": text
        })
        
        # Get the examiner's response from the LLM
        llm = self.llm_factory.create_chat_completion_api()
        response = llm.chat.completions.create(
            model="gpt-4-turbo",
            messages=self.conversation_history,
            temperature=0.7,
            max_tokens=200
        )
        
        # Extract the response text
        examiner_text = response.choices[0].message.content
        
        # Add the examiner's response to the conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": examiner_text
        })
        
        # Convert the text to speech
        audio_data = self._text_to_speech(examiner_text)
        self.last_audio = audio_data
        
        return {
            "session_id": self.session_id,
            "text": examiner_text,
            "audio": audio_data
        }
    
    def end_viva(self) -> Dict[str, Any]:
        """
        End the viva examination with a summary and assessment.
        
        Returns:
            Dict containing the final assessment text and audio
        """
        # Build a prompt for the final assessment
        assessment_prompt = """
        Please provide a final assessment of the student's performance in this viva examination.
        Include:
        1. A summary of the topics covered
        2. Areas where the student demonstrated good knowledge
        3. Areas that could be improved
        4. An overall evaluation of their performance
        Keep the assessment professional, constructive, and encouraging.
        """
        
        # Add the assessment request to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": assessment_prompt
        })
        
        # Get the assessment from the LLM
        llm = self.llm_factory.create_chat_completion_api()
        response = llm.chat.completions.create(
            model="gpt-4-turbo",
            messages=self.conversation_history,
            temperature=0.7,
            max_tokens=300
        )
        
        # Extract the assessment text
        assessment_text = response.choices[0].message.content
        
        # Add the assessment to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": assessment_text
        })
        
        # Convert the text to speech
        audio_data = self._text_to_speech(assessment_text)
        self.last_audio = audio_data
        
        return {
            "session_id": self.session_id,
            "text": assessment_text,
            "audio": audio_data,
            "conversation_history": self.conversation_history
        }
    
    def get_session_info(self) -> Dict[str, Any]:
        """
        Get information about the current viva session.
        
        Returns:
            Dict containing session details
        """
        return {
            "session_id": self.session_id,
            "subject": self.subject,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "conversation_length": len(self.conversation_history) // 2,  # Pairs of messages
        }
    
    def _text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using OpenAI's TTS API.
        
        Args:
            text: The text to convert to speech
            
        Returns:
            Base64 encoded audio data
        """
        try:
            openai_client = self.llm_factory.create_openai_client()
            
            response = openai_client.audio.speech.create(
                model="tts-1",
                voice=self.voice,
                input=text
            )
            
            # Get the audio as bytes
            audio_bytes = BytesIO()
            for chunk in response.iter_bytes(chunk_size=4096):
                audio_bytes.write(chunk)
            
            # Convert to base64 for easy transmission
            audio_bytes.seek(0)
            audio_base64 = base64.b64encode(audio_bytes.read()).decode('utf-8')
            
            return audio_base64
            
        except Exception as e:
            print(f"Error in text-to-speech conversion: {e}")
            return None
    
    def _speech_to_text(self, audio_file: str) -> str:
        """
        Convert speech to text using OpenAI's STT API.
        
        Args:
            audio_file: Path to the audio file
            
        Returns:
            Transcribed text
        """
        try:
            if not os.path.exists(audio_file):
                raise FileNotFoundError(f"Audio file not found: {audio_file}")
            
            openai_client = self.llm_factory.create_openai_client()
            
            with open(audio_file, "rb") as audio:
                transcription = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio
                )
            
            return transcription.text
            
        except Exception as e:
            print(f"Error in speech-to-text conversion: {e}")
            return None