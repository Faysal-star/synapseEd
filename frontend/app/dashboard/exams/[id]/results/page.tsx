'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Award, Clock, Brain, Lightbulb, AlertCircle, ArrowLeft, Loader2, Timer, Eye, BarChart3, User, Trophy } from "lucide-react";

// Types
interface ExamQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  hints: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category?: string;
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

interface ExamResult {
  examData: Exam;
  answers: AnswerState;
  timeRemaining: number;
  totalTime: number;
  submittedAt: string;
}

export default function ExamResultsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const [results, setResults] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  useEffect(() => {
    // In a real app, we would fetch results from the API
    // For now, we'll get them from localStorage where we simulated storing them
    const storedResults = localStorage.getItem(`exam_result_${examId}`);
    
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    }
    
    setLoading(false);
  }, [examId]);
  
  if (loading) {
    return (
      <div className="container py-6 max-w-6xl mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }
  
  if (!results) {
    return (
      <div className="container py-6 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Results Not Found</AlertTitle>
          <AlertDescription>
            Could not load the exam results. Please try again or contact support.
          </AlertDescription>
        </Alert>
        
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => router.push('/dashboard/exams')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
        </Button>
      </div>
    );
  }
  
  // Calculate score and statistics
  const calculateStats = () => {
    const { examData, answers, totalTime } = results;
    
    // Calculate correct answers
    let correctCount = 0;
    let totalHintsUsed = 0;
    let totalPenalty = 0;
    let totalQuestionsAttempted = 0;
    let avgTimePerQuestion = 0;
    
    Object.keys(answers).forEach(questionId => {
      const answer = answers[questionId];
      const question = examData.questions.find(q => q.id === questionId);
      
      if (!question) return;
      
      if (answer.selectedOption) {
        totalQuestionsAttempted++;
        
        if (answer.selectedOption === question.answer) {
          correctCount++;
        }
      }
      
      totalHintsUsed += answer.hintsUsed;
    });
    
    // Calculate raw score
    const rawScore = (correctCount / examData.totalQuestions) * 100;
    
    // Calculate penalty (5% per hint used)
    totalPenalty = totalHintsUsed * 5;
    
    // Calculate final score
    const finalScore = Math.max(0, rawScore - totalPenalty);
    
    // Calculate time metrics
    avgTimePerQuestion = totalQuestionsAttempted > 0 
      ? Math.round((totalTime / totalQuestionsAttempted)) 
      : 0;
    
    return {
      rawScore: Math.round(rawScore),
      totalPenalty,
      finalScore: Math.round(finalScore),
      correctCount,
      totalQuestionsAttempted,
      totalHintsUsed,
      avgTimePerQuestion,
      totalTimeSpent: totalTime,
      passingGrade: finalScore >= 70,
      difficultyBreakdown: {
        easy: examData.questions.filter(q => q.difficulty === 'Easy').length,
        medium: examData.questions.filter(q => q.difficulty === 'Medium').length,
        hard: examData.questions.filter(q => q.difficulty === 'Hard').length
      },
      categoryBreakdown: getCategoryBreakdown(examData.questions)
    };
  };
  
  // Helper function to format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Helper function to get category breakdown
  const getCategoryBreakdown = (questions: ExamQuestion[]) => {
    const categories: Record<string, number> = {};
    
    questions.forEach(question => {
      const category = question.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 1;
      } else {
        categories[category]++;
      }
    });
    
    return categories;
  };
  
  // Get difficulty class for styling
  const getDifficultyClass = (difficulty: string) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Hard': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  
  const stats = calculateStats();
  const { examData, answers, submittedAt } = results;
  
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
            <h1 className="text-2xl font-bold">Exam Results</h1>
            <p className="text-muted-foreground">
              {examData.title} • Completed on {new Date(submittedAt).toLocaleDateString()}
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/exams')}
            className="hidden sm:flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
          </Button>
        </div>
      </motion.div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="overview">Results Overview</TabsTrigger>
          <TabsTrigger value="answers">Question Review</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Score Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`col-span-1 md:col-span-2 ${
              stats.passingGrade 
                ? 'border-green-500/50 dark:border-green-800/50' 
                : 'border-red-500/50 dark:border-red-800/50'
            }`}>
              <CardHeader>
                <CardTitle>Final Score</CardTitle>
                <CardDescription>
                  Your performance on this exam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-6">
                  <div className="relative">
                    <svg className="w-32 h-32">
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="56"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className={`${
                          stats.passingGrade ? 'text-green-500' : 'text-red-500'
                        } stroke-current`}
                        strokeWidth="8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="56"
                        cx="64"
                        cy="64"
                        strokeDasharray={`${stats.finalScore * 3.51} 1000`}
                      />
                    </svg>
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold">
                      {stats.finalScore}%
                    </span>
                  </div>
                  
                  <div className={`mt-4 px-4 py-1 rounded-full font-medium ${
                    stats.passingGrade 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {stats.passingGrade ? 'Passed' : 'Failed'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Score</span>
                      <span className="font-medium">{stats.rawScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hint Penalty</span>
                      <span className="font-medium text-red-500">-{stats.totalPenalty}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Final Score</span>
                      <span className="font-bold">{stats.finalScore}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Correct Answers</span>
                      <span className="font-medium">{stats.correctCount}/{examData.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hints Used</span>
                      <span className="font-medium">{stats.totalHintsUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Time</span>
                      <span className="font-medium">{formatTime(stats.totalTimeSpent)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>
                  Performance breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Timer className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Time per Question</p>
                        <p className="font-medium">{formatTime(stats.avgTimePerQuestion)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Questions Attempted</p>
                        <p className="font-medium">{stats.totalQuestionsAttempted}/{examData.totalQuestions}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hints Used</p>
                        <p className="font-medium">{stats.totalHintsUsed} ({stats.totalPenalty}% penalty)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Performance</p>
                        <p className="font-medium">{stats.finalScore >= 90 ? 'Excellent' : stats.finalScore >= 70 ? 'Good' : 'Needs Improvement'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Question Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Question Difficulty Breakdown</CardTitle>
              <CardDescription>
                Your performance by question difficulty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    type: 'Easy', 
                    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                    count: stats.difficultyBreakdown.easy,
                    bgClass: 'bg-green-100 dark:bg-green-900/30' 
                  },
                  { 
                    type: 'Medium', 
                    icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
                    count: stats.difficultyBreakdown.medium,
                    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30' 
                  },
                  { 
                    type: 'Hard', 
                    icon: <Brain className="h-5 w-5 text-red-500" />,
                    count: stats.difficultyBreakdown.hard,
                    bgClass: 'bg-red-100 dark:bg-red-900/30' 
                  },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className={`p-4 rounded-lg ${item.bgClass}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <h3 className="font-medium">{item.type}</h3>
                      </div>
                      <Badge variant="outline">{item.count} questions</Badge>
                    </div>
                    
                    <div className="mt-4">
                      {/* Calculate per-difficulty stats */}
                      {(() => {
                        let correct = 0;
                        let total = 0;
                        
                        examData.questions.forEach(q => {
                          if (q.difficulty === item.type) {
                            total++;
                            const answer = answers[q.id];
                            if (answer?.selectedOption === q.answer) {
                              correct++;
                            }
                          }
                        });
                        
                        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                        
                        return (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">{correct}/{total} correct</span>
                              <span className="text-sm font-medium">{percentage}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Question Review Tab */}
        <TabsContent value="answers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>
                Review your answers and see detailed explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-8">
                  {examData.questions.map((question, index) => {
                    const answer = answers[question.id];
                    const isCorrect = answer?.selectedOption === question.answer;
                    
                    return (
                      <motion.div
                        key={question.id}
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.1, 2) }}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <div className={`p-4 ${
                            isCorrect 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : answer?.selectedOption 
                                ? 'bg-red-100 dark:bg-red-900/30' 
                                : 'bg-gray-100 dark:bg-gray-900/30'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge variant="outline" className="text-base font-mono">
                                  Question {index + 1}
                                </Badge>
                                <Badge className={`ml-2 ${getDifficultyClass(question.difficulty)}`}>
                                  {question.difficulty}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center">
                                {answer?.selectedOption ? (
                                  isCorrect ? (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Correct
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400">
                                      <XCircle className="h-3 w-3 mr-1" /> Incorrect
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:border-gray-800/50 dark:text-gray-400">
                                    Not Answered
                                  </Badge>
                                )}
                                
                                {answer?.hintsUsed > 0 && (
                                  <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-400">
                                    <Lightbulb className="h-3 w-3 mr-1" /> {answer.hintsUsed} Hint{answer.hintsUsed > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <h3 className="text-lg font-medium mb-4">{question.question}</h3>
                            
                            <div className="space-y-2">
                              {Object.entries(question.options).map(([key, value]) => (
                                <div 
                                  key={key}
                                  className={`p-3 rounded-md border ${
                                    question.answer === key && answer?.selectedOption === key
                                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                      : question.answer === key
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                        : answer?.selectedOption === key
                                          ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                                          : 'border-muted-foreground/20'
                                  }`}
                                >
                                  <div className="flex items-start">
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                                      question.answer === key
                                        ? 'bg-green-500 text-white'
                                        : answer?.selectedOption === key
                                          ? 'bg-red-500 text-white'
                                          : 'bg-muted text-muted-foreground'
                                    }`}>
                                      <span className="text-xs">{key}</span>
                                    </div>
                                    <span>{value}</span>
                                    
                                    {question.answer === key && (
                                      <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Hints Section */}
                            <div className="mt-6 space-y-2">
                              <h4 className="font-medium text-sm">Hints:</h4>
                              <div className="bg-muted/30 p-3 rounded-md">
                                <ul className="space-y-2 list-disc pl-5">
                                  {question.hints.map((hint, i) => (
                                    <li key={i} className={`${i < answer?.hintsUsed ? '' : 'text-muted-foreground'}`}>
                                      {hint}
                                      {i >= answer?.hintsUsed && <span className="text-xs ml-2">(Not used)</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            
                            {/* Answer Statistics */}
                            <div className="mt-6 flex items-center justify-between text-sm">
                              <div>
                                <span className="text-muted-foreground">Time spent: </span>
                                <span className="font-medium">{formatTime(answer?.timeSpent || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
                <CardDescription>
                  How you allocated your time across questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60 flex items-center justify-center">
                  {/* In a real app, this would be a chart */}
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Time distribution chart would appear here</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Longest time on question</span>
                    <span className="font-medium">
                      {(() => {
                        let longestTime = 0;
                        let questionNumber = 0;
                        
                        Object.keys(answers).forEach((questionId, index) => {
                          if (answers[questionId].timeSpent > longestTime) {
                            longestTime = answers[questionId].timeSpent;
                            questionNumber = index + 1;
                          }
                        });
                        
                        return `Q${questionNumber} (${formatTime(longestTime)})`;
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Shortest time on question</span>
                    <span className="font-medium">
                      {(() => {
                        let shortestTime = Infinity;
                        let questionNumber = 0;
                        
                        Object.keys(answers).forEach((questionId, index) => {
                          if (answers[questionId].timeSpent > 0 && answers[questionId].timeSpent < shortestTime) {
                            shortestTime = answers[questionId].timeSpent;
                            questionNumber = index + 1;
                          }
                        });
                        
                        return shortestTime === Infinity 
                          ? 'N/A' 
                          : `Q${questionNumber} (${formatTime(shortestTime)})`;
                      })()}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average time per question</span>
                    <span className="font-medium">{formatTime(stats.avgTimePerQuestion)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Aggregated statistics on your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Accuracy rate</span>
                      <span className="font-medium">
                        {stats.totalQuestionsAttempted > 0 
                          ? Math.round((stats.correctCount / stats.totalQuestionsAttempted) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalQuestionsAttempted > 0 
                        ? (stats.correctCount / stats.totalQuestionsAttempted) * 100
                        : 0} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completion rate</span>
                      <span className="font-medium">
                        {Math.round((stats.totalQuestionsAttempted / examData.totalQuestions) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(stats.totalQuestionsAttempted / examData.totalQuestions) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hint usage</span>
                      <span className="font-medium">
                        {Math.round((stats.totalHintsUsed / (examData.totalQuestions * 3)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(stats.totalHintsUsed / (examData.totalQuestions * 3)) * 100} 
                      className="h-2"
                      indicatorColor="bg-yellow-500" 
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-medium mb-2">Performance by question type</h3>
                    
                    <div className="space-y-4">
                      {['Easy', 'Medium', 'Hard'].map((difficulty) => {
                        let correct = 0;
                        let total = 0;
                        
                        examData.questions.forEach(q => {
                          if (q.difficulty === difficulty) {
                            total++;
                            const answer = answers[q.id];
                            if (answer?.selectedOption === q.answer) {
                              correct++;
                            }
                          }
                        });
                        
                        if (total === 0) return null;
                        
                        return (
                          <div key={difficulty} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span>{difficulty}</span>
                              <span>{correct}/{total} ({total > 0 ? Math.round((correct/total)*100) : 0}%)</span>
                            </div>
                            <Progress 
                              value={total > 0 ? (correct/total)*100 : 0} 
                              className="h-1.5" 
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Based on your performance, here are some areas to focus on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.finalScore < 70 && (
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertTitle>Need improvement</AlertTitle>
                    <AlertDescription>
                      Your score is below the passing grade. Focus on reviewing the material and trying again.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Generate some mock recommendations */}
                {(() => {
                  // Find areas where the student struggled the most
                  const difficultyPerformance: Record<string, {correct: number, total: number}> = {
                    'Easy': {correct: 0, total: 0},
                    'Medium': {correct: 0, total: 0},
                    'Hard': {correct: 0, total: 0}
                  };
                  
                  examData.questions.forEach(q => {
                    const answer = answers[q.id];
                    difficultyPerformance[q.difficulty].total++;
                    if (answer?.selectedOption === q.answer) {
                      difficultyPerformance[q.difficulty].correct++;
                    }
                  });
                  
                  // Calculate performance percentages
                  const performancePercentages: Record<string, number> = {};
                  Object.keys(difficultyPerformance).forEach(difficulty => {
                    const { correct, total } = difficultyPerformance[difficulty];
                    performancePercentages[difficulty] = total > 0 ? (correct / total) * 100 : 100;
                  });
                  
                  // Find weakest area
                  let worstPerformance = 100;
                  let worstArea = '';
                  
                  Object.keys(performancePercentages).forEach(difficulty => {
                    if (performancePercentages[difficulty] < worstPerformance && difficultyPerformance[difficulty].total > 0) {
                      worstPerformance = performancePercentages[difficulty];
                      worstArea = difficulty;
                    }
                  });
                  
                  // Generate recommendations
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {worstArea && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h3 className="font-medium flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" /> 
                            Focus Area
                          </h3>
                          <p className="text-sm mt-2">
                            You should focus on improving your understanding of {worstArea.toLowerCase()} difficulty concepts. 
                            Your performance in this area was {Math.round(worstPerformance)}%.
                          </p>
                        </div>
                      )}
                      
                      {stats.totalHintsUsed > examData.totalQuestions / 2 && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h3 className="font-medium flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" /> 
                            Hint Usage
                          </h3>
                          <p className="text-sm mt-2">
                            You used a significant number of hints ({stats.totalHintsUsed}). 
                            Consider reviewing the core materials to strengthen your understanding.
                          </p>
                        </div>
                      )}
                      
                      {stats.totalQuestionsAttempted < examData.totalQuestions && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h3 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" /> 
                            Time Management
                          </h3>
                          <p className="text-sm mt-2">
                            You didn't attempt all questions. Practice with timed exercises to improve your speed.
                          </p>
                        </div>
                      )}
                      
                      {stats.finalScore >= 90 && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h3 className="font-medium flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" /> 
                            Excellent Performance
                          </h3>
                          <p className="text-sm mt-2">
                            You've demonstrated excellent understanding of the material. 
                            Consider exploring more advanced topics in this area.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/dashboard/exams')} className="w-full">
                Return to Exams
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}