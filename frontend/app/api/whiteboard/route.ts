import { NextRequest, NextResponse } from 'next/server';

// This is a simple mock API for the whiteboard functionality
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, type } = body;
    
    // Mock delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (type === 'message') {
      // Return a mock response for regular messages
      return NextResponse.json({
        text: `AI Response to: ${message}`,
        success: true
      });
    } else if (type === 'diagram') {
      // Generate mock mermaid diagram based on description
      let mermaidCode = '';
      
      if (message.toLowerCase().includes('flowchart')) {
        mermaidCode = `
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
`;
      } else if (message.toLowerCase().includes('sequence')) {
        mermaidCode = `
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
`;
      } else if (message.toLowerCase().includes('class')) {
        mermaidCode = `
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }
`;
      } else if (message.toLowerCase().includes('entity')) {
        mermaidCode = `
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
`;
      } else {
        // Default diagram
        mermaidCode = `
graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Server1]
    B --> D[Server2]
`;
      }
      
      return NextResponse.json({
        mermaidCode,
        success: true
      });
    }
    
    return NextResponse.json({
      text: "Invalid request type",
      success: false
    });
    
  } catch (error) {
    console.error('Error processing whiteboard request:', error);
    return NextResponse.json({ 
      text: "An error occurred while processing your request",
      success: false
    }, { status: 500 });
  }
}