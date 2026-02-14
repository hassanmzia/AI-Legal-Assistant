# AI Legal Assistant

A professional-grade, multi-agent AI legal analysis platform built with MCP (Model Context Protocol) and A2A (Agent-to-Agent) protocols. The system leverages LangGraph's ReAct pattern for comprehensive legal case analysis, including precedent search, loophole detection, risk assessment, contract review, and compliance checking.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Services & Ports](#services--ports)
- [AI Agent System](#ai-agent-system)
- [API Documentation](#api-documentation)
- [Frontend Pages](#frontend-pages)
- [Data Models](#data-models)
- [MCP Protocol](#mcp-protocol)
- [A2A Protocol](#a2a-protocol)
- [Evaluation Framework](#evaluation-framework)
- [Seeding Data](#seeding-data)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Features

### AI-Powered Legal Analysis
- **LangGraph ReAct Agent** - State-of-the-art agent workflow with iterative tool use and reasoning
- **RAG Search** - Retrieval-Augmented Generation using ChromaDB vector store for legal precedent matching
- **Web Search** - Real-time legal research via Tavily API for recent cases and developments
- **Loophole Detection** - AI-powered identification of procedural loopholes, evidentiary gaps, and jurisdictional issues
- **Risk Assessment** - Probability estimates, risk scoring, and mitigation strategies
- **Contract Review** - Clause analysis, compliance checking, and recommendation generation
- **Compliance Check** - Regulatory compliance verification across federal, state, and industry standards

### Multi-Agent Orchestration
- **MCP Protocol** - Model Context Protocol for exposing tools and resources to external agents
- **A2A Protocol** - Agent-to-Agent communication for task delegation and result aggregation
- **6 Specialized Agents** - Legal Analyst, Research Agent, Loophole Detector, Risk Assessor, Contract Reviewer, Supervisor
- **Supervisor Agent** - Coordinates multi-agent workflows and synthesizes results

### Case Management
- Full CRUD for legal cases with case numbers, types, priorities, and status tracking
- Case text storage for AI analysis
- Document attachment and management
- Timeline tracking for case events
- AI analysis history per case

### Client Management
- Client profiles with contact information and organization details
- Case association and history
- Client portal (read-only access for client role users)

### Document Management
- File upload with type classification (pleading, motion, brief, contract, evidence, correspondence)
- Content extraction and vectorization for RAG search
- ChromaDB integration for semantic document search

### Chat Interface
- Real-time AI chat powered by the LangGraph agent
- Session management with conversation history
- Tool call visualization showing agent reasoning
- Case-linked chat sessions for contextual analysis

### Billing & Time Tracking
- Time entry management with hourly rates
- Billed/unbilled status tracking
- Summary statistics (total billed, unbilled, hours, average rate)

### Evaluation Framework
- **Tool Correctness** - Validates the agent used appropriate tools
- **Task Completion** - Checks all analysis aspects were covered
- **Answer Relevancy** - Measures response relevance to the query
- **Content Coverage** - Grades analysis depth across categories (A-F grading scale)

### Security & Authentication
- JWT authentication with automatic token refresh
- Role-based access control (Admin, Attorney, Paralegal, Client)
- Service-to-service authentication via API key
- CORS protection, rate limiting, security headers
- Audit logging for all significant actions

---

## Architecture Overview

```
                                    +-------------------+
                                    |    Browser/User   |
                                    +--------+----------+
                                             |
                                    HTTP (Port 3048)
                                             |
                                +------------v-----------+
                                |    Nginx Reverse Proxy  |
                                |      (Port 3048:80)     |
                                +---+-------+--------+---+
                                    |       |        |
                    /api/           |  /    |        | /orchestrator/
                    +-------+       |       |        +--------+
                    |               |       |                 |
           +--------v--------+ +----v------+---+ +-----------v----------+
           | Django Backend   | | React Frontend | | Node.js Orchestrator |
           | (Port 8052:8000) | | (Port 3164:80) | | (Port 3057:3001)     |
           +--+----+----+----+ +----------------+ +----+--------+--------+
              |    |    |                              |        |
              |    |    |         +---------+          |   WebSocket
              |    |    +-------->|  Redis  |<---------+   (Real-time)
              |    |              | (6392)  |
              |    |              +---------+
              |    |
              |    +------------------------+
              |                             |
    +---------v----------+    +-------------v-----------+
    |    PostgreSQL       |    |       ChromaDB          |
    | (Port 5488:5432)   |    |   (Port 8147:8000)      |
    | pgvector extension |    |   Vector Store / RAG     |
    +--------------------+    +-------------------------+
              |
    +---------v-----------+
    | Celery Worker/Beat  |
    | (Async Processing)  |
    +---------------------+

External APIs:
    - OpenAI API (GPT-4o-mini, text-embedding-3-small)
    - Tavily API (Web Search)
```

### Architecture Diagrams

Detailed architecture diagrams are available in the `docs/` directory:
- `docs/architecture.drawio` - Interactive Draw.io diagram (open with draw.io or diagrams.net)
- `docs/architecture.pptx` - PowerPoint presentation with detailed architecture slides

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.3.1 |
| | TypeScript | 4.9.5 |
| | Tailwind CSS | 3.x |
| | Axios | 1.x |
| | React Router | 6.x |
| | React Icons | 4.12.0 |
| **Backend** | Python | 3.11 |
| | Django | 5.x |
| | Django REST Framework | 3.15.x |
| | LangGraph | Latest |
| | LangChain | Latest |
| | Celery | 5.x |
| | Gunicorn | 23.x |
| **Orchestrator** | Node.js | 20.x |
| | Express | 4.x |
| | TypeScript | 5.x |
| | Winston | 3.x |
| **AI/ML** | OpenAI GPT-4o-mini | Latest |
| | OpenAI Embeddings | text-embedding-3-small |
| | ChromaDB | Latest |
| | Tavily Search | Latest |
| | DeepEval | Latest |
| **Databases** | PostgreSQL | 16 (pgvector) |
| | Redis | 7 (Alpine) |
| | ChromaDB | Latest |
| **Infrastructure** | Docker & Docker Compose | Latest |
| | Nginx | Alpine |

---

## Project Structure

```
AI-Legal-Assistant/
├── docker-compose.yml              # Multi-service orchestration (9 services)
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── nginx/
│   └── nginx.conf                  # Reverse proxy configuration
│
├── backend/                        # Django Backend API
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── init.sql                    # PostgreSQL initialization
│   ├── config/
│   │   ├── settings.py             # Django settings (DB, JWT, CORS, Celery)
│   │   ├── urls.py                 # Root URL configuration
│   │   ├── celery.py               # Celery app configuration
│   │   ├── wsgi.py                 # WSGI entry point
│   │   └── asgi.py                 # ASGI entry point
│   └── legal_assistant/
│       ├── models.py               # 10 Django models (User, Case, Client, etc.)
│       ├── admin.py                # Django admin configuration
│       ├── tasks.py                # Celery async tasks
│       ├── agents/
│       │   ├── graph.py            # LangGraph StateGraph (ReAct agent workflow)
│       │   ├── tools.py            # 6 AI tools (RAG, web search, analysis, etc.)
│       │   ├── rag.py              # ChromaDB RAG integration
│       │   └── evaluation.py       # DeepEval evaluation suite
│       ├── api/
│       │   ├── views.py            # DRF ViewSets and API views
│       │   ├── serializers.py      # DRF serializers for all models
│       │   ├── urls.py             # API URL routing
│       │   ├── permissions.py      # Role-based permission classes
│       │   ├── authentication.py   # Service key authentication backend
│       │   └── filters.py          # Django filter backends
│       ├── mcp/
│       │   ├── server.py           # MCP protocol endpoints
│       │   └── urls.py             # MCP URL routing
│       └── management/commands/
│           └── seed_data.py        # Database seeding (7 legal precedents)
│
├── frontend/                       # React Frontend
│   ├── Dockerfile                  # Multi-stage build (Node → Nginx)
│   ├── nginx.conf                  # Frontend Nginx config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx                 # Route definitions (14 routes)
│       ├── index.tsx               # React entry point
│       ├── contexts/
│       │   └── AuthContext.tsx      # JWT auth state management
│       ├── services/
│       │   ├── api.ts              # Axios instances (Django + Orchestrator)
│       │   ├── auth.ts             # Login, register, token management
│       │   ├── cases.ts            # Case CRUD + analysis trigger
│       │   ├── chat.ts             # Chat session management
│       │   ├── analysis.ts         # Analysis CRUD + evaluation
│       │   ├── documents.ts        # Document upload + vectorization
│       │   └── agents.ts           # Agent management service
│       ├── components/
│       │   ├── dashboard/          # Dashboard with stats and charts
│       │   ├── cases/              # Case list, detail, form (3 components)
│       │   ├── documents/          # Document list + upload (2 components)
│       │   ├── chat/               # AI chat interface
│       │   ├── analysis/           # Analysis panel + history (2 components)
│       │   ├── evaluation/         # Evaluation scores display
│       │   ├── agents/             # A2A agent management + testing
│       │   ├── clients/            # Client CRUD management
│       │   ├── billing/            # Billing & time tracking
│       │   ├── settings/           # User profile & preferences
│       │   ├── layout/             # Header, sidebar, layout (3 components)
│       │   └── common/             # Reusable UI components (5 components)
│       ├── pages/
│       │   ├── LoginPage.tsx       # JWT login
│       │   └── RegisterPage.tsx    # User registration with role selection
│       ├── hooks/
│       │   └── useApi.ts           # Custom data fetching hook
│       └── types/
│           └── index.ts            # TypeScript interfaces (15+ types)
│
├── orchestrator/                   # Node.js Orchestrator
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Express server + WebSocket setup
│       ├── a2a/
│       │   └── server.ts           # A2A protocol (agents, tasks, orchestration)
│       ├── mcp/
│       │   └── server.ts           # MCP protocol proxy
│       ├── agents/
│       │   └── supervisor.ts       # Supervisor agent for multi-agent workflows
│       ├── routes/
│       │   └── health.ts           # Health check endpoint
│       ├── services/
│       │   ├── redis.ts            # Redis pub/sub service
│       │   ├── backend.ts          # Django backend client
│       │   └── logger.ts           # Winston logger (circular-safe)
│       └── types/
│           └── index.ts            # TypeScript interfaces
│
└── docs/                           # Documentation
    ├── architecture.drawio         # Draw.io architecture diagram
    └── architecture.pptx           # PowerPoint presentation
```

---

## Prerequisites

- **Docker** and **Docker Compose** (v2.x+)
- **OpenAI API Key** - Required for AI analysis (GPT-4o-mini)
- **Tavily API Key** - Required for web search (get one at [tavily.com](https://tavily.com))
- At least **4GB RAM** available for Docker

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AI-Legal-Assistant
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your API keys:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
TAVILY_API_KEY=tvly-your-tavily-api-key-here
```

### 3. Start All Services

```bash
docker compose up -d --build
```

This starts 9 services:
- PostgreSQL, Redis, ChromaDB (data stores)
- Django Backend (API + AI agents)
- Celery Worker + Celery Beat (async processing)
- Node.js Orchestrator (MCP + A2A)
- React Frontend (UI)
- Nginx (reverse proxy)

### 4. Verify Services

```bash
# Check all services are running
docker compose ps

# Check health
curl http://localhost:3048/api/health/
```

### 5. Seed Legal Knowledge Base

```bash
docker compose exec backend python manage.py seed_data
```

This loads 7 legal precedent documents into ChromaDB for RAG search:
- Force majeure contract cases
- Breach of contract precedents
- Notice requirement cases
- Statute of limitations rulings
- Employment law precedents
- Intellectual property cases
- Real estate dispute cases

### 6. Access the Application

Open your browser and navigate to:

```
http://172.168.1.95:3048
```

Register a new account (select "Attorney" or "Admin" role for full access).

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini | Required |
| `OPENAI_MODEL` | OpenAI model name | `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `TAVILY_API_KEY` | Tavily search API key | Required |
| `POSTGRES_PASSWORD` | PostgreSQL password | `legal_secure_pass_2024` |
| `DJANGO_SECRET_KEY` | Django secret key | Auto-generated |
| `DJANGO_DEBUG` | Debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hostnames | `localhost,127.0.0.1,backend,172.168.1.95` |
| `SERVICE_API_KEY` | Internal service auth key | `legal-assistant-internal-service-key-2024` |
| `JWT_SECRET_KEY` | JWT signing key | Auto-generated |
| `JWT_EXPIRATION_HOURS` | JWT token lifetime | `24` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `CHROMA_HOST` | ChromaDB hostname | `chromadb` |
| `CHROMA_PORT` | ChromaDB port | `8000` |

---

## Services & Ports

All services use non-default ports to avoid conflicts:

| Service | Internal Port | External Port | Description |
|---------|--------------|---------------|-------------|
| **Nginx** | 80 | **3048** | Main entry point (reverse proxy) |
| **Frontend** | 80 | 3164 | React SPA (served by Nginx) |
| **Backend** | 8000 | 8052 | Django REST API |
| **Orchestrator** | 3001 | 3057 | Node.js MCP + A2A server |
| **PostgreSQL** | 5432 | 5488 | Primary database |
| **Redis** | 6379 | 6392 | Cache + message broker |
| **ChromaDB** | 8000 | 8147 | Vector database |
| **Celery Worker** | - | - | Async task processing |
| **Celery Beat** | - | - | Scheduled task scheduler |

### URL Routing (Nginx)

| Path | Destination | Description |
|------|------------|-------------|
| `/` | Frontend (port 80) | React SPA |
| `/api/` | Backend (port 8000) | Django REST API |
| `/api/auth/` | Backend (rate limited) | Authentication endpoints |
| `/orchestrator/` | Orchestrator (port 3001) | MCP + A2A API |
| `/ws/` | Orchestrator WebSocket | Real-time updates |
| `/admin/` | Backend | Django admin panel |
| `/static/admin/` | Static volume | Django admin assets |
| `/media/` | Media volume | Uploaded files |

---

## AI Agent System

### LangGraph ReAct Pattern

The core AI engine uses LangGraph's StateGraph with a ReAct (Reasoning + Acting) pattern:

```
                    +------------------+
                    |   Human Message  |
                    +--------+---------+
                             |
                    +--------v---------+
                    |    Agent Node    |
                    | (LLM + System   |
                    |   Prompt)        |
                    +--------+---------+
                             |
                    +--------v---------+
                    | Should Continue? |
                    +---+----------+---+
                        |          |
                  tool_calls    no tools
                        |          |
               +--------v---+  +---v----+
               | Tool Node  |  |  END   |
               | (Execute)  |  +--------+
               +--------+---+
                        |
                        +---> Back to Agent Node
                              (max 10 iterations)
```

### Agent State

```python
class AgentState(TypedDict):
    messages: list          # Conversation history
    case_text: str          # Legal case or query text
    final_analysis: str     # Final synthesized analysis
    analysis_type: str      # Type of analysis requested
    tools_used: list        # Record of tool invocations
    iteration_count: int    # Loop counter (max 10)
```

### Available Tools

| Tool | Description | Data Source |
|------|------------|-------------|
| `rag_search_tool` | Search legal precedents via vector similarity | ChromaDB |
| `tavily_web_search_tool` | Search web for recent legal developments | Tavily API |
| `analyze_loopholes_tool` | Identify legal loopholes and weaknesses | OpenAI LLM |
| `risk_assessment_tool` | Assess risks with probability estimates | OpenAI LLM |
| `contract_review_tool` | Review contracts for issues and compliance | OpenAI LLM |
| `compliance_check_tool` | Check regulatory compliance status | OpenAI LLM |

### Analysis Types

| Type | Description | Tools Used |
|------|------------|------------|
| `full_analysis` | Comprehensive legal analysis | All tools |
| `loophole_detection` | Find case weaknesses | loophole + RAG |
| `precedent_search` | Find relevant precedents | RAG + web search |
| `risk_assessment` | Evaluate legal risks | risk + loophole |
| `contract_review` | Review contract terms | contract + compliance |
| `compliance_check` | Check regulatory compliance | compliance + web search |

---

## API Documentation

### Authentication

```bash
# Register
POST /api/auth/register/
{
  "username": "john",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "attorney"
}

# Login (get JWT tokens)
POST /api/auth/token/
{
  "username": "john",
  "password": "SecurePass123!"
}
# Returns: { "access": "...", "refresh": "..." }

# Refresh token
POST /api/auth/token/refresh/
{ "refresh": "..." }

# Get current user
GET /api/users/me/
```

### Cases

```bash
GET    /api/cases/                    # List cases (paginated)
POST   /api/cases/                    # Create case
GET    /api/cases/{id}/               # Get case detail
PATCH  /api/cases/{id}/               # Update case
DELETE /api/cases/{id}/               # Delete case
POST   /api/cases/{id}/run_analysis/  # Trigger AI analysis
```

### Analysis

```bash
GET    /api/analyses/                 # List analyses
POST   /api/analyses/                 # Create analysis (requires case_id or input_text)
GET    /api/analyses/{id}/            # Get analysis detail
POST   /api/analyses/{id}/evaluate/   # Re-run evaluation
```

### Chat

```bash
GET    /api/chat-sessions/                       # List sessions
POST   /api/chat-sessions/                       # Create session
GET    /api/chat-sessions/{id}/                   # Get session with messages
GET    /api/chat-sessions/{id}/messages/          # Get messages
POST   /api/chat-sessions/{id}/send_message/      # Send message (triggers AI)
DELETE /api/chat-sessions/{id}/                   # Delete session
```

### Documents

```bash
GET    /api/documents/              # List documents
POST   /api/documents/              # Upload document
GET    /api/documents/{id}/         # Get document
DELETE /api/documents/{id}/         # Delete document
POST   /api/documents/{id}/vectorize/  # Vectorize for RAG
```

### Clients

```bash
GET    /api/clients/                # List clients
POST   /api/clients/                # Create client
PATCH  /api/clients/{id}/           # Update client
DELETE /api/clients/{id}/           # Delete client
```

### Billing

```bash
GET    /api/billing/                # List entries
POST   /api/billing/                # Create entry
PATCH  /api/billing/{id}/           # Update entry (toggle billed status)
```

### Dashboard

```bash
GET    /api/dashboard/              # Get dashboard statistics
```

### Health Check

```bash
GET    /api/health/                 # Service health status
```

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Stats cards, charts, quick actions, recent items |
| **Cases** | `/cases` | Case list with search, filter, sort, pagination |
| **Case Detail** | `/cases/:id` | 6-tab view: Overview, Documents, Timeline, Analysis, Billing, Chat |
| **New Case** | `/cases/new` | Case creation form |
| **Edit Case** | `/cases/:id/edit` | Case edit form |
| **Documents** | `/documents` | Document list with upload, type filter, vectorization |
| **Chat** | `/chat` | AI chat interface with session management |
| **Analysis** | `/analysis` | Analysis history with type filter and evaluation scores |
| **Agents** | `/agents` | A2A agent cards with status, capabilities, and test functionality |
| **Clients** | `/clients` | Client CRUD with search and modal forms |
| **Billing** | `/billing` | Time entries with summary cards and billed/unbilled filter |
| **Settings** | `/settings` | Profile editing, password change, preferences |
| **Login** | `/login` | JWT authentication |
| **Register** | `/register` | User registration with role selection |

---

## Data Models

### Core Models

| Model | Fields | Description |
|-------|--------|-------------|
| **User** | username, email, role, organization, bar_number | Extended AbstractUser with roles |
| **Client** | name, email, phone, address, organization, notes | Client profiles |
| **Case** | case_number, title, description, case_type, status, priority, case_text, ai_analysis, tags | Legal cases |
| **Document** | title, document_type, file, content_text, is_vectorized, vector_ids | Case documents |
| **ChatSession** | title, user, case, is_active | AI chat sessions |
| **ChatMessage** | session, role, content, tool_calls, metadata | Chat messages |
| **AnalysisResult** | case, analysis_type, input_text, result, summary, evaluation_scores, processing_time | AI analysis results |
| **CaseTimeline** | case, event_type, title, description, event_date | Case timeline events |
| **BillingEntry** | case, description, hours, rate, amount, is_billed | Time/billing entries |
| **AuditLog** | user, action, resource_type, resource_id, details, ip_address | Audit trail |

### User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access to all features and settings |
| **Attorney** | Create/edit cases, run analysis, manage documents, billing |
| **Paralegal** | View cases and documents, run searches, view analysis |
| **Client** | Read-only access to own cases |

---

## MCP Protocol

The MCP (Model Context Protocol) server exposes the backend's AI tools and resources to external agents:

### Endpoints

```bash
GET  /api/mcp/tools/              # List available tools
POST /api/mcp/tools/call/         # Execute a tool
GET  /api/mcp/resources/          # List available resources
GET  /api/mcp/resources/read/     # Read a resource
```

### Available MCP Tools

- `rag_search` - Search legal knowledge base
- `web_search` - Search web for legal information
- `analyze_loopholes` - Detect legal loopholes
- `assess_risk` - Assess legal risks
- `review_contract` - Review contract terms
- `check_compliance` - Check regulatory compliance

---

## A2A Protocol

The A2A (Agent-to-Agent) protocol enables multi-agent communication and orchestration:

### Endpoints

```bash
GET    /orchestrator/api/a2a/agents           # List all agents
GET    /orchestrator/api/a2a/agents/:id       # Get agent details
POST   /orchestrator/api/a2a/agents/register  # Register new agent
DELETE /orchestrator/api/a2a/agents/:id       # Deregister agent
POST   /orchestrator/api/a2a/tasks            # Submit task to agent
GET    /orchestrator/api/a2a/tasks/:id        # Get task status/result
POST   /orchestrator/api/a2a/orchestrate      # Multi-agent orchestration
POST   /orchestrator/api/a2a/messages         # Send inter-agent message
```

### Default Agents

| Agent ID | Name | Capabilities |
|----------|------|-------------|
| `legal-analyst` | Legal Analysis Agent | case_analysis, full_analysis, legal_research |
| `research-agent` | Legal Research Agent | precedent_search, legal_research, web_search |
| `loophole-detector` | Loophole Detection Agent | loophole_detection, weakness_analysis |
| `risk-assessor` | Risk Assessment Agent | risk_assessment, probability_estimation |
| `contract-reviewer` | Contract Review Agent | contract_review, compliance_check |
| `supervisor` | Supervisor Agent | orchestration, aggregation, routing |

---

## Evaluation Framework

The system includes a comprehensive evaluation framework inspired by DeepEval:

### Metrics

| Metric | Description | Scoring |
|--------|------------|---------|
| **Tool Correctness** | Were the right tools used for the analysis type? | 0-1.0 (pass/fail at 0.5) |
| **Task Completion** | Were all required analysis aspects covered? | 0-1.0 (pass/fail at 0.5) |
| **Answer Relevancy** | Is the response relevant to the legal query? | 0-1.0 (pass/fail at 0.5) |
| **Content Coverage** | How thoroughly are legal categories covered? | 0-1.0 per category |

### Grading Scale

| Grade | Score Range |
|-------|------------|
| A | >= 0.9 |
| B | >= 0.8 |
| C | >= 0.7 |
| D | >= 0.6 |
| F | < 0.6 |

### Content Coverage Categories

- Force Majeure Analysis
- Notice Requirements
- Burden of Proof
- Damages Assessment
- Procedural Issues
- Precedent Analysis
- Risk Assessment
- Compliance Review

---

## Seeding Data

Seed the database with sample legal precedent documents:

```bash
docker compose exec backend python manage.py seed_data
```

This populates ChromaDB with 7 legal knowledge base documents covering:
1. Force majeure defense in breach of contract
2. Commercial contract breach with notice requirements
3. Employment termination and wrongful dismissal
4. Intellectual property infringement cases
5. Real estate contract disputes
6. Medical malpractice liability
7. Consumer protection and warranty claims

---

## Development

### Running Individual Services

```bash
# Rebuild a specific service
docker compose up -d --build backend

# Restart a service (picks up code changes via volume mount)
docker compose restart backend

# View logs
docker compose logs -f backend
docker compose logs -f orchestrator
docker compose logs -f frontend

# Run Django management commands
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell
```

### Frontend Development

The frontend uses a multi-stage Docker build. To see changes:

```bash
# Rebuild frontend (required for React code changes)
docker compose up -d --build frontend
```

### Backend Development

The backend mounts `./backend:/app` as a volume, so Python code changes are reflected immediately after restarting gunicorn:

```bash
docker compose restart backend
```

### Orchestrator Development

The orchestrator requires a rebuild since TypeScript is compiled at build time:

```bash
docker compose up -d --build orchestrator
```

### API Schema

Access the auto-generated API documentation:

- **Swagger UI**: `http://172.168.1.95:3048/api/schema/swagger/`
- **ReDoc**: `http://172.168.1.95:3048/api/schema/redoc/`
- **OpenAPI Schema**: `http://172.168.1.95:3048/api/schema/`

---

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check container status
docker compose ps

# Check logs for errors
docker compose logs --tail 50

# Full rebuild
docker compose down && docker compose up -d --build
```

**Database tables missing:**
```bash
# The backend runs makemigrations + migrate on startup automatically
# If issues persist, run manually:
docker compose exec backend python manage.py makemigrations legal_assistant
docker compose exec backend python manage.py migrate
```

**Celery beat crash (table not found):**
The celery_beat service depends on backend with `service_healthy`, so it waits for migrations to complete. If it still fails:
```bash
docker compose restart celery_beat
```

**401 Unauthorized on agent tasks:**
Ensure `SERVICE_API_KEY` is set in both backend and orchestrator environments. Check docker-compose.yml has the key in both services' `environment` sections.

**OpenAI API errors:**
Ensure `OPENAI_API_KEY` is set to a valid key in `.env`. The agent will return an error message describing the API failure.

**RAG search returns empty results:**
Run `docker compose exec backend python manage.py seed_data` to populate the vector store.

**Frontend showing old content:**
React apps are compiled at Docker build time. Rebuild: `docker compose up -d --build frontend`

**Port conflicts:**
All services use non-default ports. If conflicts still occur, modify the port mappings in `docker-compose.yml`.

---

## License

This project is for educational and professional use. Please ensure compliance with all applicable laws and regulations when using AI for legal analysis. AI-generated legal analysis should always be reviewed by qualified legal professionals.
