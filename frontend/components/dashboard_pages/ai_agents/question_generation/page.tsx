'use client';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { Upload, FileType, CheckCircle, AlertCircle, FileQuestion, Download, Book, Brain, Save, CheckSquare, XSquare, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Types
interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hints: string[];
  approved?: boolean;
  category?: string;
}

export default function QuestionGenerationPage() {
  const [socket, setSocket] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [approvedQuestions, setApprovedQuestions] = useState<Question[]>([]);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [questionsPerChunk, setQuestionsPerChunk] = useState(3);
  const [activeTab, setActiveTab] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });
    
    newSocket.on('status_update', (data) => {
      console.log('Status update:', data);
      setStatus(data.status);
      setMessage(data.message);
      if (data.progress) setProgress(data.progress);
      if (data.questions) {
        // Add an approved flag to each question
        const questionsWithApproval = data.questions.map((q: Question) => ({
          ...q,
          id: q.id || `q-${Math.random().toString(36).substring(2, 9)}`,
          approved: true // Default to approved
        }));
        setQuestions(questionsWithApproval);
      }
      
      // Switch to Results tab when questions are ready
      if (data.questions && data.questions.length > 0) {
        setActiveTab('results');
      }
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Effect for select all checkbox
  useEffect(() => {
    if (questions.length > 0) {
      const allSelected = questions.every(q => q.approved);
      setSelectAll(allSelected);
    }
  }, [questions]);
  
  // Join the job room when jobId is set
  useEffect(() => {
    if (socket && jobId) {
      socket.emit('join', { job_id: jobId });
    }
  }, [socket, jobId]);

  // Update approved questions when questions change
  useEffect(() => {
    const approved = questions.filter(q => q.approved);
    setApprovedQuestions(approved);
  }, [questions]);
  
  // File upload handler with react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setFileName(acceptedFiles[0].name);
        uploadFile(acceptedFiles[0]);
      }
    }
  });
  
  // Upload the file to the server
  const uploadFile = async (file) => {
    setStatus('uploading');
    setMessage('Uploading file...');
    setProgress(0);
    setQuestions([]);
    setActiveTab('processing');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('llm_provider', llmProvider);
    formData.append('model', model);
    formData.append('questions_per_chunk', questionsPerChunk);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/q-gen/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setStatus('processing');
      } else {
        setStatus('error');
        setMessage('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('Upload failed: ' + error.message);
    }
  };
  
  // Toggle question approval
  const toggleApproval = (id: string) => {
    setQuestions(prev => 
      prev.map(q => 
        q.id === id ? { ...q, approved: !q.approved } : q
      )
    );
  };
  
  // Toggle select all questions
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setQuestions(prev => 
      prev.map(q => ({ ...q, approved: newSelectAll }))
    );
  };
  
  // Filter questions based on difficulty and approval status
  const filteredQuestions = questions.filter(q => {
    if (showApprovedOnly && !q.approved) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });
  
  // Download generated questions as JSON
  const downloadQuestions = () => {
    const dataToDownload = showApprovedOnly ? approvedQuestions : questions;
    const json = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'generated_questions.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Save approved questions
  const saveApprovedQuestions = async () => {
    setIsSaving(true);
    
    // Simulate saving to server
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, you would send the data to your backend
    // const response = await fetch('http://localhost:5000/api/save-questions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ questions: approvedQuestions }),
    // });
    
    setIsSaving(false);
    // Show success message or handle response
  };
  
  // Function to get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Brain className="h-6 w-6 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <FileQuestion className="h-6 w-6 text-gray-500" />;
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
            <h1 className="text-2xl font-bold">Question Generator</h1>
            <p className="text-muted-foreground">Generate and review multiple-choice questions from PDF documents</p>
          </div>
        </div>
      </motion.div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results">
            Results
            {approvedQuestions.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {approvedQuestions.length} Approved
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Upload Document Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF Document</CardTitle>
              <CardDescription>
                Upload a PDF document to generate multiple-choice questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model configuration section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Questions Per Chunk</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={questionsPerChunk}
                    onChange={(e) => setQuestionsPerChunk(parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`mt-6 border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-lg font-medium">Drag & drop your PDF file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse for a file
                    </p>
                  </div>
                  <Button variant="outline" type="button" className="mt-4">
                    Select File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                title: "Auto-Generated Questions", 
                description: "The system automatically analyzes content and generates relevant questions",
                icon: <Brain className="h-10 w-10 text-primary" />
              },
              { 
                title: "Multiple Choice Format", 
                description: "Questions include distractors and hints to support learning",
                icon: <FileQuestion className="h-10 w-10 text-primary" />
              },
              { 
                title: "Review & Approve", 
                description: "Review and select which questions to include in your assessments",
                icon: <CheckSquare className="h-10 w-10 text-primary" />
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
                    <CardTitle>Processing Document</CardTitle>
                    <CardDescription>
                      {fileName ? `File: ${fileName}` : 'Processing your document'}
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
                  { label: "Uploading document", complete: status !== 'idle' },
                  { label: "Processing text content", complete: progress >= 25 },
                  { label: "Generating questions", complete: progress >= 50 },
                  { label: "Creating answer options", complete: progress >= 75 },
                  { label: "Finalizing results", complete: progress >= 100 }
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
            {/* Controls and header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                Generated Questions ({filteredQuestions.length})
              </h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterDifficulty(null)}>
                      All Difficulties
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterDifficulty('Easy')}>
                      Easy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterDifficulty('Medium')}>
                      Medium
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterDifficulty('Hard')}>
                      Hard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Approved only switch */}
                <div className="flex items-center space-x-2">
                  <Label htmlFor="approved-only" className="text-sm">Approved only</Label>
                  <Switch
                    id="approved-only"
                    checked={showApprovedOnly}
                    onCheckedChange={setShowApprovedOnly}
                  />
                </div>
                
                {/* Download button */}
                <Button 
                  onClick={downloadQuestions}
                  disabled={questions.length === 0}
                  size="sm"
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  <span>Download JSON</span>
                </Button>
                
                {/* Save button */}
                <Button 
                  onClick={saveApprovedQuestions}
                  disabled={approvedQuestions.length === 0 || isSaving}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Approved</span>
                </Button>
              </div>
            </div>
            
            {questions.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <FileQuestion className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No questions generated yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a document to generate questions
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('upload')}
                    className="mt-2"
                  >
                    Upload Document
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Select all checkbox */}
                <div className="flex items-center space-x-2 mb-4 bg-muted/30 p-3 rounded-md">
                  <Checkbox 
                    id="select-all" 
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">Select all questions</Label>
                </div>
                
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-6">
                    {filteredQuestions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.1, 2) }}
                      >
                        <Card className={`bg-card overflow-hidden border-l-4 ${
                          question.approved ? 'border-l-green-500' : 'border-l-gray-300'
                        }`}>
                          <CardHeader className="bg-muted/30">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <Checkbox 
                                  checked={question.approved}
                                  onCheckedChange={() => toggleApproval(question.id)}
                                  id={`question-${question.id}`}
                                />
                                <Label htmlFor={`question-${question.id}`} className="text-lg font-semibold">
                                  Question {index + 1}
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  question.difficulty === 'Easy' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : question.difficulty === 'Medium'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {question.difficulty}
                                </div>
                                {question.approved ? (
                                  <div className="flex items-center text-green-600 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Approved</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-gray-400 text-xs gap-1">
                                    <XSquare className="h-3 w-3" />
                                    <span>Not approved</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-6">
                              <div>
                                <p className="font-medium mb-4">{question.question}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {Object.entries(question.options).map(([key, value]) => (
                                    <div 
                                      key={key}
                                      className={`flex items-start p-3 rounded-md border ${
                                        question.answer === key 
                                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                                          : 'border-border'
                                      }`}
                                    >
                                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                                        question.answer === key 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        <span className="text-xs">{key}</span>
                                      </div>
                                      <span>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="bg-muted/30 p-4 rounded-md">
                                <h4 className="font-medium mb-2">Hints:</h4>
                                <ul className="space-y-1 list-disc pl-5">
                                  {question.hints.map((hint, i) => (
                                    <li key={i} className="text-muted-foreground text-sm">{hint}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-end border-t bg-muted/20 py-2">
                            <div className="flex gap-2">
                              <Button 
                                variant={question.approved ? "outline" : "default"}
                                size="sm" 
                                onClick={() => toggleApproval(question.id)}
                                className="flex items-center gap-2"
                              >
                                {question.approved ? (
                                  <>
                                    <XSquare className="h-4 w-4" />
                                    <span>Reject</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare className="h-4 w-4" />
                                    <span>Approve</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}