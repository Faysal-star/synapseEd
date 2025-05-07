import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "./agent";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic } = body;
        
        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }
        
        console.log(`Processing content generation request for topic: ${topic}`);
        
        // Generate content with the user's topic
        const result = await generateContent(topic);
        
        // Check if there was an error
        if (result.error) {
            console.error("Content generation error:", result.error);
            return NextResponse.json({ 
                error: result.error,
                timestamp: result.timestamp
            }, { status: 500 });
        }
        
        // Log successful content generation request
        console.log({
            timestamp: result.timestamp,
            topic,
            subjectArea: result.metadata?.subjectArea,
            academicLevel: result.metadata?.academicLevel,
            type: "content-generation"
        });
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error processing content generation request:", error);
        return NextResponse.json({ 
            error: `Error: ${error.message || "Unknown error occurred"}. Please try again later.`,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // Direct PDF download endpoint
    try {
        const searchParams = request.nextUrl.searchParams;
        const topic = searchParams.get('topic');
        const format = searchParams.get('format') || 'json';
        
        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }
        
        // Generate content with the user's topic
        const result = await generateContent(topic);
        
        // Check if there was an error
        if (result.error || !result.pdfBuffer) {
            console.error("Content generation error:", result.error);
            return NextResponse.json({ 
                error: result.error || "Failed to generate PDF",
                timestamp: result.timestamp
            }, { status: 500 });
        }
        
        // If format=pdf, return the PDF directly
        if (format === 'pdf') {
            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(result.pdfBuffer, 'base64');
            
            // Create a sanitized filename
            const sanitizedTopic = topic
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
                
            const filename = `synapseEd-guide-${sanitizedTopic}.pdf`;
            
            // Return the PDF with appropriate headers
            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Content-Length': pdfBuffer.length.toString()
                }
            });
        }
        
        // Otherwise return the JSON result
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error processing content generation request:", error);
        return NextResponse.json({ 
            error: `Error: ${error.message || "Unknown error occurred"}. Please try again later.`,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}