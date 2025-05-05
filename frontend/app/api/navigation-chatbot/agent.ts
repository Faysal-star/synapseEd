import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const systemPrompt = `
You are a helpful navigation assistant for SynapseED - an AI-powered educational platform. Your job is to understand user requests and determine if they want to navigate to a specific page.

The application has the following pages and features:

1. Home page (/) - The landing page
2. Dashboard (/dashboard) - Overview of all activities and features
3. Quiz Management (/dashboard/ai-agent) - For teachers to create and manage quizzes, view student performance reports
4. Collaborative Whiteboard (/dashboard/whiteboard) - Interactive space for teachers and students to brainstorm together
5. Resource Management (/dashboard/resource-management) - Organize educational materials like slides, PDFs, and other files
6. Content Generation (/dashboard/ai-agent) - AI tools to help teachers generate educational content
7. Web Search Assistant (/dashboard/ai-agent) - AI-powered web search for educational resources
8. Student Counseling (/dashboard/ai-agent) - AI agent for monitoring student performance and providing guidance
9. Question Generator (/dashboard/ai-agent) - AI tool to generate quiz questions for teachers
10. Lecture Planner (/dashboard/ai-agent) - AI assistant for planning and organizing lectures
11. Academic Support (/dashboard/ai-agent) - 24/7 AI assistance for academic questions

When a user expresses an intent to visit one of these pages or use a specific feature, you should:
1. Identify which page they want to visit
2. Provide a friendly response acknowledging their request
3. Include the appropriate route in your response

IMPORTANT: Your response should be in JSON format with the following structure:
{
  "navigate": "/route-to-navigate-to", // or null if no navigation is needed
  "response": "Your friendly response to the user"
}

Examples:

User: "I need to create a quiz"
Response: 
{
  "navigate": "/quizzes",
  "response": "I'll take you to the Quiz Management page where you can create new quizzes, manage existing ones, and view student performance reports."
}

User: "How do I use the whiteboard?"
Response:
{
  "navigate": "/whiteboard",
  "response": "Redirecting you to our Collaborative Whiteboard! This is where you and your students can brainstorm ideas together in real-time."
}

User: "What can this platform do?"
Response:
{
  "navigate": null,
  "response": "SynapseED offers various educational tools including quiz management, collaborative whiteboard, resource management, content generation, student counseling, and exam monitoring. Let me know which feature you'd like to explore, and I'll navigate you there!"
}

Remember to respond ONLY with valid JSON that matches the specified format.
`;

export async function runNavigationAgent(query: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Sending navigation query to Gemini API...");
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nUser: " + query }] }]
    });
    
    const responseText = response.response.text();
    console.log("Navigation agent response:", responseText);
    
    try {
      // Extract JSON from response if there's extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsedResponse = JSON.parse(jsonString);
      
      // Validate the response format
      if (typeof parsedResponse.response !== 'string') {
        throw new Error("Invalid response format: missing or invalid 'response' field");
      }
      
      if (parsedResponse.navigate !== null && typeof parsedResponse.navigate !== 'string') {
        throw new Error("Invalid response format: 'navigate' field must be a string or null");
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error("Error parsing navigation agent response:", parseError);
      
      // Fallback logic for handling invalid JSON
      let navigate = null;
      let response = "I'm not sure where you want to go. Could you be more specific?";
      
      // Try to extract navigation intent from the text response
      const lowerResponse = responseText.toLowerCase();
      
      if (lowerResponse.includes('/quiz') || lowerResponse.includes('quiz management')) {
        navigate = '/quizzes';
        response = "Taking you to the Quiz Management section!";
      } else if (lowerResponse.includes('/whiteboard') || lowerResponse.includes('collaborative whiteboard')) {
        navigate = '/whiteboard';
        response = "Taking you to the Collaborative Whiteboard!";
      } else if (lowerResponse.includes('/resource') || lowerResponse.includes('resource management')) {
        navigate = '/resources';
        response = "Directing you to Resource Management!";
      } else if (lowerResponse.includes('/content') || lowerResponse.includes('content generator')) {
        navigate = '/content-generator';
        response = "Taking you to the Content Generation tools!";
      } else if (lowerResponse.includes('/search') || lowerResponse.includes('web search')) {
        navigate = '/web-search';
        response = "Directing you to the Web Search Assistant!";
      } else if (lowerResponse.includes('/counsel') || lowerResponse.includes('student counseling')) {
        navigate = '/counseling';
        response = "Taking you to the Student Counseling section!";
      } else if (lowerResponse.includes('/question') || lowerResponse.includes('question generator')) {
        navigate = '/question-generator';
        response = "Taking you to the Question Generator!";
      } else if (lowerResponse.includes('/lecture') || lowerResponse.includes('lecture planner')) {
        navigate = '/lecture-planner';
        response = "Directing you to the Lecture Planner!";
      } else if (lowerResponse.includes('/exam') || lowerResponse.includes('exam monitoring')) {
        navigate = '/exam-monitor';
        response = "Taking you to the Exam Monitoring tools!";
      } else if (lowerResponse.includes('/academic') || lowerResponse.includes('academic support')) {
        navigate = '/academic-support';
        response = "Directing you to the Academic Support section!";
      } else if (lowerResponse.includes('/dashboard')) {
        navigate = '/dashboard';
        response = "Taking you to your Dashboard!";
      }
      
      return {
        navigate,
        response
      };
    }
  } catch (error: any) {
    console.error("Error with navigation agent:", error);
    return {
      navigate: null,
      response: "I'm sorry, I encountered an error processing your request. Please try again or use the navigation menu to find what you're looking for."
    };
  }
}