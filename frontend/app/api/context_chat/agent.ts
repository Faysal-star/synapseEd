// Import necessary modules
import { ChatOpenAI } from "@langchain/openai";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory storage for document chunks
type DocumentChunk = {
  content: string;
  metadata: Record<string, any>;
};

// Store document chunks in memory
let documentChunks: DocumentChunk[] = [];

export type PDFMessage = {
  type: "human" | "ai";
  content: string;
};

export type PDFQuery = {
  pdfUrl?: string;
  pdfBlobUrl?: string;
  pdfName?: string;
  supabaseUrl?: string;
  query: string;
};

// Process a URL directly and store content in memory using LangChain's PDFLoader
async function processURLDirectly(url: string): Promise<boolean> {
  console.log("Processing PDF from URL: ", url);
  
  try {
    // Create a temporary file path
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp-${uuidv4()}.pdf`);
    
    // Fetch the PDF
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    // Convert response to buffer and save to temp file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log(`PDF saved to temporary file: ${tempFilePath}`);
    
    // Use LangChain's PDFLoader to load the document
    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();
    console.log(`Loaded ${docs.length} pages from PDF`);
    
    // Split the documents into chunks
    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);
    
    // Clear previous chunks
    documentChunks = [];
    
    // Store chunks in memory
    splitDocs.forEach((doc: Document, index: number) => {
      documentChunks.push({
        content: doc.pageContent,
        metadata: { 
          ...doc.metadata,
          source: url, 
          chunkIndex: index 
        }
      });
    });
    
    console.log(`Stored ${documentChunks.length} chunks in memory`);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Deleted temporary file: ${tempFilePath}`);
    } catch (unlinkError) {
      console.error(`Error deleting temporary file: ${unlinkError}`);
    }
    
    return documentChunks.length > 0;
  } catch (error) {
    console.error("Error in processURLDirectly:", error);
    
    // Fall back to placeholder content
    console.log("Falling back to placeholder content");
    const content = `This is a placeholder document for the PDF at URL: ${url}. 
    There was an error processing the actual PDF content: ${error instanceof Error ? error.message : String(error)}
    
    In a production environment, you would want to:
    1. Use a PDF extraction API service
    2. Use a serverless function with PDF extraction capabilities
    3. Use a browser-based PDF.js solution for client-side extraction
    4. Store extracted text in your database alongside the PDF`;
    
    // Split the content into chunks
    const chunks = content.split('\n\n');
    
    // Clear previous chunks
    documentChunks = [];
    
    // Store chunks in memory
    chunks.forEach(chunk => {
      if (chunk.trim()) {
        documentChunks.push({
          content: chunk.trim(),
          metadata: { source: url, isPlaceholder: true }
        });
      }
    });
    
    console.log(`Stored ${documentChunks.length} placeholder chunks in memory`);
    return documentChunks.length > 0;
  }
}

// Simple text matching for document retrieval
function retrieveRelevantChunks(query: string): DocumentChunk[] {
  console.log("Retrieving relevant chunks for query:", query);
  
  if (documentChunks.length === 0) {
    console.log("No document chunks available");
    return [];
  }
  
  // Simple keyword matching (in a real app, you'd use embeddings or better search)
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  
  // Score each chunk based on word matches
  const scoredChunks = documentChunks.map(chunk => {
    const content = chunk.content.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
      if (content.includes(word)) {
        score += 1;
      }
    });
    
    return { chunk, score };
  });
  
  // Sort by score and take top results
  const sortedChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0)
    .slice(0, 3)
    .map(item => item.chunk);
  
  console.log(`Found ${sortedChunks.length} relevant chunks`);
  return sortedChunks;
}

// Custom callback handler for streaming tokens
class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "StreamingCallbackHandler";
  
  constructor(private callback: (token: string) => void) {
    super();
  }

  handleLLMNewToken(token: string) {
    this.callback(token);
  }
}

// Handle answering queries using the in-memory chunks
export async function answerQuery(
  query: string,
  openAIApiKey: string,
  streamCallback?: (token: string) => void
): Promise<string> {
  if (documentChunks.length === 0) {
    return "Please provide a PDF document first before asking questions.";
  }

  // Create callback handlers
  const callbackHandlers = streamCallback
    ? [new StreamingCallbackHandler(streamCallback)]
    : undefined;

  // Initialize the language model
  const model = new ChatOpenAI({
    openAIApiKey,
    model: "gpt-4o-mini",
    temperature: 0,
    streaming: !!streamCallback,
    callbacks: callbackHandlers,
  });

  // Retrieve relevant chunks
  const relevantChunks = retrieveRelevantChunks(query);
  
  if (relevantChunks.length === 0) {
    // No relevant chunks found, use general knowledge
    const noContextPrompt = `The user is asking about a PDF document, but I couldn't find relevant information in the document. The query is: "${query}"
    
    Please provide a general response based on your knowledge, but make it clear that this information is not from the specific document.`;
    
    const result = await model.invoke([new HumanMessage(noContextPrompt)]);
    console.log("Result:", result);
    return result.content.toString();
  }
  
  // Prepare prompt with retrieved context
  const context = relevantChunks.map(chunk => chunk.content).join("\n\n");
  console.log("Context:", context);
  
  const systemMessage = new SystemMessage(
    `You are an assistant that answers questions based on the provided context from a PDF document. 
    If the answer cannot be found in the context, say "I don't have enough information to answer this question."`
  );
  
  const userMessage = new HumanMessage(
    `Context from the PDF document:
    ${context}
    
    Based on this context only, please answer the following question:
    ${query}`
  );
  
  // Generate answer using the language model
  const result = await model.invoke([systemMessage, userMessage]);
  console.log("Result:", result);
  return result.content.toString();
}

// Reset the stored document chunks
export function resetVectorStore(): void {
  documentChunks = [];
}

// Main handler for PDF processing and answering queries
export async function handlePDFQuery(
  query: PDFQuery,
  openAIApiKey: string
): Promise<string> {
  try {
    console.log("handlePDFQuery called with:", {
      pdfUrl: query.pdfUrl,
      pdfBlobUrl: query.pdfBlobUrl,
      pdfName: query.pdfName,
      supabaseUrl: query.supabaseUrl,
      query: query.query
    });

    let pdfProcessed = false;
    
    // If a new PDF is provided, process it
    if (query.pdfUrl || query.pdfBlobUrl || query.supabaseUrl) {
      console.log("PDF source detected, resetting document store");
      resetVectorStore();
      
      try {
        const url = query.supabaseUrl || query.pdfUrl || query.pdfBlobUrl;
        if (url) {
          console.log("Processing URL directly:", url);
          pdfProcessed = await processURLDirectly(url);
        }
      } catch (processingError) {
        console.error("Error during PDF URL processing:", processingError);
      }
    }

    // Now answer the query
    console.log("Answering query:", query.query);
    
    if (!pdfProcessed && documentChunks.length === 0) {
      console.log("No PDF was successfully processed, returning a fallback response");
      return `I'm sorry, I couldn't process the PDF document. There was an issue loading or parsing the file. Please try again with a different file or check the file format. Your query was: "${query.query}"`;
    }
    
    const answer = await answerQuery(query.query, openAIApiKey);
    console.log("Query answered successfully");
    return answer;
  } catch (error: any) {
    console.error("Error handling PDF query:", error);
    console.error("Error stack:", error.stack);
    return `Error processing your query: ${error.message}`;
  }
} 