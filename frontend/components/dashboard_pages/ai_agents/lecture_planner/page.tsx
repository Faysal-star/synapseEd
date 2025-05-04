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
    <div className="container py-6 max-w-6xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold">Lecture Planner</h1>
        <p className="text-muted-foreground">Create detailed lesson plans with AI assistance</p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
              <CardDescription>
                Provide information about your lesson to generate a comprehensive lesson plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Biology, Mathematics, History" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gradeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="elementary">Elementary School</SelectItem>
                            <SelectItem value="middle">Middle School</SelectItem>
                            <SelectItem value="high">High School</SelectItem>
                            <SelectItem value="college">College/University</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="topicTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic/Lesson Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cell Division, Linear Equations" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lesson Duration (minutes)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                            <SelectItem value="120">120 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="learningObjectives"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Objectives</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List the key learning objectives, one per line"
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          What should students know or be able to do by the end of the lesson?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priorKnowledge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prior Knowledge (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What should students already know before this lesson?"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="additionalRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Requirements (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any specific teaching methods, resources, or content to include"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate Lesson Plan
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Templates</CardTitle>
              <CardDescription>
                Start with a template and customize to your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start text-left"
                onClick={() => {
                  form.reset({
                    subject: "Biology",
                    gradeLevel: "high",
                    topicTitle: "Cell Division: Mitosis and Meiosis",
                    duration: "60",
                    learningObjectives: "Describe the stages of mitosis\nCompare and contrast mitosis and meiosis\nExplain the significance of cell division in growth and reproduction",
                    priorKnowledge: "Basic understanding of cell structure",
                    additionalRequirements: "Include microscope activity",
                  });
                }}
              >
                <div className="flex items-center mr-2">
                  <div className="rounded-full bg-green-500/10 p-1">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Biology: Cell Division</p>
                  <p className="text-xs text-muted-foreground">High School | 60 min</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-left"
                onClick={() => {
                  form.reset({
                    subject: "History",
                    gradeLevel: "middle",
                    topicTitle: "The Industrial Revolution",
                    duration: "45",
                    learningObjectives: "Identify key inventions of the Industrial Revolution\nAnalyze the social impact of industrialization\nEvaluate how the Industrial Revolution changed society",
                    priorKnowledge: "Basic timeline of world history events",
                    additionalRequirements: "Include primary source documents",
                  });
                }}
              >
                <div className="flex items-center mr-2">
                  <div className="rounded-full bg-blue-500/10 p-1">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">History: Industrial Revolution</p>
                  <p className="text-xs text-muted-foreground">Middle School | 45 min</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-left"
                onClick={() => {
                  form.reset({
                    subject: "Mathematics",
                    gradeLevel: "elementary",
                    topicTitle: "Introduction to Fractions",
                    duration: "30",
                    learningObjectives: "Identify fractions as parts of a whole\nRepresent fractions using visual models\nCompare simple fractions",
                    priorKnowledge: "Basic understanding of whole numbers",
                    additionalRequirements: "Include hands-on manipulatives",
                  });
                }}
              >
                <div className="flex items-center mr-2">
                  <div className="rounded-full bg-purple-500/10 p-1">
                    <Lightbulb className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Math: Introduction to Fractions</p>
                  <p className="text-xs text-muted-foreground">Elementary | 30 min</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Generated Plan Column */}
        <div className="lg:col-span-2">
          {!generatedPlan ? (
            <div className="h-full flex items-center justify-center border rounded-lg p-12 bg-accent/10">
              <div className="text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-6 mx-auto w-fit">
                  <LayoutList className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-medium">No Lesson Plan Generated Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Fill in the form to generate a comprehensive, AI-powered lesson plan tailored to your specific needs and teaching style.
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Plan Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {generatedPlan.metadata.topicTitle}
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generatePdf()}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(generatedPlan, null, 2))}>
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setGeneratedPlan(null)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              
              <Card>
                <CardHeader className="bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Lesson Overview</CardTitle>
                      <CardDescription>General information about the lesson</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {generatedPlan.metadata.gradeLevel}
                      </Badge>
                      <Badge variant="secondary">
                        <Timer className="h-3 w-3 mr-1" />
                        {generatedPlan.metadata.duration} min
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Subject</h3>
                      <p>{generatedPlan.metadata.subject}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Overview</h3>
                      <p>{generatedPlan.outline.overview}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Learning Objectives</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {generatedPlan.outline.objectives.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Tabs defaultValue="timeline">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="differentiation">Differentiation</TabsTrigger>
                  <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="extensions">Extensions</TabsTrigger>
                </TabsList>
                
                {/* Timeline Tab */}
                <TabsContent value="timeline" className="space-y-4 pt-4">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-6">
                      {generatedPlan.timeline.map((section, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle>{section.title}</CardTitle>
                                <CardDescription>{section.duration}</CardDescription>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(JSON.stringify(section, null, 2))}>
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <p className="mb-4">{section.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Activities</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {section.activities.map((activity, i) => (
                                    <li key={i} className="text-sm">{activity}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-sm mb-2">Resources</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {section.resources.map((resource, i) => (
                                    <li key={i} className="text-sm">{resource}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                {/* Differentiation Tab */}
                <TabsContent value="differentiation" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Differentiation Strategies</CardTitle>
                      <CardDescription>
                        Approaches to meet the needs of diverse learners
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="advanced">
                          <AccordionTrigger>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-2 text-blue-500" />
                              <span>Advanced Students</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-2">
                              {generatedPlan.differentiation.advancedStudents.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="struggling">
                          <AccordionTrigger>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-2 text-amber-500" />
                              <span>Struggling Students</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-2">
                              {generatedPlan.differentiation.strugglingStudents.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="ell">
                          <AccordionTrigger>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-2 text-green-500" />
                              <span>English Language Learners</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-2">
                              {generatedPlan.differentiation.englishLanguageLearners.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Assessment Tab */}
                <TabsContent value="assessment" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                          Formative Assessment
                        </CardTitle>
                        <CardDescription>
                          Ongoing checks for understanding
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {generatedPlan.assessment.formative.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Check className="h-4 w-4 mr-2 text-blue-500" />
                          Summative Assessment
                        </CardTitle>
                        <CardDescription>
                          Final evaluation of learning
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {generatedPlan.assessment.summative.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Library className="h-4 w-4 mr-2 text-primary" />
                        Teaching Resources
                      </CardTitle>
                      <CardDescription>
                        Materials and tools needed for this lesson
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedPlan.resources.map((resource, index) => (
                          <div key={index} className="flex space-x-3">
                            <div className="rounded-full bg-primary/10 p-2 h-fit">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{resource.title}</h4>
                              <p className="text-sm text-muted-foreground">{resource.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Extensions Tab */}
                <TabsContent value="extensions" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Homework Assignments</CardTitle>
                        <CardDescription>
                          Tasks for continued learning outside of class
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {generatedPlan.extensions.homeworkAssignments.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Further Practice</CardTitle>
                        <CardDescription>
                          Additional learning opportunities
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {generatedPlan.extensions.furtherPractice.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between items-center pt-2 pb-6">
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date(generatedPlan.metadata.createdAt).toLocaleDateString()} | Plan ID: LP-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </p>
                <Button onClick={() => setGeneratedPlan(null)} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create New Plan
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}