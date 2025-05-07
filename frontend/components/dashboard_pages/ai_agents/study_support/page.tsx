"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  SendHorizontal, BookOpen, MoveLeft, Info, FileText, Link, 
  ThumbsUp, ThumbsDown, GraduationCap, Tag, Activity 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Badge } from "@/components/ui/badge";

type MessageMetadata = {
  subjectArea: string;
  difficultyLevel: string;
  keyTerms: string[];
  processingTimeMs?: number;
};

type ResourceItem = {
  title: string;
  description: string;
  url?: string;
  type: "book" | "article" | "video" | "website" | "practice";
};

type Message = {
  id: string;
  content: string;
  sender: "user" | "bot";
  additionalResources?: ResourceItem[] | null;
  timestamp: string;
  isError?: boolean;
  metadata?: MessageMetadata;
};

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const StudySupportPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your AI Study Support Assistant. Ask me any academic questions and I'll do my best to help you learn.",
      sender: "bot",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeResourcesMessageId, setActiveResourcesMessageId] = useState<string | null>(null);
  const [showResourcesSidebar, setShowResourcesSidebar] = useState<boolean>(false);
  const [showMetadataSidebar, setShowMetadataSidebar] = useState<boolean>(false);
  const [activeMetadataMessageId, setActiveMetadataMessageId] = useState<string | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputMessage.trim() === "" || isLoading) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Send request to the API
      const response = await fetch("/api/study-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from study support API");
      }

      const data = await response.json();

      // Add bot response to chat
      const botMessage: Message = {
        id: Date.now().toString(),
        content: data.answer || "Sorry, I couldn't process that request.",
        sender: "bot",
        additionalResources: data.additionalResources,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      
      // If we have additional resources, show them in the sidebar
      if (botMessage.additionalResources && botMessage.additionalResources.length > 0) {
        setActiveResourcesMessageId(botMessage.id);
        setShowResourcesSidebar(true);
        setShowMetadataSidebar(false);
      }
      // If we have metadata, show that instead
      else if (botMessage.metadata) {
        setActiveMetadataMessageId(botMessage.id);
        setShowMetadataSidebar(true);
        setShowResourcesSidebar(false);
      }
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error in study support chat:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error processing your request. Please try again later.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleResourcesSidebar = (messageId: string) => {
    if (activeResourcesMessageId === messageId && showResourcesSidebar) {
      setShowResourcesSidebar(false);
    } else {
      setActiveResourcesMessageId(messageId);
      setShowResourcesSidebar(true);
      setShowMetadataSidebar(false);
    }
  };

  const toggleMetadataSidebar = (messageId: string) => {
    if (activeMetadataMessageId === messageId && showMetadataSidebar) {
      setShowMetadataSidebar(false);
    } else {
      setActiveMetadataMessageId(messageId);
      setShowMetadataSidebar(true);
      setShowResourcesSidebar(false);
    }
  };

  // Helper function to get resource icon based on type
  const getResourceIcon = (resource: ResourceItem) => {
    switch (resource.type) {
      case 'book':
        return <BookOpen className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Activity className="h-4 w-4" />;
      case 'website':
        return <Link className="h-4 w-4" />;
      case 'practice':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Function to get difficulty color class
  const getDifficultyColor = (level: string) => {
    return difficultyColors[level as keyof typeof difficultyColors] || "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => window.history.back()}
          >
            <MoveLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Study Support</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat history */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 mb-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "max-w-[80%] rounded-lg p-4",
                      message.sender === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : message.isError 
                          ? "bg-destructive/10 border border-destructive/20" 
                          : "bg-accent"
                    )}
                  >
                    {message.sender === "bot" && message.metadata && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        <Badge 
                          variant="outline" 
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 cursor-pointer"
                          onClick={() => toggleMetadataSidebar(message.id)}
                        >
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {message.metadata.subjectArea}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={getDifficultyColor(message.metadata.difficultyLevel)}
                        >
                          {message.metadata.difficultyLevel}
                        </Badge>
                      </div>
                    )}
                  
                    {message.sender === "bot" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(
                        "text-xs",
                        message.sender === "user" 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      )}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {message.sender === "bot" && (
                        <div className="flex items-center space-x-2">
                          {message.metadata && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => toggleMetadataSidebar(message.id)}
                                  >
                                    <Tag className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Show subject details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {message.additionalResources && message.additionalResources.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => toggleResourcesSidebar(message.id)}
                                  >
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Show learning resources</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
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
                                >
                                  <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This was not helpful</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              ))}
              
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
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1">
                <div className="grid gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Ask me any academic question..."
                      className="pr-10 min-h-[56px] py-6"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                    <div className="absolute right-2 bottom-2">
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!inputMessage.trim() || isLoading}
                        className={cn(
                          "rounded-full",
                          !inputMessage.trim() ? "text-muted-foreground" : "bg-primary text-primary-foreground"
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

        {/* Resources Sidebar */}
        {showResourcesSidebar && (
          <div className="w-80 border-l bg-slate-50 dark:bg-slate-900/30 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Learning Resources</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowResourcesSidebar(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="space-y-2">
                  {(() => {
                    // Find the active message
                    const activeMessage = messages.find(msg => msg.id === activeResourcesMessageId);
                    if (!activeMessage || !activeMessage.additionalResources || activeMessage.additionalResources.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground p-3">
                          No additional resources available for this response.
                        </div>
                      );
                    }
                    
                    return activeMessage.additionalResources.map((resource, idx) => (
                      <Card key={idx} className="overflow-hidden hover:bg-accent transition-colors">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-accent rounded-full">
                              {getResourceIcon(resource)}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">
                                {resource.title || (resource.url && resource.url.length > 50 
                                  ? resource.url.substring(0, 50) + '...' 
                                  : resource.url || "Resource")}
                              </h4>
                              {resource.description && (
                                <p className="text-xs text-muted-foreground">
                                  {resource.description.length > 60 
                                    ? resource.description.substring(0, 60) + '...' 
                                    : resource.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {resource.url && (
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Link className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Metadata Sidebar */}
        {showMetadataSidebar && (
          <div className="w-80 border-l bg-slate-50 dark:bg-slate-900/30 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Question Analysis</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMetadataSidebar(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                {(() => {
                  // Find the active message
                  const activeMessage = messages.find(msg => msg.id === activeMetadataMessageId);
                  if (!activeMessage || !activeMessage.metadata) {
                    return (
                      <div className="text-sm text-muted-foreground p-3">
                        No analysis available for this question.
                      </div>
                    );
                  }
                  
                  const { subjectArea, difficultyLevel, keyTerms, processingTimeMs } = activeMessage.metadata;
                  
                  return (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Subject Area</h4>
                        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-3 py-1.5 rounded-md flex items-center">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          <span>{subjectArea}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Difficulty Level</h4>
                        <div className={`px-3 py-1.5 rounded-md flex items-center ${getDifficultyColor(difficultyLevel)}`}>
                          <Activity className="h-4 w-4 mr-2" />
                          <span className="capitalize">{difficultyLevel}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Concepts</h4>
                        {keyTerms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {keyTerms.map((term, idx) => (
                              <Badge key={idx} variant="secondary" className="py-1">
                                <Tag className="h-3 w-3 mr-1.5" />
                                {term}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No key terms identified</div>
                        )}
                      </div>
                      
                      {processingTimeMs && (
                        <div className="pt-2 text-xs text-muted-foreground">
                          Processed in {(processingTimeMs / 1000).toFixed(2)} seconds
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudySupportPage;