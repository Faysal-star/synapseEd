import os
from fpdf import FPDF
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

class PDFGenerator:
    def __init__(self, llm_provider="openai", model=None):
        """Initialize the PDF generator with configurable LLM
        
        Args:
            llm_provider: The LLM provider to use (openai, google)
            model: Specific model to use (defaults to provider's standard model)
        """
        self.llm_provider = llm_provider
        self.model_name = model
        self.llm = self._create_llm()
        
    def _create_llm(self):
        """Create LLM instance based on provider"""
        if self.llm_provider == "openai":
            model = self.model_name or "gpt-4o"
            return ChatOpenAI(model=model, temperature=0.7)
        elif self.llm_provider == "google":
            model = self.model_name or "gemini-pro"
            return ChatGoogleGenerativeAI(model=model, temperature=0.7)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")
    
    def generate_content(self, topic, additional_context="", sections=None):
        """Generate structured lecture content based on topic
        
        Args:
            topic: Main topic for the lecture
            additional_context: Any additional teacher instructions
            sections: Optional list of specific sections to include
            
        Returns:
            Dictionary with structured lecture content
        """
        # Default sections if none provided
        if sections is None:
            sections = [
                "Introduction",
                "Key Concepts",
                "Important Definitions",
                "Examples",
                "Applications",
                "Common Misconceptions",
                "Summary"
            ]
        
        section_str = "\n".join([f"- {section}" for section in sections])
        
        prompt = ChatPromptTemplate.from_template(
            """Create a well-structured lecture on "{topic}".
            
            Additional context from teacher:
            {additional_context}
            
            Please organize the content into the following sections:
            {sections}
            
            For each section:
            1. Provide thorough, accurate information
            2. Use clear, concise language suitable for teaching
            3. Include relevant examples where appropriate
            4. Highlight key points and important terminology
            
            Format your response as a JSON object with the following structure:
            {{
                "title": "Main title for the lecture",
                "subtitle": "Optional subtitle",
                "sections": [
                    {{
                        "heading": "Section heading",
                        "content": "Formatted content with paragraphs separated by newlines. Can include bullet points with '- ' prefix."
                    }}
                ]
            }}
            
            Only respond with the JSON object, no additional explanations.
            """
        )
        
        chain = prompt | self.llm
        response = chain.invoke({
            "topic": topic,
            "additional_context": additional_context,
            "sections": section_str
        })
        
        # Extract and parse JSON response
        import json
        import re
        
        # Find JSON in the response
        content = response.content
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to extract anything that looks like JSON
            json_str = content
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # If parsing fails, try cleaning up the string
            cleaned_json = json_str.replace("'", '"')
            try:
                return json.loads(cleaned_json)
            except:
                raise ValueError(f"Could not parse JSON from LLM response: {content}")
    
    def create_pdf(self, content_data, output_path=None):
        """Create a formatted PDF from the generated content
        
        Args:
            content_data: Dictionary with lecture content
            output_path: Path to save the PDF (optional)
            
        Returns:
            Path to the saved PDF file
        """
        # Generate output path if not provided
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"lecture_{timestamp}.pdf"
            output_dir = "generated_pdfs"
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, filename)
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        
        # Set up fonts
        pdf.add_font('DejaVu', '', 'DejaVuSansCondensed.ttf', uni=True)
        pdf.add_font('DejaVu', 'B', 'DejaVuSansCondensed-Bold.ttf', uni=True)
        
        # Title
        pdf.set_font('DejaVu', 'B', 24)
        pdf.cell(0, 20, content_data.get("title", "Lecture Notes"), 0, 1, 'C')
        
        # Subtitle if available
        if "subtitle" in content_data and content_data["subtitle"]:
            pdf.set_font('DejaVu', 'B', 16)
            pdf.cell(0, 10, content_data["subtitle"], 0, 1, 'C')
        
        # Date
        pdf.set_font('DejaVu', '', 12)
        pdf.cell(0, 10, f"Date: {datetime.now().strftime('%B %d, %Y')}", 0, 1, 'C')
        pdf.ln(5)
        
        # Sections
        for section in content_data.get("sections", []):
            # Section heading
            pdf.set_font('DejaVu', 'B', 16)
            pdf.cell(0, 10, section.get("heading", ""), 0, 1, 'L')
            pdf.ln(2)
            
            # Section content
            pdf.set_font('DejaVu', '', 12)
            
            # Process content paragraph by paragraph
            paragraphs = section.get("content", "").split('\n')
            for paragraph in paragraphs:
                if paragraph.strip():
                    if paragraph.strip().startswith('-'):
                        # Bullet point
                        pdf.cell(10, 10, chr(149), 0, 0)  # Bullet character
                        pdf.multi_cell(0, 10, paragraph.strip()[2:])
                    else:
                        # Regular paragraph
                        pdf.multi_cell(0, 10, paragraph.strip())
                    pdf.ln(2)
            
            pdf.ln(5)
        
        # Save the PDF
        pdf.output(output_path)
        return output_path