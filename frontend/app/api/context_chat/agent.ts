import { NextRequest } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import fs from "fs";

// Store the vector store in memory for the session
let vectorStore: FaissStore | null = null;

export type PDFMessage = {
  type: "human" | "ai";
  content: string;
};

export type PDFQuery = {
  pdfUrl?: string;
  pdfBlobUrl?: string;
  pdfName?: string;
  supabaseUrl?: string; // Add support for Supabase URL
  query: string;
};

// Handle file uploads (receive ArrayBuffer and save to disk temporarily)
async function handleFileUpload(
  pdfBlob: Blob,
  pdfName: string
): Promise<string> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, pdfName);
  
  await writeFile(filePath, buffer);
  return filePath;
}

// Simple PDF loader using pdf-parse
async function loadPDFDocuments(filePath: string): Promise<Document[]> {
  const pdfParse = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const result = await pdfParse.default(dataBuffer);
  
  // Create a document with the PDF content
  return [
    new Document({
      pageContent: result.text,
      metadata: {
        source: filePath,
        pdf_numpages: result.numpages,
      },
    }),
  ];
}

// Process a PDF file and create a vector store
export async function processPDF(
  pdfPath: string,
  openAIApiKey: string,
  onProgress?: (progress: number) => void
): Promise<FaissStore> {
  try {
    // Load the PDF
    const docs = await loadPDFDocuments(pdfPath);

    // Split the document into chunks for processing
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    // Create embeddings for the chunks
    const embeddings = new OpenAIEmbeddings({ openAIApiKey });

    // Create a vector store from the documents
    const store = await FaissStore.fromDocuments(splitDocs, embeddings);

    // Save the vector store for future use
    vectorStore = store;

    return store;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}

// Handle PDF processing from a URL
export async function processPDFfromURL(
  pdfUrl: string, 
  openAIApiKey: string
): Promise<FaissStore> {
  // Fetch the PDF from the URL
  const response = await fetch(pdfUrl);
  const pdfBlob = await response.blob();
  
  // Create a temporary file
  const pdfName = `temp-${Date.now()}.pdf`;
  const pdfPath = await handleFileUpload(pdfBlob, pdfName);
  
  // Process the PDF
  return processPDF(pdfPath, openAIApiKey);
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

// Handle answering queries using the vectorstore
export async function answerQuery(
  query: string,
  openAIApiKey: string,
  streamCallback?: (token: string) => void
): Promise<string> {
  if (!vectorStore) {
    return "Please upload a PDF document first before asking questions.";
  }

  // Create callback handlers
  const callbackHandlers = streamCallback
    ? [new StreamingCallbackHandler(streamCallback)]
    : undefined;

  // Initialize the language model
  const model = new OpenAI({
    openAIApiKey,
    temperature: 0,
    streaming: !!streamCallback,
    callbacks: callbackHandlers,
  });

  // Create a retrieval chain using the vector store
  const retriever = vectorStore.asRetriever();
  
  // Define the retrieval-based QA chain
  const chain = RunnableSequence.from([
    async (input: { query: string }) => {
      // Retrieve relevant documents
      const docs = await retriever.getRelevantDocuments(input.query);
      
      // Prepare prompt with retrieved context
      const context = docs.map(doc => doc.pageContent).join("\n\n");
      const prompt = `Answer the following question based on the provided context. If the answer cannot be found in the context, say "I don't have enough information to answer this question."
      
Context: ${context}

Question: ${input.query}

Answer:`;
      
      return { prompt };
    },
    async (input: { prompt: string }) => {
      // Generate answer using the language model
      const result = await model.invoke(input.prompt);
      return { answer: result };
    }
  ]);

  // Execute the chain
  const result = await chain.invoke({ query });
  
  return result.answer;
}

// Reset the vectorstore (when a new PDF is uploaded)
export function resetVectorStore(): void {
  vectorStore = null;
}

// Main handler for PDF processing and answering queries
export async function handlePDFQuery(
  query: PDFQuery,
  openAIApiKey: string
): Promise<string> {
  try {
    // If a new PDF is provided, process it first
    if (query.pdfUrl || query.pdfBlobUrl || query.supabaseUrl) {
      resetVectorStore();
      
      if (query.supabaseUrl) {
        // Handle Supabase URL (which is already a direct download link)
        await processPDFfromURL(query.supabaseUrl, openAIApiKey);
      } else if (query.pdfUrl) {
        await processPDFfromURL(query.pdfUrl, openAIApiKey);
      } else if (query.pdfBlobUrl && query.pdfName) {
        // For client-side blob URLs, we need to fetch the blob
        const response = await fetch(query.pdfBlobUrl);
        const pdfBlob = await response.blob();
        const pdfPath = await handleFileUpload(pdfBlob, query.pdfName);
        await processPDF(pdfPath, openAIApiKey);
      }
    }

    // Now answer the query
    const answer = await answerQuery(query.query, openAIApiKey);
    return answer;
  } catch (error: any) {
    console.error("Error handling PDF query:", error);
    return `Error processing your query: ${error.message}`;
  }
}
