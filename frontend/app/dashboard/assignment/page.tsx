"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileWarning } from "lucide-react";

interface Course {
  id: number;
  name: string;
  description: string | null;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string | null;
  createdBy: {
    name: string | null;
    email: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  course: {
    name: string;
  };
  createdBy: {
    name: string | null;
  };
  submissions: {
    id: string;
    submittedAt: string;
    fileUrl: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
}

interface SimilarityResult {
  submission1: {
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    submittedAt: string;
  };
  submission2: {
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    submittedAt: string;
  };
  similarity: number;
}

export default function AssignmentPage() {
  const { user, role, isLoading } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);

  // Form state for teachers
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    courseId: "",
  });

  useEffect(() => {
    fetchAssignments();
    if (role === "teacher") {
      fetchCourses();
    }
  }, [role]);

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const response = await fetch("/api/courses");
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/assignments");
      if (!response.ok) throw new Error("Failed to fetch assignments");
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File size should be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) {
      toast.error("Please select an assignment");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const supabase = createClient();
      
      // Generate a unique file name
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${selectedAssignment}/${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("files")
        .upload(fileName, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf"
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);

      // Submit assignment
      const response = await fetch("/api/assignments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment,
          fileUrl: publicUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit assignment");
      }

      toast.success("Assignment submitted successfully");
      setSelectedFile(null);
      setSelectedAssignment("");
      setUploadProgress(0);
      fetchAssignments();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create assignment");

      toast.success("Assignment created successfully");
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        courseId: "",
      });
      fetchAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    }
  };

  const checkSimilarity = async (assignmentId: string) => {
    setIsCheckingSimilarity(true);
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment || assignment.submissions.length < 2) {
        toast.error("Need at least 2 submissions to check similarity");
        return;
      }

      const submissions = assignment.submissions.map(sub => ({
        id: sub.id,
        userId: sub.user.id,
        userName: sub.user.name,
        userEmail: sub.user.email,
        submittedAt: sub.submittedAt,
        fileUrl: sub.fileUrl
      }));

      const response = await fetch('http://localhost:5000/check-similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to check similarity');
      }

      const data = await response.json();
      setSimilarityResults(data.results);
    } catch (error) {
      console.error('Error checking similarity:', error);
      toast.error('Failed to check similarity');
    } finally {
      setIsCheckingSimilarity(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const pendingAssignments = assignments.filter(assignment => assignment.submissions.length === 0);
  const submittedAssignments = assignments.filter(assignment => assignment.submissions.length > 0);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Assignments</h1>

      {role === "teacher" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <Input
                    placeholder="Assignment Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Assignment Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                    disabled={isLoadingCourses}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select Course"} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{course.name}</span>
                            {course.isStarred && (
                              <span className="text-yellow-500">★</span>
                            )}
                            <span className="text-sm text-gray-500">
                              (by {course.createdBy.name || course.createdBy.email})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {courses.length === 0 && !isLoadingCourses && (
                    <p className="text-sm text-gray-500 mt-2">No courses available.</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={!formData.courseId || isLoadingCourses}
                >
                  Create Assignment
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Assignments</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "submissions" && (
            <div className="space-y-6">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {assignment.course?.name || "No Course"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                          Due: {new Date(assignment.dueDate).toLocaleString()}
                        </div>
                        {assignment.submissions.length >= 2 && (
                          <Button
                            variant="outline"
                            onClick={() => checkSimilarity(assignment.id)}
                            disabled={isCheckingSimilarity}
                          >
                            {isCheckingSimilarity ? "Checking..." : "Check Similarity"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          Total Submissions: {assignment.submissions.length}
                        </p>
                        {assignment.submissions.length === 0 && (
                          <p className="text-sm text-gray-500">No submissions yet</p>
                        )}
                      </div>

                      {/* Similarity Results */}
                      {similarityResults.length > 0 && (
                        <div className="space-y-4">
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Potential Plagiarism Detected</AlertTitle>
                            <AlertDescription>
                              Found {similarityResults.length} pairs of submissions with high similarity
                            </AlertDescription>
                          </Alert>
                          {similarityResults.map((result, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-red-50">
                              <div className="flex items-center gap-2 mb-2">
                                <FileWarning className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-red-700">
                                  Similarity: {(result.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-medium">Student 1:</p>
                                  <p>{result.submission1.userName || result.submission1.userEmail}</p>
                                  <p className="text-sm text-gray-500">
                                    Submitted: {new Date(result.submission1.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Student 2:</p>
                                  <p>{result.submission2.userName || result.submission2.userEmail}</p>
                                  <p className="text-sm text-gray-500">
                                    Submitted: {new Date(result.submission2.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Submissions List */}
                      {assignment.submissions.length > 0 && (
                        <div className="space-y-4">
                          {assignment.submissions.map((submission) => (
                            <div key={submission.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">
                                    Submitted by: {submission.user.name || submission.user.email}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Submitted at: {new Date(submission.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => window.open(submission.fileUrl, '_blank')}
                                >
                                  View Submission
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "all" && (
            <div className="grid gap-6">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {assignment.course?.name || "No Course"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        Created by: {assignment.createdBy?.name || "Unknown"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{assignment.description}</p>
                    <div className="flex flex-col gap-2 text-sm text-gray-500">
                      <p>Due: {new Date(assignment.dueDate).toLocaleString()}</p>
                      <div className="mt-2">
                        <p className="text-blue-600">
                          Submissions: {assignment.submissions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {role === "student" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Submit Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <Select
                    value={selectedAssignment}
                    onValueChange={setSelectedAssignment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingAssignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{assignment.title}</span>
                            <span className="text-sm text-gray-500">
                              {assignment.course.name} - Due: {new Date(assignment.dueDate).toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pendingAssignments.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No pending assignments available.</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting || !selectedAssignment}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSubmitAssignment}
                    disabled={!selectedFile || !selectedAssignment || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assignment"}
                  </Button>
                </div>
                {selectedFile && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Selected file: {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}
                {isSubmitting && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Assignments</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({submittedAssignments.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      )}
    </div>
  );
}
