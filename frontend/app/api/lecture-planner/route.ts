import { NextRequest, NextResponse } from 'next/server';

// Configure backend API URL for the lecture planner service
const API_BASE_URL = 'http://localhost:5005';

// Generic handler for all HTTP methods
async function handleRequest(request: NextRequest, endpoint: string, method: string) {
  try {
    let body = null;
    
    // For methods that can have a body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.json();
    }
    
    // Forward the request to the backend API
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lecture Planner API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to communicate with the Lecture Planner service: ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in lecture-planner API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle POST request to generate a new lecture plan
export async function POST(request: NextRequest) {
  return handleRequest(request, '/lectures/', 'POST');
}

// Handler for updating lecture plan components
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Path format: /api/lecture-planner/[id]/[component]
  // Example: /api/lecture-planner/123/topics
  if (pathParts.length >= 5) {
    const id = pathParts[3];
    const component = pathParts[4];
    
    const validComponents = ['topics', 'teaching-methods', 'resources', 'learning-objectives'];
    
    if (validComponents.includes(component)) {
      return handleRequest(request, `/lectures/${id}/${component}`, 'PUT');
    }
  }
  
  return NextResponse.json(
    { error: 'Invalid endpoint' },
    { status: 400 }
  );
}

// Handle GET request to check API status
export async function GET(request: NextRequest) {
  return handleRequest(request, '/status/', 'GET');
} 