import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Question classification function
async function classifyQuestion(query: string) {
  try {
    const classifierModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const classifierPrompt = `
      You are an educational question classifier.
      
      Analyze the following student question and classify it by:
      1. Subject area - Be specific (e.g., "Algebra", "Organic Chemistry", "European History")
      2. Difficulty level - (beginner, intermediate, advanced)
      3. Key terms or concepts in the question
      
      Output ONLY valid JSON in this format:
      {
        "subjectArea": "specific subject",
        "difficultyLevel": "beginner|intermediate|advanced",
        "keyTerms": ["key1", "key2", "key3"]
      }
      
      Question: ${query}
    `;
    
    const classifierResponse = await classifierModel.generateContent({
      contents: [{ role: "user", parts: [{ text: classifierPrompt }] }]
    });
    
    const classifierText = classifierResponse.response.text();
    
    // Extract JSON from response
    const jsonMatch = classifierText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : classifierText;
    
    const classification = JSON.parse(jsonString);
    console.log("Question classification:", classification);
    
    return classification;
  } catch (error) {
    console.error("Error classifying question:", error);
    return {
      subjectArea: "General",
      difficultyLevel: "intermediate",
      keyTerms: []
    };
  }
}

const systemPrompt = `
You are SynapseEd's AI Study Support Assistant - a helpful educational companion for students. Your purpose is to provide accurate, clear, and educational responses to student questions across various academic subjects.

EXPERTISE AREAS:
1. Mathematics (algebra, calculus, geometry, statistics, etc.)
2. Computer Science (programming, algorithms, data structures, etc.)
3. Physics (mechanics, thermodynamics, electromagnetism, etc.)
4. Chemistry (organic, inorganic, physical chemistry, etc.)
5. Biology (cellular biology, ecology, genetics, etc.)
6. Literature and Language Arts
7. History
8. Geography
9. Economics
10. General study skills and learning strategies

RESPONSE GUIDELINES:
1. Be accurate and educational in your answers
2. Explain concepts step-by-step when appropriate
3. Use examples to illustrate complex ideas
4. When responding to coding questions, provide well-structured, commented code
5. Suggest additional resources for further learning when relevant
6. If you're unsure about something, acknowledge it rather than providing incorrect information
7. Keep responses at an appropriate educational level for the question
8. Always respond in English, regardless of the language of the question
9. Format mathematical expressions using LaTeX notation (e.g., $E = mc^2$)
10. For chemistry, use proper notation for chemical formulas (e.g., H₂O)
11. Include diagrams/visualizations when helpful (described in text)
12. Break down complex problems into manageable parts
13. Provide learning strategies and memory techniques when appropriate

RESPONSE FORMAT:
Your response must be valid JSON with the following structure:
{
  "answer": "Your detailed educational response to the question",
  "additionalResources": [
    {
      "title": "Resource Title",
      "description": "Brief description of this resource",
      "url": "https://example.com/resource (if applicable)",
      "type": "book|article|video|website|practice"
    }
  ],
  "subjectArea": "The specific subject area of this question (e.g., 'Organic Chemistry', 'Calculus', 'Data Structures')",
  "difficultyLevel": "beginner|intermediate|advanced",
  "keyTerms": ["term1", "term2", "term3"]
}
`;

export async function runStudySupportAgent(query: string) {
  const startTime = Date.now();
  try {
    // First classify the question
    const classification = await classifyQuestion(query);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2,  // Lower temperature for more factual responses
        topP: 0.8,         // More focused distribution of tokens
        maxOutputTokens: 4096  // Allow longer explanations for complex topics
      }
    });
    
    console.log("Sending study support query to Gemini API...");
    
    // Enhance prompt with classification
    const enhancedPrompt = `
${systemPrompt}

This question appears to be about ${classification.subjectArea} at a ${classification.difficultyLevel} level.
Key terms identified: ${classification.keyTerms.join(", ")}

User: ${query}
`;
    
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }]
    });
    
    const responseText = response.response.text();
    console.log("Study support agent response received");
    
    try {
      // Extract JSON from response if there's extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsedResponse = JSON.parse(jsonString);
      
      // Validate the response format
      if (typeof parsedResponse.answer !== 'string') {
        throw new Error("Invalid response format: missing or invalid 'answer' field");
      }
      
      // additionalResources can be null or an array
      if (parsedResponse.additionalResources !== null && 
          !Array.isArray(parsedResponse.additionalResources)) {
        parsedResponse.additionalResources = null;
      }
      
      // Create metadata from either response or classification
      const metadata = {
        subjectArea: parsedResponse.subjectArea || classification.subjectArea || "General",
        difficultyLevel: parsedResponse.difficultyLevel || classification.difficultyLevel || "intermediate",
        keyTerms: parsedResponse.keyTerms || classification.keyTerms || [],
        processingTimeMs: Date.now() - startTime
      };
      
      return {
        answer: parsedResponse.answer,
        additionalResources: parsedResponse.additionalResources || null,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (parseError) {
      console.error("Error parsing study support agent response:", parseError);
      
      // Fallback response
      const fallbackAnswer = "I apologize, but I encountered an issue processing your question. Could you please try asking another question or rephrase your current one?";
      
      return {
        answer: fallbackAnswer,
        additionalResources: null,
        metadata: {
          subjectArea: classification.subjectArea || "General",
          difficultyLevel: classification.difficultyLevel || "intermediate",
          keyTerms: classification.keyTerms || [],
          processingTimeMs: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    console.error("Error with study support agent:", error);
    
    // Error message
    const errorMessage = "I'm sorry, I encountered an error processing your question. Please try again.";
    
    return {
      answer: errorMessage,
      additionalResources: null,
      metadata: {
        subjectArea: "General",
        difficultyLevel: "intermediate",
        keyTerms: [],
        processingTimeMs: Date.now() - startTime
      },
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}