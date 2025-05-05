'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Brain, Check, ClipboardCopy, FileText, GraduationCap, LayoutList, Library, Lightbulb, Loader2, RefreshCw, Save, Target, Timer } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import LecturePlannerApiComponent from './lecture_planner_api';

// Form schema
const formSchema = z.object({
  subject: z.string().min(2, {
    message: "Subject must be at least 2 characters.",
  }),
  gradeLevel: z.string({
    required_error: "Please select a grade level.",
  }),
  topicTitle: z.string().min(2, {
    message: "Topic title must be at least 2 characters.",
  }),
  duration: z.string({
    required_error: "Please select a duration.",
  }),
  learningObjectives: z.string().min(10, {
    message: "Learning objectives must be at least 10 characters.",
  }),
  priorKnowledge: z.string().optional(),
  additionalRequirements: z.string().optional(),
});

export default function LecturePlannerPage() {
  const [activeTab, setActiveTab] = useState('api-version');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      gradeLevel: "",
      topicTitle: "",
      duration: "60",
      learningObjectives: "",
      priorKnowledge: "",
      additionalRequirements: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    
    // Simulate API call with delayed response
    setTimeout(() => {
      setGeneratedPlan({
        metadata: {
          ...values,
          createdAt: new Date().toISOString(),
        },
        outline: {
          title: values.topicTitle,
          overview: `This lesson focuses on ${values.topicTitle} for grade ${values.gradeLevel} ${values.subject} students. The lesson is designed to engage students through a combination of direct instruction, interactive activities, and collaborative learning.`,
          objectives: values.learningObjectives.split('\n').filter(item => item.trim() !== ''),
        },
        timeline: [
          {
            title: "Introduction",
            duration: "10 minutes",
            description: "Begin by connecting to students' prior knowledge and introducing the key concepts of the lesson. Use a brief multimedia presentation to spark interest.",
            activities: [
              "Warm-up questions to assess prior knowledge",
              "Brief video introduction to the topic",
              "Introduction to key vocabulary and concepts"
            ],
            resources: [
              "Digital presentation slides",
              "Introductory video clip"
            ]
          },
          {
            title: "Direct Instruction",
            duration: "15 minutes",
            description: "Present core concepts and demonstrate key procedures. Use visual aids and examples to reinforce understanding.",
            activities: [
              "Teacher-led explanation of key concepts",
              "Worked examples on the board",
              "Guided note-taking using provided templates"
            ],
            resources: [
              "Whiteboard/digital display",
              "Guided notes handout",
              "Visual concept maps"
            ]
          },
          {
            title: "Guided Practice",
            duration: "15 minutes",
            description: "Students work on problems or activities with teacher guidance and support. Provide immediate feedback and clarification.",
            activities: [
              "Think-pair-share on discussion questions",
              "Small group problem-solving",
              "Interactive digital activity"
            ],
            resources: [
              "Worksheet with practice problems",
              "Digital learning platform",
              "Manipulatives or lab materials (if applicable)"
            ]
          },
          {
            title: "Independent Application",
            duration: "15 minutes",
            description: "Students demonstrate their understanding by applying concepts independently or in small groups.",
            activities: [
              "Individual problem-solving task",
              "Small group project work",
              "Creation of visual summary or concept map"
            ],
            resources: [
              "Application worksheets",
              "Project materials",
              "Digital creation tools"
            ]
          },
          {
            title: "Closure and Assessment",
            duration: "5 minutes",
            description: "Summarize key learning points and check for understanding. Assign homework if applicable.",
            activities: [
              "Exit ticket or quick formative assessment",
              "Student reflection on learning",
              "Preview of next lesson"
            ],
            resources: [
              "Exit ticket forms",
              "Digital assessment tool",
              "Homework assignment handout"
            ]
          }
        ],
        differentiation: {
          advancedStudents: [
            "Provide extension problems that require deeper analysis",
            "Assign leadership roles in group activities",
            "Offer opportunity to create teaching materials for peers"
          ],
          strugglingStudents: [
            "Provide visual aids and reference sheets",
            "Allow extended time for activities",
            "Implement sentence starters for written responses",
            "Pair with peer mentors during group work"
          ],
          englishLanguageLearners: [
            "Pre-teach vocabulary with visual supports",
            "Provide translated materials when possible",
            "Use word banks and sentence frames",
            "Allow use of translation tools for complex concepts"
          ]
        },
        assessment: {
          formative: [
            "Exit ticket responses",
            "Observation during group work",
            "Quality of discussion participation",
            "Completion of guided practice activities"
          ],
          summative: [
            "End-of-unit test",
            "Project presentation",
            "Written explanation of concepts",
            "Portfolio of work samples"
          ]
        },
        resources: [
          {
            title: "Core Textbook",
            description: "Relevant chapters for reference and homework assignments"
          },
          {
            title: "Digital Presentation Slides",
            description: "Visual aids for direct instruction component"
          },
          {
            title: "Interactive Digital Tools",
            description: "Online simulations and practice activities"
          },
          {
            title: "Printable Materials",
            description: "Handouts, worksheets, and reference guides"
          }
        ],
        extensions: {
          homeworkAssignments: [
            "Complete practice problems 1-10 in the textbook",
            "Watch related video and answer reflection questions",
            "Begin research for upcoming project"
          ],
          furtherPractice: [
            "Online interactive activities",
            "Additional readings on the topic",
            "Practice quizzes for self-assessment"
          ]
        }
      });
      setIsGenerating(false);
    }, 3000);
  };
  
  // Handle copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };
  
  // Generate PDF (mock function)
  const generatePdf = () => {
    alert("PDF generation would be implemented here");
  };
  
  return (
    <div className="w-full h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="api-version" className="flex-1">
            API Version
          </TabsTrigger>
          <TabsTrigger value="local-version" className="flex-1">
            Local Version
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-version" className="w-full mt-0">
          <LecturePlannerApiComponent />
        </TabsContent>
        
        <TabsContent value="local-version" className="w-full mt-0">
          <Card className="w-full p-6">
            <div className="text-center p-8">
              <h3 className="text-lg font-medium">Local Version</h3>
              <p className="text-muted-foreground mt-2">
                This version uses a local implementation without API calls.
                Switch to the API version to use the Flask backend.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}