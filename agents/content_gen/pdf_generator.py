from common.llm_factory import LLMFactory
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

class PDFGenerator:
    """Class to generate educational PDF content using LLMs"""
    
    def __init__(self, llm_provider='openai', model=None):
        """Initialize the PDF generator with specified LLM"""
        self.llm_factory = LLMFactory()
        self.llm = self.llm_factory.get_llm_client(provider=llm_provider, model=model)
    
    def generate_content(self, topic, additional_context='', sections=None):
        """
        Generate structured content for a lecture on the given topic
        
        Args:
            topic (str): The main topic for the lecture
            additional_context (str): Additional context or instructions
            sections (list): Optional custom sections to include
            
        Returns:
            dict: Structured content data with title, introduction, sections, etc.
        """
        # Create system prompt for content generation
        system_prompt = self._create_content_system_prompt(sections)
        
        # Create the user prompt with topic and context
        user_prompt = f"Generate a comprehensive lecture on {topic}."
        if additional_context:
            user_prompt += f" {additional_context}"
        
        # Call the LLM
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Get response from LLM
        response = self.llm.invoke(messages)
        
        # Parse the response as JSON
        try:
            # For actual implementation, parse JSON from response.content
            # This is a simplified placeholder
            content_data = {
                "title": f"Lecture on {topic}",
                "author": "SynapseEd AI",
                "introduction": "This is an AI-generated lecture on the requested topic.",
                "sections": [
                    {"heading": "Introduction", "content": "This is the introduction to the topic."},
                    {"heading": "Key Concepts", "content": "These are the key concepts."},
                    {"heading": "Practical Applications", "content": "Here are some practical applications."}
                ],
                "conclusion": "This concludes our lecture on the topic."
            }
            return content_data
            
        except Exception as e:
            print(f"Error parsing content from LLM: {e}")
            # Return a basic structure in case of error
            return {
                "title": f"Lecture on {topic}",
                "introduction": "Content generation encountered an error.",
                "sections": []
            }
    
    def create_pdf(self, content_data, output_path):
        """
        Create a PDF document from the generated content
        
        Args:
            content_data (dict): The structured content data
            output_path (str): Path where the PDF should be saved
            
        Returns:
            str: Path to the created PDF file
        """
        # Create a PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72, leftMargin=72,
            topMargin=72, bottomMargin=72
        )
        
        # Create styles
        styles = getSampleStyleSheet()
        title_style = styles['Title']
        heading1_style = styles['Heading1']
        heading2_style = styles['Heading2']
        normal_style = styles['Normal']
        
        # Build the document content
        content = []
        
        # Add title
        content.append(Paragraph(content_data['title'], title_style))
        content.append(Spacer(1, 0.25*inch))
        
        # Add introduction
        if 'introduction' in content_data:
            content.append(Paragraph("Introduction", heading1_style))
            content.append(Paragraph(content_data['introduction'], normal_style))
            content.append(Spacer(1, 0.2*inch))
        
        # Add sections
        for section in content_data.get('sections', []):
            content.append(Paragraph(section['heading'], heading1_style))
            content.append(Paragraph(section['content'], normal_style))
            content.append(Spacer(1, 0.2*inch))
        
        # Add conclusion
        if 'conclusion' in content_data:
            content.append(Paragraph("Conclusion", heading1_style))
            content.append(Paragraph(content_data['conclusion'], normal_style))
        
        # Build the PDF
        doc.build(content)
        
        return output_path
    
    def _create_content_system_prompt(self, sections=None):
        """Create the system prompt for content generation"""
        prompt = """
        You are an expert educational content creator. Your task is to generate a comprehensive, 
        well-structured lecture on the requested topic. The content should be accurate, 
        informative, and suitable for educational purposes.
        
        Please structure your response as valid JSON with the following fields:
        - title: A descriptive title for the lecture
        - introduction: An engaging introduction to the topic
        - sections: An array of sections, each with a 'heading' and 'content'
        - conclusion: A conclusion summarizing the main points
        
        Each section's content should be comprehensive but concise, focusing on clarity and accuracy.
        """
        
        if sections:
            prompt += f"\n\nInclude the following sections: {', '.join(sections)}"
        
        return prompt