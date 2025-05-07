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
  }[];
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const pendingAssignments = assignments.filter(assignment => assignment.submissions.length === 0);
  const submittedAssignments = assignments.filter(assignment => assignment.submissions.length > 0);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Assignments</h1>

      {role === "teacher" && (
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
                {assignment.submissions && assignment.submissions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-green-600">Submitted: {new Date(assignment.submissions[0].submittedAt).toLocaleString()}</p>
                    <a 
                      href={assignment.submissions[0].fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Submission
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
