import os
import re
import logging
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from .tools import search_tool, wiki_tool, save_tool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LectureResponse(BaseModel):
    """Schema for lecture plan response"""
    title: str
    outline: str
    learning_objectives: List[str]
    topics: List[Dict[str, List[str]]]
    teaching_methods: List[str]
    resources: List[str]
    tools_used: List[str]

def create_lecture_plan(
    client, 
    query: str, 
    level: str = "beginner"
) -> Dict[str, Any]:
    """
    Create a lecture plan using the specified LLM client
    
    Args:
        client: LLM client (OpenAI)
        query: Topic or description for the lecture
        level: Student level (beginner, intermediate, advanced)
        
    Returns:
        Dict containing the structured lecture plan
    """
    try:
        # System prompt for generating a structured lecture plan
        system_prompt = f"""You are a lecture assistant that will generate a detailed lecture plan in JSON format.
Please ensure that the content is appropriate for {level} students.

YOU MUST RETURN ONLY A VALID JSON OBJECT without any explanations before or after.
Do not include markdown formatting, bullet points, or numbered lists outside the JSON structure.

The JSON structure must be:
{{
    "title": "A descriptive and specific title for the lecture",
    "outline": "A comprehensive overview of the lecture content",
    "learning_objectives": ["At least 3-4 specific learning objectives"],
    "topics": [{{"Main Topic 1": ["Subtopic 1.1", "Subtopic 1.2"]}}, {{"Main Topic 2": ["Subtopic 2.1", "Subtopic 2.2"]}}],
    "teaching_methods": ["At least 2-3 specific teaching methods that will be used"],
    "resources": ["At least 2-3 specific resources and materials"],
    "tools_used": ["search", "wikipedia"]
}}

IMPORTANT: Your entire response must be a single, valid JSON object.
DO NOT include any explanatory text, markdown formatting, or other content outside the JSON.
"""

        # Make the API call to generate content
        response = client.chat.completions.create(
            model="gpt-4",
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a lecture plan on the topic: {query}"}
            ],
            response_format={"type": "json_object"}
        )
        
        # Extract the JSON response
        lecture_plan = json.loads(response.choices[0].message.content)
        
        # Validate with the model
        validated_plan = LectureResponse(**lecture_plan)
        
        return validated_plan.dict()
        
    except Exception as e:
        logger.error(f"Error generating lecture plan: {e}")
        # Create a fallback response
        return text_to_lecture_json("Failed to generate lecture plan. Using fallback structure.", query)

def update_lecture_plan(
    client,
    plan_data: Dict[str, Any],
    update_field: str,
    update_value: Any
) -> Dict[str, Any]:
    """
    Update a specific field in an existing lecture plan
    
    Args:
        client: LLM client
        plan_data: Original lecture plan data
        update_field: Field to update ('topics', 'teaching_methods', etc.)
        update_value: New value for the field
        
    Returns:
        Updated lecture plan dictionary
    """
    try:
        # Create a copy of the original plan
        updated_plan = plan_data.copy()
        
        # Update the specific field
        updated_plan[update_field] = update_value
        
        # For certain fields, we should regenerate related content
        if update_field == "topics":
            # Regenerate outline based on new topics
            topics_str = ", ".join([list(t.keys())[0] for t in update_value])
            
            response = client.chat.completions.create(
                model="gpt-4",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": "You are an expert educational content creator. Generate a comprehensive lecture outline based on these topics."},
                    {"role": "user", "content": f"Create a concise lecture outline (max 200 words) covering these topics: {topics_str}"}
                ]
            )
            
            updated_plan["outline"] = response.choices[0].message.content.strip()
            
        elif update_field == "learning_objectives":
            # Ensure topics align with learning objectives
            objectives_str = ", ".join(update_value)
            
            response = client.chat.completions.create(
                model="gpt-4",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": "You are an expert educational content creator."},
                    {"role": "user", "content": f"Review these learning objectives: {objectives_str}. Do the current topics in the lecture plan properly address these objectives? If not, suggest aligned topics."}
                ]
            )
            
            # Note: We're not automatically changing topics here, just providing feedback
            logger.info(f"Learning objectives review: {response.choices[0].message.content}")
            
        return updated_plan
        
    except Exception as e:
        logger.error(f"Error updating lecture plan: {e}")
        return plan_data  # Return original data on error

def text_to_lecture_json(text: str, query: str) -> Dict[str, Any]:
    """Convert a text explanation to a structured lecture JSON"""
    logger.info("Converting text explanation to JSON format")
    
    # Extract title - use query as fallback
    title_match = re.search(r'(?:title|topic)[\s:]+(.*?)(?:\n|$)', text, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else f"Introduction to {query}"
    
    # Extract or generate outline
    outline = text[:500]  # Use first 500 chars as outline
    
    # Extract learning objectives
    learning_objectives = []
    objectives_match = re.findall(r'\d+\.\s+\*\*([^:]+?):\*\*\s+(.*?)(?=\n\n|\n\d+\.|\Z)', text, re.DOTALL)
    if objectives_match:
        for obj_title, obj_desc in objectives_match[:4]:  # Take first 4 matches
            learning_objectives.append(f"{obj_title}: {obj_desc.strip()}")
    else:
        # Fallback: extract numbered or bulleted items
        objectives = re.findall(r'(?:\d+\.|\*)\s+(.*?)(?=\n\n|\n(?:\d+\.|\*)|\Z)', text)
        learning_objectives = objectives[:4] if objectives else ["Understand basic concepts", "Apply theoretical knowledge", "Analyze real-world examples"]
    
    # Extract or generate topics
    topics = []
    # Try to find structured topics in the text
    topic_matches = re.findall(r'\d+\.\s+\*\*([^:]+?):\*\*\s+(.*?)(?=\n\n|\n\d+\.|\Z)', text, re.DOTALL)
    if topic_matches:
        for topic_title, topic_desc in topic_matches[:3]:  # Take first 3 matches
            subtopics = re.findall(r'(?:[-•*]|\d+\.)\s+(.*?)(?=\n[-•*]|\n\d+\.|\Z)', topic_desc)
            subtopics = subtopics if subtopics else [f"Understanding {topic_title}", f"Applications of {topic_title}"]
            topics.append({topic_title.strip(): [s.strip() for s in subtopics[:3]]})
    
    # If no topics found, create generic ones based on the query
    if not topics:
        topics = [
            {f"Introduction to {query}": ["Basic Concepts", "Historical Context"]},
            {f"Core Principles of {query}": ["Theoretical Framework", "Key Components"]},
            {f"Applications of {query}": ["Real-world Examples", "Case Studies"]}
        ]
    
    # Generate teaching methods
    teaching_methods = ["Interactive Lectures", "Group Discussions", "Practical Demonstrations"]
    
    # Generate resources
    resources = [f"{query} Textbook", "Academic Journal Articles", "Online Resources and Tools"]
    
    # List tools used
    tools_used = ["Search Tool", "Wikipedia Tool"]
    
    # Create structured response
    return {
        "title": title,
        "outline": outline,
        "learning_objectives": learning_objectives,
        "topics": topics,
        "teaching_methods": teaching_methods,
        "resources": resources,
        "tools_used": tools_used
    }