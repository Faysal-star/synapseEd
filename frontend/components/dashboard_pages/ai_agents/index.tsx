'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search,FileText, SendHorizontal, Wand2, Globe, SquarePen, Brain, Sparkles, Lightbulb, AlertCircle, ThumbsUp, ThumbsDown, Check, Info, BookOpen } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "@/components/ui/use-toast";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import QuestionGenerationPage from '@/components/dashboard_pages/ai_agents/question_generation/page';
import WebSearchPage from '@/components/dashboard_pages/ai_agents/web_search/page';
import LecturePlannerPage from '@/components/dashboard_pages/ai_agents/lecture_planner/page';
import StudySupportPage from '@/components/dashboard_pages/ai_agents/study_support/page';
import ContentGenerationPage from '@/components/dashboard_pages/ai_agents/content-generation/page';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isMarkdown?: boolean; // Flag to indicate if content should be rendered as markdown
  messageId?: string; // Unique message ID from the API for feedback
  hasFeedback?: boolean; // Track if feedback was given
  reasoning?: any[]; // For storing reasoning steps
}

// Feedback form schema
const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  feedbackText: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface AgentType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export default function AIAgentsPage() {
  const router = useRouter();
  const [activeAgent, setActiveAgent] = useState<string>('smart-counselor');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [showReasoning, setShowReasoning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
 
  // User role and type
  const { role, user } = useUser();
  const userType = role || 'student';
  
  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [initialRating, setInitialRating] = useState<number>(3);
  const [conversationId, setConversationId] = useState<string>('');

  // State for all specialized interfaces
  const [showLecturePlanner, setShowLecturePlanner] = useState(false);
  const [showStudySupport, setShowStudySupport] = useState(false);
  const [showContentGenerator, setShowContentGenerator] = useState(false);

  // Create form
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 3,
      feedbackText: '',
    },
  });

  // Available agents based on user type
  const agents: AgentType[] = [
    {
      id: 'content-generator',
      name: 'Content Generator',
      icon: <Sparkles className="h-5 w-5" />,
      description: 'Generate dynamic content and teaching materials'
    },
    {
      id: 'web-search',
      name: 'Web Search',
      icon: <Globe className="h-5 w-5" />,
      description: 'Find information and resources from the web'
    },
    {
      id: 'smart-counselor',
      name: 'Smart Counselor',
      icon: <Brain className="h-5 w-5" />,
      description: 'Get guidance on personal and academic challenges'
    },
    {
      id: 'study-support',
      name: 'Study Support',
      icon: <BookOpen className="h-5 w-5" />,
      description: 'Get help with academic subjects and homework'
    },
    ...(userType === 'teacher' ? [
      {
        id: 'question-generation',
        name: 'Question Generation',
        icon: <Lightbulb className="h-5 w-5" />,
        description: 'Generate quizzes, tests, and assessment materials'
      },
      {
        id: 'lecture-planner',
        name: 'Lecture Planner',
        icon: <SquarePen className="h-5 w-5" />,
        description: 'Create comprehensive lesson plans and activities'
      }
    ] : [])
  ];


  useEffect(() => {
    if (userType === 'student' && 
       (activeAgent === 'question-generation' || activeAgent === 'lecture-planner')) {
      setActiveAgent('smart-counselor');
    }
  }, [userType, activeAgent]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting message based on selected agent
  useEffect(() => {
    const initialMessage = {
      id: `${activeAgent}-welcome`,
      role: 'assistant' as const,
      content: getInitialMessage(activeAgent),
      timestamp: new Date()
    };
    
    setMessages([initialMessage]);
  }, [activeAgent]);

  // Effect to handle active agent changes
  useEffect(() => {
    // Reset UI state when agent changes
    setShowQuestionGenerator(false);
    setShowWebSearch(false);
    setShowLecturePlanner(false);
    setShowStudySupport(false);
    setShowContentGenerator(false);
  }, [activeAgent]);

  // Get welcome message based on agent
  const getInitialMessage = (agentId: string) => {
    switch (agentId) {
      case 'content-generator':
        return "I can help you generate lesson content, quizzes, assignments, and other educational materials. What would you like to create today?";
      case 'web-search':
        return "I can search the web for current information and resources. What would you like to know more about?";
      case 'smart-counselor':
        return "How can I help you today? I'm here to discuss any academic or personal challenges you might be facing.";
      case 'study-support':
        return "Hello! I'm your AI Study Support Assistant. Ask me any academic questions and I'll do my best to help you learn.";
      case 'lecture-planner':
        return "I'll help you create structured lesson plans tailored to your curriculum. What subject and grade level are you planning for?";
      default:
        return "How can I help you today?";
    }
  };

  const submitFeedback = async (messageId: string, rating: number, feedbackText = '') => {
    try {
      // Call the backend API
      const backendUrl = 'http://localhost:5003';
      const response = await fetch(`${backendUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_id: messageId,
          rating: rating,
          feedback_text: feedbackText
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Mark the message as having feedback
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.role === 'assistant' && msg.messageId === messageId 
            ? { ...msg, hasFeedback: true } 
            : msg
        )
      );
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to open feedback dialog
  const openFeedbackDialog = (messageId: string, initialRating: number) => {
    setFeedbackMessageId(messageId);
    setInitialRating(initialRating);
    form.reset({ rating: initialRating, feedbackText: '' });
    setFeedbackDialogOpen(true);
  };

  // Function to handle feedback form submission
  const onFeedbackSubmit = (values: FeedbackFormValues) => {
    if (feedbackMessageId) {
      submitFeedback(feedbackMessageId, values.rating, values.feedbackText);
      setFeedbackDialogOpen(false);
    }
  };

  // Function to toggle viewing reasoning
  const toggleReasoning = (messageId: string) => {
    if (showReasoning === messageId) {
      setShowReasoning(null);
    } else {
      setShowReasoning(messageId);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // If web-search is active, use actual API call instead of mock response
    if (activeAgent === 'web-search') {
      try {
        // Generate a conversation ID if one doesn't exist
        const currentConvoId = conversationId || `${activeAgent}-${Date.now()}`;
        if (!conversationId) {
          setConversationId(currentConvoId);
        }
        
        const backendUrl = 'http://localhost:5003';
        const response = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputValue,
            conversation_id: currentConvoId,
            context: {
              agent_type: activeAgent,
            }
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        const newAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          isMarkdown: true, // API responses are markdown formatted
          messageId: data.message_id, // Use the correct property name from API
          reasoning: data.reasoning // Store reasoning steps
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error sending message to API:', error);
        
        // Show error toast
        toast({
          title: "API Connection Error",
          description: "Failed to connect to the search backend. Using mock response instead.",
          variant: "destructive"
        });
        
        // Fallback to mock response if API call fails
        const agentResponse = generateAgentResponse(activeAgent, inputValue);
        
        const newAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: agentResponse,
          timestamp: new Date(),
          isMarkdown: false // Mock responses are not markdown
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        setIsLoading(false);
      }
    } else if (activeAgent === 'study-support') {
      // Study support uses its own API
      try {
        const response = await fetch("/api/study-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: inputValue }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to get response from study support API");
        }
        
        const data = await response.json();
        
        const newAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer || "Sorry, I couldn't process that request.",
          timestamp: new Date(),
          isMarkdown: true,
          // Include additional resources if available
          reasoning: data.additionalResources ? [{
            type: "Resources",
            content: data.additionalResources.join(", ")
          }] : undefined
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error sending message to study support API:', error);
        
        // Show error toast
        toast({
          title: "API Error",
          description: "Failed to connect to the study support service. Please try again.",
          variant: "destructive"
        });
        
        // Add error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error processing your request. Please try again later.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    } else if (activeAgent === 'content-generator') {
      // Content generation uses its own API
      try {
        const response = await fetch("/api/content-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: inputValue }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to get response from content generation API");
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Store the generated content in localStorage to access it in the dedicated interface
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastGeneratedContent', JSON.stringify(data));
          localStorage.setItem('lastGeneratedTopic', inputValue);
        }
        
        const newAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I've created educational content on this topic! You can now view or download it as a PDF document.",
          timestamp: new Date(),
          isMarkdown: true
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        
        // Show toast with option to open content generator
        toast({
          title: "Content generated successfully",
          description: "Click 'Open' to view and download your content",
          action: (
            <Button size="sm" onClick={() => setShowContentGenerator(true)}>
              Open
            </Button>
          )
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error sending message to content generation API:', error);
        
        // Show error toast
        toast({
          title: "Content Generation Error",
          description: error instanceof Error ? error.message : "Failed to generate content. Please try again.",
          variant: "destructive"
        });
        
        // Add error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error generating the content. Please try again later.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    } else {
      // For other agents, use the mock response as before
      setTimeout(() => {
        const agentResponse = generateAgentResponse(activeAgent, inputValue);
        
        const newAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: agentResponse,
          timestamp: new Date(),
          isMarkdown: false // Mock responses are not markdown
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        setIsLoading(false);
      }, 1000);
    }
  };

  // Mock response generation - would be replaced with actual API calls
  const generateAgentResponse = (agentId: string, query: string) => {
    switch (agentId) {
      case 'study-support':
        return `Based on your question about "${query}", I recommend reviewing the following concepts...`;
      case 'web-search':
        return `[MOCK RESPONSE - API CONNECTION FAILED]\n\nI searched for information about "${query}"\n\nHere are some relevant results: \n1. [Result 1 description]\n2. [Result 2 description]\n3. [Result 3 description]`;
      case 'smart-counselor':
        return `Thank you for sharing that. Based on what you've told me about "${query}", I would suggest...\n\n[Personalized guidance would appear here]`;
      case 'lecture-planner':
        return `I've created a lesson plan outline for "${query}"\n\n**Lesson Objectives:**\n- Objective 1\n- Objective 2\n\n**Activities:**\n1. Opening activity (10 min)\n2. Main instruction (25 min)\n3. Group work (15 min)\n4. Assessment (10 min)`;
      case 'content-generator':
        return `I'd be happy to create educational content about "${query}". Please click the "Launch Content Generator" button in the sidebar to use the full interface.`;
      default:
        return "I'm not sure how to respond to that. Can you try a different question?";
    }
  };

  return (
    <div className="flex flex-col h-[100vh]">
      {/* Header section */}
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <div className="flex items-center space-x-2">
          {(showQuestionGenerator && activeAgent === 'question-generation') || 
           (showWebSearch && activeAgent === 'web-search') ||
           (showLecturePlanner && activeAgent === 'lecture-planner') ||
           (showStudySupport && activeAgent === 'study-support') ||
           (showContentGenerator && activeAgent === 'content-generator') ? (
            <Button variant="outline" size="sm" onClick={() => {
              setShowQuestionGenerator(false);
              setShowWebSearch(false);
              setShowLecturePlanner(false);
              setShowStudySupport(false);
              setShowContentGenerator(false);
            }}>
              Back to Agents
            </Button>
          ) : null}
          <Button variant="outline" size="sm">
            <Wand2 className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main content */}
      {showQuestionGenerator && activeAgent === 'question-generation' ? (
        <div className="flex-1 overflow-y-auto">
          <QuestionGenerationPage />
        </div>
      ) : showWebSearch && activeAgent === 'web-search' ? (
        <div className="flex-1 overflow-y-auto">
          <WebSearchPage />
        </div>
      ) : showLecturePlanner && activeAgent === 'lecture-planner' ? (
        <div className="flex-1 overflow-y-auto">
          <LecturePlannerPage />
        </div>
      ) : showStudySupport && activeAgent === 'study-support' ? (
        <div className="flex-1 overflow-y-auto">
          <StudySupportPage />
        </div>
      ) : showContentGenerator && activeAgent === 'content-generator' ? (
        <div className="flex-1 overflow-y-auto">
          <ContentGenerationPage />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - chat list */}
          <div className="w-72 border-r bg-background flex flex-col">
            <div className="p-4">
              <Button className="w-full" variant="outline">
                <span className="mr-2">+</span> New chat
              </Button>
              <div className="relative mt-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search chats..." 
                  className="pl-8" 
                />
              </div>
            </div>
            <Separator />
            <ScrollArea className="flex-1 px-2">
              <div className="py-2 space-y-2">
                <p className="px-2 text-xs font-medium text-muted-foreground">Today</p>
                <Button variant="ghost" className="w-full justify-start font-normal">
                  <div className="h-6 w-6 mr-2 rounded-full bg-primary flex items-center justify-center">
                    <SquarePen className="h-3 w-3 text-primary-foreground" />
                  </div>
                  Lesson Plan for Physics
                </Button>
                
                <Button variant="ghost" className="w-full justify-start font-normal">
                  <div className="h-6 w-6 mr-2 rounded-full bg-primary flex items-center justify-center">
                    <Brain className="h-3 w-3 text-primary-foreground" />
                  </div>
                  Student Behavior Analysis
                </Button>
                
                <p className="mt-4 px-2 text-xs font-medium text-muted-foreground">Yesterday</p>
                <Button variant="ghost" className="w-full justify-start font-normal">
                  <div className="h-6 w-6 mr-2 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
                  Quiz Generation
                </Button>
                
                <Button variant="ghost" className="w-full justify-start font-normal">
                  <div className="h-6 w-6 mr-2 rounded-full bg-primary flex items-center justify-center">
                    <Globe className="h-3 w-3 text-primary-foreground" />
                  </div>
                  Research on Teaching Methods
                </Button>
              </div>
            </ScrollArea>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Agent selector dropdown */}
            <div className="bg-muted/30 p-4 flex justify-center">
              <div className="w-full max-w-xs">
                <Select 
                  value={activeAgent} 
                  onValueChange={setActiveAgent}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      {agents.find(agent => agent.id === activeAgent)?.icon}
                      <span>{agents.find(agent => agent.id === activeAgent)?.name}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          {agent.icon}
                          <span>{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat history */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "max-w-[80%] rounded-lg p-4",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : message.isMarkdown
                            ? "bg-accent/80 border border-accent-foreground/10" 
                            : "bg-accent"
                      )}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.isMarkdown ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown 
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a 
                                    {...props} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline" 
                                  />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul {...props} className="list-disc pl-4 my-2" />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol {...props} className="list-decimal pl-4 my-2" />
                                ),
                                li: ({ node, ...props }) => (
                                  <li {...props} className="mt-1" />
                                ),
                                h1: ({ node, ...props }) => (
                                  <h1 {...props} className="text-lg font-bold mt-3 mb-1" />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 {...props} className="text-md font-bold mt-3 mb-1" />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 {...props} className="font-bold mt-2 mb-1" />
                                ),
                                p: ({ node, ...props }) => (
                                  <p {...props} className="my-1.5" />
                                ),
                                code: ({ className, children, node, ...props }: any) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !match;
                                  return !isInline ? (
                                    <div className="my-2">
                                      <div className="bg-black/70 text-xs text-white px-2 py-1 rounded-t-md">
                                        {match?.[1] || 'Code'}
                                      </div>
                                      <code
                                        className={cn(
                                          "block bg-black/10 dark:bg-black/50 p-2 rounded-b-md overflow-x-auto text-xs",
                                          className
                                        )}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    </div>
                                  ) : (
                                    <code
                                      className="bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded text-xs"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className={cn(
                          "text-xs", 
                          message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center space-x-1">
                            {activeAgent === 'content-generator' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => setShowContentGenerator(true)}
                                    >
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View generated content</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {message.reasoning && message.reasoning.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => toggleReasoning(message.id)}
                                    >
                                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Show reasoning</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {activeAgent === 'web-search' && message.messageId && !message.hasFeedback ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6"
                                        onClick={() => openFeedbackDialog(message.messageId!, 5)}
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This was helpful</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6"
                                        onClick={() => openFeedbackDialog(message.messageId!, 1)}
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This was not helpful</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : message.hasFeedback ? (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Check className="h-3 w-3 mr-1" /> 
                                Feedback submitted
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      
                      {/* Reasoning section */}
                      {showReasoning === message.id && message.reasoning && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t text-xs text-muted-foreground"
                        >
                          <h4 className="font-medium mb-1">Reasoning Process:</h4>
                          <ol className="space-y-1 list-decimal list-inside">
                            {message.reasoning.map((step, idx) => (
                              <li key={idx} className="text-xs">
                                <span className="font-medium">{step.type}:</span> {step.content}
                              </li>
                            ))}
                          </ol>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex space-x-2 p-4 bg-accent rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                    </motion.div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Agent info badge - now positioned more responsively */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
              <div className="flex space-x-2">
                {agents.map(agent => (
                  agent.id === activeAgent && (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center space-x-1 bg-accent p-2 rounded-full shadow-lg"
                    >
                      <div className="rounded-full bg-primary p-1 text-primary-foreground flex items-center justify-center">
                        {agent.icon}
                      </div>
                      <span className="text-xs font-medium">{agent.name} active</span>
                    </motion.div>
                  )
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="grid gap-2">
                    <div className="relative">
                      <Input
                        placeholder={`Message ${agents.find(a => a.id === activeAgent)?.name || 'AI'}...`}
                        className="pr-10 min-h-[56px] py-6"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                      />
                      <div className="absolute right-2 bottom-2">
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!inputValue.trim() || isLoading}
                          className={cn(
                            "rounded-full",
                            !inputValue.trim() ? "text-muted-foreground" : "bg-primary text-primary-foreground"
                          )}
                        >
                          <SendHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right sidebar - Agent functionality (now with better responsive behavior) */}
          <div className="w-64 lg:w-72 border-l hidden md:block">
            <div className="p-4">
              <h3 className="font-semibold mb-2">
                {agents.find(agent => agent.id === activeAgent)?.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {agents.find(agent => agent.id === activeAgent)?.description}
              </p>
              
              {activeAgent === 'content-generator' && (
                <div className="space-y-3">
                  {/* Content Generator section */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowContentGenerator(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Create lesson materials</h4>
                      <p className="text-xs text-muted-foreground">Generate handouts, slides, and resources</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowContentGenerator(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Assignment generator</h4>
                      <p className="text-xs text-muted-foreground">Create custom homework and assignments</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowContentGenerator(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Interactive activities</h4>
                      <p className="text-xs text-muted-foreground">Create engaging class activities</p>
                    </CardContent>
                  </Card>
                  
                  {/* Launch content generator button */}
                  <div className="mt-6">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowContentGenerator(true)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Launch Content Generator
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Create comprehensive educational materials
                    </p>
                  </div>
                </div>
              )}
              
              {activeAgent === 'web-search' && (
                <div className="space-y-3">
                  {/* Web Search section */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowWebSearch(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Academic resources</h4>
                      <p className="text-xs text-muted-foreground">Find journals, papers, and studies</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowWebSearch(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">News and current events</h4>
                      <p className="text-xs text-muted-foreground">Find recent articles on a topic</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowWebSearch(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Educational websites</h4>
                      <p className="text-xs text-muted-foreground">Discover teaching resources online</p>
                    </CardContent>
                  </Card>
                  
                  {/* Launch advanced search button */}
                  <div className="mt-6">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowWebSearch(true)}
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Launch Advanced Search
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Use the advanced interface
                    </p>
                  </div>
                </div>
              )}
              
              {activeAgent === 'smart-counselor' && (
                <div className="space-y-3">
                  {/* Smart Counselor section */}
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Time management advice</h4>
                      <p className="text-xs text-muted-foreground">Get tips for better productivity</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Addressing test anxiety</h4>
                      <p className="text-xs text-muted-foreground">Strategies to reduce stress</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Working with students</h4>
                      <p className="text-xs text-muted-foreground">Support for learning styles</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {activeAgent === 'study-support' && (
                <div className="space-y-3">
                  {/* Study Support section */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowStudySupport(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Mathematics Help</h4>
                      <p className="text-xs text-muted-foreground">Get help with math problems</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowStudySupport(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Computer Science</h4>
                      <p className="text-xs text-muted-foreground">Programming and algorithm assistance</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowStudySupport(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Science Topics</h4>
                      <p className="text-xs text-muted-foreground">Physics, chemistry, biology help</p>
                    </CardContent>
                  </Card>
                  
                  {/* Launch full study support interface */}
                  <div className="mt-6">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowStudySupport(true)}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Launch Study Assistant
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Open dedicated learning interface
                    </p>
                  </div>
                </div>
              )}
              
              {activeAgent === 'question-generation' && !showQuestionGenerator && (
                <div className="space-y-3">
                  {/* Question Generation section */}
                  <Card 
                    onClick={() => setShowQuestionGenerator(true)} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Create quiz questions</h4>
                      <p className="text-xs text-muted-foreground">Generate multiple-choice questions</p>
                    </CardContent>
                  </Card>
                  <Card 
                    onClick={() => setShowQuestionGenerator(true)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Test bank generator</h4>
                      <p className="text-xs text-muted-foreground">Build question banks</p>
                    </CardContent>
                  </Card>
                  <Card 
                    onClick={() => setShowQuestionGenerator(true)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Assessment materials</h4>
                      <p className="text-xs text-muted-foreground">Create varying difficulty exams</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {activeAgent === 'lecture-planner' && (
                <div className="space-y-3">
                  {/* Lecture Planner section */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowLecturePlanner(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Create New Lecture Plan</h4>
                      <p className="text-xs text-muted-foreground">Generate lesson plans</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowLecturePlanner(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Edit Existing Plans</h4>
                      <p className="text-xs text-muted-foreground">Modify lecture plans</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setShowLecturePlanner(true)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">API-Powered Planning</h4>
                      <p className="text-xs text-muted-foreground">Use advanced features</p>
                    </CardContent>
                  </Card>
                  
                  {/* Launch lecture planner button */}
                  <div className="mt-6">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowLecturePlanner(true)}
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Launch Planner
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Use the full interface
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share your feedback</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFeedbackSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>How helpful was this response?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={initialRating.toString()}
                        className="flex space-x-4"
                      >
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <FormItem key={rating} className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                            </FormControl>
                            <Label htmlFor={`rating-${rating}`} className="text-sm cursor-pointer">
                              {rating}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription className="text-xs">
                      1 = Not helpful at all, 5 = Extremely helpful
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="feedbackText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional comments (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What could be improved about this response?"
                        {...field}
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Submit Feedback</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}