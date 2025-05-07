"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  SendHorizontal, 
  MoveLeft, 
  FileText, 
  Download, 
  BookOpen,
  GraduationCap,
  Tag,
  Clock,
  LineChart,
  Sparkles,
  Search,
  CheckCircle,
  ThumbsUp
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

type ContentMetadata = {
  title: string;
  subjectArea: string;
  academicLevel: string;
  keyConcepts: string[];
  sections: string[];
  pageCount: number;
  wordCount: number;
  processingTimeMs: number;
};

type GeneratedContent = {
  markdown: string | null;
  pdfBuffer: string | null;
  metadata: ContentMetadata | null;
  timestamp: string;
  error?: string;
};

const ContentGenerationPage = () => {
  const [topic, setTopic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("preview");
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const academicLevelColors: Record<string, string> = {
    primary: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    secondary: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    undergraduate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    postgraduate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    professional: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
  };

  // Simulate progress during generation
  const startProgressSimulation = () => {
    // Reset progress
    setProgress(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        // Slowly increment, but never reach 100% until complete
        if (prev >= 95) return prev;
        return prev + (Math.random() * 3);
      });
    }, 800);
  };

  const stopProgressSimulation = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setProgress(100);
  };

  const handleGenerateContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedContent(null);
    startProgressSimulation();

    try {
      // Call the API to generate content
      const response = await fetch("/api/content-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setGeneratedContent(data);
      
      toast({
        title: "Content generated successfully",
        description: `Your guide on "${topic}" is ready to download`,
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error generating content:", error);
      
      toast({
        title: "Content generation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      stopProgressSimulation();
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedContent || !generatedContent.pdfBuffer) {
      toast({
        title: "Download failed",
        description: "PDF data is not available",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create a sanitized filename
      const sanitizedTopic = topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const filename = `synapseEd-guide-${sanitizedTopic}.pdf`;
      
      // Convert base64 to Blob
      const byteCharacters = atob(generatedContent.pdfBuffer);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'application/pdf' });
      
      // Create download link
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      
      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not download the PDF",
        variant: "destructive"
      });
    }
  };

  const directDownloadUrl = topic ? `/api/content-generation?topic=${encodeURIComponent(topic)}&format=pdf` : '';

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
          <h1 className="text-xl font-bold">Content Generation</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input and generated content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Input form section */}
          <div className="p-6 border-b">
            <form onSubmit={handleGenerateContent} className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Generate Educational Content</h2>
                <p className="text-muted-foreground">
                  Enter a topic to generate a comprehensive educational guide. The content will be available as a downloadable PDF.
                </p>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Enter a topic (e.g., Quantum Physics, World War II, Machine Learning)"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      className="pr-10 py-6"
                    />
                    {topic && !isGenerating && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-10 top-1/2 transform -translate-y-1/2"
                        onClick={() => setTopic("")}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={!topic.trim() || isGenerating}
                    className={cn(
                      !topic.trim() ? "text-muted-foreground" : "bg-primary text-primary-foreground"
                    )}
                  >
                    {isGenerating ? (
                      <>Generating<span className="ml-2 animate-pulse">...</span></>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Generating content...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </form>
          </div>
          
          {/* Results section */}
          <ScrollArea className="flex-1 p-6">
            {generatedContent ? (
              <div className="max-w-4xl mx-auto">
                <Tabs defaultValue="preview" value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex justify-between items-center mb-4">
                    <TabsList>
                      <TabsTrigger value="preview">
                        <FileText className="h-4 w-4 mr-2" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="metadata">
                        <Tag className="h-4 w-4 mr-2" />
                        Details
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={handleDownloadPdf}
                        disabled={!generatedContent.pdfBuffer}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                  
                  <TabsContent value="preview" className="mt-4">
                    <Card>
                      <CardContent className="p-6">
                        {generatedContent.markdown ? (
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                              {generatedContent.markdown}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Preview is not available for this content.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="metadata" className="mt-4">
                    {generatedContent.metadata ? (
                      <Card>
                        <CardContent className="p-6 space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Content Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Title</p>
                                <p className="font-medium">{generatedContent.metadata.title}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Subject Area</p>
                                <div className="flex items-center">
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {generatedContent.metadata.subjectArea}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Academic Level</p>
                                <div className="flex items-center">
                                  <Badge 
                                    variant="outline" 
                                    className={academicLevelColors[generatedContent.metadata.academicLevel] || "bg-gray-100"}
                                  >
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    {generatedContent.metadata.academicLevel}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Content Statistics</p>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {generatedContent.metadata.pageCount} pages
                                  </Badge>
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                    <LineChart className="h-3 w-3 mr-1" />
                                    {generatedContent.metadata.wordCount} words
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1 col-span-2">
                                <p className="text-sm text-muted-foreground">Generation Time</p>
                                <div className="flex items-center">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {(generatedContent.metadata.processingTimeMs / 1000).toFixed(1)} seconds
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Content Structure</h3>
                            <div className="space-y-2">
                              {generatedContent.metadata.sections.map((section, idx) => (
                                <div key={idx} className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                                    {idx + 1}
                                  </div>
                                  <span>{section}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Key Concepts</h3>
                            <div className="flex flex-wrap gap-2">
                              {generatedContent.metadata.keyConcepts.map((concept, idx) => (
                                <Badge key={idx} variant="outline" className="py-1.5">
                                  <Tag className="h-3 w-3 mr-1.5" />
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6">
                          <p className="text-muted-foreground">
                            Metadata is not available for this content.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : !isGenerating && (
              <div className="max-w-2xl mx-auto text-center py-12">
                <div className="bg-primary/5 p-12 rounded-lg">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6">
                    <Search className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Enter a Topic to Generate Content</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate comprehensive educational content on any topic. The AI will create a structured guide that can be downloaded as a PDF.
                  </p>
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="flex items-center p-2 bg-secondary/20 rounded-md">
                      <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                      <p className="text-sm text-left">Perfect for creating study materials and lesson plans</p>
                    </div>
                    <div className="flex items-center p-2 bg-secondary/20 rounded-md">
                      <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                      <p className="text-sm text-left">Includes key concepts, examples, and structured sections</p>
                    </div>
                    <div className="flex items-center p-2 bg-secondary/20 rounded-md">
                      <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                      <p className="text-sm text-left">Download as beautifully formatted PDF documents</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ContentGenerationPage;