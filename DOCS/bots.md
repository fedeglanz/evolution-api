# 🧠 SISTEMA DE KNOWLEDGE BASE ROBUSTO - WhatsApp Bot Platform

## 🎯 OBJETIVO PRINCIPAL

Implementar un sistema completo de base de conocimientos a nivel empresa que permita:
- **Gestión centralizada** por empresa
- **Asignación dinámica** a bots específicos  
- **Multi-LLM** compatible (OpenAI, Anthropic, etc.)
- **RAG (Retrieval Augmented Generation)** para contexto inteligente
- **Escalabilidad** sin límites de tokens

## 🏗️ ARQUITECTURA PROPUESTA

### **Modelo de Datos:**
```sql
-- Knowledge Base Items (a nivel empresa)
CREATE TABLE whatsapp_bot.knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'manual', -- manual|pdf|docx|url|api
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  file_url TEXT, -- Si es archivo subido
  metadata JSON, -- Para info adicional (tamaño, fuente, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asignación Bot → Knowledge Items (Many to Many)
CREATE TABLE whatsapp_bot.bot_knowledge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_config_id UUID NOT NULL REFERENCES whatsapp_bot.bot_configs(id),
  knowledge_item_id UUID NOT NULL REFERENCES whatsapp_bot.knowledge_items(id),
  priority INTEGER DEFAULT 1, -- Para ordenar importancia
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(bot_config_id, knowledge_item_id)
);

-- Embeddings para RAG (PostgreSQL con pgvector)
CREATE TABLE whatsapp_bot.knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_item_id UUID NOT NULL REFERENCES whatsapp_bot.knowledge_items(id),
  chunk_index INTEGER NOT NULL, -- Para textos largos divididos
  content_chunk TEXT NOT NULL, -- Pedazo de texto
  embedding VECTOR(1536), -- OpenAI embeddings (cambiar dimensión según LLM)
  tokens_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_knowledge_items_company ON whatsapp_bot.knowledge_items(company_id);
CREATE INDEX idx_bot_knowledge_assignments_bot ON whatsapp_bot.bot_knowledge_assignments(bot_config_id);
CREATE INDEX idx_knowledge_embeddings_item ON whatsapp_bot.knowledge_embeddings(knowledge_item_id);
```

## 📋 ENDPOINTS A IMPLEMENTAR

### **Knowledge Base Management:**
```javascript
// Gestión de Knowledge Items
GET    /api/knowledge                     // Listar items por empresa
POST   /api/knowledge                     // Crear nuevo item
GET    /api/knowledge/:id                 // Obtener item específico
PUT    /api/knowledge/:id                 // Actualizar item
DELETE /api/knowledge/:id                 // Eliminar item
POST   /api/knowledge/upload              // Subir archivo (PDF, DOCX, etc.)
POST   /api/knowledge/:id/process         // Procesar y generar embeddings

// Asignaciones Bot ↔ Knowledge
GET    /api/bot-config/:botId/knowledge   // Knowledge asignado a bot
POST   /api/bot-config/:botId/knowledge   // Asignar knowledge a bot
DELETE /api/bot-config/:botId/knowledge/:itemId  // Quitar knowledge de bot

// RAG y Búsqueda
POST   /api/knowledge/search              // Buscar contexto relevante
POST   /api/bot/:instanceId/generate-response // Generar respuesta con RAG
```

## 🔧 SERVICIOS A CREAR

### **1. KnowledgeService**
```javascript
// backend/src/services/knowledgeService.js
class KnowledgeService {
  // CRUD Operations
  async createKnowledgeItem(companyId, data) { }
  async updateKnowledgeItem(itemId, data) { }
  async deleteKnowledgeItem(itemId) { }
  async getCompanyKnowledge(companyId, filters) { }
  
  // File Processing
  async processUploadedFile(file, companyId) { }
  async extractTextFromPDF(filePath) { }
  async extractTextFromDOCX(filePath) { }
  
  // Embeddings Management
  async generateEmbeddings(knowledgeItemId) { }
  async updateEmbeddings(knowledgeItemId) { }
  
  // RAG Search
  async findRelevantContext(query, botConfigId, limit = 5) { }
  async searchKnowledgeByQuery(companyId, query) { }
}
```

### **2. RAGService (Retrieval Augmented Generation)**
```javascript
// backend/src/services/ragService.js
class RAGService {
  async generateEmbedding(text, model = 'openai') { }
  
  async findSimilarContent(queryEmbedding, botConfigId, limit = 5) {
    // Vector similarity search en PostgreSQL
  }
  
  async buildContextPrompt(userMessage, botConfigId) {
    // 1. Generar embedding del mensaje usuario
    // 2. Buscar contenido similar
    // 3. Construir prompt con contexto relevante
  }
  
  async generateResponseWithContext(message, botConfig, context) {
    // Construir prompt final con contexto y generar respuesta
  }
}
```

### **3. Enhanced OpenAIService**
```javascript
// backend/src/services/openaiService.js - Actualizar existente
class OpenAIService {
  async generateResponseWithRAG(message, botConfigId) {
    // 1. Obtener contexto relevante
    const context = await ragService.buildContextPrompt(message, botConfigId);
    
    // 2. Construir prompt mejorado
    const enhancedPrompt = `
CONTEXTO RELEVANTE DE LA EMPRESA:
${context}

CONFIGURACIÓN DEL BOT:
${botConfig.system_prompt}

INSTRUCCIONES:
- Responde ÚNICAMENTE basándote en el contexto proporcionado
- Si no tienes información específica, dilo claramente
- Mantén el tono y personalidad configurada

MENSAJE DEL USUARIO: ${message}
`;
    
    // 3. Generar respuesta
    return await this.generateResponse(enhancedPrompt, botConfig);
  }
}
```

## 🎨 FRONTEND COMPONENTS

### **1. Knowledge Base Manager**
```jsx
// components/knowledge/KnowledgeManager.jsx
const KnowledgeManager = () => {
  // - Lista de knowledge items de la empresa
  // - Upload de archivos
  // - Editor de contenido manual
  // - Tags y categorías
  // - Búsqueda y filtros
  // - Estados de procesamiento
};
```

### **2. Bot Knowledge Assignment**
```jsx
// components/bots/BotKnowledgeConfig.jsx
const BotKnowledgeConfig = ({ botId }) => {
  // - Lista de knowledge items disponibles
  // - Knowledge items ya asignados al bot
  // - Drag & drop para asignar/quitar
  // - Prioridades de contexto
  // - Preview de cómo se ve el contexto
};
```

### **3. Knowledge Item Editor**
```jsx
// components/knowledge/KnowledgeEditor.jsx
const KnowledgeEditor = ({ itemId }) => {
  // - Editor de texto enriquecido
  // - Upload de archivos
  // - Vista previa del contenido procesado
  // - Tags y metadata
  // - Estado de embeddings
};
```

## 🔄 FLUJO COMPLETO

### **1. Creación de Knowledge:**
```
Usuario → Upload/Edita → KnowledgeService → Base de Datos → RAGService → Embeddings
```

### **2. Asignación a Bot:**
```
Usuario → Selecciona Items → BotKnowledgeAssignment → Base de Datos → Configuración Lista
```

### **3. Generación de Respuesta:**
```
Mensaje → RAGService (buscar contexto) → OpenAIService (generar) → Respuesta Contextual
```

## 📊 CARACTERÍSTICAS AVANZADAS

### **Multi-LLM Support:**
```javascript
// Preparado para múltiples LLMs
const llmService = {
  openai: new OpenAIService(),
  anthropic: new AnthropicService(),
  cohere: new CohereService(),
  
  async generateResponse(provider, prompt, config) {
    return await this[provider].generateResponse(prompt, config);
  }
};
```

### **Chunking Inteligente:**
```javascript
// Para documentos largos
async processLargeDocument(content) {
  const chunks = this.splitIntoChunks(content, {
    maxTokens: 500,
    overlap: 50,
    preserveSentences: true
  });
  
  return await Promise.all(
    chunks.map(chunk => this.generateEmbedding(chunk))
  );
}
```

### **Analytics y Optimización:**
```sql
-- Tracking de uso para optimizar
CREATE TABLE whatsapp_bot.knowledge_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_item_id UUID REFERENCES whatsapp_bot.knowledge_items(id),
  bot_config_id UUID REFERENCES whatsapp_bot.bot_configs(id),
  query TEXT,
  relevance_score DECIMAL,
  was_helpful BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 IMPLEMENTACIÓN POR FASES

### **Fase 1: Base Structure (Semana 1)**
- Modelos de datos
- CRUD básico de knowledge items
- Upload de archivos básico
- UI para gestión de knowledge

### **Fase 2: RAG Implementation (Semana 2)**  
- Embeddings generation
- Vector similarity search
- RAG service completo
- Integración con OpenAI mejorada

### **Fase 3: Advanced Features (Semana 3)**
- Asignación dinámica bot ↔ knowledge
- UI para gestión de asignaciones
- Analytics y optimización
- Multi-LLM preparation

## 🚀 CRITERIOS DE ÉXITO

- ✅ **Gestión centralizada** de knowledge por empresa
- ✅ **Asignación flexible** a múltiples bots
- ✅ **RAG funcionando** con contexto relevante
- ✅ **Upload de archivos** (PDF, DOCX) procesados
- ✅ **Búsqueda inteligente** en knowledge base
- ✅ **Performance** < 2 segundos para generar respuesta
- ✅ **Escalabilidad** para empresas grandes
- ✅ **Multi-LLM ready** para futuras integraciones

## 📋 ENTREGABLES ESPERADOS

1. **Modelos de datos** completos con migraciones
2. **APIs REST** para toda la gestión
3. **Servicios backend** (Knowledge, RAG, Enhanced OpenAI)
4. **Componentes React** para gestión visual
5. **Documentación** de APIs y flujos
6. **Tests** unitarios para servicios críticos

¿Todo claro? ¿Empezamos con la implementación completa del sistema de Knowledge Base?