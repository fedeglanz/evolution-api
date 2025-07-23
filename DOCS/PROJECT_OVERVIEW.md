# 🤖 WhatsApp Bot Platform - Project Overview

## 📋 Descripción General

**WhatsApp Bot Platform** es una plataforma SaaS completa para crear y gestionar bots inteligentes de WhatsApp con capacidades de **RAG (Retrieval Augmented Generation)**. La plataforma permite a las empresas automatizar conversaciones, gestionar knowledge bases, y proporcionar respuestas contextualizadas usando IA.

### 🎯 Objetivos Principales

- **🤖 Bots Inteligentes:** Crear bots que respondan usando conocimiento específico de la empresa
- **📚 Knowledge Base:** Sistema completo de gestión de conocimientos con embeddings vectoriales
- **🔄 Automatización:** Flujos automáticos de conversación y respuesta
- **📊 Multi-tenant:** Sistema escalable para múltiples empresas y planes
- **🧠 IA Contextual:** Respuestas inteligentes usando RAG con OpenAI

---

## 🏗️ Stack Tecnológico

### **Backend**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ con pgvector
- **Authentication:** JWT + bcrypt
- **Vector Search:** pgvector + OpenAI embeddings
- **File Processing:** multer, pdf-parse, mammoth

### **Frontend** 
- **Framework:** React 18 + Vite
- **State Management:** Zustand + React Query
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI + Lucide Icons
- **Routing:** React Router DOM

### **Integraciones Externas**
- **WhatsApp:** Evolution API (self-hosted)
- **IA:** OpenAI GPT-4 + Embeddings
- **Automation:** N8N workflows
- **Deployment:** Render (backend + frontend)
- **Storage:** Local file system + PostgreSQL

### **Desarrollo**
- **Version Control:** Git + GitHub
- **Database Migration:** Custom SQL migrations
- **API Testing:** Postman collections
- **Environment:** .env configuration

---

## 🏛️ Arquitectura High-Level

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Evolution API  │    │   N8N Workflow  │
│   Usuarios      │◄──►│   (WhatsApp      │◄──►│   Automation    │
│                 │    │    Gateway)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Auth &    │  │   Bots &    │  │     RAG System         │  │
│  │   Plans     │  │ Instances   │  │   (Knowledge + AI)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + pgvector Database                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Companies  │  │  Messages   │  │   Knowledge Base +     │  │
│  │  & Users    │  │ & Contacts  │  │     Embeddings         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Dashboard & │  │   Bots &    │  │   Knowledge Base       │  │
│  │ Analytics   │  │ Instances   │  │   Management           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Funcionalidades Core

### 📱 **Gestión de WhatsApp**
- **Instancias:** Conexión y gestión de múltiples números WhatsApp
- **QR Code:** Vinculación de dispositivos
- **Mensajería:** Envío/recepción automática de mensajes
- **Webhooks:** Integración en tiempo real con N8N

### 🤖 **Sistema de Bots Inteligentes**
- **Configuración:** Prompts personalizados, modelos IA, parámetros
- **RAG Integration:** Respuestas basadas en knowledge base específica
- **Multi-bot:** Múltiples bots por empresa con diferentes propósitos
- **Plan Limits:** Restricciones basadas en plan de suscripción

### 📚 **Knowledge Base con RAG**
- **Content Management:** Subida de PDF, DOCX, TXT + texto manual
- **Vector Embeddings:** Generación automática con OpenAI
- **Semantic Search:** Búsqueda vectorial con pgvector
- **Assignments:** Asignación de knowledge específico a bots
- **Processing:** Chunking automático y optimización de tokens

### 👥 **Multi-tenancy & Plans**
- **Companies:** Aislamiento completo de datos
- **User Management:** Roles y permisos
- **Subscription Plans:** Free, Trial, Starter, Business, Pro, Enterprise
- **Resource Limits:** Instancias, bots, knowledge items por plan

### 📊 **Analytics & Monitoring**
- **Message Analytics:** Volumen, respuesta, interacciones
- **Bot Performance:** Uso de tokens, tiempos de respuesta
- **Knowledge Stats:** Embeddings, similarity scores, usage
- **Plan Usage:** Tracking de límites y facturación

---

## 🔄 Flujo Principal de Funcionamiento

### 1. **📩 Recepción de Mensaje**
```
WhatsApp User → Evolution API → N8N Webhook → Backend /api/bot/process-message
```

### 2. **🧠 Procesamiento Inteligente**
```
Backend → RAG Search (Knowledge Base) → OpenAI (Prompt + Context) → Response
```

### 3. **📤 Envío de Respuesta**
```
Backend → N8N Workflow → Evolution API → WhatsApp User
```

### 4. **📈 Analytics & Logging**
```
All interactions → Database → Analytics Dashboard
```

---

## 📁 Estructura del Proyecto

```
evolution-api/
├── 📁 backend/                 # Backend API (Node.js)
│   ├── 📁 src/
│   │   ├── 📁 controllers/     # API endpoints logic
│   │   ├── 📁 services/        # Business logic (RAG, OpenAI, etc.)
│   │   ├── 📁 routes/          # API routes definition
│   │   ├── 📁 middleware/      # Auth, validation, etc.
│   │   └── 📁 utils/           # Helper functions
│   ├── 📁 migrations/          # Database migrations
│   └── 📁 uploads/             # File storage
│
├── 📁 frontend/                # Frontend App (React)
│   └── 📁 whatsapp-bot-frontend/
│       ├── 📁 src/
│       │   ├── 📁 components/  # React components
│       │   ├── 📁 pages/       # Page components
│       │   ├── 📁 hooks/       # Custom hooks (React Query)
│       │   ├── 📁 services/    # API client
│       │   └── 📁 store/       # Zustand stores
│
├── 📁 n8n/                    # N8N workflows
│   └── 📄 n8n_bot_workflow.json
│
└── 📁 DOCS/                   # Documentation (this folder)
    ├── 📄 PROJECT_OVERVIEW.md
    └── 📄 ... (other docs)
```

---

## 🔧 Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key
- Evolution API instance
- N8N instance

### **Environment Setup**
```bash
# Backend
cp .env.example .env
# Configure: DB_URL, OPENAI_API_KEY, JWT_SECRET, etc.

# Frontend  
cd frontend/whatsapp-bot-frontend
cp .env.example .env
# Configure: VITE_API_URL
```

### **Database Setup**
```bash
# Run migrations
npm run migrate

# Or manually:
psql -f migrations/001_initial_schema.sql
psql -f migrations/002_add_indexes.sql
# ... etc
```

### **Development**
```bash
# Backend
npm install
npm run dev

# Frontend
cd frontend/whatsapp-bot-frontend
npm install
npm run dev
```

---

## 🎯 Casos de Uso

### **👨‍💼 Empresa de Servicios**
- **Bot de Soporte:** Responde preguntas usando manual de FAQ
- **Knowledge:** PDFs de políticas, horarios, servicios
- **Automatización:** Derivación a humanos para casos complejos

### **🏦 Institución Financiera**
- **Bot Educativo:** Explica instrumentos de inversión
- **Knowledge:** Documentos regulatorios, términos y condiciones
- **Compliance:** Respuestas basadas en documentación oficial

### **🛒 E-commerce**
- **Bot Comercial:** Información de productos, envíos, devoluciones
- **Knowledge:** Catálogos, políticas, especificaciones técnicas
- **Ventas:** Conversión automática con información precisa

---

## 🔮 Roadmap & Futuras Mejoras

### **🚀 Corto Plazo**
- [ ] Dashboard analytics mejorado
- [ ] Soporte para más formatos de archivo
- [ ] API webhooks para integraciones externas

### **📈 Mediano Plazo**
- [ ] Multi-language support
- [ ] Voice messages con transcripción
- [ ] A/B testing para prompts

### **🌟 Largo Plazo**  
- [ ] Marketplace de bots pre-configurados
- [ ] API pública para developers
- [ ] WhatsApp Business API integration

---

## 📞 Links y Referencias

- **📚 Documentation:** `/DOCS/` folder
- **🔧 API Reference:** `BACKEND_API.md`
- **🧠 RAG System:** `RAG_SYSTEM.md`
- **🎨 Frontend Guide:** `FRONTEND_GUIDE.md`
- **🚀 Deployment:** `DEPLOYMENT.md`

---

**📝 Documento actualizado:** Enero 2025  
**👥 Maintainers:** Development Team  
**📧 Contact:** [Incluir información de contacto] 