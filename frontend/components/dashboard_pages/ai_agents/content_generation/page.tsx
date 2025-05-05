'use client';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Brain, FileText, Download, Loader2, CheckCircle, AlertCircle, Trash, Plus, Info, PlusCircle, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ContentSummary {
  title: string;
  sections: string[];
}

interface StatusUpdate {
  job_id: string;
  status: 'connected' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
  filename?: string;
  content_summary?: ContentSummary;
}

export default function PDFGenerationPage() {
  const [socket, setSocket] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [topic, setTopic] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [customSections, setCustomSections] = useState(['Introduction', 'Key Concepts', 'Examples', 'Summary']);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filename, setFilename] = useState('');
  const [contentSummary, setContentSummary] = useState<ContentSummary | null>(null);
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001'); // Note the port is 5001
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });
    
    newSocket.on('status_update', (data: StatusUpdate) => {
      console.log('Status update:', data);
      setStatus(data.status);
      setMessage(data.message);
      if (data.progress) setProgress(data.progress);
      
      if (data.filename) {
        setFilename(data.filename);
      }
      
      if (data.content_summary) {
        setContentSummary(data.content_summary);
      }
      
      // Switch to Results tab when PDF is ready
      if (data.status === 'completed') {
        setActiveTab('results');
      }
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Join the job room when jobId is set
  useEffect(() => {
    if (socket && jobId) {
      socket.emit('join', { job_id: jobId });
    }
  }, [socket, jobId]);
  
  // Handle custom sections
  const addSection = () => {
    setCustomSections([...customSections, '']);
  };
  
  const removeSection = (index: number) => {
    const updated = [...customSections];
    updated.splice(index, 1);
    setCustomSections(updated);
  };
  
  const updateSection = (index: number, value: string) => {
    const updated = [...customSections];
    updated[index] = value;
    setCustomSections(updated);
  };
  
  // Generate PDF function
  const generatePDF = async () => {
    if (!topic) {
      setMessage('Please enter a topic');
      return;
    }
    
    setStatus('processing');
    setMessage('Starting PDF generation...');
    setProgress(0);
    setActiveTab('processing');
    
    try {
      const response = await fetch('http://localhost:5001/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          additional_context: additionalContext,
          sections: customSections.filter(s => s.trim()), // Filter out empty sections
          llm_provider: llmProvider,
          model: model || undefined,
        }),
      });
      
      const data = await response.json();
      if (data.job_id) {
        setJobId(data.job_id);
      } else {
        setStatus('error');
        setMessage('Generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('Generation failed: ' + error.message);
    }
  };
  
  // Download PDF function
  const downloadPDF = () => {
    if (!jobId) return;
    
    window.open(`http://localhost:5001/api/pdf/download/${jobId}`, '_blank');
  };
  
  // Function to get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Brain className="h-6 w-6 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };
  
  return (
    <div className="container py-6 space-y-6 max-w-6xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lecture PDF Generator</h1>
            <p className="text-muted-foreground">Create professional lecture materials from your topics</p>
          </div>
        </div>
      </motion.div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="create">Create PDF</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results">
            Results
            {status === 'completed' && (
              <Badge variant="outline" className="ml-2">Ready</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Create PDF Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Lecture PDF</CardTitle>
              <CardDescription>
                Enter your topic and preferences to generate a professional lecture PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Topic and context section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic" className="text-base font-medium">Topic*</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Introduction to Machine Learning"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="context" className="text-base font-medium">Additional Context</Label>
                  <Textarea
                    id="context"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Provide any specific instructions or focus areas for the lecture"
                    className="mt-2"
                    rows={4}
                  />
                </div>
              </div>
              
              {/* Custom sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Lecture Sections</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addSection}
                    className="flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Section</span>
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {customSections.map((section, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={section}
                        onChange={(e) => updateSection(index, e.target.value)}
                        placeholder={`Section ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(index)}
                        disabled={customSections.length <= 1}
                      >
                        <MinusCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Model configuration section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium">LLM Provider</label>
                  <Select value={llmProvider} onValueChange={setLlmProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Name (optional)</label>
                  <Input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Leave empty for default model"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generatePDF}
                disabled={!topic}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generate PDF</span>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                title: "AI-Powered Content", 
                description: "Create comprehensive lecture materials with AI assistance",
                icon: <Brain className="h-10 w-10 text-primary" />
              },
              { 
                title: "Custom Structure", 
                description: "Define your own sections and organization for the lecture",
                icon: <FileText className="h-10 w-10 text-primary" />
              },
              { 
                title: "Ready to Use", 
                description: "Download professional PDFs ready for classroom distribution",
                icon: <Download className="h-10 w-10 text-primary" />
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="rounded-full bg-primary/10 p-2 w-fit">{feature.icon}</div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
        
        {/* Processing Tab */}
        <TabsContent value="processing">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon()}
                  <div>
                    <CardTitle>Processing PDF</CardTitle>
                    <CardDescription>
                      {topic ? `Topic: ${topic}` : 'Generating your PDF'}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {Math.round(progress)}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar */}
              <Progress value={progress} className="h-2" />
              
              {/* Status message */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{message}</p>
              </div>
              
              {/* Processing steps */}
              <div className="space-y-4">
                {[
                  { label: "Initializing generation", complete: status !== 'idle' },
                  { label: "Processing topic information", complete: progress >= 25 },
                  { label: "Creating lecture content", complete: progress >= 50 },
                  { label: "Formatting PDF document", complete: progress >= 75 },
                  { label: "Finalizing PDF", complete: progress >= 100 }
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`rounded-full w-6 h-6 flex items-center justify-center ${
                      step.complete 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.complete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={step.complete ? 'font-medium' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results">
          <div className="space-y-6">
            {status === 'completed' ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <CardTitle>PDF Generated Successfully</CardTitle>
                      <CardDescription>
                        Your lecture PDF is ready to download
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Content summary */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium text-lg mb-4">
                      {contentSummary?.title || topic}
                    </h3>
                    
                    {contentSummary && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          PDF contains the following sections:
                        </p>
                        <ul className="space-y-1">
                          {contentSummary.sections.map((section, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                {i + 1}
                              </span>
                              {section}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Download button */}
                  <Button
                    onClick={downloadPDF}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </Button>
                </CardContent>
              </Card>
            ) : status === 'error' ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {message || "An error occurred while generating the PDF. Please try again."}
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="p-10 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No PDF generated yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Go to the Create PDF tab to generate a new lecture PDF
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('create')}
                    className="mt-2"
                  >
                    Create PDF
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}