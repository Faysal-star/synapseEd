import { NextResponse } from "next/server";
import { runStudySupportAgent } from "./agent";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query } = body;
        
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }
        
        // Run the study support agent with the user's query
        const result = await runStudySupportAgent(query);
        
        // Log the study support request with metadata
        console.log({
            timestamp: result.timestamp,
            query,
            subjectArea: result.metadata?.subjectArea,
            difficultyLevel: result.metadata?.difficultyLevel,
            type: "study-support"
        });
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error processing study support request:", error);
        return NextResponse.json({ 
            error: `Error: ${error.message || "Unknown error occurred"}. Please try again later.`,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}