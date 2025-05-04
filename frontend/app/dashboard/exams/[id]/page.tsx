'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertCircle, HelpCircle, CheckCircle, ChevronLeft, ChevronRight, Flag } from "lucide-react";

// Types
interface ExamQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  hints: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  difficulty: string;
  questions: ExamQuestion[];
}

interface AnswerState {
  [questionId: string]: {
    selectedOption?: string;
    hintsUsed: number;
    flagged: boolean;
    timeSpent: number; // in seconds
  };
}

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isExamEnding, setIsExamEnding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Navigation state
  const [showNavigator, setShowNavigator] = useState(false);
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const slideIn = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  };

  useEffect(() => {
    async function fetchExamData() {
      try {
        // In a real app this would be a fetch to your API
        // For now we'll simulate loading the exam data
        const questionsResponse = await fetch('/api/question');
        const questionsData = await questionsResponse.json();

        // Simulate finding the exam by ID
        const mockExam: Exam = {
          id: examId,
          title: 'Rice Grain Quality Assessment',
          description: 'This exam tests knowledge on rice grain quality detection using ensemble approaches',
          duration: 30, // 30 minutes
          totalQuestions: questionsData.length,
          difficulty: 'Mixed',
          questions: questionsData
        };
        
        setExam(mockExam);
        setTimeLeft(mockExam.duration * 60); // Convert minutes to seconds
        
        // Initialize answer state for all questions
        const initialAnswerState: AnswerState = {};
        mockExam.questions.forEach(q => {
          initialAnswerState[q.id] = {
            selectedOption: undefined,
            hintsUsed: 0,
            flagged: false,
            timeSpent: 0
          };
        });
        setAnswerState(initialAnswerState);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading exam:', error);
        setLoading(false);
      }
    }
    
    fetchExamData();
  }, [examId]);

  // Timer effect
  useEffect(() => {
    if (!exam || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });

      // Update time spent on current question
      setAnswerState(prev => {
        const currentQuestion = exam.questions[currentQuestionIndex];
        if (!currentQuestion) return prev;
        
        return {
          ...prev,
          [currentQuestion.id]: {
            ...prev[currentQuestion.id],
            timeSpent: prev[currentQuestion.id].timeSpent + 1
          }
        };
      });
      
      // Show warning when 5 minutes left
      if (timeLeft === 300) {
        setIsExamEnding(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, exam, currentQuestionIndex]);

  // Handle time up
  const handleTimeUp = () => {
    handleSubmitExam();
  };

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate exam progress
  const calculateProgress = () => {
    if (!exam) return 0;
    const answeredCount = Object.values(answerState).filter(a => a.selectedOption).length;
    return (answeredCount / exam.totalQuestions) * 100;
  };

  // Handle option selection
  const handleSelectOption = (questionId: string, option: string) => {
    setAnswerState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOption: option
      }
    }));
  };

  // Handle showing a hint
  const handleShowHint = (questionId: string) => {
    // Only increment hints used the first time a new hint is viewed
    const currentHintsUsed = answerState[questionId].hintsUsed;
    const maxHints = exam?.questions.find(q => q.id === questionId)?.hints.length || 0;
    
    if (currentHintsUsed < maxHints) {
      setAnswerState(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          hintsUsed: currentHintsUsed + 1
        }
      }));
    }
    
    setShowHint(true);
  };

  // Handle flagging a question
  const handleFlagQuestion = (questionId: string) => {
    setAnswerState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        flagged: !prev[questionId].flagged
      }
    }));
  };

  // Navigation functions
  const goToNextQuestion = () => {
    if (!exam) return;
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowHint(false);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowHint(false);
    }
  };

  const goToQuestion = (index: number) => {
    if (!exam || index < 0 || index >= exam.questions.length) return;
    setCurrentQuestionIndex(index);
    setShowNavigator(false);
    setShowHint(false);
  };

  // Submit exam
  const handleSubmitExam = () => {
    // In a real application, you would send the answers to your API here
    // For now, we'll just redirect to the results page
    
    // Calculate results
    const results = {
      examId,
      answers: answerState,
      timeRemaining: timeLeft,
      totalTime: exam?.duration ? exam.duration * 60 - timeLeft : 0,
      submittedAt: new Date().toISOString()
    };
    
    // In a real app, you would post this data to your backend
    console.log('Submitting exam results:', results);
    
    // Use localStorage to simulate storing results for the results page
    localStorage.setItem(`exam_result_${examId}`, JSON.stringify({
      examData: exam,
      answers: answerState,
      timeRemaining: timeLeft,
      totalTime: exam?.duration ? exam.duration * 60 - timeLeft : 0,
      submittedAt: new Date().toISOString()
    }));
    
    // Navigate to results page
    router.push(`/dashboard/exams/${examId}/results`);
  };

  // Calculate current question number for display
  const currentQuestionNumber = currentQuestionIndex + 1;
  const currentQuestion = exam?.questions?.[currentQuestionIndex];

  if (loading) {
    return (
      <div className="container py-6 max-w-6xl mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container py-6 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load the exam. Please try again or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 max-w-6xl mx-auto">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 bg-background pt-2 pb-4 border-b mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold truncate">{exam.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{exam.difficulty}</Badge>
              <Badge>{exam.totalQuestions} Questions</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`p-2 rounded-md flex items-center gap-2 ${
              timeLeft < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                : 'bg-muted'
            }`}>
              <Clock className={`h-4 w-4 ${timeLeft < 300 ? 'text-red-600 dark:text-red-400' : ''}`} />
              <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
            </div>
            
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium">
                {Math.round(calculateProgress())}%
              </span>
              <Progress value={calculateProgress()} className="w-24 h-2" />
            </div>
            
            {/* Submit button */}
            <Button 
              variant="destructive"
              onClick={() => setConfirmSubmit(true)}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Mobile progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm">{Math.round(calculateProgress())}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-2" />
      </div>
      
      {/* Main Question Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Content */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-base font-mono">
                  {currentQuestionNumber}/{exam.totalQuestions}
                </Badge>
                <Badge className={`${
                  currentQuestion?.difficulty === 'Easy' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : currentQuestion?.difficulty === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {currentQuestion?.difficulty}
                </Badge>
                {answerState[currentQuestion?.id]?.flagged && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    <span>Flagged</span>
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleFlagQuestion(currentQuestion.id)}
                  className={`${answerState[currentQuestion?.id]?.flagged ? 'text-destructive' : ''}`}
                >
                  <Flag className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowNavigator(!showNavigator)}
                >
                  <span className="sr-only">Show navigation</span>
                  {currentQuestionNumber}/{exam.totalQuestions}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={slideIn}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-medium mb-6">{currentQuestion?.question}</h2>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(currentQuestion?.options || {}).map(([key, value]) => (
                        <div 
                          key={key}
                          className={`relative p-4 rounded-md cursor-pointer border transition-colors ${
                            answerState[currentQuestion?.id]?.selectedOption === key
                              ? 'border-primary bg-primary/5'
                              : 'border-muted-foreground/20 hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectOption(currentQuestion.id, key)}
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                              answerState[currentQuestion?.id]?.selectedOption === key 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <span className="text-xs">{key}</span>
                            </div>
                            <span>{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Hint Section */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground flex items-center gap-1"
                        onClick={() => handleShowHint(currentQuestion.id)}
                        disabled={
                          answerState[currentQuestion.id]?.hintsUsed >= 
                          (currentQuestion?.hints?.length || 0)
                        }
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span>
                          {answerState[currentQuestion.id]?.hintsUsed > 0 
                            ? `Hint ${answerState[currentQuestion.id]?.hintsUsed}/${currentQuestion?.hints?.length}` 
                            : 'Use a hint'}
                        </span>
                      </Button>
                      
                      {answerState[currentQuestion.id]?.hintsUsed > 0 && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          {answerState[currentQuestion.id]?.hintsUsed * 5}% Penalty
                        </Badge>
                      )}
                    </div>
                    
                    {showHint && answerState[currentQuestion.id]?.hintsUsed > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 bg-muted/40 p-4 rounded-md border border-muted"
                      >
                        <p className="text-sm">
                          <span className="font-medium">Hint {answerState[currentQuestion.id].hintsUsed}:</span>{' '}
                          {currentQuestion?.hints[answerState[currentQuestion.id].hintsUsed - 1]}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <CardFooter className="border-t flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            
            <Button
              variant="outline"
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === exam.questions.length - 1}
              className="flex items-center gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        {/* Question navigator panel */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((question, index) => {
                  const isAnswered = !!answerState[question.id]?.selectedOption;
                  const isFlagged = answerState[question.id]?.flagged;
                  const isActive = index === currentQuestionIndex;
                  
                  return (
                    <Button
                      key={question.id}
                      variant="outline"
                      size="icon"
                      className={`w-full h-10 relative ${
                        isActive 
                          ? 'border-primary border-2' 
                          : isAnswered 
                            ? 'bg-primary/10' 
                            : ''
                      }`}
                      onClick={() => goToQuestion(index)}
                    >
                      <span>{index + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                      )}
                      {isAnswered && (
                        <CheckCircle className="absolute bottom-0 right-0 w-3 h-3 text-primary" />
                      )}
                    </Button>
                  );
                })}
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 bg-primary/10 border border-primary/50 rounded-sm"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 border border-muted rounded-sm"></div>
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="relative h-3 w-3 border border-muted rounded-sm">
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"></span>
                  </div>
                  <span>Flagged</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Answered:</span>
                  <span>
                    {Object.values(answerState).filter(a => a.selectedOption).length}/{exam.totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Unanswered:</span>
                  <span>
                    {exam.totalQuestions - Object.values(answerState).filter(a => a.selectedOption).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Flagged:</span>
                  <span>
                    {Object.values(answerState).filter(a => a.flagged).length}
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4"
                variant="destructive"
                onClick={() => setConfirmSubmit(true)}
              >
                Submit Exam
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile Question Navigator Dialog */}
        {showNavigator && (
          <Dialog open={showNavigator} onOpenChange={setShowNavigator}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Question Navigator</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="grid grid-cols-5 gap-2">
                  {exam.questions.map((question, index) => {
                    const isAnswered = !!answerState[question.id]?.selectedOption;
                    const isFlagged = answerState[question.id]?.flagged;
                    const isActive = index === currentQuestionIndex;
                    
                    return (
                      <Button
                        key={question.id}
                        variant="outline"
                        size="icon"
                        className={`w-full h-10 relative ${
                          isActive 
                            ? 'border-primary border-2' 
                            : isAnswered 
                              ? 'bg-primary/10' 
                              : ''
                        }`}
                        onClick={() => goToQuestion(index)}
                      >
                        <span>{index + 1}</span>
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                        )}
                        {isAnswered && (
                          <CheckCircle className="absolute bottom-0 right-0 w-3 h-3 text-primary" />
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Answered:</span>
                    <span>
                      {Object.values(answerState).filter(a => a.selectedOption).length}/{exam.totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Unanswered:</span>
                    <span>
                      {exam.totalQuestions - Object.values(answerState).filter(a => a.selectedOption).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Flagged:</span>
                    <span>
                      {Object.values(answerState).filter(a => a.flagged).length}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowNavigator(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Confirm Submit Dialog */}
        <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Exam?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4">
                Are you sure you want to submit your exam? This action cannot be undone.
              </p>
              
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Answered Questions</p>
                      <p className="font-medium">
                        {Object.values(answerState).filter(a => a.selectedOption).length}/{exam.totalQuestions}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Time</p>
                      <p className="font-medium">{formatTime(timeLeft)}</p>
                    </div>
                  </div>
                </div>
                
                {Object.values(answerState).filter(a => a.selectedOption).length < exam.totalQuestions && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      You have {exam.totalQuestions - Object.values(answerState).filter(a => a.selectedOption).length} unanswered questions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setConfirmSubmit(false)}>
                Go Back
              </Button>
              <Button variant="destructive" onClick={handleSubmitExam}>
                Submit Exam
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Time Warning Dialog */}
        <Dialog open={isExamEnding} onOpenChange={setIsExamEnding}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Time is running out!</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  You have less than 5 minutes remaining to complete the exam.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsExamEnding(false)}>
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}