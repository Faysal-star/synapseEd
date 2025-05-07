import PyPDF2
import os

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text from the PDF
    """
    try:
        print(f"\nAttempting to extract text from: {file_path}")
        
        if not os.path.exists(file_path):
            print(f"Error: PDF file not found at path: {file_path}")
            return ""
        
        if not file_path.lower().endswith('.pdf'):
            print(f"Error: File {file_path} is not a PDF file")
            return ""
            
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            print(f"Successfully opened PDF with {len(reader.pages)} pages")
            
            if len(reader.pages) == 0:
                print(f"Error: PDF file {file_path} has no pages")
                return ""
                
            text = ""
            total_text_length = 0
            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if not page_text.strip():
                        print(f"Warning: Page {page_num + 1} appears to be empty or unreadable")
                    text += page_text + "\n"
                    total_text_length += len(page_text)
                    print(f"Extracted {len(page_text)} characters from page {page_num + 1}")
                except Exception as e:
                    print(f"Error extracting text from page {page_num + 1}: {str(e)}")
                    continue
            
            print(f"Total extracted text length: {total_text_length} characters")
            if total_text_length == 0:
                print("Warning: No text was extracted from the PDF")
            return text
            
    except PyPDF2.PdfReadError as e:
        print(f"Error reading PDF file {file_path}: {str(e)}")
        return ""
    except Exception as e:
        print(f"Unexpected error processing PDF file {file_path}: {str(e)}")
        return ""
