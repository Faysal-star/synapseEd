'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Calendar, Clock, Brain, BookOpen, Clock3, CheckCircle } from "lucide-react";

// Types
interface ExamQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  hints: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  approved?: boolean;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'running' | 'completed';
  score?: number;
  completed?: boolean;
  progress?: number;
  questions?: ExamQuestion[];
}

export default function ExamsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('running');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Fetch exams on component mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        // In a real application, this would fetch from your API
        // For now, we'll use mock data
        
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        // Mock exam data
        const mockExams: Exam[] = [
          {
            id: 'exam-1',
            title: 'Machine Learning Fundamentals',
            description: 'Test your knowledge on machine learning basics, algorithms, and evaluation metrics',
            duration: 45,
            totalQuestions: 12,
            difficulty: 'Medium',
            startTime: yesterday.toISOString(),
            endTime: yesterday.toISOString(),
            status: 'completed',
            score: 85,
            completed: true,
            progress: 100
          },
          {
            id: 'exam-2',
            title: 'Deep Learning & Neural Networks',
            description: 'Comprehensive exam covering deep learning concepts and neural network architecture',
            duration: 60,
            totalQuestions: 15,
            difficulty: 'Hard',
            startTime: now.toISOString(),
            endTime: tomorrow.toISOString(),
            status: 'running',
            progress: 0
          },
          {
            id: 'exam-3',
            title: 'Data Preprocessing Techniques',
            description: 'Assessment on data cleaning, normalization, transformation, and feature engineering',
            duration: 30,
            totalQuestions: 10,
            difficulty: 'Easy',
            startTime: tomorrow.toISOString(),
            endTime: nextWeek.toISOString(),
            status: 'upcoming'
          },
          {
            id: 'exam-4',
            title: 'Computer Vision Essentials',
            description: 'Test covering image processing, convolutional networks, and object detection',
            duration: 50,
            totalQuestions: 15,
            difficulty: 'Hard',
            startTime: yesterday.toISOString(),
            endTime: yesterday.toISOString(),
            status: 'completed',
            score: 92,
            completed: true,
            progress: 100
          },
          {
            id: 'exam-5',
            title: 'Natural Language Processing',
            description: 'Exam on text processing, word embeddings, and language models',
            duration: 40,
            totalQuestions: 12,
            difficulty: 'Medium',
            startTime: now.toISOString(),
            endTime: tomorrow.toISOString(),
            status: 'running',
            progress: 0
          }
        ];
        
        setExams(mockExams);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching exams:', error);
        setLoading(false);
      }
    };
    
    fetchExams();
  }, []);
  
  // Filter exams by status
  const filteredExams = exams.filter(exam => {
    if (activeTab === 'running') return exam.status === 'running';
    if (activeTab === 'upcoming') return exam.status === 'upcoming';
    if (activeTab === 'completed') return exam.status === 'completed';
    return true;
  });
  
  // Handle exam start
  const startExam = (examId: string) => {
    router.push(`/dashboard/exams/${examId}`);
  };
  
  // Handle view results
  const viewResults = (examId: string) => {
    router.push(`/dashboard/exams/${examId}/results`);
  };
  
  // Get badge color based on difficulty
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'Easy': 
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Medium': 
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Hard': 
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Mixed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };
  
  // Format time from ISO to readable format
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Calculate time remaining for upcoming exams
  const getTimeRemaining = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = start - now;
    
    if (diff <= 0) return 'Starting now';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };
  
  // Time left for running exams
  const getExamTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Ending';
    
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
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
            <h1 className="text-2xl font-bold">Exams</h1>
            <p className="text-muted-foreground">View and take your scheduled examinations</p>
          </div>
        </div>
      </motion.div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="running">Running</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="w-full flex justify-center p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading exams...</p>
            </div>
          </div>
        ) : (
          <TabsContent value={activeTab} className="space-y-4">
            {filteredExams.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No {activeTab} exams</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'running' && "You don't have any exams in progress."}
                      {activeTab === 'upcoming' && "You don't have any upcoming exams scheduled."}
                      {activeTab === 'completed' && "You haven't completed any exams yet."}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-4">
                  {filteredExams.map((exam, index) => (
                    <motion.div
                      key={exam.id}
                      initial="hidden"
                      animate="visible"
                      variants={fadeIn}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.1, 1) }}
                    >
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{exam.title}</CardTitle>
                              <CardDescription className="mt-1">{exam.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getDifficultyColor(exam.difficulty)}>
                                {exam.difficulty}
                              </Badge>
                              {exam.status === 'running' && (
                                <Badge variant="outline" className="animate-pulse border-red-500 text-red-500">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(exam.startTime)}
                                {exam.status !== 'upcoming' && ` - ${formatDate(exam.endTime)}`}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{exam.duration} minutes</span>
                              {exam.status === 'running' && (
                                <Badge variant="secondary" className="ml-2">
                                  {getExamTimeLeft(exam.endTime)}
                                </Badge>
                              )}
                              {exam.status === 'upcoming' && (
                                <Badge variant="outline" className="ml-2">
                                  {getTimeRemaining(exam.startTime)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground">Questions</span>
                              <span className="font-medium">{exam.totalQuestions} Total</span>
                            </div>
                            
                            {exam.status === 'completed' && (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-sm text-muted-foreground">Score</span>
                                  <span className="font-medium">{exam.score}%</span>
                                </div>
                                
                                <div className="flex flex-col">
                                  <span className="text-sm text-muted-foreground">Result</span>
                                  <span className={`font-medium ${exam.score && exam.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                    {exam.score && exam.score >= 70 ? 'Passed' : 'Failed'}
                                  </span>
                                </div>
                              </>
                            )}
                            
                            {exam.status === 'running' && (
                              <div className="flex flex-col col-span-2">
                                <span className="text-sm text-muted-foreground mb-1">Progress</span>
                                <Progress value={exam.progress} className="h-2" />
                              </div>
                            )}
                            
                            {exam.status === 'upcoming' && (
                              <div className="flex flex-col col-span-2">
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">Be prepared and review related materials</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="border-t bg-muted/20 pt-4">
                          {exam.status === 'running' && (
                            <Button 
                              onClick={() => startExam(exam.id)}
                              className="w-full sm:w-auto"
                            >
                              Continue Exam
                            </Button>
                          )}
                          
                          {exam.status === 'upcoming' && (
                            <Button 
                              onClick={() => startExam(exam.id)}
                              className="w-full sm:w-auto"
                              disabled={new Date(exam.startTime) > new Date()}
                            >
                              {new Date(exam.startTime) > new Date() ? 'Not Available Yet' : 'Start Exam'}
                            </Button>
                          )}
                          
                          {exam.status === 'completed' && (
                            <Button 
                              onClick={() => viewResults(exam.id)}
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}