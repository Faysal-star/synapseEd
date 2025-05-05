import { NextRequest, NextResponse } from 'next/server';

// Base URL for the Flask backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// API key for backend authentication - you should set this in your environment variables
const API_KEY = process.env.VIVA_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action')?.toString();

    // Route the request to the appropriate backend endpoint based on the action
    switch (action) {
      case 'start':
        // Start a new VIVA session
        const subject = formData.get('subject')?.toString();
        const topic = formData.get('topic')?.toString();
        const difficulty = formData.get('difficulty')?.toString() || 'medium';
        const voice = formData.get('voice')?.toString() || 'alloy';

        console.log(`Attempting to start VIVA session with: ${BACKEND_URL}/api/viva/start`, 
          { subject, topic, difficulty, voice });

        try {
          const startResponse = await fetch(`${BACKEND_URL}/api/viva/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
              'X-Api-Key': API_KEY || '',
              'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            },
            body: JSON.stringify({ subject, topic, difficulty, voice }),
            // Add timeout to avoid hanging requests
            signal: AbortSignal.timeout(15000), // 15 seconds timeout
          });
          
          // Log response status for debugging
          console.log(`VIVA start response status: ${startResponse.status}`);
          
          if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Backend returned ${startResponse.status}: ${errorText || startResponse.statusText}`);
          }

          const startData = await startResponse.json();
          return NextResponse.json(startData);
        } catch (error) {
          console.error('Error connecting to VIVA backend:', error);
          if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
              { error: 'Could not connect to the VIVA backend server. Please check if the backend is running.' }, 
              { status: 503 }
            );
          }
          throw error; // Re-throw for the outer catch block
        }

      case 'respond':
        // Process student response
        const sessionId = formData.get('session_id')?.toString();
        
        // Create a new FormData to send to the backend
        const backendFormData = new FormData();
        backendFormData.append('session_id', sessionId || '');
        
        // Check if audio file is provided
        const audio = formData.get('audio');
        if (audio && audio instanceof Blob) {
          backendFormData.append('audio', audio);
        } else {
          // Fallback to text
          const text = formData.get('text')?.toString();
          if (text) {
            backendFormData.append('text', text);
          }
        }
        
        try {
          const respondResponse = await fetch(`${BACKEND_URL}/api/viva/respond`, {
            method: 'POST',
            headers: {
              'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
              'X-Api-Key': API_KEY || '',
              'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            },
            body: backendFormData,
            signal: AbortSignal.timeout(15000), // 15 seconds timeout
          });

          // Log response status for debugging
          console.log(`VIVA respond response status: ${respondResponse.status}`);
          
          if (!respondResponse.ok) {
            const errorText = await respondResponse.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Backend returned ${respondResponse.status}: ${errorText || respondResponse.statusText}`);
          }

          const respondData = await respondResponse.json();
          return NextResponse.json(respondData);
        } catch (error) {
          console.error('Error connecting to VIVA backend:', error);
          if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
              { error: 'Could not connect to the VIVA backend server. Please check if the backend is running.' }, 
              { status: 503 }
            );
          }
          throw error; // Re-throw for the outer catch block
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('VIVA API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse the URL to extract path parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const action = searchParams.get('action');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (action === 'history') {
      // Get conversation history
      try {
        const historyResponse = await fetch(`${BACKEND_URL}/api/viva/history/${sessionId}`, {
          headers: {
            'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
            'X-Api-Key': API_KEY || '',
            'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
          },
          signal: AbortSignal.timeout(15000), // 15 seconds timeout
        });
        
        // Log response status for debugging
        console.log(`VIVA history response status: ${historyResponse.status}`);
        
        if (!historyResponse.ok) {
          const errorText = await historyResponse.text();
          console.error('Backend error response:', errorText);
          throw new Error(`Backend returned ${historyResponse.status}: ${errorText || historyResponse.statusText}`);
        }
        
        const historyData = await historyResponse.json();
        return NextResponse.json(historyData);
      } catch (error) {
        console.error('Error connecting to VIVA backend:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          return NextResponse.json(
            { error: 'Could not connect to the VIVA backend server. Please check if the backend is running.' }, 
            { status: 503 }
          );
        }
        throw error; // Re-throw for the outer catch block
      }
    }
    
    // Default action: get session status
    return NextResponse.json({ 
      session_id: sessionId,
      status: 'active' 
    });
  } catch (error: any) {
    console.error('VIVA API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}