"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Brain, MessageSquare, Heart, FileText, PenTool, Users, MessageCircle, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: <Brain className="h-10 w-10 text-purple-500" />,
    title: "Dynamic Content Retrieval",
    description: "Intelligent content retrieval and question generation tailored to individual learning needs.",
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-blue-500" />,
    title: "Agentic Chat with Web Search",
    description:
      "AI-powered chat assistant with web search capabilities to provide accurate and up-to-date information.",
  },
  {
    icon: <Heart className="h-10 w-10 text-pink-500" />,
    title: "AI-Powered Smart Counseling",
    description: "Support student well-being with intelligent counseling that adapts to individual needs.",
  },
  {
    icon: <FileText className="h-10 w-10 text-green-500" />,
    title: "Smart Lecture Plan Generator",
    description: "Help teachers create engaging and effective lecture plans with AI-powered suggestions.",
  },
  {
    icon: <PenTool className="h-10 w-10 text-amber-500" />,
    title: "AI-Integrated Smart Whiteboard",
    description: "Collaborate in real-time with an intelligent whiteboard that enhances creativity and learning.",
  },
  {
    icon: <Users className="h-10 w-10 text-indigo-500" />,
    title: "Enhanced Classroom Management",
    description: "Streamline communication and management tools for more efficient classroom operations.",
  },
  {
    icon: <MessageCircle className="h-10 w-10 text-teal-500" />,
    title: "Collaborative AI for Peer Learning",
    description: "Foster collaboration among students with AI-facilitated peer learning experiences.",
  },
]

export function FeatureSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-muted/30 dark:bg-muted/10 -z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"></div>
      
      <div className="container px-4 md:px-6 relative">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium border border-border/50 shadow-sm"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 text-purple-500" />
            <span>Powerful Features</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl"
          >
            <span className="inline bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">Intelligent Tools</span> for Modern Education
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-lg/relaxed xl:text-xl/relaxed"
          >
            SynapseED offers a comprehensive suite of AI-powered tools designed to enhance the educational experience
            for both students and teachers.
          </motion.p>
        </div>
        
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 hover:border-purple-500/30 overflow-hidden group bg-background/70 backdrop-blur-sm border-border/60">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader>
                  <div className="p-3 w-fit rounded-2xl bg-muted group-hover:bg-muted/80 transition-colors duration-300 shadow-sm border border-border/40">
                    {feature.icon}
                  </div>
                  <CardTitle className="mt-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-5xl mx-auto"
        >
          {[
            { value: "500+", label: "Schools" },
            { value: "10k+", label: "Teachers" },
            { value: "250k+", label: "Students" },
            { value: "98%", label: "Satisfaction" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-6 bg-background/70 backdrop-blur-sm border border-border/60 rounded-2xl">
              <div className="text-2xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-purple-600 to-indigo-600">{stat.value}</div>
              <div className="text-sm md:text-base text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
