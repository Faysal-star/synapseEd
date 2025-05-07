import { NextRequest, NextResponse } from 'next/server';

// Base URL for the Flask backend
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
              'X-Session-ID': crypto.randomUUID(),
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
          
          // Generate full audio URL
          if (startData.audio_path) {
            startData.audio_url = `${BACKEND_URL}${startData.audio_path.startsWith('/') ? '' : '/'}${startData.audio_path}`;
          }
          
          // Set session ID from response or generate one
          startData.session_id = startData.session_id || startResponse.headers.get('X-Session-ID') || crypto.randomUUID();
          
          // Pass greeting from the response
          startData.text = startData.greeting || 'Hello! I am your VIVA examiner.';
          
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
        
        // Check if audio file is provided
        const audio = formData.get('audio');
        if (audio && audio instanceof Blob) {
          // Process audio response
          try {
            // Convert Blob to base64
            const arrayBuffer = await audio.arrayBuffer();
            const base64Audio = Buffer.from(arrayBuffer).toString('base64');
            
            const chatResponse = await fetch(`${BACKEND_URL}/api/viva/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
                'X-Api-Key': API_KEY || '',
                'X-Session-ID': sessionId || '',
                'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
              },
              body: JSON.stringify({
                assistant_id: sessionId,
                thread_id: sessionId,
                audio_data: base64Audio
              }),
              signal: AbortSignal.timeout(30000), // 30 seconds timeout for audio processing
            });

            // Log response status for debugging
            console.log(`VIVA audio chat response status: ${chatResponse.status}`);
            
            if (!chatResponse.ok) {
              const errorText = await chatResponse.text();
              console.error('Backend error response:', errorText);
              throw new Error(`Backend returned ${chatResponse.status}: ${errorText || chatResponse.statusText}`);
            }

            const responseData = await chatResponse.json();
            
            // Generate full audio URL
            if (responseData.audio_path) {
              responseData.audio_url = `${BACKEND_URL}${responseData.audio_path.startsWith('/') ? '' : '/'}${responseData.audio_path}`;
            }
            
            // Pass response text
            responseData.text = responseData.response || 'I received your audio response.';
            
            return NextResponse.json(responseData);
          } catch (error) {
            console.error('Error processing audio response:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              return NextResponse.json(
                { error: 'Could not connect to the VIVA backend server. Please check if the backend is running.' }, 
                { status: 503 }
              );
            }
            throw error; // Re-throw for the outer catch block
          }
        } else {
          // Process text response
          const text = formData.get('text')?.toString();
          if (!text) {
            return NextResponse.json({ error: 'No text or audio provided' }, { status: 400 });
          }
          
          try {
            const chatResponse = await fetch(`${BACKEND_URL}/api/viva/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
                'X-Api-Key': API_KEY || '',
                'X-Session-ID': sessionId || '',
                'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
              },
              body: JSON.stringify({
                assistant_id: sessionId,
                thread_id: sessionId,
                text: text
              }),
              signal: AbortSignal.timeout(15000), // 15 seconds timeout
            });

            // Log response status for debugging
            console.log(`VIVA text chat response status: ${chatResponse.status}`);
            
            if (!chatResponse.ok) {
              const errorText = await chatResponse.text();
              console.error('Backend error response:', errorText);
              throw new Error(`Backend returned ${chatResponse.status}: ${errorText || chatResponse.statusText}`);
            }

            const responseData = await chatResponse.json();
            
            // Generate full audio URL
            if (responseData.audio_path) {
              responseData.audio_url = `${BACKEND_URL}${responseData.audio_path.startsWith('/') ? '' : '/'}${responseData.audio_path}`;
            }
            
            // Pass response text
            responseData.text = responseData.response || 'I received your text response.';
            
            return NextResponse.json(responseData);
          } catch (error) {
            console.error('Error processing text response:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              return NextResponse.json(
                { error: 'Could not connect to the VIVA backend server. Please check if the backend is running.' }, 
                { status: 503 }
              );
            }
            throw error; // Re-throw for the outer catch block
          }
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
    const { searchParams, pathname } = new URL(request.url);
    const audio_path = searchParams.get('audio_path');
    
    // Check if this is an audio request
    if (audio_path) {
      // Remove any leading slash to ensure correct URL construction
      const audioPathCleaned = audio_path.startsWith('/') ? audio_path.substring(1) : audio_path;
      
      // Get the VIVA API URL from environment variables
      const VIVA_API_URL = process.env.NEXT_PUBLIC_VIVA_API_URL || 'http://localhost:5000';
      
      // Construct the full URL to the audio file
      const audioUrl = `${VIVA_API_URL}/${audioPathCleaned}`;
      
      // Make a request to the backend for the audio file
      const audioResponse = await fetch(audioUrl);
      
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio file: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      
      // Get the audio file as a buffer
      const audioBuffer = await audioResponse.arrayBuffer();
      
      // Return the audio file with the correct content type
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    const sessionId = searchParams.get('session_id');
    const action = searchParams.get('action');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (action === 'history') {
      // Get conversation history - this is not implemented in the current backend
      try {
        const historyResponse = await fetch(`${BACKEND_URL}/api/viva/history`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': API_KEY ? `Bearer ${API_KEY}` : '',
            'X-Api-Key': API_KEY || '',
            'X-Session-ID': sessionId,
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
    
    // Check if server is healthy
    if (action === 'health') {
      try {
        // Try to directly access the backend health endpoint
        const healthResponse = await fetch(`${BACKEND_URL}/api/viva/health`, {
          signal: AbortSignal.timeout(5000), // 5 seconds timeout
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          return NextResponse.json(healthData);
        } else {
          console.error(`Health check failed: Backend returned ${healthResponse.status}`);
          return NextResponse.json({ 
            status: 'unhealthy',
            message: `Backend server returned ${healthResponse.status}`
          }, { status: 200 });
        }
      } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({ 
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Could not connect to backend server'
        }, { status: 200 });
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