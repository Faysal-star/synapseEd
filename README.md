
# 📝 SynapseEd - Next-Generation AI-Powered Learning Platform

<div align="center">

![SynapseEd Logo](https://img.shields.io/badge/SynapseEd-AI%20Learning-blue)

</div>

---

## 🌟 Overview

**SynapseEd** is a cutting-edge educational platform that revolutionizes learning through advanced AI technologies. It enables real-time collaboration, intelligent content generation, and highly personalized learning experiences to empower both students and educators.

---

## 🛠️ Tech Stack

### 🧩 Frontend Architecture

| Category | Technologies |
| --- | --- |
| Core Framework | Next.js 15.2.4 , TypeScript |
| UI/UX | Radix UI, TailwindCSS, Shadcn/ui, Framer Motion |
| Real-time Features | Socket.IO, Server-Sent Events (SSE), Server-Side Rendering (SSR) |

### 🧪 Backend Architecture

| Category | Technologies |
| --- | --- |
| API Framework | Flask, eventlet, NEXT.js |
| AI/ML Stack | LangChain, LangGraph, OpenAI, Gemini, Groq, Hugging Face Transformers, Tavily |
| Custom Model | LoRA Fine-Tuned Gemma Model |
| Vector Database | FAISS |
| Real-time Infra | WebSocket |

### 🗃️ Database & Storage

| Component | Technologies |
| --- | --- |
| Primary Database | Supabase PostgreSQL |
| ORM & Realtime | Prisma ORM, Supabase (Auth & Realtime) |

---

## ✨ Key Features

### 🤖 AI-Powered Learning

| Feature | Description |
| --- | --- |
| **Intelligent Content Gen.** | Dynamic lecture planning, content summarization, class-chat AI |
| **Personalized Learning** | Progress analytics, performance insights |
| **AI Counselor** | Personalized feedback based on progress and performance |

---

### ✒️ AI-Assisted Exam System

| **Feature** | **Description** |
| --- | --- |
| **Question Generation** | Teachers upload class content (PDF, notes); AI generates MCQs with options, answers, hints, and solutions. |
| **Exam Creation** | Auto-generates structured exams from approved questions. |
| **Anti-Cheat System** | Clipboard tracking, tab-switch detection, and webcam-based eye movement monitoring. |
| **Student Analysis** | Per-question time tracking and topic-wise strength/weakness analysis post-exam. |
| **Class Analytics** | Teachers get comprehensive performance metrics across the class. |
---

### 🧠 Viva & Evaluation Tools

| Feature | Description |
| --- | --- |
| **AI Viva Simulation** | Real-time oral exam simulation, AI verbal response & feedback |
| **Instant Evaluation** | Real-time assessment with improvement suggestions |

---

### 🧾 Interactive & Collaborative Tools

| Feature | Description |
| --- | --- |
| **Virtual Whiteboard** | AI-powered, interactive & collaborative |
| **Shared Docs & Brainstorming** | Multi-user real-time collaboration tools |
| **Diagram & Summary Tools** | Instant class diagram & summary generation |

---

### 🔍 AI Paradigms

| Paradigm | Capabilities |
| --- | --- |
| **Retrieval-Augmented Generation (RAG)** | Semantic chunking, metadata enrichment, vector search, context retrieval |
| **Agentic Architecture** | Multi-agent task decomposition, parallelism, error handling, web crawling |
| **LangGraph Workflows** | Graph-based execution, state management, error recovery |

---

## 📚 API Documentation

### Content Generation

| Endpoint | Description |
| --- | --- |
| `POST /api/content-gen/pdf/generate` | Generate lecture content in PDF format |

### Lecture Planning

| Endpoint | Description |
| --- | --- |
| `POST /api/lecture-planner/generate` | Generate new lecture plan |
| `GET/DELETE /api/lecture-planner/{plan_id}` | Retrieve/Delete specific plan |
| `PUT /api/lecture-planner/{plan_id}/topics` | Update lecture topics |
| `PUT /api/lecture-planner/{plan_id}/teaching-methods` | Update teaching methods |
| `PUT /api/lecture-planner/{plan_id}/resources` | Update resources |
| `PUT /api/lecture-planner/{plan_id}/learning-objectives` | Update learning objectives |

### Question Generation

| Endpoint | Description |
| --- | --- |
| `POST /api/q-gen/upload` | Upload PDF to generate questions |
| `GET /api/q-gen/status/{job_id}` | Check generation status |
| `GET /api/q-gen/questions/{job_id}` | Retrieve generated questions |

### Viva Examination

| Endpoint | Description |
| --- | --- |
| `POST /api/viva/start` | Start a new viva session |
| `POST /api/viva/chat` | Process interaction during viva |
| `POST /api/viva/cleanup` | Clean up session data and audio |

### Web Search & Memory

| Endpoint | Description |
| --- | --- |
| `POST /api/web-search/search` | Perform AI-enhanced web search |
| `POST /api/web-search/memory-stats` | Retrieve memory and user profile info |
| `POST /api/web-search/feedback` | Submit feedback for AI search responses |
> [Incomplete Documentation]
---

### 🔧 Sample Requests

#### 📄 Generate PDF Content

```json
{
  "topic": "Introduction to Quantum Computing",
  "additional_context": "Focus on basic concepts",
  "sections": ["Overview", "Key Concepts", "Applications"],
  "llm_provider": "openai"
}
```

#### 🎤 Start VIVA Session

```json
{
  "subject": "Computer Science",
  "topic": "Data Structures",
  "difficulty": "medium",
  "voice": "onyx"
}
```

#### 🔎 Web Search

```json
{
  "message": "Explain quantum computing basics",
  "conversation_id": "conv_123",
  "context": {
    "user_level": "beginner"
  }
}
```
> [Incomplete Documentation]
---

## 🚀 Getting Started

### 1\. Prerequisites

```bash
Node.js >= 20
Python >= 3.11
```

### 2\. Frontend Setup

```bash
cd frontend
pnpm install
pnpm run db
pnpm run dev:all
```

### 3\. Backend Setup

```bash
cd agents
python -m venv .venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 4\. Environment Setup

```bash
cp .env.example .env
# Fill in your environment variables
```

### 5\. Access the Platform

-   **Frontend**: [http://localhost:3000](http://localhost:3000)
    
-   **Backend**: [http://localhost:5000](http://localhost:5000)
    

---

## 👨‍💻 Contributors

|✒️| Name | GitHub |
|--- | ---  | --- |
|<img src="https://github.com/faysal-star.png" width="70px" style="border-radius: 50%;" alt="Faysal"/>| Faysal Mahmud  | [Faysal-star](https://github.com/Faysal-star) |
|<img src="https://github.com/iq-bal.png" width="70px" style="border-radius: 50%;" alt="Iqbal"/>| Iqbal Mahamud  | [iq-bal](https://github.com/iq-bal) |
|<img src="https://github.com/taut0logy.png" width="70px" style="border-radius: 50%;" alt="Raufun"/>| Raufun Ahsan |[taut0logy](https://github.com/taut0logy) |
|<img src="https://github.com/abirzishan32.png" width="70px" style="border-radius: 50%;" alt="Abir"/>| Abir Rahman | [abirzishan32](https://github.com/abirzishan32) |
|<img src="https://github.com/SakiburRahman07.png" width="70px" style="border-radius: 50%;" alt="Sakibur"/>| MD Sakibur Rahman | [SakiburRahman07](https://github.com/SakiburRahman07) |
---

<div align="center">

✨ Made with ❤️ by the SynapseEd Team ✨

</div>
