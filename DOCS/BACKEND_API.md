# 🔧 Backend API Reference

## 📋 Descripción General

La **Backend API** es el núcleo del WhatsApp Bot Platform, construida en **Node.js + Express.js** con **PostgreSQL + pgvector**. Proporciona endpoints RESTful para gestión de empresas, usuarios, bots, knowledge base con RAG, y integración con WhatsApp via Evolution API.

### 🎯 **Características Principales**
- **🔐 JWT Authentication** con refresh tokens
- **🏢 Multi-tenant** con aislamiento completo de datos  
- **🧠 RAG System** con embeddings vectoriales
- **📊 Plan-based limits** y usage tracking
- **🔒 Security** con rate limiting y validation
- **📄 File processing** para knowledge base

---

## 🔐 Authentication

### **JWT Token System**

**Base URL:** `https://whatsapp-bot-backend.onrender.com/api`

#### **Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "usuario@empresa.com",
      "name": "Usuario Ejemplo",
      "role": "admin",
      "company_id": 1,
      "company": {
        "id": 1,
        "name": "Empresa Demo",
        "plan": "business"
      }
    }
  }
}
```

#### **Register**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "nuevo@empresa.com",
  "password": "password123",
  "name": "Nuevo Usuario",
  "company_name": "Nueva Empresa"
}
```

#### **Headers de Autenticación**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🏢 Companies Management

### **Get Company Info**
```http
GET /companies/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Empresa Demo",
    "plan": "business",
    "limits": {
      "instances": 5,
      "bots": 10,
      "knowledge_items": 100,
      "monthly_messages": 10000
    },
    "usage": {
      "instances": 2,
      "bots": 3,
      "knowledge_items": 15,
      "monthly_messages": 1250
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### **Update Company**
```http
PUT /companies/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Empresa Actualizada",
  "settings": {
    "timezone": "America/Argentina/Buenos_Aires",
    "default_language": "es"
  }
}
```

---

## 👥 Users Management

### **Get Users**
```http
GET /users
Authorization: Bearer {token}
```

### **Create User**
```http
POST /users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "colaborador@empresa.com",
  "name": "Colaborador Nuevo",
  "role": "user",
  "password": "password123"
}
```

### **Update User**
```http
PUT /users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nombre Actualizado",
  "role": "admin"
}
```

---

## 📱 WhatsApp Instances

### **List Instances**
```http
GET /instances
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "WhatsApp Principal",
      "instance_key": "main_instance_001",
      "phone_number": "+5491123456789",
      "status": "connected",
      "qr_code": null,
      "webhook_url": "https://n8n.empresa.com/webhook/whatsapp-main",
      "created_at": "2024-01-15T10:00:00Z",
      "last_seen": "2024-01-20T15:30:00Z"
    }
  ]
}
```

### **Create Instance**
```http
POST /instances
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "WhatsApp Soporte",
  "webhook_url": "https://n8n.empresa.com/webhook/whatsapp-support"
}
```

### **Get QR Code**
```http
GET /instances/:id/qr
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expires_in": 45
  }
}
```

### **Delete Instance**
```http
DELETE /instances/:id
Authorization: Bearer {token}
```

---

## 🤖 Bots Management

### **List Bots**
```http
GET /bots
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bot de Soporte",
      "description": "Bot para atención al cliente",
      "prompt": "Eres un asistente virtual especializado en atención al cliente...",
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 500,
      "is_active": true,
      "instance_id": 1,
      "knowledge_count": 5,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### **Create Bot**
```http
POST /bots
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Bot Comercial",
  "description": "Bot para ventas y consultas comerciales",
  "prompt": "Eres un experto en ventas que ayuda a los clientes...",
  "model": "gpt-4",
  "temperature": 0.8,
  "max_tokens": 600,
  "instance_id": 1
}
```

### **Update Bot**
```http
PUT /bots/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Bot Actualizado",
  "prompt": "Prompt mejorado...",
  "temperature": 0.7,
  "is_active": true
}
```

### **Get Bot Knowledge**
```http
GET /bots/:id/knowledge
Authorization: Bearer {token}
```

### **Assign Knowledge to Bot**
```http
POST /bots/:id/knowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "knowledge_ids": [1, 2, 3, 5]
}
```

---

## 🧠 Bot Message Processing

### **Process WhatsApp Message** ⭐
```http
POST /bot/process-message
Authorization: Bearer {token}
Content-Type: application/json

{
  "instance_key": "main_instance_001",
  "from": "5491123456789@c.us",
  "message": "¿Cuáles son los horarios de atención?",
  "message_type": "text",
  "timestamp": "2024-01-20T15:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Nuestros horarios de atención son de lunes a viernes de 9:00 a 18:00 horas.",
    "bot_used": {
      "id": 1,
      "name": "Bot de Soporte"
    },
    "rag_context": {
      "knowledge_used": [
        {
          "id": 2,
          "title": "Horarios de Atención",
          "similarity": 0.92
        }
      ],
      "tokens_used": 156
    },
    "processing_time_ms": 1250
  }
}
```

---

## 📚 Knowledge Base Management

### **List Knowledge Items**
```http
GET /knowledge
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Política de Devoluciones",
        "type": "text",
        "content": "Las devoluciones se pueden realizar dentro de...",
        "file_name": null,
        "embeddings_generated": true,
        "processing_status": "completed",
        "chunks_count": 3,
        "created_at": "2024-01-15T10:00:00Z"
      },
      {
        "id": 2,
        "title": "Manual de Usuario.pdf",
        "type": "file",
        "content": null,
        "file_name": "manual_usuario.pdf",
        "embeddings_generated": true,
        "processing_status": "completed", 
        "chunks_count": 15,
        "created_at": "2024-01-16T14:20:00Z"
      }
    ],
    "stats": {
      "total": 12,
      "with_embeddings": 10,
      "processing": 1,
      "failed": 1
    }
  }
}
```

### **Create Knowledge (Text)**
```http
POST /knowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Términos y Condiciones",
  "type": "text",
  "content": "1. Aceptación de términos\nAl utilizar nuestros servicios..."
}
```

### **Create Knowledge (File Upload)**
```http
POST /knowledge
Authorization: Bearer {token}
Content-Type: multipart/form-data

title: "Catálogo de Productos"
type: "file"
file: [PDF/DOCX/TXT file]
```

### **Update Knowledge**
```http
PUT /knowledge/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Título Actualizado",
  "content": "Contenido actualizado..."
}
```

### **Delete Knowledge**
```http
DELETE /knowledge/:id
Authorization: Bearer {token}
```

### **Get Knowledge Stats**
```http
GET /knowledge/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_items": 25,
    "with_embeddings": 22,
    "processing": 2,
    "failed": 1,
    "total_chunks": 156,
    "avg_similarity": 0.78,
    "last_generated": "2024-01-20T10:30:00Z"
  }
}
```

---

## 🔍 RAG Debug Endpoints

### **Search Knowledge**
```http
POST /knowledge/search
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "horarios de atención",
  "limit": 5,
  "threshold": 0.3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "knowledge_id": 2,
        "title": "Horarios de Atención",
        "chunk_text": "Nuestros horarios de atención son de lunes a viernes de 9:00 a 18:00",
        "similarity": 0.92,
        "chunk_index": 0
      }
    ],
    "query_embedding": [0.1234, -0.5678, ...],
    "processing_time_ms": 45
  }
}
```

### **RAG Debug**
```http
POST /knowledge/rag/debug
Authorization: Bearer {token}
Content-Type: application/json

{
  "bot_id": 1,
  "query": "¿cuándo abren?",
  "include_embedding": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bot": {
      "id": 1,
      "name": "Bot de Soporte",
      "knowledge_count": 5
    },
    "query": "¿cuándo abren?",
    "rag_results": [
      {
        "knowledge_id": 2,
        "title": "Horarios de Atención",
        "similarity": 0.89,
        "chunk_preview": "Nuestros horarios de atención son..."
      }
    ],
    "context_generated": "Contexto: Nuestros horarios...",
    "processing_steps": {
      "embedding_generation_ms": 120,
      "vector_search_ms": 25,
      "context_building_ms": 5
    }
  }
}
```

---

## 📊 Analytics & Stats

### **Message Analytics**
```http
GET /analytics/messages
Authorization: Bearer {token}
?start_date=2024-01-01&end_date=2024-01-31&bot_id=1
```

### **Bot Performance**
```http
GET /analytics/bots/:id/performance
Authorization: Bearer {token}
?period=30d
```

### **Plan Usage**
```http
GET /analytics/usage
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current_period": {
      "messages": 1250,
      "tokens_used": 45000,
      "api_calls": 890
    },
    "limits": {
      "messages": 10000,
      "tokens": 100000,
      "api_calls": 5000
    },
    "usage_percentage": {
      "messages": 12.5,
      "tokens": 45.0,
      "api_calls": 17.8
    }
  }
}
```

---

## 📋 Plans Management

### **List Available Plans**
```http
GET /plans
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "billing_cycle": "monthly",
      "limits": {
        "instances": 1,
        "bots": 1,
        "knowledge_items": 5,
        "monthly_messages": 100
      }
    },
    {
      "id": "business",
      "name": "Business",
      "price": 49,
      "currency": "USD", 
      "billing_cycle": "monthly",
      "limits": {
        "instances": 5,
        "bots": 10,
        "knowledge_items": 100,
        "monthly_messages": 10000
      }
    }
  ]
}
```

---

## 🔒 Security & Error Handling

### **Rate Limiting**
- **General API:** 100 requests/15min per IP
- **Auth endpoints:** 5 requests/15min per IP  
- **File uploads:** 10 requests/hour per user
- **AI processing:** 50 requests/hour per company

### **Error Responses**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

### **HTTP Status Codes**
- **200** - Success
- **201** - Created
- **400** - Bad Request / Validation Error
- **401** - Unauthorized
- **403** - Forbidden / Plan Limit Exceeded
- **404** - Not Found
- **429** - Rate Limit Exceeded
- **500** - Internal Server Error

---

## 🗄️ Database Schema (Key Tables)

### **companies**
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **knowledge_base**
```sql
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    title VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'text' or 'file'
    content TEXT,
    file_name VARCHAR(255),
    embeddings_generated BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **knowledge_embeddings**
```sql
CREATE TABLE knowledge_embeddings (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER REFERENCES knowledge_base(id),
    content_chunk TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **bots**
```sql
CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    model VARCHAR(50) DEFAULT 'gpt-4',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    instance_id INTEGER REFERENCES instances(id)
);
```

---

## 🔧 Environment Variables

```bash
# Database
DB_URL=postgresql://user:password@localhost:5432/whatsapp_bot

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Server
PORT=3000
NODE_ENV=production

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 📝 API Testing

### **Postman Collection**
```bash
# Import collection
curl -o WhatsApp-Bot-API.postman_collection.json \
  https://raw.githubusercontent.com/tu-repo/evolution-api/main/backend/postman/WhatsApp-Bot-API.postman_collection.json
```

### **cURL Examples**

**Login:**
```bash
curl -X POST https://whatsapp-bot-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Create Knowledge:**
```bash
curl -X POST https://whatsapp-bot-backend.onrender.com/api/knowledge \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"FAQ","type":"text","content":"Preguntas frecuentes..."}'
```

**Test RAG:**
```bash
curl -X POST https://whatsapp-bot-backend.onrender.com/api/knowledge/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"horarios","threshold":0.3}'
```

---

## 🚀 Deployment

### **Render Configuration**
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node.js 18+
- **Database:** PostgreSQL with pgvector extension

### **Health Check**
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "openai": "available",
    "uptime": "2d 14h 30m",
    "version": "1.2.0"
  }
}
```

---

**📝 Documento actualizado:** Enero 2025  
**🔗 Base URL:** `https://whatsapp-bot-backend.onrender.com/api`  
**📧 Support:** [Incluir información de contacto] 