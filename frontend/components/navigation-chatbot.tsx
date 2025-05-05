'use client'
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Loader2,
  ArrowRight,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Message type definition
interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your SynapseED assistant. How can I help you navigate our platform?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  
  // Typing animation state
  const [visibleContent, setVisibleContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // Auto-scroll to the bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, visibleContent]);

  // Typing animation effect
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isTyping) {
      setIsTyping(true);
      setVisibleContent('');
      setCurrentMessageIndex(0);
      
      const content = lastMessage.content;
      const typingInterval = setInterval(() => {
        setCurrentMessageIndex(prev => {
          if (prev < content.length) {
            setVisibleContent(content.substring(0, prev + 1));
            return prev + 1;
          } else {
            clearInterval(typingInterval);
            setIsTyping(false);
            // Update the message to remove the isTyping flag
            setMessages(prevMessages => 
              prevMessages.map((msg, index) => 
                index === messages.length - 1 ? { ...msg, isTyping: false } : msg
              )
            );
            return prev;
          }
        });
      }, 15); // Speed of typing
      
      return () => clearInterval(typingInterval);
    }
  }, [messages]);

  const toggleChatBot = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Add a temporary "thinking" message
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Thinking...', 
      isTyping: true 
    }]);
    
    try {
      // Call the navigation agent API
      const response = await fetch('/api/navigation-chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });
      
      const data = await response.json();
      
      // Replace the "thinking" message with actual response
      if (data.error) {
        setMessages(prev => [
          ...prev.slice(0, -1), 
          { role: 'assistant', content: `Error: ${data.error}`, isTyping: true }
        ]);
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1), 
          { role: 'assistant', content: data.response, isTyping: true }
        ]);
        
        // Check if navigation is required
        if (data.navigate) {
          // Wait a moment before navigating so user can see the response
          setTimeout(() => {
            router.push(data.navigate);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error calling navigation agent:', error);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', isTyping: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Tab button on the right edge - only visible when panel is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40"
          >
            <Button
              onClick={toggleChatBot}
              variant="secondary"
              className="h-40 w-10 rounded-l-lg rounded-r-none shadow-lg bg-gradient-to-b from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
            >
              <div className="flex flex-col items-center justify-center">
                <ChevronLeft size={20} className="text-white" />
                <div className="mt-3 -rotate-90 whitespace-nowrap text-sm font-medium text-white flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  <span>Assistant</span>
                </div>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Slide-out chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[350px] md:w-[400px] z-30 shadow-2xl"
          >
            <Card className="h-full flex flex-col bg-background/95 backdrop-blur-sm border-l border-y border-r-0 border-slate-200/20 dark:border-slate-800/20 rounded-l-2xl rounded-r-none">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex flex-row items-center justify-between gap-2 rounded-tl-2xl">
                <div className="flex items-center gap-2">
                  <div className="bg-white/10 p-1.5 rounded-full">
                    <Bot size={18} className="text-white" />
                  </div>
                  <CardTitle className="text-lg text-white font-medium">
                    SynapseED Assistant
                  </CardTitle>
                </div>
                
                {/* Ghost button to close panel and show the tab button again */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleChatBot}
                  className="h-8 w-8 hover:bg-white/10 text-white"
                  title="Minimize chat"
                >
                  <ArrowRight size={16} />
                </Button>
              </CardHeader>
              
              <ScrollArea className="flex-1 overflow-y-auto">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 flex-shrink-0 mr-2 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center rounded-full shadow-md">
                            <Bot size={16} className="text-white" />
                          </div>
                        )}
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`
                            max-w-[80%] p-3 rounded-2xl
                            ${message.role === 'user' 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-lg'
                              : 'bg-slate-100 dark:bg-slate-800 rounded-tl-none shadow'
                            }
                          `}
                        >
                          {message.role === 'assistant' && message.isTyping && index === messages.length - 1 ? (
                            <>
                              {visibleContent || (
                                <div className="flex items-center gap-1">
                                  <div className="animate-bounce h-2 w-2 bg-current rounded-full" style={{ animationDelay: '0ms' }}></div>
                                  <div className="animate-bounce h-2 w-2 bg-current rounded-full" style={{ animationDelay: '150ms' }}></div>
                                  <div className="animate-bounce h-2 w-2 bg-current rounded-full" style={{ animationDelay: '300ms' }}></div>
                                </div>
                              )}
                            </>
                          ) : (
                            message.content
                          )}
                        </motion.div>
                        
                        {message.role === 'user' && (
                          <div className="w-8 h-8 flex-shrink-0 ml-2 bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center rounded-full">
                            <User size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
              </ScrollArea>
              
              <CardFooter className="border-t p-3 bg-background">
                <form onSubmit={handleSubmit} className="flex w-full gap-2">
                  <Input
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="flex-1 rounded-full border-slate-200 dark:border-slate-700 focus-visible:ring-purple-500"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}