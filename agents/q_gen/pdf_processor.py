import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import os

class PDFProcessor:
    def __init__(self, chunk_size=8000, chunk_overlap=500):
        """Initialize the PDF processor with configurable chunk parameters
        
        Args:
            chunk_size: Size of each text chunk (increased for modern LLMs)
            chunk_overlap: Overlap between chunks to maintain context
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def process_pdf(self, pdf_path):
        """Process a PDF file and return chunks using whole-document approach"""
        try:
            print(f"Processing PDF: {pdf_path}")
            
            # Extract full document text using PyMuPDF directly
            full_text = self._extract_full_text(pdf_path)
            print(f"Extracted {len(full_text)} characters from PDF")
            
            if not full_text.strip():
                print("Warning: Extracted text is empty")
                return [], 0
                
            # Create a single document with the full text
            doc = Document(
                page_content=full_text,
                metadata={"source": os.path.basename(pdf_path)}
            )
            
            # Split the full text into chunks
            chunks = self.text_splitter.split_documents([doc])
            print(f"Split into {len(chunks)} chunks")
            
            # Add metadata about chunk position
            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_id"] = i
                chunk.metadata["total_chunks"] = len(chunks)
                print(f"Chunk {i}: {len(chunk.page_content)} characters")
            
            return chunks, len(chunks)
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            import traceback
            traceback.print_exc()
            return [], 0
    
    def _extract_full_text(self, pdf_path):
        """Extract all text from the PDF as a single string"""
        full_text = ""
        try:
            # Open the PDF
            doc = fitz.open(pdf_path)
            
            # Extract text from all pages
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                full_text += text + "\n\n"  # Add double newline between pages
                
            return full_text
        except Exception as e:
            print(f"Error extracting text: {str(e)}")
            return ""