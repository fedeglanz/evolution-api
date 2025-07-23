# 🧠 RAG System - Retrieval Augmented Generation

## 📋 Descripción General

El **RAG System** es el núcleo inteligente del WhatsApp Bot Platform que permite a los bots responder usando **conocimiento específico de la empresa**. Utiliza **embeddings vectoriales de OpenAI** con **búsqueda semántica en PostgreSQL + pgvector** para encontrar información relevante y generar respuestas contextualizadas.

### 🎯 **Objetivos del RAG**
- **🧠 Inteligencia Contextual:** Respuestas basadas en knowledge base específica
- **🔍 Búsqueda Semántica:** Encuentra información por significado, no por texto exacto
- **⚡ Performance:** Búsqueda vectorial optimizada en milisegundos
- **🏢 Multi-tenant:** Aislamiento completo entre companies
- **📊 Measurable:** Tracking de similarity scores y performance

---

## 🏗️ Arquitectura RAG

### **High-Level Flow**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Query    │    │   OpenAI         │    │   Knowledge     │
│   "¿horarios?"  │───►│   Embedding      │───►│   Vector        │
│                 │    │   Generation     │    │   Search        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   OpenAI GPT-4   │    │   Relevant      │
│   Response      │◄───│   Response       │◄───│   Context       │
│                 │    │   Generation     │    │   Building      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Technical Stack**
- **🧮 Vector Database:** PostgreSQL 15+ with pgvector extension
- **🤖 AI Provider:** OpenAI (GPT-4 + text-embedding-ada-002)
- **📄 File Processing:** pdf-parse, mammoth, text chunking
- **🔍 Similarity Search:** Cosine similarity with configurable threshold
- **📊 Monitoring:** Performance metrics, similarity scores, token usage

---

## 🗄️ Database Schema RAG

### **knowledge_base** - Core Content
```sql
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    title VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'text' or 'file'
    content TEXT, -- Raw content (for text type)
    file_name VARCHAR(255), -- Original filename (for file type)
    embeddings_generated BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Multi-tenant isolation
CREATE INDEX idx_knowledge_company ON knowledge_base(company_id);
CREATE INDEX idx_knowledge_status ON knowledge_base(processing_status);
CREATE INDEX idx_knowledge_embeddings ON knowledge_base(embeddings_generated);
```

### **knowledge_embeddings** - Vector Storage
```sql
CREATE TABLE knowledge_embeddings (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL, -- Chunked text content
    chunk_index INTEGER NOT NULL, -- Order within knowledge item
    embedding vector(1536), -- OpenAI embedding (1536 dimensions)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vector search optimization
CREATE INDEX idx_embeddings_knowledge ON knowledge_embeddings(knowledge_id);
CREATE INDEX idx_embeddings_vector ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### **bot_knowledge** - Assignment
```sql
CREATE TABLE bot_knowledge (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    knowledge_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id, knowledge_id)
);

-- Query optimization
CREATE INDEX idx_bot_knowledge_bot ON bot_knowledge(bot_id);
CREATE INDEX idx_bot_knowledge_combo ON bot_knowledge(bot_id, knowledge_id);
```

---

## 🔧 Core Services

### **1. EmbeddingService.js**

#### **Generate Embeddings**
```javascript
class EmbeddingService {
  // Generate embedding vector for text
  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.trim(),
        encoding_format: 'float'
      });
      
      return response.data[0].embedding; // Array of 1536 floats
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Process knowledge item into chunks + embeddings
  async processKnowledgeItem(knowledgeId, content) {
    const chunks = this.chunkText(content);
    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      await db.query(`
        INSERT INTO knowledge_embeddings 
        (knowledge_id, content_chunk, chunk_index, embedding)
        VALUES ($1, $2, $3, $4)
      `, [knowledgeId, chunk, i, JSON.stringify(embedding)]);
      
      embeddings.push({ chunk, embedding, index: i });
    }
    
    return embeddings;
  }

  // Smart text chunking (500-1000 chars with overlap)
  chunkText(text, maxChunkSize = 800, overlap = 100) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Overlap: keep last part of previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap/10));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += sentence + '. ';
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter tiny chunks
  }
}
```

### **2. RAGService.js**

#### **Semantic Search**
```javascript
class RAGService {
  // Core RAG search function
  async searchRelevantKnowledge(companyId, query, botId = null, options = {}) {
    const {
      limit = 5,
      threshold = 0.3, // Minimum similarity score
      includeChunks = true
    } = options;

    // 1. Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    // 2. Build search query with multi-tenant isolation
    let searchQuery = `
      SELECT 
        ke.knowledge_id,
        kb.title,
        ke.content_chunk,
        ke.chunk_index,
        1 - (ke.embedding <=> $1::vector) as similarity,
        kb.type,
        kb.file_name
      FROM knowledge_embeddings ke
      JOIN knowledge_base kb ON ke.knowledge_id = kb.id
      WHERE kb.company_id = $2
        AND kb.embeddings_generated = true
        AND kb.processing_status = 'completed'
    `;
    
    const queryParams = [JSON.stringify(queryEmbedding), companyId];
    let paramCount = 2;
    
    // 3. Filter by bot's assigned knowledge
    if (botId) {
      searchQuery += ` AND ke.knowledge_id IN (
        SELECT knowledge_id FROM bot_knowledge WHERE bot_id = $${++paramCount}
      )`;
      queryParams.push(botId);
    }
    
    // 4. Apply similarity threshold and ordering
    searchQuery += `
      AND (1 - (ke.embedding <=> $1::vector)) >= $${++paramCount}
      ORDER BY similarity DESC
      LIMIT $${++paramCount}
    `;
    queryParams.push(threshold, limit);
    
    // 5. Execute search
    const startTime = Date.now();
    const result = await db.query(searchQuery, queryParams);
    const searchTime = Date.now() - startTime;
    
    // 6. Format results
    const results = result.rows.map(row => ({
      knowledge_id: row.knowledge_id,
      title: row.title,
      similarity: parseFloat(row.similarity.toFixed(4)),
      chunk_text: includeChunks ? row.content_chunk : null,
      chunk_index: row.chunk_index,
      type: row.type,
      file_name: row.file_name
    }));
    
    return {
      results,
      query_embedding: queryEmbedding,
      search_time_ms: searchTime,
      threshold_used: threshold,
      total_results: results.length
    };
  }

  // Build context for OpenAI prompt
  buildRAGContext(searchResults, maxTokens = 2000) {
    if (!searchResults.length) return null;
    
    let context = "Información relevante de la base de conocimiento:\n\n";
    let tokenCount = 0;
    
    for (const result of searchResults) {
      const snippet = `📄 ${result.title} (similitud: ${result.similarity})\n${result.chunk_text}\n\n`;
      const estimatedTokens = Math.ceil(snippet.length / 4); // Rough estimation
      
      if (tokenCount + estimatedTokens > maxTokens) break;
      
      context += snippet;
      tokenCount += estimatedTokens;
    }
    
    context += `\nUsa esta información para responder de manera precisa y contextualizada.`;
    
    return {
      context,
      estimated_tokens: tokenCount,
      knowledge_sources: searchResults.length
    };
  }

  // Full RAG pipeline for bot responses
  async generateRAGResponse(companyId, botId, userMessage, botConfig) {
    try {
      // 1. Search relevant knowledge
      const searchResults = await this.searchRelevantKnowledge(
        companyId, 
        userMessage, 
        botId,
        { 
          limit: 5, 
          threshold: botConfig.similarity_threshold || 0.3 
        }
      );
      
      // 2. Build context
      const ragContext = this.buildRAGContext(searchResults.results);
      
      // 3. Generate OpenAI response
      const response = await this.generateContextualResponse(
        userMessage,
        ragContext?.context,
        botConfig
      );
      
      // 4. Log interaction
      await this.logRAGInteraction(companyId, botId, userMessage, searchResults, response);
      
      return {
        response: response.content,
        rag_context: {
          knowledge_used: searchResults.results.map(r => ({
            id: r.knowledge_id,
            title: r.title,
            similarity: r.similarity
          })),
          tokens_used: response.usage?.total_tokens || 0,
          search_time_ms: searchResults.search_time_ms
        }
      };
      
    } catch (error) {
      console.error('❌ RAG Response generation failed:', error);
      throw error;
    }
  }

  // Generate response with OpenAI
  async generateContextualResponse(userMessage, context, botConfig) {
    const messages = [
      {
        role: 'system',
        content: botConfig.prompt + (context ? `\n\n${context}` : '')
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await openai.chat.completions.create({
      model: botConfig.model || 'gpt-4',
      messages,
      temperature: botConfig.temperature || 0.7,
      max_tokens: botConfig.max_tokens || 500
    });

    return response.choices[0].message;
  }
}
```

---

## 📊 Performance Optimization

### **1. Vector Index Configuration**
```sql
-- IVFFlat index for fast approximate search
CREATE INDEX idx_embeddings_vector ON knowledge_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Update vector statistics for query planner
ANALYZE knowledge_embeddings;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE indexname = 'idx_embeddings_vector';
```

### **2. Query Performance Monitoring**
```javascript
// Performance tracking middleware
class RAGPerformanceTracker {
  async trackSearch(companyId, query, results, timing) {
    const stats = {
      company_id: companyId,
      query_length: query.length,
      results_count: results.length,
      avg_similarity: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.similarity, 0) / results.length : 0,
      search_time_ms: timing.search_time_ms,
      embedding_time_ms: timing.embedding_time_ms || 0,
      timestamp: new Date()
    };
    
    // Log to analytics table or external service
    await this.logPerformanceMetrics(stats);
  }
}
```

### **3. Caching Strategy**
```javascript
// Embedding cache to avoid regenerating for same queries
class EmbeddingCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
    this.ttl = 3600000; // 1 hour
  }
  
  getCacheKey(text) {
    return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
  }
  
  async getEmbedding(text) {
    const key = this.getCacheKey(text);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.embedding;
    }
    
    const embedding = await embeddingService.generateEmbedding(text);
    
    // LRU cache management
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      embedding,
      timestamp: Date.now()
    });
    
    return embedding;
  }
}
```

---

## 🔍 Similarity Threshold Tuning

### **Threshold Guidelines**
```javascript
const SIMILARITY_THRESHOLDS = {
  // Very high precision, may miss some relevant content
  STRICT: 0.8,
  
  // Good balance for most use cases
  BALANCED: 0.6,
  
  // More permissive, better recall
  PERMISSIVE: 0.45,
  
  // Very permissive, for simple/short content
  LOOSE: 0.3,
  
  // Experimental, may include noise
  EXPERIMENTAL: 0.2
};

// Dynamic threshold based on content analysis
function getOptimalThreshold(knowledgeStats) {
  const { avgChunkLength, contentComplexity, totalChunks } = knowledgeStats;
  
  if (avgChunkLength < 200) return SIMILARITY_THRESHOLDS.LOOSE; // Short content
  if (contentComplexity === 'high') return SIMILARITY_THRESHOLDS.STRICT; // Complex content
  if (totalChunks > 100) return SIMILARITY_THRESHOLDS.BALANCED; // Large knowledge base
  
  return SIMILARITY_THRESHOLDS.PERMISSIVE; // Default
}
```

### **Quality Metrics**
```javascript
// Analyze knowledge base quality for better RAG performance
async function analyzeKnowledgeQuality(companyId) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_knowledge,
      COUNT(CASE WHEN embeddings_generated THEN 1 END) as with_embeddings,
      AVG(LENGTH(content)) as avg_content_length,
      COUNT(CASE WHEN type = 'file' THEN 1 END) as file_count,
      COUNT(CASE WHEN type = 'text' THEN 1 END) as text_count
    FROM knowledge_base 
    WHERE company_id = $1
  `, [companyId]);
  
  const embeddingsStats = await db.query(`
    SELECT 
      COUNT(*) as total_chunks,
      AVG(LENGTH(content_chunk)) as avg_chunk_length,
      COUNT(DISTINCT knowledge_id) as knowledge_with_chunks
    FROM knowledge_embeddings ke
    JOIN knowledge_base kb ON ke.knowledge_id = kb.id
    WHERE kb.company_id = $1
  `, [companyId]);
  
  return {
    ...result.rows[0],
    ...embeddingsStats.rows[0],
    embedding_coverage: result.rows[0].with_embeddings / result.rows[0].total_knowledge,
    avg_chunks_per_knowledge: embeddingsStats.rows[0].total_chunks / embeddingsStats.rows[0].knowledge_with_chunks
  };
}
```

---

## 🛠️ Debug & Troubleshooting

### **RAG Debug Endpoints**

#### **1. Knowledge Search Test**
```http
POST /api/knowledge/search
{
  "query": "horarios de atención",
  "limit": 5,
  "threshold": 0.3,
  "include_embedding": false
}
```

#### **2. Full RAG Debug**
```http
POST /api/knowledge/rag/debug
{
  "bot_id": 1,
  "query": "¿cuándo abren?",
  "include_embedding": false,
  "threshold_override": 0.3
}
```

#### **3. Knowledge Analysis**
```http
GET /api/knowledge/analysis/:companyId
```

### **Common Issues & Solutions**

#### **❌ No Results Found**
```javascript
// Diagnostic function
async function diagnoseNoResults(companyId, query, botId) {
  // 1. Check if knowledge exists
  const knowledgeCount = await db.query(`
    SELECT COUNT(*) FROM knowledge_base 
    WHERE company_id = $1 AND embeddings_generated = true
  `, [companyId]);
  
  if (knowledgeCount.rows[0].count === '0') {
    return { issue: 'NO_KNOWLEDGE', solution: 'Create knowledge items first' };
  }
  
  // 2. Check bot assignment
  if (botId) {
    const assignedCount = await db.query(`
      SELECT COUNT(*) FROM bot_knowledge bk
      JOIN knowledge_base kb ON bk.knowledge_id = kb.id
      WHERE bk.bot_id = $1 AND kb.company_id = $2
    `, [botId, companyId]);
    
    if (assignedCount.rows[0].count === '0') {
      return { issue: 'NO_ASSIGNMENT', solution: 'Assign knowledge to bot' };
    }
  }
  
  // 3. Test with lower threshold
  const results = await ragService.searchRelevantKnowledge(
    companyId, query, botId, { threshold: 0.1, limit: 10 }
  );
  
  if (results.results.length === 0) {
    return { issue: 'EMBEDDING_MISMATCH', solution: 'Check query language/content' };
  }
  
  const maxSimilarity = Math.max(...results.results.map(r => r.similarity));
  return { 
    issue: 'LOW_SIMILARITY', 
    solution: `Lower threshold (max found: ${maxSimilarity})`,
    suggestions: results.results.slice(0, 3)
  };
}
```

#### **🐌 Slow Performance**
```sql
-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT ke.knowledge_id, 1 - (ke.embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_base kb ON ke.knowledge_id = kb.id
WHERE kb.company_id = 1
ORDER BY similarity DESC
LIMIT 5;

-- Optimize if needed
REINDEX INDEX idx_embeddings_vector;
ANALYZE knowledge_embeddings;
```

#### **💰 High Token Usage**
```javascript
// Token optimization strategies
function optimizeRAGContext(searchResults, maxTokens = 1500) {
  // 1. Prioritize by similarity
  const sorted = searchResults.sort((a, b) => b.similarity - a.similarity);
  
  // 2. Deduplicate similar chunks
  const deduped = [];
  for (const result of sorted) {
    const isDuplicate = deduped.some(existing => 
      result.knowledge_id === existing.knowledge_id &&
      Math.abs(result.chunk_index - existing.chunk_index) <= 1
    );
    
    if (!isDuplicate) {
      deduped.push(result);
    }
  }
  
  // 3. Smart truncation
  let tokenCount = 0;
  const optimized = [];
  
  for (const result of deduped) {
    const chunkTokens = Math.ceil(result.chunk_text.length / 4);
    if (tokenCount + chunkTokens > maxTokens) break;
    
    optimized.push(result);
    tokenCount += chunkTokens;
  }
  
  return { optimized, tokensSaved: sorted.length - optimized.length };
}
```

---

## 📈 Analytics & Monitoring

### **RAG Performance Metrics**
```javascript
// Track RAG effectiveness
class RAGAnalytics {
  async trackRAGInteraction(interaction) {
    const metrics = {
      company_id: interaction.company_id,
      bot_id: interaction.bot_id,
      query: interaction.query,
      results_count: interaction.rag_results?.length || 0,
      max_similarity: interaction.rag_results?.length > 0 ? 
        Math.max(...interaction.rag_results.map(r => r.similarity)) : 0,
      avg_similarity: interaction.rag_results?.length > 0 ?
        interaction.rag_results.reduce((sum, r) => sum + r.similarity, 0) / interaction.rag_results.length : 0,
      tokens_used: interaction.tokens_used || 0,
      response_time_ms: interaction.response_time_ms || 0,
      timestamp: new Date()
    };
    
    await db.query(`
      INSERT INTO rag_analytics 
      (company_id, bot_id, query, results_count, max_similarity, avg_similarity, tokens_used, response_time_ms, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      metrics.company_id, metrics.bot_id, metrics.query,
      metrics.results_count, metrics.max_similarity, metrics.avg_similarity,
      metrics.tokens_used, metrics.response_time_ms, metrics.timestamp
    ]);
  }
  
  // Generate performance report
  async getRAGPerformanceReport(companyId, days = 30) {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_queries,
        AVG(results_count) as avg_results_per_query,
        AVG(max_similarity) as avg_max_similarity,
        AVG(avg_similarity) as avg_avg_similarity,
        AVG(tokens_used) as avg_tokens_per_query,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN results_count = 0 THEN 1 END) as queries_with_no_results,
        COUNT(CASE WHEN max_similarity >= 0.8 THEN 1 END) as high_confidence_queries
      FROM rag_analytics
      WHERE company_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
    `, [companyId]);
    
    return result.rows[0];
  }
}
```

---

## 🚀 Best Practices

### **1. Content Optimization**
```markdown
✅ **DO:**
- Write clear, specific titles for knowledge items
- Include context and examples in content
- Use consistent terminology across knowledge base
- Break long documents into logical sections
- Include common questions and variations

❌ **DON'T:**
- Upload very short content (< 100 characters)
- Duplicate information across multiple items
- Use too technical language without explanations
- Include outdated or conflicting information
```

### **2. Threshold Configuration**
```javascript
// Smart threshold selection
function selectThreshold(knowledgeStats, queryType) {
  const { avgChunkLength, contentDiversity, totalItems } = knowledgeStats;
  
  // FAQ or simple content
  if (queryType === 'FAQ' || avgChunkLength < 300) {
    return 0.3; // Lower threshold for exact matches
  }
  
  // Technical documentation
  if (contentDiversity === 'high' && avgChunkLength > 800) {
    return 0.6; // Higher threshold for quality
  }
  
  // Balanced approach
  return 0.45;
}
```

### **3. Monitoring Checklist**
```markdown
🔍 **Daily Monitoring:**
- [ ] Check embedding generation success rate
- [ ] Monitor search performance (< 100ms target)
- [ ] Review queries with no results
- [ ] Track token usage vs budget

📊 **Weekly Analysis:**
- [ ] Analyze similarity score distribution
- [ ] Review most/least used knowledge items
- [ ] Check for knowledge gaps based on failed queries
- [ ] Optimize underperforming content

🚀 **Monthly Optimization:**
- [ ] Retrain/update knowledge base
- [ ] A/B test different similarity thresholds
- [ ] Clean up unused or low-quality content
- [ ] Review and update bot prompts
```

---

## 🔧 Environment Configuration

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_MAX_TOKENS=4000

# RAG Performance
RAG_SIMILARITY_THRESHOLD=0.3
RAG_MAX_RESULTS=5
RAG_MAX_CONTEXT_TOKENS=2000
RAG_CACHE_TTL=3600

# Vector Search
PGVECTOR_LISTS=100
PGVECTOR_PROBES=10

# Monitoring
RAG_ENABLE_ANALYTICS=true
RAG_LOG_LEVEL=info
```

---

**📝 Documento actualizado:** Enero 2025  
**🧠 Sistema:** RAG with OpenAI + pgvector  
**📊 Performance Target:** < 100ms search, > 0.8 similarity for quality matches 