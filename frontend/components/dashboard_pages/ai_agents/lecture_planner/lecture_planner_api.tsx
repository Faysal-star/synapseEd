'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, BookOpen, GraduationCap, Pencil, Clock, Lightbulb, RefreshCw, Save, Check, Edit, Plus, X } from "lucide-react";

// Types for lecture plan data
interface Topic {
  [key: string]: string[];
}

interface LecturePlan {
  title: string;
  outline: string;
  learning_objectives: string[];
  topics: Topic[];
  teaching_methods: string[];
  resources: string[];
  tools_used: string[];
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LecturePlannerApiComponent() {
  const { toast } = useToast();
  
  // State for form data
  const [query, setQuery] = useState('Introduction to Quantum Computing');
  const [level, setLevel] = useState('beginner');
  const [isLoading, setIsLoading] = useState(false);
  const [lecturePlan, setLecturePlan] = useState<LecturePlan | null>(null);
  const [editingMode, setEditingMode] = useState<string | null>(null);
  
  // State for editing various components
  const [editableLearningObjectives, setEditableLearningObjectives] = useState<string[]>([]);
  const [editableTopics, setEditableTopics] = useState<Topic[]>([]);
  const [editableTeachingMethods, setEditableTeachingMethods] = useState<string[]>([]);
  const [editableResources, setEditableResources] = useState<string[]>([]);
  
  // Track lecture plan ID for updates
  const [lecturePlanId, setLecturePlanId] = useState<string>('temp-id');
  
  // Generate a new lecture plan
  const generateLecturePlan = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/lecture-planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          level
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLecturePlan(data.plan);
      console.log('Generated lecture plan:', data);
      setLecturePlanId(`data.id`); // In a real app, get this from the response
      
      // Initialize editable states
      setEditableLearningObjectives(data.learning_objectives);
      setEditableTopics(data.topics);
      setEditableTeachingMethods(data.teaching_methods);
      setEditableResources(data.resources);
      
      toast({
        title: "Lecture Plan Generated",
        description: "Your customized lecture plan is ready",
      });
    } catch (error) {
      console.error('Error generating lecture plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate lecture plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update learning objectives
  const updateLearningObjectives = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/lecture-planner/${lecturePlanId}/learning-objectives`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learning_objectives: editableLearningObjectives
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLecturePlan(data);
      console.log('Updated lecture plan:', data);
      
      toast({
        title: "Learning Objectives Updated",
        description: "Your learning objectives have been updated",
      });
    } catch (error) {
      console.error('Error updating learning objectives:', error);
      toast({
        title: "Error",
        description: "Failed to update learning objectives. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setEditingMode(null);
    }
  };
  
  // Update topics
  const updateTopics = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/lecture-planner/${lecturePlanId}/topics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics: editableTopics
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLecturePlan(data);
      
      toast({
        title: "Topics Updated",
        description: "Your lecture topics have been updated",
      });
    } catch (error) {
      console.error('Error updating topics:', error);
      toast({
        title: "Error",
        description: "Failed to update topics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setEditingMode(null);
    }
  };
  
  // Update teaching methods
  const updateTeachingMethods = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/lecture-planner/${lecturePlanId}/teaching-methods`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teaching_methods: editableTeachingMethods
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLecturePlan(data);
      
      toast({
        title: "Teaching Methods Updated",
        description: "Your teaching methods have been updated",
      });
    } catch (error) {
      console.error('Error updating teaching methods:', error);
      toast({
        title: "Error",
        description: "Failed to update teaching methods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setEditingMode(null);
    }
  };
  
  // Update resources
  const updateResources = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/lecture-planner/${lecturePlanId}/resources`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resources: editableResources
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLecturePlan(data);
      
      toast({
        title: "Resources Updated",
        description: "Your lecture resources have been updated",
      });
    } catch (error) {
      console.error('Error updating resources:', error);
      toast({
        title: "Error",
        description: "Failed to update resources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setEditingMode(null);
    }
  };
  
  // Helper functions for editing array items
  const addLearningObjective = () => {
    setEditableLearningObjectives([...editableLearningObjectives, '']);
  };
  
  const updateLearningObjective = (index: number, value: string) => {
    const updated = [...editableLearningObjectives];
    updated[index] = value;
    setEditableLearningObjectives(updated);
  };
  
  const removeLearningObjective = (index: number) => {
    setEditableLearningObjectives(editableLearningObjectives.filter((_, i) => i !== index));
  };
  
  const addTeachingMethod = () => {
    setEditableTeachingMethods([...editableTeachingMethods, '']);
  };
  
  const updateTeachingMethod = (index: number, value: string) => {
    const updated = [...editableTeachingMethods];
    updated[index] = value;
    setEditableTeachingMethods(updated);
  };
  
  const removeTeachingMethod = (index: number) => {
    setEditableTeachingMethods(editableTeachingMethods.filter((_, i) => i !== index));
  };
  
  const addResource = () => {
    setEditableResources([...editableResources, '']);
  };
  
  const updateResource = (index: number, value: string) => {
    const updated = [...editableResources];
    updated[index] = value;
    setEditableResources(updated);
  };
  
  const removeResource = (index: number) => {
    setEditableResources(editableResources.filter((_, i) => i !== index));
  };
  
  // Topic editing helpers
  const addTopic = () => {
    setEditableTopics([...editableTopics, { 'New Topic': ['Subtopic 1'] }]);
  };
  
  const updateTopicTitle = (index: number, newTitle: string) => {
    const updated = [...editableTopics];
    const oldTitle = Object.keys(updated[index])[0];
    updated[index] = { [newTitle]: updated[index][oldTitle] };
    setEditableTopics(updated);
  };
  
  const addSubtopic = (topicIndex: number) => {
    const updated = [...editableTopics];
    const title = Object.keys(updated[topicIndex])[0];
    updated[topicIndex][title] = [...updated[topicIndex][title], ''];
    setEditableTopics(updated);
  };
  
  const updateSubtopic = (topicIndex: number, subtopicIndex: number, value: string) => {
    const updated = [...editableTopics];
    const title = Object.keys(updated[topicIndex])[0];
    updated[topicIndex][title][subtopicIndex] = value;
    setEditableTopics(updated);
  };
  
  const removeSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const updated = [...editableTopics];
    const title = Object.keys(updated[topicIndex])[0];
    updated[topicIndex][title] = updated[topicIndex][title].filter((_, i) => i !== subtopicIndex);
    setEditableTopics(updated);
  };
  
  const removeTopic = (topicIndex: number) => {
    setEditableTopics(editableTopics.filter((_, i) => i !== topicIndex));
  };
  
  return (
    <div className="flex flex-col w-full h-full p-6 gap-6">
      {/* <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lecture Planner</h1>
          <p className="text-sm text-muted-foreground">Create comprehensive lesson plans and activities</p>
        </div>
      </div> */}
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generate Lecture Plan</CardTitle>
            <CardDescription>
              Provide a topic and level to generate a customized lecture plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Lecture Topic</Label>
              <Input 
                id="topic" 
                placeholder="e.g., Introduction to Quantum Computing" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">Student Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={generateLecturePlan} 
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Generate Lecture Plan
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Lecture Plan Display */}
        <AnimatePresence>
          {lecturePlan && (
            <motion.div 
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{lecturePlan.title}</CardTitle>
                    <Badge variant="outline">
                      {level.charAt(0).toUpperCase() + level.slice(1)} Level
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {lecturePlan.outline}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="learning-objectives">
                    <TabsList className="grid grid-cols-4 mb-4">
                      <TabsTrigger value="learning-objectives">Objectives</TabsTrigger>
                      <TabsTrigger value="topics">Topics</TabsTrigger>
                      <TabsTrigger value="teaching-methods">Teaching Methods</TabsTrigger>
                      <TabsTrigger value="resources">Resources</TabsTrigger>
                    </TabsList>
                    
                    {/* Learning Objectives Tab */}
                    <TabsContent value="learning-objectives">
                      <Card>
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Learning Objectives</CardTitle>
                            {editingMode === 'learning-objectives' ? (
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingMode(null)}>
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" variant="default" onClick={updateLearningObjectives} disabled={isLoading}>
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditingMode('learning-objectives')}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px] pr-4">
                            {editingMode === 'learning-objectives' ? (
                              <div className="space-y-3">
                                {editableLearningObjectives.map((objective, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <Input 
                                      value={objective}
                                      onChange={(e) => updateLearningObjective(index, e.target.value)}
                                      placeholder="Enter learning objective"
                                    />
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={() => removeLearningObjective(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  className="w-full mt-2"
                                  onClick={addLearningObjective}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Objective
                                </Button>
                              </div>
                            ) : (
                              <ul className="space-y-3 list-disc pl-5">
                                {lecturePlan?.learning_objectives?.map((objective, index) => (
                                  <li key={index} className="text-sm">
                                    {objective}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Topics Tab */}
                    <TabsContent value="topics">
                      <Card>
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Topics & Subtopics</CardTitle>
                            {editingMode === 'topics' ? (
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingMode(null)}>
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" variant="default" onClick={updateTopics} disabled={isLoading}>
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditingMode('topics')}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px] pr-4">
                            {editingMode === 'topics' ? (
                              <div className="space-y-6">
                                {editableTopics.map((topic, topicIndex) => {
                                  const topicTitle = Object.keys(topic)[0];
                                  const subtopics = topic[topicTitle];
                                  
                                  return (
                                    <div key={topicIndex} className="space-y-3 border p-3 rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <Input 
                                          value={topicTitle}
                                          onChange={(e) => updateTopicTitle(topicIndex, e.target.value)}
                                          placeholder="Enter topic title"
                                          className="font-medium"
                                        />
                                        <Button 
                                          size="icon" 
                                          variant="ghost"
                                          onClick={() => removeTopic(topicIndex)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-2 pl-4">
                                        {subtopics.map((subtopic, subtopicIndex) => (
                                          <div key={subtopicIndex} className="flex items-center space-x-2">
                                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                                            <Input 
                                              value={subtopic}
                                              onChange={(e) => updateSubtopic(topicIndex, subtopicIndex, e.target.value)}
                                              placeholder="Enter subtopic"
                                              className="text-sm"
                                            />
                                            <Button 
                                              size="icon" 
                                              variant="ghost"
                                              onClick={() => removeSubtopic(topicIndex, subtopicIndex)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ))}
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="ml-3"
                                          onClick={() => addSubtopic(topicIndex)}
                                        >
                                          <Plus className="h-3 w-3 mr-1" /> Add Subtopic
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                                <Button 
                                  variant="outline" 
                                  className="w-full mt-2"
                                  onClick={addTopic}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Topic
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {lecturePlan.topics.map((topic, index) => {
                                  const topicTitle = Object.keys(topic)[0];
                                  const subtopics = topic[topicTitle];
                                  
                                  return (
                                    <div key={index}>
                                      <h3 className="font-medium">{topicTitle}</h3>
                                      <ul className="pl-6 mt-1 space-y-1">
                                        {subtopics.map((subtopic, subIndex) => (
                                          <li key={subIndex} className="text-sm list-disc">
                                            {subtopic}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Teaching Methods Tab */}
                    <TabsContent value="teaching-methods">
                      <Card>
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Teaching Methods</CardTitle>
                            {editingMode === 'teaching-methods' ? (
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingMode(null)}>
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" variant="default" onClick={updateTeachingMethods} disabled={isLoading}>
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditingMode('teaching-methods')}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px] pr-4">
                            {editingMode === 'teaching-methods' ? (
                              <div className="space-y-3">
                                {editableTeachingMethods.map((method, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <Input 
                                      value={method}
                                      onChange={(e) => updateTeachingMethod(index, e.target.value)}
                                      placeholder="Enter teaching method"
                                    />
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={() => removeTeachingMethod(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  className="w-full mt-2"
                                  onClick={addTeachingMethod}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Method
                                </Button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {lecturePlan.teaching_methods.map((method, index) => (
                                  <div key={index} className="flex items-center space-x-2 bg-muted/50 rounded-md p-3">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                    <span className="text-sm">{method}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Resources Tab */}
                    <TabsContent value="resources">
                      <Card>
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Resources</CardTitle>
                            {editingMode === 'resources' ? (
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingMode(null)}>
                                  <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" variant="default" onClick={updateResources} disabled={isLoading}>
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditingMode('resources')}>
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px] pr-4">
                            {editingMode === 'resources' ? (
                              <div className="space-y-3">
                                {editableResources.map((resource, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <Input 
                                      value={resource}
                                      onChange={(e) => updateResource(index, e.target.value)}
                                      placeholder="Enter resource"
                                    />
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={() => removeResource(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  className="w-full mt-2"
                                  onClick={addResource}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Resource
                                </Button>
                              </div>
                            ) : (
                              <ul className="space-y-3 list-disc pl-5">
                                {lecturePlan.resources.map((resource, index) => (
                                  <li key={index} className="text-sm">
                                    {resource}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="mt-4 text-xs text-muted-foreground border-t pt-4">
                    <p>Tools used: {lecturePlan.tools_used.join(', ')}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 