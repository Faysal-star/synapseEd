import { NextRequest, NextResponse } from "next/server";
import { handlePDFQuery, resetVectorStore, PDFQuery } from "./agent";

// Ensure the OpenAI API key is set
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Handler for the main PDF query endpoint
export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    // Make sure we have the required query field
    if (!body.query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Process the PDF query
    const pdfQuery: PDFQuery = {
      pdfUrl: body.pdfUrl,
      pdfBlobUrl: body.pdfBlobUrl,
      pdfName: body.pdfName,
      supabaseUrl: body.supabaseUrl,
      query: body.query,
    };

    // Get the answer
    const answer = await handlePDFQuery(pdfQuery, OPENAI_API_KEY);

    // Return the response
    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

// Handler for resetting the context (clearing the vector store)
export async function DELETE(request: NextRequest) {
  try {
    resetVectorStore();
    return NextResponse.json({ message: "Context cleared successfully" });
  } catch (error: any) {
    console.error("Error clearing context:", error);
    return NextResponse.json(
      { error: `Failed to clear context: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

// For OPTIONS requests (CORS support)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
