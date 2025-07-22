const { pool } = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ragService = require('./ragService');

class KnowledgeService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads/knowledge');
    this.ensureUploadDirectory();
  }

  // ========================================
  // KNOWLEDGE ITEMS MANAGEMENT
  // ========================================

  /**
   * Get company knowledge items with filtering
   */
  async getCompanyKnowledge(companyId, filters = {}) {
    try {
      let query = `
        SELECT 
          ki.*,
          COALESCE((
            SELECT COUNT(*) 
            FROM whatsapp_bot.bot_knowledge_assignments bka
            WHERE bka.knowledge_item_id = ki.id AND bka.is_active = true
          ), 0) as assigned_bots_count
        FROM whatsapp_bot.knowledge_items ki
        WHERE ki.company_id = $1
      `;
      
      const params = [companyId];
      let paramCounter = 1;

      // Apply filters
      if (filters.active_only) {
        query += ` AND ki.is_active = true`;
      }

      if (filters.content_type) {
        paramCounter++;
        query += ` AND ki.content_type = $${paramCounter}`;
        params.push(filters.content_type);
      }

      if (filters.search) {
        paramCounter++;
        query += ` AND (
          ki.title ILIKE $${paramCounter} OR 
          ki.content ILIKE $${paramCounter} OR
          EXISTS (
            SELECT 1 FROM unnest(ki.tags) tag 
            WHERE tag ILIKE $${paramCounter}
          )
        )`;
        params.push(`%${filters.search}%`);
      }

      // Order by
      query += ` ORDER BY ki.created_at DESC`;

      // Apply pagination
      if (filters.limit) {
        paramCounter++;
        query += ` LIMIT $${paramCounter}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCounter++;
        query += ` OFFSET $${paramCounter}`;
        params.push(filters.offset);
      }

      const result = await pool.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.knowledge_items ki
        WHERE ki.company_id = $1
      `;
      const countParams = [companyId];
      let countParamCounter = 1;

      if (filters.active_only) {
        countQuery += ` AND ki.is_active = true`;
      }

      if (filters.content_type) {
        countParamCounter++;
        countQuery += ` AND ki.content_type = $${countParamCounter}`;
        countParams.push(filters.content_type);
      }

      if (filters.search) {
        countParamCounter++;
        countQuery += ` AND (
          ki.title ILIKE $${countParamCounter} OR 
          ki.content ILIKE $${countParamCounter} OR
          EXISTS (
            SELECT 1 FROM unnest(ki.tags) tag 
            WHERE tag ILIKE $${countParamCounter}
          )
        )`;
        countParams.push(`%${filters.search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        items: result.rows,
        total,
        limit: filters.limit || total,
        offset: filters.offset || 0
      };

    } catch (error) {
      console.error('[KnowledgeService] Error getting company knowledge:', error);
      throw error;
    }
  }

  /**
   * Get specific knowledge item
   */
  async getKnowledgeItem(id, companyId) {
    try {
      const result = await pool.query(`
        SELECT 
          ki.*,
          COALESCE((
            SELECT json_agg(
              json_build_object(
                'bot_id', b.id,
                'bot_name', b.name,
                'priority', bka.priority,
                'assigned_at', bka.created_at
              )
            )
            FROM whatsapp_bot.bot_knowledge_assignments bka
            JOIN whatsapp_bot.bots b ON bka.bot_id = b.id
            WHERE bka.knowledge_item_id = ki.id AND bka.is_active = true
          ), '[]'::json) as assigned_bots
        FROM whatsapp_bot.knowledge_items ki
        WHERE ki.id = $1 AND ki.company_id = $2
      `, [id, companyId]);

      if (result.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      return result.rows[0];

    } catch (error) {
      console.error('[KnowledgeService] Error getting knowledge item:', error);
      throw error;
    }
  }

  /**
   * Create new knowledge item
   */
  async createKnowledgeItem(companyId, data) {
    try {
      const {
        title,
        content,
        content_type = 'manual',
        tags = [],
        file_url = null,
        file_name = null,
        file_size = null
      } = data;

      const result = await pool.query(`
        INSERT INTO whatsapp_bot.knowledge_items (
          company_id, title, content, content_type, tags,
          file_url, file_name, file_size, embeddings_generated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
        RETURNING *
      `, [
        companyId, title, content, content_type, tags,
        file_url, file_name, file_size
      ]);

      const knowledgeItem = result.rows[0];

      // **🔥 RAG INTEGRATION: Generate embeddings automatically**
      if (content && content.trim().length >= 50) {
        try {
          console.log(`[KnowledgeService] Auto-generating embeddings for knowledge item ${knowledgeItem.id}`);
          await ragService.processKnowledgeForRAG(knowledgeItem.id, companyId, content);
        } catch (embeddingError) {
          console.error('[KnowledgeService] Failed to generate embeddings:', embeddingError);
          // Don't throw - knowledge creation should succeed even if embeddings fail
        }
      }

      return knowledgeItem;

    } catch (error) {
      console.error('[KnowledgeService] Error creating knowledge item:', error);
      throw error;
    }
  }

  /**
   * Update knowledge item
   */
  async updateKnowledgeItem(id, companyId, data) {
    try {
      const allowedFields = ['title', 'content', 'tags', 'is_active'];
      const updateFields = [];
      const values = [];
      let paramCounter = 0;

      for (const [field, value] of Object.entries(data)) {
        if (allowedFields.includes(field) && value !== undefined) {
          paramCounter++;
          updateFields.push(`${field} = $${paramCounter}`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      // Add updated_at
      paramCounter++;
      updateFields.push(`updated_at = $${paramCounter}`);
      values.push(new Date());

      // Add WHERE conditions
      paramCounter++;
      values.push(id);
      paramCounter++;
      values.push(companyId);

      const result = await pool.query(`
        UPDATE whatsapp_bot.knowledge_items 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter - 1} AND company_id = $${paramCounter}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      const updatedItem = result.rows[0];

      // **🔥 RAG INTEGRATION: Regenerate embeddings if content changed**
      if (data.content && data.content !== updatedItem.content) {
        try {
          console.log(`[KnowledgeService] Content updated, regenerating embeddings for ${id}`);
          
          // Delete old embeddings
          await pool.query(`
            DELETE FROM whatsapp_bot.knowledge_embeddings
            WHERE knowledge_item_id = $1
          `, [id]);

          // Generate new embeddings
          await ragService.processKnowledgeForRAG(id, companyId, data.content);
        } catch (embeddingError) {
          console.error('[KnowledgeService] Failed to regenerate embeddings:', embeddingError);
        }
      }

      return updatedItem;

    } catch (error) {
      console.error('[KnowledgeService] Error updating knowledge item:', error);
      throw error;
    }
  }

  /**
   * Delete knowledge item
   */
  async deleteKnowledgeItem(id, companyId) {
    try {
      // Check if item exists and belongs to company
      const checkResult = await pool.query(`
        SELECT file_url FROM whatsapp_bot.knowledge_items
        WHERE id = $1 AND company_id = $2
      `, [id, companyId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      const fileUrl = checkResult.rows[0].file_url;

      // Delete from database (cascades to embeddings and assignments)
      await pool.query(`
        DELETE FROM whatsapp_bot.knowledge_items
        WHERE id = $1 AND company_id = $2
      `, [id, companyId]);

      // Delete associated file if exists
      if (fileUrl) {
        try {
          await this.deleteFile(fileUrl);
        } catch (fileError) {
          console.error('[KnowledgeService] Failed to delete file:', fileError);
        }
      }

      return true;

    } catch (error) {
      console.error('[KnowledgeService] Error deleting knowledge item:', error);
      throw error;
    }
  }

  // ========================================
  // FILE UPLOAD AND PROCESSING
  // ========================================

  getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${cleanName}`);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`));
        }
      }
    });
  }

  async processUploadedFile(file, companyId, metadata = {}) {
    try {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let extractedText = '';
      let title = metadata.title || path.basename(file.originalname, fileExtension);

      // Create temporary knowledge item
      const tempItem = await pool.query(`
        INSERT INTO whatsapp_bot.knowledge_items (
          company_id, title, content, content_type, file_url, file_name, file_size,
          processing_status, embeddings_generated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        companyId, title, 'Procesando archivo...', fileExtension.substring(1),
        file.filename, file.originalname, file.size, 'processing', false
      ]);

      const itemId = tempItem.rows[0].id;

      try {
        // Extract text based on file type
        switch (fileExtension) {
          case '.pdf':
            extractedText = await this.extractTextFromPDF(file.path);
            break;
          case '.docx':
          case '.doc':
            extractedText = await this.extractTextFromDOCX(file.path);
            break;
          case '.txt':
            extractedText = await fs.readFile(file.path, 'utf8');
            break;
          default:
            throw new Error(`Tipo de archivo no soportado: ${fileExtension}`);
        }

        if (!extractedText || extractedText.trim().length < 10) {
          throw new Error('No se pudo extraer texto válido del archivo');
        }

        // Generate summary
        const summary = await this.generateSummary(extractedText);

        // Update knowledge item with extracted content
        await pool.query(`
          UPDATE whatsapp_bot.knowledge_items
          SET content = $1, content_summary = $2, processing_status = $3, updated_at = NOW()
          WHERE id = $4
        `, [extractedText.trim(), summary, 'completed', itemId]);

        // **🔥 RAG INTEGRATION: Generate embeddings for uploaded file**
        try {
          console.log(`[KnowledgeService] Generating embeddings for uploaded file ${itemId}`);
          await ragService.processKnowledgeForRAG(itemId, companyId, extractedText.trim());
        } catch (embeddingError) {
          console.error('[KnowledgeService] Failed to generate embeddings for uploaded file:', embeddingError);
        }

        // Return the complete knowledge item
        return await this.getKnowledgeItem(itemId, companyId);

      } catch (processingError) {
        // Update status to error
        await pool.query(`
          UPDATE whatsapp_bot.knowledge_items
          SET processing_status = $1, processing_error = $2, updated_at = NOW()
          WHERE id = $3
        `, ['error', processingError.message, itemId]);

        throw processingError;
      }

    } catch (error) {
      console.error('[KnowledgeService] Error processing uploaded file:', error);
      
      // Clean up file if processing failed
      if (file && file.path) {
        await this.deleteFile(file.path);
      }
      
      throw new Error(`Error procesando archivo: ${error.message}`);
    }
  }

  async extractTextFromPDF(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`Error procesando PDF: ${error.message}`);
    }
  }

  async extractTextFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`Error procesando DOCX: ${error.message}`);
    }
  }

  async generateSummary(text) {
    // Simple summary generation (first 200 chars)
    // TODO: Integrate with OpenAI for better summaries
    if (text.length <= 200) {
      return text;
    }
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > 200) {
        break;
      }
      summary += sentence.trim() + '. ';
    }
    
    return summary.trim() || text.substring(0, 200) + '...';
  }

  // ========================================
  // BOT ASSIGNMENTS
  // ========================================

  async getBotKnowledge(botId) {
    try {
      const result = await pool.query(`
        SELECT 
          ki.*,
          bka.priority,
          bka.created_at as assigned_at
        FROM whatsapp_bot.knowledge_items ki
        JOIN whatsapp_bot.bot_knowledge_assignments bka ON ki.id = bka.knowledge_item_id
        WHERE bka.bot_id = $1 AND bka.is_active = true AND ki.is_active = true
        ORDER BY bka.priority ASC, ki.created_at DESC
      `, [botId]);

      return result.rows;

    } catch (error) {
      console.error('[KnowledgeService] Error getting bot knowledge:', error);
      throw error;
    }
  }

  async assignKnowledgeToBot(botId, knowledgeItemId, priority = 3) {
    try {
      // Check if already assigned
      const existing = await pool.query(`
        SELECT id FROM whatsapp_bot.bot_knowledge_assignments
        WHERE bot_id = $1 AND knowledge_item_id = $2
      `, [botId, knowledgeItemId]);

      if (existing.rows.length > 0) {
        // Update existing assignment
        const result = await pool.query(`
          UPDATE whatsapp_bot.bot_knowledge_assignments
          SET priority = $3, is_active = true, updated_at = NOW()
          WHERE bot_id = $1 AND knowledge_item_id = $2
          RETURNING *
        `, [botId, knowledgeItemId, priority]);

        return result.rows[0];
      } else {
        // Create new assignment
        const result = await pool.query(`
          INSERT INTO whatsapp_bot.bot_knowledge_assignments (
            bot_id, knowledge_item_id, priority
          ) VALUES ($1, $2, $3)
          RETURNING *
        `, [botId, knowledgeItemId, priority]);

        return result.rows[0];
      }

    } catch (error) {
      console.error('[KnowledgeService] Error assigning knowledge to bot:', error);
      throw error;
    }
  }

  async unassignKnowledgeFromBot(botId, knowledgeItemId) {
    try {
      const result = await pool.query(`
        DELETE FROM whatsapp_bot.bot_knowledge_assignments
        WHERE bot_id = $1 AND knowledge_item_id = $2
      `, [botId, knowledgeItemId]);

      return result.rowCount > 0;

    } catch (error) {
      console.error('[KnowledgeService] Error unassigning knowledge from bot:', error);
      throw error;
    }
  }

  // ========================================
  // SEARCH AND ANALYTICS
  // ========================================

  /**
   * Enhanced search with RAG integration
   */
  async searchKnowledge(companyId, filters) {
    try {
      const { search, content_types, limit, active_only } = filters;

      // **🔥 RAG INTEGRATION: Use semantic search if available**
      if (search && search.length >= 3) {
        try {
          const ragResults = await ragService.retrieveKnowledgeForCompany(
            companyId,
            search,
            {
              similarityThreshold: 0.6, // Lower threshold for search
              limit: limit || 20
            }
          );

          if (ragResults.sources.length > 0) {
            console.log(`[KnowledgeService] Using RAG search, found ${ragResults.sources.length} results`);
            
            // Convert RAG results to knowledge items format
            const knowledgeItemIds = [...new Set(ragResults.sources.map(s => s.knowledgeItemId))];
            
            if (knowledgeItemIds.length > 0) {
              const placeholders = knowledgeItemIds.map((_, i) => `$${i + 2}`).join(',');
              const result = await pool.query(`
                SELECT ki.*, 0 as assigned_bots_count
                FROM whatsapp_bot.knowledge_items ki
                WHERE ki.company_id = $1 AND ki.id IN (${placeholders})
                ORDER BY 
                  CASE 
                    ${knowledgeItemIds.map((id, i) => `WHEN ki.id = $${i + 2} THEN ${i}`).join(' ')}
                    ELSE ${knowledgeItemIds.length}
                  END
              `, [companyId, ...knowledgeItemIds]);

              return {
                items: result.rows,
                total: result.rows.length,
                searchType: 'semantic',
                ragMetadata: ragResults.metadata
              };
            }
          }
        } catch (ragError) {
          console.warn('[KnowledgeService] RAG search failed, falling back to traditional search:', ragError.message);
        }
      }

      // Fallback to traditional search
      return await this.getCompanyKnowledge(companyId, {
        search,
        content_type: content_types?.[0],
        active_only,
        limit
      });

    } catch (error) {
      console.error('[KnowledgeService] Error in knowledge search:', error);
      throw error;
    }
  }

  async getCompanyKnowledgeStats(companyId) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE is_active = true) as active_items,
          COUNT(*) FILTER (WHERE content_type = 'manual') as manual_items,
          COUNT(*) FILTER (WHERE content_type IN ('pdf', 'docx', 'txt')) as file_items,
          COUNT(*) FILTER (WHERE embeddings_generated = true) as items_with_embeddings,
          COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_items,
          COUNT(*) FILTER (WHERE processing_status = 'error') as error_items,
          AVG(LENGTH(content)) as avg_content_length,
          (
            SELECT COUNT(*) 
            FROM whatsapp_bot.bot_knowledge_assignments bka
            JOIN whatsapp_bot.knowledge_items ki ON bka.knowledge_item_id = ki.id
            WHERE ki.company_id = $1 AND bka.is_active = true
          ) as total_assignments
        FROM whatsapp_bot.knowledge_items
        WHERE company_id = $1
      `, [companyId]);

      const stats = result.rows[0];

      // 🔧 Convert string numbers to integers for frontend
      Object.keys(stats).forEach(key => {
        if (typeof stats[key] === 'string' && !isNaN(stats[key])) {
          stats[key] = parseInt(stats[key]) || 0;
        }
        if (typeof stats[key] === 'string' && stats[key].includes('.')) {
          stats[key] = parseFloat(stats[key]) || 0;
        }
      });

      // **🔥 RAG INTEGRATION: Add embedding stats**
      try {
        const embeddingStats = await pool.query(`
          SELECT * FROM whatsapp_bot.get_embeddings_stats($1)
        `, [companyId]);

        if (embeddingStats.rows.length > 0) {
          const embStats = embeddingStats.rows[0];
          stats.total_embeddings = embStats.total_embeddings || 0;
          stats.embeddings_by_provider = embStats.embeddings_by_provider || {};
          stats.embeddings_by_type = embStats.embeddings_by_type || {};
          stats.avg_chunk_tokens = embStats.avg_chunk_tokens || 0;
          stats.total_tokens = embStats.total_tokens || 0;
        }
      } catch (embeddingError) {
        console.warn('[KnowledgeService] Could not get embedding stats:', embeddingError.message);
      }

      return stats;

    } catch (error) {
      console.error('[KnowledgeService] Error getting knowledge stats:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('[KnowledgeService] Failed to create upload directory:', error);
    }
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('[KnowledgeService] Failed to delete file:', error);
      throw error;
    }
  }

  // ========================================
  // RAG INTEGRATION METHODS
  // ========================================

  /**
   * Migrate existing knowledge to RAG (generate embeddings)
   */
  async migrateToRAG(companyId) {
    try {
      console.log(`[KnowledgeService] Starting RAG migration for company ${companyId}`);
      
      const results = await ragService.reprocessCompanyKnowledge(companyId);
      
      console.log(`[KnowledgeService] RAG migration completed for company ${companyId}`);
      return results;

    } catch (error) {
      console.error('[KnowledgeService] Error in RAG migration:', error);
      throw error;
    }
  }

  /**
   * Get knowledge with RAG readiness info
   */
  async getKnowledgeRAGStatus(companyId) {
    try {
      const result = await pool.query(`
        SELECT 
          ki.id,
          ki.title,
          ki.content_type,
          ki.embeddings_generated,
          ki.processing_status,
          COALESCE((
            SELECT COUNT(*) 
            FROM whatsapp_bot.knowledge_embeddings ke
            WHERE ke.knowledge_item_id = ki.id
          ), 0) as embeddings_count
        FROM whatsapp_bot.knowledge_items ki
        WHERE ki.company_id = $1 AND ki.is_active = true
        ORDER BY ki.created_at DESC
      `, [companyId]);

      return result.rows;

    } catch (error) {
      console.error('[KnowledgeService] Error getting RAG status:', error);
      throw error;
    }
  }
}

module.exports = new KnowledgeService(); 