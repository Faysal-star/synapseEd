import { NextRequest, NextResponse } from 'next/server';

// Configure backend API URL with a default fallback
const API_BASE_URL = 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the backend API
    const response = await fetch(`${API_BASE_URL}/api/memory_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to communicate with the backend service' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in memory_stats API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 