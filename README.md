# SynapseEd - Next-Generation AI-Powered Learning Platform 🚀

<div align="center">

![SynapseEd Logo](https://img.shields.io/badge/SynapseEd-AI%20Learning-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

</div>

## 🌟 Overview

SynapseEd is a cutting-edge educational platform that revolutionizes learning through advanced AI technologies. Our platform seamlessly integrates real-time collaboration, intelligent content generation, and personalized learning experiences to create an engaging and effective educational environment.

## 🛠️ Tech Stack

### Frontend Architecture
- **Core Framework**: 
  - Next.js 15.2.4 (App Router)
  - React 19 with Server Components
  - TypeScript for type safety
- **UI/UX**: 
  - Radix UI for accessible components
  - TailwindCSS with custom design system
  - Framer Motion for fluid animations
  - Shadcn/ui for modern components
- **State Management**: 
  - React Query for server state
  - Zustand for client state
  - React Context for theme/auth
- **Real-time Features**: 
  - Socket.IO for real-time communication
  - Server-Sent Events for live updates

### Backend Architecture
- **API Framework**: 
  - Flask
  - eventlet
- **AI/ML Stack**: 
  - LangChain for AI orchestration
  - OpenAI 
  - Google's Gemini Pro for multimodal tasks
  - Groq for ultra-fast inference
  - Hugging Face Transformers
  - Tavily for Web search

- **Image Processing**:
  - Gemini 2.5 Flash
- **Vector Database**: 
  - FAISS for local similarity search
- **Real-time Infrastructure**:
  - WebSocket for live updates

### Database & Storage
- **Primary Database**: 
  - PostgreSQL 
  - Prisma ORM for type-safe queries
  - Supabase for auth and real-time

## ✨ Features

### 🤖 AI-Powered Learning
- **Intelligent Content Generation**
  - Dynamic lecture planning with AI
  - Smart question generation
  - Automated exam preparation
  - Content summarization
- **Personalized Learning**
  - Adaptive learning paths
  - Progress analytics
  - Custom study materials
  - Performance insights

### 🎯 Interactive Learning
- **Real-time Collaboration**
  - Virtual whiteboard
  - Interactive diagrams

### 🔄 Real-time Features
- **Collaborative Tools**
  - Shared documents
  - Real-time editing

## 🧠 AI Paradigms

### Retrieval-Augmented Generation (RAG)
- **Advanced Chunking**
  - Semantic text splitting
  - Context preservation
  - Metadata enrichment
  - Hierarchical structure
- **Knowledge Integration**
  - Vector embeddings
  - Semantic search
  - Context retrieval
  - Source validation

### Agentic Architecture
- **Multi-Agent System**
  - Task decomposition
  - Parallel processing
  - Error recovery
  - State management
- **Intelligent Search**
  - Web crawling
  - Content verification
  - Source validation
  - Knowledge synthesis

### Graph-Based Execution
- **LangGraph Workflows**
  - State management
  - Parallel processing
  - Error handling
  - Recovery mechanisms

## 📚 API Documentation

### Content Generation
- **Generate PDF Content**
  ```http
  POST /api/content-gen/pdf/generate
  ```
  Generate lecture content in PDF format with customizable sections and LLM providers.

### Lecture Planning
- **Create Lecture Plan**
  ```http
  POST /api/lecture-planner/generate
  ```
  Generate a new lecture plan with customizable difficulty levels.

- **Manage Lecture Plan**
  ```http
  GET /api/lecture-planner/{plan_id}
  DELETE /api/lecture-planner/{plan_id}
  ```
  Retrieve or delete specific lecture plans.

- **Update Lecture Components**
  ```http
  PUT /api/lecture-planner/{plan_id}/topics
  PUT /api/lecture-planner/{plan_id}/teaching-methods
  PUT /api/lecture-planner/{plan_id}/resources
  PUT /api/lecture-planner/{plan_id}/learning-objectives
  ```
  Update various aspects of a lecture plan including topics, teaching methods, resources, and learning objectives.

### Question Generation
- **Upload PDF for Questions**
  ```http
  POST /api/q-gen/upload
  ```
  Upload PDF files to generate questions with customizable parameters.

- **Check Generation Status**
  ```http
  GET /api/q-gen/status/{job_id}
  GET /api/q-gen/questions/{job_id}
  ```
  Monitor question generation progress and retrieve generated questions.

### VIVA Examination
- **Start VIVA Session**
  ```http
  POST /api/viva/start
  ```
  Initialize a new VIVA examination session with customizable difficulty and voice settings.

- **Process VIVA Interaction**
  ```http
  POST /api/viva/chat
  ```
  Handle user input (text or audio) during VIVA sessions.

- **Cleanup Session**
  ```http
  POST /api/viva/cleanup
  ```
  Clean up session data and associated audio files.

### Web Search & Memory
- **Perform Web Search**
  ```http
  POST /api/web-search/search
  ```
  Execute web searches with AI-generated responses and citations.

- **Memory Management**
  ```http
  POST /api/web-search/memory-stats
  ```
  Retrieve memory statistics and user profile information.

- **Provide Feedback**
  ```http
  POST /api/web-search/feedback
  ```
  Submit feedback for search responses.

### Request/Response Examples

#### Generate PDF Content
```json
{
  "topic": "Introduction to Quantum Computing",
  "additional_context": "Focus on basic concepts",
  "sections": ["Overview", "Key Concepts", "Applications"],
  "llm_provider": "openai"
}
```

#### Start VIVA Session
```json
{
  "subject": "Computer Science",
  "topic": "Data Structures",
  "difficulty": "medium",
  "voice": "onyx"
}
```

#### Web Search
```json
{
  "message": "Explain quantum computing basics",
  "conversation_id": "conv_123",
  "context": {
    "user_level": "beginner"
  }
}
```

For detailed API specifications and schema definitions, visit our [API Documentation](https://docs.synapseed.com/api).

## 🚀 Getting Started

1. **Prerequisites**
   ```bash
   Node.js >= 20
   Python >= 3.11
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   pnpm install
   pnpm run dev:all
   ```

3. **Backend Setup**
   ```bash
   cd agents
   python -m venv .venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   python app.py #Run the app
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

5. **Site Link**

The site will run on `http://localhost:3000` for the frontend and `http://localhost:5000` for the backend.


<div align="center">
Made with ❤️ by the SynapseEd Team
</div>
