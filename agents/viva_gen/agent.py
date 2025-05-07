import json
import logging
import time
import os
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class VivaExam:
    """Class to manage a structured viva exam with questions, scoring, and feedback"""
    
    def __init__(self, subject, topic, difficulty="medium", client=None, api_key=None):
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
        
        # Initialize OpenAI client
        if client:
            self.client = client
        elif api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            raise ValueError("Either client or API key must be provided")
            
        # Default models
        self.DEFAULT_MODEL = "gpt-4o"
        
    def generate_questions(self):
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
            response = self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
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
    
    def evaluate_answer(self, answer):
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
            response = self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
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
    
    def generate_final_report(self):
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
            response = self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
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
    
    def elaborate_question(self):
        """Generate an elaboration for the current question."""
        current_question = self.get_current_question()
        if not current_question:
            return "No current question to elaborate."
            
        try:
            system_prompt = f"""You are an examiner in {self.subject} conducting a viva on {self.topic}.
            A student has asked for clarification on this question: "{current_question}"
            
            Provide a brief elaboration to help them understand what's being asked.
            
            Your elaboration should:
            1. Be concise (2-3 sentences)
            2. Clarify the scope or intent of the question
            3. Stay factual and academic in tone
            4. Not provide any answers
            
            Return only the elaboration text without any introductory phrases like "Here's an elaboration" or "To clarify".
            """
            
            response = self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Please elaborate on this question: {current_question}"}
                ],
                max_tokens=100  # Limit response length to ensure conciseness
            )
            
            elaboration = response.choices[0].message.content.strip()
            
            # Add a natural lead-in
            return f"To clarify: {elaboration}"
        except Exception as e:
            logger.error(f"Error generating question elaboration: {str(e)}")
            return "Could you please provide your answer to this question?"


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