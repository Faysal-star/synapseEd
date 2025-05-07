# Context Chat API

This API provides a way to interact with PDF documents using natural language. It processes PDFs, chunks them, stores them in a vector database, and answers questions based on the document content and OpenAI language models.

## API Endpoints

### 1. Process PDF and Answer Query
- **Endpoint:** `POST /api/context_chat`
- **Description:** Upload a PDF document and ask a query about its content
- **Request Body:**
  ```json
  {
    "pdfUrl": "https://example.com/path/to/document.pdf", // Optional: URL to a PDF
    "pdfBlobUrl": "blob:http://localhost:3000/...", // Optional: client-side Blob URL
    "pdfName": "document.pdf", // Required if pdfBlobUrl is provided
    "supabaseUrl": "https://supabase-storage-url.com/...", // Optional: Supabase storage URL
    "query": "What is this document about?" // Required: The question to answer
  }
  ```
- **Response:**
  ```json
  {
    "answer": "This document is about..."
  }
  ```

### 2. Clear Context
- **Endpoint:** `DELETE /api/context_chat`
- **Description:** Clear the stored vector database
- **Response:**
  ```json
  {
    "message": "Context cleared successfully"
  }
  ```

## Example Usage

```javascript
// Upload a PDF and ask a question using a client-side file
async function uploadPDFAndAskQuestion() {
  const formData = new FormData();
  formData.append('file', pdfFile);
  
  // First, get a blob URL from the uploaded file
  const blobUrl = URL.createObjectURL(pdfFile);
  
  // Then send the query
  const response = await fetch('/api/context_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdfBlobUrl: blobUrl,
      pdfName: pdfFile.name,
      query: 'What is the main topic of this document?',
    }),
  });
  
  const data = await response.json();
  console.log(data.answer);
}

// Using a Supabase storage URL
async function queryWithSupabasePDF() {
  const response = await fetch('/api/context_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supabaseUrl: 'https://your-supabase-storage-url.com/path/to/document.pdf',
      query: 'What is the main topic of this document?',
    }),
  });
  
  const data = await response.json();
  console.log(data.answer);
}

// Ask a follow-up question (using the same PDF context)
async function askFollowUpQuestion() {
  const response = await fetch('/api/context_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'What are the key findings?',
    }),
  });
  
  const data = await response.json();
  console.log(data.answer);
}

// Clear the context when done
async function clearContext() {
  await fetch('/api/context_chat', {
    method: 'DELETE',
  });
}
```

## Supabase Integration

To use PDFs stored in Supabase:

1. Upload your PDF to Supabase Storage
2. Get the public URL for the file (ensure it has public read access)
3. Pass this URL in the `supabaseUrl` field of your request

Example Supabase code:
```javascript
// Upload PDF to Supabase
async function uploadToSupabase(file) {
  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(`documents/${file.name}`, file);
    
  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('pdfs')
    .getPublicUrl(`documents/${file.name}`);
    
  return urlData.publicUrl;
}

// Use the URL for querying
async function queryDocumentFromSupabase(supabaseUrl, query) {
  const response = await fetch('/api/context_chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supabaseUrl,
      query,
    }),
  });
  
  return await response.json();
}
```

## Notes
- The API requires an OpenAI API key to be set in the environment variables as `OPENAI_API_KEY`
- PDFs are processed and stored in memory during the session
- FAISS is used as the vector store for efficiency
- The implementation leverages LangChain's latest modules for improved performance 