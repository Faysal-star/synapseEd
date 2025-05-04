'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { BookOpen, Brain, BarChart3, PenBox, Calendar, Clock, BookOpenCheck, Activity, Users } from "lucide-react";
import Link from 'next/link';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const [userType, setUserType] = useState<"teacher" | "student">("teacher"); // Default to teacher, would be set from user session
  const [greeting, setGreeting] = useState('Good morning');
  
  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);
  
  // Quick access features based on user type
  const quickAccessFeatures = userType === "teacher" ? [
    { icon: BookOpen, title: "Manage Resources", description: "Upload and organize teaching materials", href: "/dashboard/resource-management" },
    { icon: Brain, title: "AI Assistance", description: "Generate lesson plans and content", href: "/dashboard/ai-agents" },
    { icon: BarChart3, title: "Student Performance", description: "View analytics and progress reports", href: "/dashboard/student-analytics" },
    { icon: PenBox, title: "Collaborative Whiteboard", description: "Start a new interactive session", href: "/dashboard/whiteboard" }
  ] : [
    { icon: BookOpen, title: "Class Resources", description: "Access study materials and guides", href: "/dashboard/class-resources" },
    { icon: Brain, title: "AI Study Assistant", description: "Get help with questions and concepts", href: "/dashboard/ai-agents" },
    { icon: BookOpenCheck, title: "Upcoming Exams", description: "View exam schedule and prepare", href: "/dashboard/exams" },
    { icon: Users, title: "AI Counselor", description: "Get personalized guidance and support", href: "/dashboard/ai-counselor" }
  ];
  
  // Toggle for demo purposes - would be removed in production
  const toggleUserType = () => {
    setUserType(prevType => prevType === "teacher" ? "student" : "teacher");
  };
  
  return (
    <div className="container py-6 space-y-8">
      <motion.div 
        className="flex items-center justify-between"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}, John</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening in your {userType === "teacher" ? "classroom" : "studies"} today.
          </p>
        </div>
        <Button variant="outline" onClick={toggleUserType} className="hidden sm:flex">
          Switch to {userType === "teacher" ? "Student" : "Teacher"} View
        </Button>
      </motion.div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickAccessFeatures.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link href={feature.href} className="block h-full">
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                      <CardHeader>
                        <feature.icon className="h-8 w-8 text-primary" />
                        <CardTitle className="mt-2">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <Button variant="ghost" size="sm" className="ml-auto">
                          Open
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* Stats/Overview Cards */}
          <section>
            <h2 className="text-xl font-semibold mb-4">{userType === "teacher" ? "Classroom Stats" : "Learning Stats"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {userType === "teacher" ? "Active Students" : "Completed Assignments"}
                    </CardDescription>
                    <CardTitle className="text-3xl">
                      {userType === "teacher" ? "28/30" : "12/15"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-green-500" />
                      {userType === "teacher" ? "2 absent today" : "3 pending"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {userType === "teacher" ? "Resources Created" : "Resources Accessed"}
                    </CardDescription>
                    <CardTitle className="text-3xl">
                      {userType === "teacher" ? "24" : "18"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-blue-500" />
                      {userType === "teacher" ? "+3 this week" : "+5 this week"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {userType === "teacher" ? "AI Sessions" : "Study Hours"}
                    </CardDescription>
                    <CardTitle className="text-3xl">
                      {userType === "teacher" ? "15" : "32"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-purple-500" />
                      {userType === "teacher" ? "Generated 45 resources" : "This month"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {userType === "teacher" ? "Upcoming Events" : "Upcoming Deadlines"}
                    </CardDescription>
                    <CardTitle className="text-3xl">
                      {userType === "teacher" ? "3" : "4"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-orange-500" />
                      Next: {userType === "teacher" ? "Staff Meeting (Today)" : "Physics Quiz (Tomorrow)"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
          
          {/* Recent Activity Preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <Button variant="ghost" size="sm">
                See all
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[1, 2, 3].map((item, index) => (
                    <motion.div 
                      key={index}
                      initial="hidden"
                      animate="visible"
                      variants={fadeIn}
                      transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        {index === 0 ? <Brain className="h-5 w-5" /> : 
                         index === 1 ? <PenBox className="h-5 w-5" /> :
                         <BookOpen className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {userType === "teacher" ? 
                            (index === 0 ? "Generated a new lesson plan" : 
                             index === 1 ? "Updated whiteboard session" : 
                             "Uploaded 3 new resources") : 
                            (index === 0 ? "Completed AI study session" : 
                             index === 1 ? "Participated in whiteboard discussion" : 
                             "Accessed study materials")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {index === 0 ? "2 hours ago" : index === 1 ? "Yesterday" : "2 days ago"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {userType === "teacher" ? "Your teaching schedule for the day" : "Your class schedule for the day"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "9:00 AM - 10:30 AM", title: userType === "teacher" ? "Physics - Grade 10A" : "Physics Class" },
                  { time: "11:00 AM - 12:30 PM", title: userType === "teacher" ? "Staff Meeting" : "Mathematics Class" },
                  { time: "2:00 PM - 3:30 PM", title: userType === "teacher" ? "Physics - Grade 11B" : "Chemistry Lab" },
                ].map((event, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-24 text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {event.time.split(" - ")[0]}
                    </div>
                    <div className="ml-2 h-full w-1 bg-primary rounded-full"></div>
                    <div className="ml-4">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {userType === "teacher" ? "Room 101" : "Room 101"} • {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>A detailed log of your recent activities on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { 
                    date: "Today", 
                    activities: [
                      { icon: Brain, title: userType === "teacher" ? "Generated physics quiz" : "Completed practice questions", time: "2 hours ago" },
                      { icon: BookOpen, title: userType === "teacher" ? "Uploaded lecture notes" : "Downloaded study materials", time: "3 hours ago" },
                    ]
                  },
                  { 
                    date: "Yesterday", 
                    activities: [
                      { icon: PenBox, title: userType === "teacher" ? "Hosted whiteboard session" : "Joined whiteboard session", time: "May 3, 10:30 AM" },
                      { icon: BarChart3, title: userType === "teacher" ? "Reviewed class performance" : "Checked grade report", time: "May 3, 2:15 PM" },
                    ]
                  }
                ].map((day, dayIndex) => (
                  <div key={dayIndex} className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      {day.date}
                    </h3>
                    <div className="space-y-3">
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex} className="flex items-start gap-4 bg-accent/50 rounded-lg p-3">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <activity.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}