import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Function to detect if text is Bengali
function isBengali(text: string): boolean {
  // Bengali Unicode range: \u0980-\u09FF
  const bengaliPattern = /[\u0980-\u09FF]/;
  return bengaliPattern.test(text);
}

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

IMPORTANT: If the user's request is in Bengali language, YOUR RESPONSE MUST ALSO BE IN BENGALI.

Your response should be in JSON format with the following structure:
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

Bengali Example:
User: "এই প্লাটফর্ম কী কী করতে পারে?"
Response:
{
  "navigate": null,
  "response": "স্যিনাপ্সED বিভিন্ন শিক্ষামূলক টুল অফার করে, যার মধ্যে আছে কুইজ ম্যানেজমেন্ট, কোলাবরেটিভ হোয়াইটবোর্ড, রিসোর্স ম্যানেজমেন্ট, কন্টেন্ট জেনারেশন, স্টুডেন্ট কাউন্সেলিং এবং এক্সাম মনিটরিং। আপনি কোন ফিচারটি এক্সপ্লোর করতে চান আমাকে জানান, আমি আপনাকে সেখানে নিয়ে যাব!"
}

Remember to respond ONLY with valid JSON that matches the specified format.
`;

export async function runNavigationAgent(query: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const isBengaliQuery = isBengali(query);
    
    console.log("Sending navigation query to Gemini API...");
    console.log("Query language detection: ", isBengaliQuery ? "Bengali" : "Not Bengali");
    
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
      
      // Fallback logic for handling invalid JSON with language awareness
      let navigate = null;
      let response = isBengaliQuery 
        ? "আমি নিশ্চিত নই আপনি কোথায় যেতে চান। আরও নির্দিষ্টভাবে বলতে পারবেন কি?"
        : "I'm not sure where you want to go. Could you be more specific?";
      
      // Try to extract navigation intent from the text response
      const lowerResponse = responseText.toLowerCase();
      
      if (lowerResponse.includes('/quiz') || lowerResponse.includes('quiz management')) {
        navigate = '/quizzes';
        response = isBengaliQuery 
          ? "আপনাকে কুইজ ম্যানেজমেন্ট সেকশনে নিয়ে যাচ্ছি!"
          : "Taking you to the Quiz Management section!";
      } else if (lowerResponse.includes('/whiteboard') || lowerResponse.includes('collaborative whiteboard')) {
        navigate = '/whiteboard';
        response = isBengaliQuery 
          ? "আপনাকে কোলাবরেটিভ হোয়াইটবোর্ডে নিয়ে যাচ্ছি!"
          : "Taking you to the Collaborative Whiteboard!";
      } else if (lowerResponse.includes('/resource') || lowerResponse.includes('resource management')) {
        navigate = '/resources';
        response = isBengaliQuery 
          ? "আপনাকে রিসোর্স ম্যানেজমেন্টে নিয়ে যাচ্ছি!"
          : "Directing you to Resource Management!";
      } else if (lowerResponse.includes('/dashboard')) {
        navigate = '/dashboard';
        response = isBengaliQuery 
          ? "আপনাকে আপনার ড্যাশবোর্ডে নিয়ে যাচ্ছি!"
          : "Taking you to your Dashboard!";
      }
      
      // Special case for "What can this platform do?" in Bengali
      if (query.includes("প্লাটফর্ম কী কী করতে পারে") || query.includes("প্ল্যাটফর্ম কি করতে পারে")) {
        navigate = null;
        response = "SynapseEd বিভিন্ন শিক্ষামূলক টুল অফার করে, যার মধ্যে আছে কুইজ ম্যানেজমেন্ট, কোলাবরেটিভ হোয়াইটবোর্ড, রিসোর্স ম্যানেজমেন্ট, কন্টেন্ট জেনারেশন, স্টুডেন্ট কাউন্সেলিং এবং এক্সাম মনিটরিং। আপনি কোন ফিচারটি এক্সপ্লোর করতে চান আমাকে জানান, আমি আপনাকে সেখানে নিয়ে যাব!";
      }
      
      return {
        navigate,
        response
      };
    }
  } catch (error: any) {
    console.error("Error with navigation agent:", error);
    
    // Check if the query is in Bengali for the error message
    const errorMessage = isBengali(query)
      ? "দুঃখিত, আপনার অনুরোধ প্রক্রিয়া করতে একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা নেভিগেশন মেনু ব্যবহার করুন।"
      : "I'm sorry, I encountered an error processing your request. Please try again or use the navigation menu to find what you're looking for.";
    
    return {
      navigate: null,
      response: errorMessage
    };
  }
}