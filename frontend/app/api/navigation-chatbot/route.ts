import { NextResponse } from "next/server";
import { runNavigationAgent } from "../navigation-chatbot/agent";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query } = body;
        
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }
        
        // Run the navigation agent with the user's query
        const result = await runNavigationAgent(query);
        
        // Log the navigation request
        console.log({
            timestamp: new Date().toISOString(),
            query,
            navigate: result.navigate,
            type: "navigation"
        });
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error processing navigation request:", error);
        return NextResponse.json({ 
            error: `Error: ${error.message || "Unknown error occurred"}. Please try again later.`,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}