const OpenAI = require('openai');
const { encoding_for_model } = require('tiktoken');
const crypto = require('crypto');
const { pool } = require('../database');

class EmbeddingService {
  constructor() {
    // Initialize providers
    this.providers = {
      'openai': new OpenAIProvider()
    };
    this.defaultProvider = 'openai';
    
    // Chunking configuration
    this.chunkConfig = {
      maxChunkSize: 1000,        // Max characters per chunk
      overlapSize: 200,          // Overlap between chunks
      maxTokens: 8000,           // Max tokens for embedding model
      minChunkSize: 50           // Minimum viable chunk size
    };
  }

  // ========================================
  // MAIN EMBEDDING METHODS
  // ========================================

  /**
   * Generate embeddings for knowledge item content
   */
  async generateKnowledgeEmbeddings(knowledgeItemId, companyId, content, options = {}) {
    try {
      console.log(`[EmbeddingService] Generating embeddings for knowledge item: ${knowledgeItemId}`);
      
      const provider = options.provider || this.defaultProvider;
      const model = options.model || 'text-embedding-3-small';
      
      // Step 1: Clean and prepare content
      const cleanContent = this.cleanText(content);
      if (cleanContent.length < this.chunkConfig.minChunkSize) {
        throw new Error('Content too short for embedding generation');
      }

      // Step 2: Chunk the content optimally
      const chunks = await this.chunkText(cleanContent);
      console.log(`[EmbeddingService] Created ${chunks.length} chunks`);

      // Step 3: Generate embeddings for each chunk
      const embeddings = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Check if chunk already exists (deduplication)
        const chunkHash = this.generateChunkHash(chunk.text);
        const existingEmbedding = await this.findExistingEmbedding(knowledgeItemId, chunkHash);
        
        if (existingEmbedding) {
          console.log(`[EmbeddingService] Using cached embedding for chunk ${i + 1}`);
          embeddings.push(existingEmbedding);
          continue;
        }

        // Generate new embedding
        const embedding = await this.providers[provider].generateEmbedding(chunk.text, model);
        const tokenCount = await this.countTokens(chunk.text, model);

        // Save to database
        const savedEmbedding = await this.saveEmbedding({
          knowledgeItemId,
          chunkText: chunk.text,
          chunkIndex: i + 1,
          chunkTokens: tokenCount,
          chunkHash,
          embeddingData: embedding,
          embeddingProvider: provider,
          embeddingModel: model
        });

        embeddings.push(savedEmbedding);
        
        // Rate limiting for API calls
        if (i < chunks.length - 1) {
          await this.sleep(100); // 100ms between API calls
        }
      }

      // Step 4: Update knowledge item status
      await this.markKnowledgeWithEmbeddings(knowledgeItemId);
      
      console.log(`[EmbeddingService] Successfully generated ${embeddings.length} embeddings`);
      return embeddings;

    } catch (error) {
      console.error(`[EmbeddingService] Error generating embeddings:`, error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate query embedding for search
   */
  async generateQueryEmbedding(queryText, options = {}) {
    try {
      const provider = options.provider || this.defaultProvider;
      const model = options.model || 'text-embedding-3-small';
      
      const cleanQuery = this.cleanText(queryText);
      const embedding = await this.providers[provider].generateEmbedding(cleanQuery, model);
      
      return {
        embedding,
        provider,
        model,
        tokenCount: await this.countTokens(cleanQuery, model)
      };

    } catch (error) {
      console.error(`[EmbeddingService] Error generating query embedding:`, error);
      throw error;
    }
  }

  // ========================================
  // TEXT PROCESSING METHODS
  // ========================================

  /**
   * Clean and normalize text for embedding
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\s+/g, ' ')             // Collapse whitespace
      .replace(/[^\w\s.,;:!?()-]/g, '') // Remove special chars but keep punctuation
      .trim();
  }

  /**
   * Intelligently chunk text for optimal embedding
   */
  async chunkText(text) {
    const chunks = [];
    const textLength = text.length;
    
    if (textLength <= this.chunkConfig.maxChunkSize) {
      // Single chunk if text is small enough
      return [{
        text: text,
        index: 1,
        start: 0,
        end: textLength
      }];
    }

    // Use SQL function for consistent chunking
    try {
      const result = await pool.query(`
        SELECT chunk_index, chunk_text, chunk_start, chunk_end
        FROM whatsapp_bot.chunk_text_for_embeddings($1, $2, $3)
        ORDER BY chunk_index
      `, [text, this.chunkConfig.maxChunkSize, this.chunkConfig.overlapSize]);

      return result.rows.map(row => ({
        text: row.chunk_text,
        index: row.chunk_index,
        start: row.chunk_start,
        end: row.chunk_end
      }));

    } catch (error) {
      console.warn('[EmbeddingService] SQL chunking failed, using JS fallback:', error.message);
      return this.chunkTextFallback(text);
    }
  }

  /**
   * Fallback chunking method (JavaScript implementation)
   */
  chunkTextFallback(text) {
    const chunks = [];
    let currentStart = 0;
    let chunkIndex = 0;
    
    while (currentStart < text.length) {
      chunkIndex++;
      const currentEnd = Math.min(currentStart + this.chunkConfig.maxChunkSize, text.length);
      
      // Try to break at word boundary
      let breakPoint = currentEnd;
      if (currentEnd < text.length) {
        const lastSpace = text.lastIndexOf(' ', currentEnd);
        if (lastSpace > currentStart + this.chunkConfig.maxChunkSize * 0.7) {
          breakPoint = lastSpace;
        }
      }
      
      const chunkText = text.substring(currentStart, breakPoint).trim();
      
      if (chunkText.length >= this.chunkConfig.minChunkSize) {
        chunks.push({
          text: chunkText,
          index: chunkIndex,
          start: currentStart,
          end: breakPoint
        });
      }
      
      // Move to next chunk with overlap
      currentStart = breakPoint - this.chunkConfig.overlapSize;
      if (currentStart >= text.length - this.chunkConfig.minChunkSize) {
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Count tokens for pricing and optimization
   */
  async countTokens(text, model = 'text-embedding-3-small') {
    try {
      // Map embedding models to chat models for tokenization
      const tokenModel = model.includes('3') ? 'gpt-3.5-turbo' : 'gpt-3.5-turbo';
      const encoding = encoding_for_model(tokenModel);
      const tokens = encoding.encode(text);
      encoding.free();
      return tokens.length;
    } catch (error) {
      // Fallback: rough estimate (4 chars per token)
      return Math.ceil(text.length / 4);
    }
  }

  // ========================================
  // DATABASE METHODS
  // ========================================

  /**
   * Save embedding to database
   */
  async saveEmbedding(embeddingParams) {
    const {
      knowledgeItemId,
      chunkText,
      chunkIndex,
      chunkTokens,
      chunkHash,
      embeddingData,
      embeddingProvider,
      embeddingModel
    } = embeddingParams;

    const result = await pool.query(`
      INSERT INTO whatsapp_bot.knowledge_embeddings (
        knowledge_item_id,
        content_chunk,
        chunk_index,
        chunk_tokens,
        chunk_hash,
        embedding_data,
        embedding_provider,
        embedding_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      knowledgeItemId,
      chunkText,
      chunkIndex,
      chunkTokens,
      chunkHash,
      JSON.stringify(embeddingData), // Convert array to string for pgvector
      embeddingProvider,
      embeddingModel
    ]);

    return result.rows[0];
  }

  /**
   * Find existing embedding by hash (deduplication)
   */
  async findExistingEmbedding(knowledgeItemId, chunkHash) {
    const result = await pool.query(`
      SELECT * FROM whatsapp_bot.knowledge_embeddings
      WHERE knowledge_item_id = $1 AND chunk_hash = $2
      LIMIT 1
    `, [knowledgeItemId, chunkHash]);

    return result.rows[0] || null;
  }

  /**
   * Mark knowledge item as having embeddings
   */
  async markKnowledgeWithEmbeddings(knowledgeItemId) {
    await pool.query(`
      UPDATE whatsapp_bot.knowledge_items
      SET embeddings_generated = true, updated_at = NOW()
      WHERE id = $1
    `, [knowledgeItemId]);
  }

  /**
   * Get embeddings for knowledge item
   */
  async getKnowledgeEmbeddings(knowledgeItemId) {
    const result = await pool.query(`
      SELECT * FROM whatsapp_bot.knowledge_embeddings
      WHERE knowledge_item_id = $1
      ORDER BY chunk_index ASC
    `, [knowledgeItemId]);

    return result.rows;
  }

  /**
   * Delete embeddings for knowledge item
   */
  async deleteKnowledgeEmbeddings(knowledgeItemId) {
    const result = await pool.query(`
      DELETE FROM whatsapp_bot.knowledge_embeddings
      WHERE knowledge_item_id = $1
    `, [knowledgeItemId]);

    return result.rowCount;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Generate hash for chunk deduplication
   */
  generateChunkHash(text) {
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  }

  /**
   * Sleep utility for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(companyId) {
    try {
      const result = await pool.query(`
        SELECT * FROM whatsapp_bot.get_embeddings_stats($1)
      `, [companyId]);

      return result.rows[0] || {};
    } catch (error) {
      console.error('[EmbeddingService] Error getting stats:', error);
      return {};
    }
  }
}

// ========================================
// PROVIDER IMPLEMENTATIONS
// ========================================

class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Rate limiting configuration
    this.rateLimitDelay = 100; // ms between requests
    this.lastRequestTime = 0;
  }

  async generateEmbedding(text, model = 'text-embedding-3-small') {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
    }

    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
        encoding_format: 'float'
      });

      this.lastRequestTime = Date.now();
      return response.data[0].embedding;

    } catch (error) {
      console.error('[OpenAIProvider] Embedding generation failed:', error);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// SINGLETON EXPORT
// ========================================

module.exports = new EmbeddingService(); 