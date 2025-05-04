'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, SendHorizontal, Wand2, Globe, SquarePen, Brain, Sparkles, Lightbulb } from "lucide-react";
import { useRouter } from 'next/navigation';
import QuestionGenerationPage from '@/components/dashboard_pages/ai_agents/question_generation/page';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userType] = useState<'teacher' | 'student'>('teacher'); // Would be from context or props

  // Available agents based on user type
  const agents: AgentType[] = [
    {
      id: 'content-generator',
      name: 'Content Generator',
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Generate dynamic content and teaching materials'
    },
    {
      id: 'web-search',
      name: 'Web Search',
      icon: <Globe className="h-6 w-6" />,
      description: 'Find information and resources from the web'
    },
    {
      id: 'smart-counselor',
      name: 'Smart Counselor',
      icon: <Brain className="h-6 w-6" />,
      description: 'Get guidance on personal and academic challenges'
    },
    {
      id: 'question-generation',
      name: 'Question Generation',
      icon: <Lightbulb className="h-6 w-6" />,
      description: 'Generate quizzes, tests, and assessment materials'
    },
    {
      id: 'lecture-planner',
      name: 'Lecture Planner',
      icon: <SquarePen className="h-6 w-6" />,
      description: 'Create comprehensive lesson plans and activities'
    }
  ];

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

  // Get welcome message based on agent
  const getInitialMessage = (agentId: string) => {
    switch (agentId) {
      case 'content-generator':
        return "I can help you generate lesson content, quizzes, assignments, and other educational materials. What would you like to create today?";
      case 'web-search':
        return "I can search the web for current information and resources. What would you like to know more about?";
      case 'smart-counselor':
        return "How can I help you today? I'm here to discuss any academic or personal challenges you might be facing.";
      case 'lecture-planner':
        return "I'll help you create structured lesson plans tailored to your curriculum. What subject and grade level are you planning for?";
      default:
        return "How can I help you today?";
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
    
    // Simulate API response delay
    setTimeout(() => {
      const agentResponse = generateAgentResponse(activeAgent, inputValue);
      
      const newAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: agentResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAssistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Mock response generation - would be replaced with actual API calls
  const generateAgentResponse = (agentId: string, query: string) => {
    switch (agentId) {
      case 'content-generator':
        return `Here's a draft content based on your request: "${query}"\n\n[Generated content would appear here based on the actual implementation]`;
      case 'web-search':
        return `I searched for information about "${query}"\n\nHere are some relevant results: \n1. [Result 1 description]\n2. [Result 2 description]\n3. [Result 3 description]`;
      case 'smart-counselor':
        return `Thank you for sharing that. Based on what you've told me about "${query}", I would suggest...\n\n[Personalized guidance would appear here]`;
      case 'lecture-planner':
        return `I've created a lesson plan outline for "${query}"\n\n**Lesson Objectives:**\n- Objective 1\n- Objective 2\n\n**Activities:**\n1. Opening activity (10 min)\n2. Main instruction (25 min)\n3. Group work (15 min)\n4. Assessment (10 min)`;
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
          {showQuestionGenerator && activeAgent === 'question-generation' && (
            <Button variant="outline" size="sm" onClick={() => setShowQuestionGenerator(false)}>
              Back to Agents
            </Button>
          )}
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
            <div className="bg-muted/30 p-2 flex items-center justify-center">
              <Tabs defaultValue={activeAgent} onValueChange={setActiveAgent}>
                <TabsList>
                  {agents.map(agent => (
                    <TabsTrigger 
                      key={agent.id} 
                      value={agent.id}
                      className="flex items-center gap-2"
                    >
                      <div className="h-5 w-5">
                        {agent.icon}
                      </div>
                      <span>{agent.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
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
                          : "bg-accent"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={cn(
                        "text-xs mt-2", 
                        message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
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

            {/* Agent info section */}
            <div className="absolute bottom-24 right-6">
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

          {/* Right sidebar - Agent functionality */}
          <div className="w-80 border-l hidden lg:block">
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
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Create lesson materials</h4>
                      <p className="text-xs text-muted-foreground">Generate handouts, slides, and resources</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Assignment generator</h4>
                      <p className="text-xs text-muted-foreground">Create custom homework and assignments</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Interactive activities</h4>
                      <p className="text-xs text-muted-foreground">Create engaging class activities</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {activeAgent === 'web-search' && (
                <div className="space-y-3">
                  {/* Web Search section */}
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Academic resources</h4>
                      <p className="text-xs text-muted-foreground">Find journals, papers, and studies</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">News and current events</h4>
                      <p className="text-xs text-muted-foreground">Find recent articles on a topic</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Educational websites</h4>
                      <p className="text-xs text-muted-foreground">Discover teaching resources online</p>
                    </CardContent>
                  </Card>
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
                      <h4 className="font-medium text-sm">Working with introverted students</h4>
                      <p className="text-xs text-muted-foreground">Support for different learning styles</p>
                    </CardContent>
                  </Card>
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
                      <p className="text-xs text-muted-foreground">Generate multiple-choice and short answer questions</p>
                    </CardContent>
                  </Card>
                  <Card 
                    onClick={() => setShowQuestionGenerator(true)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Test bank generator</h4>
                      <p className="text-xs text-muted-foreground">Build comprehensive question banks</p>
                    </CardContent>
                  </Card>
                  <Card 
                    onClick={() => setShowQuestionGenerator(true)}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Assessment materials</h4>
                      <p className="text-xs text-muted-foreground">Create exams with varying difficulty levels</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {activeAgent === 'lecture-planner' && (
                <div className="space-y-3">
                  {/* Lecture Planner section */}
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Create lesson structure</h4>
                      <p className="text-xs text-muted-foreground">Design organized lesson outlines</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Activity planning</h4>
                      <p className="text-xs text-muted-foreground">Design engaging classroom activities</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm">Curriculum mapping</h4>
                      <p className="text-xs text-muted-foreground">Plan across multiple lessons or units</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}