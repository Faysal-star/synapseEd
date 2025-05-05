"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Brain,
  BookOpen,
  Clock,
  Users,
  Trophy,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  BookOpenCheck,
  Activity,
} from "lucide-react";

// Dummy data for demonstration
const dummyData = {
  exams: [
    {
      id: 1,
      title: "Physics Midterm",
      date: "2024-05-01",
      totalStudents: 30,
      participants: 28,
      averageScore: 78,
      highestScore: 95,
      lowestScore: 45,
      questionStats: {
        total: 20,
        byDifficulty: {
          easy: { total: 8, correct: 6.5 },
          medium: { total: 8, correct: 5.8 },
          hard: { total: 4, correct: 2.2 }
        }
      }
    },
    {
      id: 2,
      title: "Chemistry Quiz",
      date: "2024-04-15",
      totalStudents: 30,
      participants: 29,
      averageScore: 82,
      highestScore: 98,
      lowestScore: 52,
      questionStats: {
        total: 15,
        byDifficulty: {
          easy: { total: 6, correct: 5.2 },
          medium: { total: 6, correct: 4.8 },
          hard: { total: 3, correct: 1.8 }
        }
      }
    }
  ],
  contentAnalytics: [
    {
      title: "Introduction to Quantum Mechanics",
      views: 145,
      avgTimeSpent: 45, // minutes
      completionRate: 85,
      lastAccessed: "2024-05-02"
    },
    {
      title: "Chemical Bonding Basics",
      views: 132,
      avgTimeSpent: 35,
      completionRate: 78,
      lastAccessed: "2024-05-01"
    },
    {
      title: "Organic Chemistry Fundamentals",
      views: 98,
      avgTimeSpent: 55,
      completionRate: 72,
      lastAccessed: "2024-04-30"
    }
  ],
  studentPerformance: {
    overallAverage: 80,
    improvementRate: 12,
    topPerformers: 8,
    needsImprovement: 5,
    bySubject: {
      physics: 78,
      chemistry: 82,
      mathematics: 85
    }
  }
};

export default function StudentAnalyticsPage() {
  const [selectedExam, setSelectedExam] = useState(dummyData.exams[0].id);
  const [activeTab, setActiveTab] = useState("overview");

  const selectedExamData = dummyData.exams.find(exam => exam.id === selectedExam);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Analytics</h1>
        <Select
          value={selectedExam.toString()}
          onValueChange={(value) => setSelectedExam(parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Exam" />
          </SelectTrigger>
          <SelectContent>
            {dummyData.exams.map((exam) => (
              <SelectItem key={exam.id} value={exam.id.toString()}>
                {exam.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="exams">Exam Analytics</TabsTrigger>
          <TabsTrigger value="content">Content Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overall Average</CardDescription>
                <CardTitle className="text-3xl">
                  {dummyData.studentPerformance.overallAverage}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                  {dummyData.studentPerformance.improvementRate}% improvement
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Top Performers</CardDescription>
                <CardTitle className="text-3xl">
                  {dummyData.studentPerformance.topPerformers}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Trophy className="h-4 w-4 mr-1 text-amber-500" />
                  Students above 90%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Needs Improvement</CardDescription>
                <CardTitle className="text-3xl">
                  {dummyData.studentPerformance.needsImprovement}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                  Students below 60%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Content Engagement</CardDescription>
                <CardTitle className="text-3xl">
                  {Math.round(dummyData.contentAnalytics.reduce((acc, curr) => acc + curr.completionRate, 0) / dummyData.contentAnalytics.length)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <BookOpen className="h-4 w-4 mr-1 text-blue-500" />
                  Average completion rate
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
              <CardDescription>Average scores across different subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(dummyData.studentPerformance.bySubject).map(([subject, score]) => (
                  <div key={subject} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize">{subject}</span>
                      <span className="font-medium">{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          {selectedExamData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Participation Rate</CardDescription>
                    <CardTitle className="text-3xl">
                      {Math.round((selectedExamData.participants / selectedExamData.totalStudents) * 100)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {selectedExamData.participants} of {selectedExamData.totalStudents} students
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Score</CardDescription>
                    <CardTitle className="text-3xl">
                      {selectedExamData.averageScore}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Highest: {selectedExamData.highestScore}% | Lowest: {selectedExamData.lowestScore}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Question Success Rate</CardDescription>
                    <CardTitle className="text-3xl">
                      {Math.round((selectedExamData.questionStats.byDifficulty.easy.correct + 
                        selectedExamData.questionStats.byDifficulty.medium.correct + 
                        selectedExamData.questionStats.byDifficulty.hard.correct) / 
                        selectedExamData.questionStats.total * 100)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Across {selectedExamData.questionStats.total} questions
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Difficulty Distribution</CardDescription>
                    <CardTitle className="text-3xl">
                      {Math.round((selectedExamData.questionStats.byDifficulty.hard.total / 
                        selectedExamData.questionStats.total) * 100)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Hard questions
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Question Performance by Difficulty</CardTitle>
                  <CardDescription>Success rates across different difficulty levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(selectedExamData.questionStats.byDifficulty).map(([difficulty, stats]) => (
                      <div key={difficulty} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="capitalize">{difficulty}</span>
                          <span className="font-medium">
                            {Math.round((stats.correct / stats.total) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(stats.correct / stats.total) * 100} 
                          className="h-2"
                          indicatorColor={
                            difficulty === 'easy' ? 'bg-green-500' :
                            difficulty === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dummyData.contentAnalytics.map((content, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{content.title}</CardTitle>
                  <CardDescription>
                    Last accessed: {content.lastAccessed}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Views</span>
                      <span className="font-medium">{content.views}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg. Time Spent</span>
                      <span className="font-medium">{content.avgTimeSpent} min</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completion Rate</span>
                        <span className="font-medium">{content.completionRate}%</span>
                      </div>
                      <Progress value={content.completionRate} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Content Engagement Trends</CardTitle>
              <CardDescription>Overall content consumption patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Content engagement trends chart would appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 