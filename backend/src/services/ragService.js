const { pool } = require('../database');
const embeddingService = require('./embeddingService');

class RAGService {
  constructor() {
    // RAG Configuration
    this.config = {
      similarityThreshold: 0.7,     // Minimum similarity score
      maxContextChunks: 5,          // Max chunks per query
      maxContextTokens: 2000,       // Max tokens in context
      diversityWeight: 0.3,         // Balance between similarity and diversity
      priorityWeight: 0.4           // Weight for bot priority scores
    };
  }

  // ========================================
  // MAIN RAG METHODS
  // ========================================

  /**
   * Retrieve relevant knowledge for a bot's query using RAG
   */
  async retrieveKnowledgeForBot(botId, queryText, options = {}) {
    try {
      console.log(`[RAGService] Retrieving knowledge for bot ${botId}: "${queryText}"`);
      
      const startTime = Date.now();
      
      // Step 1: Generate query embedding
      const queryEmbedding = await embeddingService.generateQueryEmbedding(queryText);
      const embeddingTime = Date.now() - startTime;
      
      // Step 2: Search for relevant knowledge chunks
      const searchResults = await this.searchBotKnowledge(
        botId, 
        queryEmbedding.embedding, 
        {
          similarityThreshold: options.similarityThreshold || this.config.similarityThreshold,
          limit: options.maxResults || this.config.maxContextChunks,
          ...options
        }
      );
      
      const totalTime = Date.now() - startTime;
      
      // Step 3: Build optimized context
      const context = await this.buildContext(searchResults, queryText);
      
      // Step 4: Log analytics
      await this.logSearchAnalytics({
        botId,
        queryText,
        results: searchResults,
        searchDuration: totalTime,
        embeddingDuration: embeddingTime,
        queryEmbedding: queryEmbedding
      });
      
      console.log(`[RAGService] Retrieved ${searchResults.length} relevant chunks in ${totalTime}ms`);
      
      return {
        context,
        sources: searchResults,
        metadata: {
          queryEmbedding: queryEmbedding,
          searchTime: totalTime,
          embeddingTime: embeddingTime,
          resultsCount: searchResults.length,
          avgSimilarity: searchResults.reduce((sum, r) => sum + r.similarity_score, 0) / searchResults.length || 0
        }
      };

    } catch (error) {
      console.error(`[RAGService] Error in knowledge retrieval:`, error);
      throw new Error(`RAG retrieval failed: ${error.message}`);
    }
  }

  /**
   * Retrieve knowledge by company (admin/general search)
   */
  async retrieveKnowledgeForCompany(companyId, queryText, options = {}) {
    try {
      console.log(`[RAGService] Company search for: "${queryText}"`);
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateQueryEmbedding(queryText);
      
      // Search company knowledge
      const searchResults = await this.searchCompanyKnowledge(
        companyId,
        queryEmbedding.embedding,
        options
      );
      
      // Build context
      const context = await this.buildContext(searchResults, queryText);
      
      return {
        context,
        sources: searchResults,
        metadata: {
          queryEmbedding: queryEmbedding,
          resultsCount: searchResults.length
        }
      };

    } catch (error) {
      console.error(`[RAGService] Error in company knowledge retrieval:`, error);
      throw error;
    }
  }

  // ========================================
  // SEARCH METHODS
  // ========================================

  /**
   * Search knowledge specific to a bot (considers assignments and priorities)
   */
  async searchBotKnowledge(botId, queryEmbedding, options = {}) {
    const {
      similarityThreshold = this.config.similarityThreshold,
      limit = this.config.maxContextChunks
    } = options;

    try {
      // Use the SQL function for secure, optimized search
      const result = await pool.query(`
        SELECT 
          embedding_id,
          knowledge_item_id,
          knowledge_title,
          content_type,
          chunk_text,
          chunk_index,
          similarity_score,
          priority,
          tags
        FROM whatsapp_bot.search_bot_knowledge_embeddings($1, $2, $3, $4)
      `, [botId, JSON.stringify(queryEmbedding), similarityThreshold, limit]);

      return result.rows.map(this.formatSearchResult);

    } catch (error) {
      console.error(`[RAGService] Bot knowledge search failed:`, error);
      throw error;
    }
  }

  /**
   * Search knowledge for entire company
   */
  async searchCompanyKnowledge(companyId, queryEmbedding, options = {}) {
    const {
      similarityThreshold = this.config.similarityThreshold,
      limit = this.config.maxContextChunks
    } = options;

    try {
      const result = await pool.query(`
        SELECT 
          embedding_id,
          knowledge_item_id,
          knowledge_title,
          content_type,
          chunk_text,
          chunk_index,
          similarity_score,
          tags
        FROM whatsapp_bot.search_knowledge_embeddings($1, $2, $3, $4)
      `, [companyId, JSON.stringify(queryEmbedding), similarityThreshold, limit]);

      return result.rows.map(this.formatSearchResult);

    } catch (error) {
      console.error(`[RAGService] Company knowledge search failed:`, error);
      throw error;
    }
  }

  // ========================================
  // CONTEXT BUILDING
  // ========================================

  /**
   * Build intelligent context from search results
   */
  async buildContext(searchResults, queryText = '') {
    if (!searchResults || searchResults.length === 0) {
      return {
        text: '',
        sources: [],
        totalTokens: 0,
        chunksUsed: 0
      };
    }

    // Sort and deduplicate results
    const optimizedResults = this.optimizeSearchResults(searchResults);
    
    // Build context text
    let contextText = '';
    let totalTokens = 0;
    const usedSources = [];
    
    for (const result of optimizedResults) {
      const chunkTokens = await embeddingService.countTokens(result.chunk_text);
      
      // Check if adding this chunk would exceed token limit
      if (totalTokens + chunkTokens > this.config.maxContextTokens) {
        console.log(`[RAGService] Context token limit reached (${totalTokens}/${this.config.maxContextTokens})`);
        break;
      }
      
      // Add source context
      const sourceHeader = `[${result.knowledge_title}${result.content_type !== 'manual' ? ` (${result.content_type.toUpperCase()})` : ''}]`;
      const chunkContent = `${sourceHeader}\n${result.chunk_text}\n`;
      
      contextText += chunkContent + '\n';
      totalTokens += chunkTokens + 10; // +10 for header tokens
      
      usedSources.push({
        knowledgeItemId: result.knowledge_item_id,
        title: result.knowledge_title,
        contentType: result.content_type,
        chunkIndex: result.chunk_index,
        similarityScore: result.similarity_score,
        priority: result.priority,
        tags: result.tags
      });
    }
    
    return {
      text: contextText.trim(),
      sources: usedSources,
      totalTokens,
      chunksUsed: usedSources.length,
      metadata: {
        avgSimilarity: usedSources.reduce((sum, s) => sum + s.similarityScore, 0) / usedSources.length || 0,
        contentTypes: [...new Set(usedSources.map(s => s.contentType))],
        knowledgeItems: [...new Set(usedSources.map(s => s.knowledgeItemId))]
      }
    };
  }

  /**
   * Optimize search results for better context
   */
  optimizeSearchResults(results) {
    // Sort by composite score: similarity + priority + diversity
    const scoredResults = results.map((result, index) => {
      let compositeScore = result.similarity_score;
      
      // Add priority bonus (higher priority = higher score)
      if (result.priority) {
        const priorityBonus = (6 - result.priority) * this.config.priorityWeight / 5;
        compositeScore += priorityBonus;
      }
      
      // Add small diversity penalty for later results
      const diversityPenalty = index * this.config.diversityWeight * 0.1;
      compositeScore -= diversityPenalty;
      
      return {
        ...result,
        compositeScore
      };
    });
    
    // Sort by composite score
    scoredResults.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Deduplicate by knowledge item (prefer highest scoring chunk per item)
    const deduplicatedResults = [];
    const seenKnowledgeItems = new Set();
    
    for (const result of scoredResults) {
      if (!seenKnowledgeItems.has(result.knowledge_item_id)) {
        deduplicatedResults.push(result);
        seenKnowledgeItems.add(result.knowledge_item_id);
      }
    }
    
    return deduplicatedResults;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Format search result from database
   */
  formatSearchResult(row) {
    return {
      embedding_id: row.embedding_id,
      knowledge_item_id: row.knowledge_item_id,
      knowledge_title: row.knowledge_title,
      content_type: row.content_type,
      chunk_text: row.chunk_text,
      chunk_index: parseInt(row.chunk_index),
      similarity_score: parseFloat(row.similarity_score),
      priority: row.priority ? parseInt(row.priority) : null,
      tags: Array.isArray(row.tags) ? row.tags : []
    };
  }

  /**
   * Create RAG-optimized prompt with context
   */
  buildRAGPrompt(systemPrompt, context, userMessage, options = {}) {
    const {
      includeSourceInfo = true,
      maxPromptTokens = 4000
    } = options;

    if (!context.text) {
      return {
        systemPrompt,
        userMessage,
        tokensUsed: 0
      };
    }

    const contextSection = includeSourceInfo 
      ? `KNOWLEDGE BASE CONTEXT:\n${context.text}\n\nUSE THE ABOVE CONTEXT TO HELP ANSWER THE FOLLOWING QUESTION. If the context doesn't contain relevant information, rely on your general knowledge but mention that you're doing so.`
      : `CONTEXT:\n${context.text}\n\n`;

    const enhancedPrompt = `${systemPrompt}\n\n${contextSection}`;
    
    // TODO: Implement token counting and truncation if needed
    
    return {
      systemPrompt: enhancedPrompt,
      userMessage,
      tokensUsed: context.totalTokens,
      sources: context.sources
    };
  }

  // ========================================
  // ANALYTICS AND MONITORING
  // ========================================

  /**
   * Log search analytics for optimization
   */
  async logSearchAnalytics(data) {
    const {
      botId,
      queryText,
      results = [],
      searchDuration = 0,
      embeddingDuration = 0,
      queryEmbedding
    } = data;

    try {
      // Get company_id from bot
      const botResult = await pool.query(`
        SELECT wi.company_id 
        FROM whatsapp_bot.bots b
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        WHERE b.id = $1
      `, [botId]);
      
      if (botResult.rows.length === 0) return;
      
      const companyId = botResult.rows[0].company_id;
      
      // Create embedding hash for deduplication
      const embeddingHash = require('crypto')
        .createHash('sha256')
        .update(JSON.stringify(queryEmbedding.embedding))
        .digest('hex');

      const avgSimilarity = results.length > 0 
        ? results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length 
        : 0;
        
      const maxSimilarity = results.length > 0 
        ? Math.max(...results.map(r => r.similarity_score)) 
        : 0;

      await pool.query(`
        INSERT INTO whatsapp_bot.rag_search_analytics (
          company_id,
          bot_id,
          query_text,
          query_embedding_hash,
          results_count,
          avg_similarity_score,
          max_similarity_score,
          search_duration_ms,
          embedding_generation_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        companyId,
        botId,
        queryText,
        embeddingHash,
        results.length,
        avgSimilarity,
        maxSimilarity,
        searchDuration,
        embeddingDuration
      ]);

    } catch (error) {
      console.error('[RAGService] Error logging analytics:', error);
      // Don't throw - analytics failures shouldn't break RAG
    }
  }

  /**
   * Get RAG performance analytics
   */
  async getRAGAnalytics(companyId, options = {}) {
    const {
      botId = null,
      daysBack = 30,
      limit = 100
    } = options;

    try {
      let query = `
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as searches_count,
          AVG(results_count) as avg_results,
          AVG(avg_similarity_score) as avg_similarity,
          AVG(search_duration_ms) as avg_search_time
        FROM whatsapp_bot.rag_search_analytics
        WHERE company_id = $1 
          AND created_at >= NOW() - INTERVAL '${daysBack} days'
      `;
      
      const params = [companyId];
      
      if (botId) {
        query += ` AND bot_id = $2`;
        params.push(botId);
      }
      
      query += ` GROUP BY DATE_TRUNC('day', created_at) ORDER BY date DESC LIMIT ${limit}`;
      
      const result = await pool.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('[RAGService] Error getting analytics:', error);
      return [];
    }
  }

  // ========================================
  // KNOWLEDGE PROCESSING INTEGRATION
  // ========================================

  /**
   * Process knowledge item for RAG (generate embeddings)
   */
  async processKnowledgeForRAG(knowledgeItemId, companyId, content) {
    try {
      console.log(`[RAGService] Processing knowledge item ${knowledgeItemId} for RAG`);
      
      // Generate embeddings using EmbeddingService
      const embeddings = await embeddingService.generateKnowledgeEmbeddings(
        knowledgeItemId,
        companyId,
        content
      );
      
      console.log(`[RAGService] Generated ${embeddings.length} embeddings for knowledge item`);
      return embeddings;

    } catch (error) {
      console.error(`[RAGService] Error processing knowledge for RAG:`, error);
      throw error;
    }
  }

  /**
   * Reprocess all knowledge items for a company (migration helper)
   */
  async reprocessCompanyKnowledge(companyId) {
    try {
      console.log(`[RAGService] Reprocessing all knowledge for company ${companyId}`);
      
      // Get all active knowledge items without embeddings
      const result = await pool.query(`
        SELECT id, content
        FROM whatsapp_bot.knowledge_items
        WHERE company_id = $1 
          AND is_active = true 
          AND (embeddings_generated = false OR embeddings_generated IS NULL)
          AND content IS NOT NULL
          AND LENGTH(content) >= 50
      `, [companyId]);
      
      const knowledgeItems = result.rows;
      console.log(`[RAGService] Found ${knowledgeItems.length} knowledge items to process`);
      
      const results = [];
      for (const item of knowledgeItems) {
        try {
          const embeddings = await this.processKnowledgeForRAG(
            item.id,
            companyId,
            item.content
          );
          results.push({
            knowledgeItemId: item.id,
            success: true,
            embeddingsCount: embeddings.length
          });
          
          // Rate limiting between items
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`[RAGService] Failed to process knowledge item ${item.id}:`, error);
          results.push({
            knowledgeItemId: item.id,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`[RAGService] Completed reprocessing for company ${companyId}`);
      return results;

    } catch (error) {
      console.error(`[RAGService] Error in bulk reprocessing:`, error);
      throw error;
    }
  }
}

// ========================================
// SINGLETON EXPORT
// ========================================

module.exports = new RAGService(); 