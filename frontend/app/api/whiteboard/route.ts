import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';

import {
  GoogleGenAI,
  createUserContent,
  createPartFromBase64,
} from "@google/genai";
import fs from 'fs';
import { createReadStream } from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// This is a simple mock API for the whiteboard functionality
export async function POST(req: NextRequest) {
  let filePath = '';
  try {
    const body = await req.json();
    const { message, type, image } = body;

    // save the image to a file
    //create uploads folder if not exists
    if (!fs.existsSync('./public/uploads')) {
      fs.mkdirSync('./public/uploads', { recursive: true });
    }
    filePath = `./public/uploads/${Date.now()}.png`;
    if (image) {
      const base64Data = image.replace(/^data:image\/png;base64,/, '');
      
      fs.writeFileSync(filePath, base64Data, 'base64');
      console.log('Image saved to:', filePath);
    }
    // Mock delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    if (type === 'message') {
      const prompt = `You are a helpful assistant. Respond to the following message: ${message} in short concise manner. Without any extra info , just the precise answer.`;
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
      });
      return NextResponse.json({
        text: response.output_text.trim(),
        success: true
      });

    } else if (type === 'diagram') {
      // Generate mock mermaid diagram based on description
      let mermaidCode = '';

      const prompt = `You are a helpful assistant. Generate a mermaid diagram code based on the following description: ${message}. No extra info or any text, just the code. wrap the code in <code> </code> wrapper.
      A sample response format:
      <code>
      graph TD
          A[Client] --> B[Load Balancer]
          B --> C[Server1]
          B --> D[Server2]
      </code>
      NO MERMAID BLOCKs OR ANY BACKTICKS. Just the code inside <code> </code> tags.
      Make sure to use the mermaid syntax and wrap the code in <code> </code> tags. Do not include any other text or explanation. Just the code.
      `;

      let response = await openai.responses.create({
        model: "gpt-4o",
        input: prompt,
      });

      mermaidCode = response.output_text.trim().replace(/<code>/g, '').replace(/<\/code>/g, '');

      return NextResponse.json({
        mermaidCode,
        success: true
      });
    } else if (type === 'summarize') {
      // Handle image summarization
      if (!image) {
        return NextResponse.json({
          text: "No image data provided",
          success: false
        }, { status: 400 });
}
      

      const prompt = `You are an expert at analyzing visual content. This is an image of a whiteboard with various elements.
      Provide a clear, concise summary of what you see on this whiteboard. Focus on:
      1. The main topics or concepts
      2. Any key relationships between elements
      3. The overall structure and organization
      
      Keep your summary under 150 words and make it actionable for someone who wants to understand the main points quickly.`;

      // const model = ai.models.gemini("gemini-2.0-flash");
      // const base64ImageFile = fs.readFileSync(image, {
      //   encoding: "base64",
      // });

      const base64ImageFile = fs.readFileSync(filePath, {
        encoding: "base64",
      });

      
      const contents = [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64ImageFile,
          },
        },
        { text: prompt },
      ];


      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
      });
      
      const res = response.text;
      
      return NextResponse.json({
        text: res,
        success: true
      });
    }

    return NextResponse.json({
      text: "Invalid request type",
      success: false
    });

  } catch (error) {
    //console.error('Error processing whiteboard request:', error);
    return NextResponse.json({
      text: "An error occurred while processing your request: " + JSON.stringify(error),
      success: false
    }, { status: 500 });
  } finally {
    // Clean up the saved image file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Image file deleted:', filePath);
    }
  }
}
