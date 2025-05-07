'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, SendHorizontal, ThumbsUp, ThumbsDown, Info, MoveLeft, Brain, Check, Globe, ExternalLink, FileText, Book, Image, Video, ChevronRight } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string; // For feedback purposes
  reasoning?: ReasoningStep[];
  isError?: boolean;
  hasFeedback?: boolean; // Track if feedback was given
  searched_websites?: string[]; // Add this field for websites
}

interface ReasoningStep {
  type: string;
  content: string;
}

interface MemoryStats {
  stats: any;
  user_profile: any;
  topics: string[];
  main_memory_size: number;
  external_memory_size: number;
  attention_sinks: number;
}

// Feedback form schema
const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  feedbackText: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function WebSearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(`websearch-${Date.now()}`);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [showMemoryStats, setShowMemoryStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [initialRating, setInitialRating] = useState<number>(3);

  // Create form
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 3,
      feedbackText: '',
    },
  });

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting message
  useEffect(() => {
    const initialMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant' as const,
      content: "I can search the web for current information and resources. What would you like to know more about?",
      timestamp: new Date()
    };

    setMessages([initialMessage]);
  }, []);

  // Add state to track the current message whose sources are being shown
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the backend API - using the direct URL approach like in question_generation
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/web-search/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          conversation_id: conversationId,
          context: {
            agent_type: 'web_search',
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Add assistant message with searched_websites
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        messageId: data.message_id,
        reasoning: data.reasoning,
        searched_websites: data.searched_websites || [] // Store searched websites
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set this message as active to show its sources in the sidebar
      setActiveMessageId(assistantMessage.id);

      // Update conversation ID if this is the first message
      if (!conversationId || conversationId.startsWith('websearch-')) {
        setConversationId(data.conversation_id);
      }

      // Fetch memory stats after receiving response
      fetchMemoryStats(data.conversation_id);

    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, but I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemoryStats = async (convoId: string) => {
    try {
      // Use the same backend URL approach as in handleSendMessage
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Fix the URL to match the correct backend endpoint
      const response = await fetch(`${backendUrl}/api/web-search/memory-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: convoId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMemoryStats(data);

    } catch (error) {
      console.error('Error fetching memory stats:', error);
      toast({
        title: "Warning",
        description: "Could not fetch memory statistics",
        variant: "default"
      });
    }
  };

  const submitFeedback = async (messageId: string, rating: number, feedbackText = '') => {
    try {
      // Use the same backend URL approach as in handleSendMessage
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/web-search/feedback`, {
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

  const toggleReasoning = (messageId: string) => {
    if (showReasoning === messageId) {
      setShowReasoning(null);
    } else {
      setShowReasoning(messageId);
    }
  };

  // Helper function to get website icon based on URL
  const getWebsiteIcon = (url: string) => {
    if (url.includes('wikipedia.org')) return <Book className="h-4 w-4" />;
    if (url.includes('khanacademy.org')) return <FileText className="h-4 w-4" />;
    if (url.includes('youtube.com') || url.includes('vimeo.com')) return <Video className="h-4 w-4" />;
    if (url.includes('flickr.com') || url.includes('.jpg') || url.includes('.png')) return <Image className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  // Helper function to get domain name from URL
  const getDomainName = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch (error) {
      return url;
    }
  };

  // Helper function to get page title from URL
  const getPageTitle = (url: string) => {
    const domain = getDomainName(url);

    // Extract the last path segment as title if available
    try {
      const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1]
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\.[^/.]+$/, '') // Remove file extension
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        if (lastSegment) return lastSegment;
      }
    } catch (error) {
      // Fallback to domain
    }

    return domain;
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
          <h1 className="text-xl font-bold">Web Search</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMemoryStats(!showMemoryStats)}
          >
            <Brain className="mr-2 h-4 w-4" />
            Memory Stats
          </Button>
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
                        : message.isError
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-accent"
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}

                    <div className="text-xs mt-2 flex items-center justify-between">
                      <span className={cn(
                        message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {message.role === 'assistant' && message.messageId && !message.isError && (
                        <div className="flex items-center space-x-2">
                          {/* Add Sources button if we have searched websites */}
                          {message.searched_websites && message.searched_websites.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setActiveMessageId(activeMessageId === message.id ? null : message.id)}
                                  >
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Show sources</p>
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

                          {!message.hasFeedback ? (
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
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              Feedback submitted
                            </span>
                          )}
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
                      placeholder="Search the web for information..."
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

        {/* Website Sources Sidebar - conditionally rendered */}
        {activeMessageId && (
          <div className="w-80 border-l bg-slate-50 dark:bg-slate-900/30 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Sources</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMessageId(null)}
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
                    const activeMessage = messages.find(msg => msg.id === activeMessageId);
                    console.log("Active message:", activeMessage); // Debug logging

                    if (!activeMessage) {
                      return (
                        <div className="text-sm text-muted-foreground p-3">
                          No sources available for this response.
                        </div>
                      );
                    }

                    const websites = activeMessage.searched_websites || [];
                    console.log("Websites:", websites); // Debug logging

                    if (websites.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground p-3">
                          No sources available for this response.
                        </div>
                      );
                    }

                    return websites.map((website, idx) => (
                      <Card key={idx} className="overflow-hidden hover:bg-accent transition-colors">
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-accent rounded-full">
                                {getWebsiteIcon(website)}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm truncate max-w-[180px]">
                                  {getPageTitle(website)}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {getDomainName(website)}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </a>
                      </Card>
                    ));
                  })()}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Memory stats sidebar - conditionally rendered */}
        {showMemoryStats && (
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Memory Statistics</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMemoryStats(false)}
                >
                  ✕
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4">
                {memoryStats ? (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-2">Conversation Summary</h4>
                        <div className="space-y-1 text-xs">
                          <p><span className="font-medium">Main memory:</span> {memoryStats.main_memory_size} exchanges</p>
                          <p><span className="font-medium">External memory:</span> {memoryStats.external_memory_size} exchanges</p>
                          <p><span className="font-medium">Attention sinks:</span> {memoryStats.attention_sinks} items</p>
                        </div>
                      </CardContent>
                    </Card>

                    {memoryStats.topics.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm mb-2">Knowledge Topics</h4>
                          <div className="flex flex-wrap gap-1">
                            {memoryStats.topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-accent px-2 py-1 rounded-full"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {Object.keys(memoryStats.user_profile).length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm mb-2">User Profile</h4>
                          <div className="space-y-1 text-xs">
                            {Object.entries(memoryStats.user_profile).map(([key, value], idx) => (
                              <p key={idx}>
                                <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {
                                  Array.isArray(value)
                                    ? value.join(', ')
                                    : String(value)
                                }
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

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