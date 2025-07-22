# 🧠 RAG (Retrieval Augmented Generation) Setup Guide

## 📋 Resumen

El sistema RAG implementa búsqueda semántica inteligente usando embeddings de OpenAI y pgvector para proporcionar contexto relevante a los bots de WhatsApp.

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Añadir a tu archivo `.env`:

```bash
# 🔥 RAG & AI CONFIGURATION (REQUERIDO)
OPENAI_API_KEY=sk-your-openai-api-key-here

# RAG SETTINGS (Opcional - se usan valores por defecto)
RAG_SIMILARITY_THRESHOLD=0.7
RAG_MAX_CONTEXT_CHUNKS=5
RAG_MAX_CONTEXT_TOKENS=2000
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_EMBEDDING_DIMENSIONS=1536
```

### 2. Base de Datos PostgreSQL

Ejecutar la migración RAG:

```sql
-- Ejecutar el archivo: migrations/007_rag_embeddings.sql
-- Esto instala pgvector y crea las tablas/funciones necesarias
```

### 3. Dependencias de Node.js

Ya instaladas:
- `openai` - SDK oficial de OpenAI
- `tiktoken` - Tokenización para cálculo de costos

## 🚀 Testing del Sistema

### Endpoints de Prueba Disponibles:

#### 1. Verificar Estado RAG
```bash
GET /api/knowledge/rag/status
```
Devuelve el estado de embeddings para tu empresa.

#### 2. Migrar Knowledge Existente
```bash
POST /api/knowledge/rag/migrate
```
Genera embeddings para todo el knowledge existente.

#### 3. Probar Búsqueda Semántica
```bash
POST /api/knowledge/rag/test-search
Content-Type: application/json

{
  "query": "¿Cómo funciona el sistema de pagos?",
  "botId": "uuid-opcional-del-bot",
  "similarityThreshold": 0.7,
  "maxResults": 5
}
```

#### 4. Probar Generación de Embeddings
```bash
POST /api/knowledge/rag/test-embeddings
Content-Type: application/json

{
  "text": "Este es un texto de prueba para generar embeddings",
  "provider": "openai",
  "model": "text-embedding-3-small"
}
```

#### 5. Ver Analytics RAG
```bash
GET /api/knowledge/rag/analytics
GET /api/knowledge/rag/analytics/{botId}
```

## 🔄 Flujo de Funcionamiento

### 1. Creación Automática de Embeddings
- Al crear/actualizar knowledge → se generan embeddings automáticamente
- Al subir archivos → se extraen embeddings del contenido

### 2. Búsqueda Inteligente
- Query del usuario → embedding del query
- Búsqueda de similitud en pgvector → chunks relevantes
- Construcción de contexto optimizado → respuesta del bot

### 3. Multi-Tenant Security
- Todos los embeddings incluyen `company_id`
- Funciones SQL con `SECURITY DEFINER`
- Búsquedas aisladas por empresa/bot

## 📊 Arquitectura del Sistema

```
User Query → EmbeddingService → RAGService → PostgreSQL pgvector
                    ↓
OpenAI API → Vector(1536) → Cosine Similarity Search
                    ↓
Knowledge Chunks → Context Builder → Bot Response
```

## 🔍 Funciones PostgreSQL Creadas

- `search_knowledge_embeddings()` - Búsqueda por empresa
- `search_bot_knowledge_embeddings()` - Búsqueda por bot específico
- `get_embeddings_stats()` - Estadísticas de embeddings
- `chunk_text_for_embeddings()` - Chunking inteligente de texto

## 💰 Costos de OpenAI

### Modelos de Embeddings:
- `text-embedding-3-small`: $0.00002 / 1K tokens
- `text-embedding-3-large`: $0.00013 / 1K tokens

### Estimación:
- Documento de 1000 palabras ≈ 1333 tokens
- Cost per documento ≈ $0.000027 (small) o $0.00017 (large)

## 🛟 Troubleshooting

### Error: "pgvector extension not found"
```sql
-- En PostgreSQL como superuser:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "OpenAI API key not configured"
```bash
# Verificar variable de entorno:
echo $OPENAI_API_KEY
```

### Error: "Insufficient similarity results"
- Reducir `similarityThreshold` en las búsquedas
- Verificar que hay knowledge con embeddings generados

### Performance Issues
- Verificar índices: `idx_embeddings_vector_cosine`
- Monitorear token usage en OpenAI dashboard
- Ajustar `RAG_MAX_CONTEXT_TOKENS` si es necesario

## 📈 Monitoreo

### Métricas Importantes:
- Embedding generation time
- Search similarity scores
- Context token usage
- API call frequency

### Logs a Monitorear:
```bash
# Buscar en logs:
grep "EmbeddingService" backend.log
grep "RAGService" backend.log
grep "OpenAI" backend.log
```

## ⚡ Optimizaciones Futuras

1. **Cache de Embeddings**: Redis cache para queries frecuentes
2. **Batch Processing**: Procesar múltiples embeddings en paralelo
3. **Embedding Providers**: Añadir Cohere, Hugging Face, etc.
4. **Vector Database**: Considerar Pinecone, Weaviate para escalamiento
5. **Smart Chunking**: Chunking basado en estructura de documento

## 🔐 Seguridad

- ✅ Multi-tenant isolation a nivel de base de datos
- ✅ Validation de ownership de bots
- ✅ Rate limiting en OpenAI API calls
- ✅ Encriptación de embeddings (opcional, configurar si necesario)

---

**¿Dudas?** Verificar logs del sistema o usar los endpoints de testing para diagnosticar problemas. 