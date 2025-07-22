const { pool } = require('../database');
const knowledgeService = require('../services/knowledgeService');
const ragService = require('../services/ragService');
const embeddingService = require('../services/embeddingService');

// UTILITY FUNCTIONS
async function verifyBotOwnership(botId, companyId) {
  const result = await pool.query(`
    SELECT b.id
    FROM whatsapp_bot.bots b
    JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
    WHERE b.id = $1 AND wi.company_id = $2
  `, [botId, companyId]);
  
  if (result.rows.length === 0) {
    throw new Error('Bot no encontrado o no tienes acceso');
  }
  return true;
}

class KnowledgeController {
  // ========================================
  // MAIN KNOWLEDGE OPERATIONS
  // ========================================

  async getKnowledgeItems(req, res) {
    try {
      const companyId = req.user.companyId;
      const filters = {
        active_only: req.query.active_only === 'true',
        content_type: req.query.content_type,
        search: req.query.search,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined
      };

      const result = await knowledgeService.getCompanyKnowledge(companyId, filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting knowledge items:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo knowledge items',
        error: error.message
      });
    }
  }

  async getKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const item = await knowledgeService.getKnowledgeItem(id, companyId);

      res.json({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting knowledge item:', error);
      res.status(404).json({
        success: false,
        message: 'Knowledge item no encontrado',
        error: error.message
      });
    }
  }

  async createKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const data = req.body;

      const item = await knowledgeService.createKnowledgeItem(companyId, data);

      res.status(201).json({
        success: true,
        message: 'Knowledge item creado exitosamente',
        data: item
      });

    } catch (error) {
      console.error('[KnowledgeController] Error creating knowledge item:', error);
      res.status(400).json({
        success: false,
        message: 'Error creando knowledge item',
        error: error.message
      });
    }
  }

  async updateKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const data = req.body;

      const item = await knowledgeService.updateKnowledgeItem(id, companyId, data);

      res.json({
        success: true,
        message: 'Knowledge item actualizado exitosamente',
        data: item
      });

    } catch (error) {
      console.error('[KnowledgeController] Error updating knowledge item:', error);
      res.status(400).json({
        success: false,
        message: 'Error actualizando knowledge item',
        error: error.message
      });
    }
  }

  async deleteKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      await knowledgeService.deleteKnowledgeItem(id, companyId);

      res.json({
        success: true,
        message: 'Knowledge item eliminado exitosamente'
      });

    } catch (error) {
      console.error('[KnowledgeController] Error deleting knowledge item:', error);
      res.status(400).json({
        success: false,
        message: 'Error eliminando knowledge item',
        error: error.message
      });
    }
  }

  // ========================================
  // FILE UPLOAD
  // ========================================

  async uploadFile(req, res) {
    try {
      const companyId = req.user.companyId;
      const file = req.file;
      const metadata = {
        title: req.body.title,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo'
        });
      }

      const item = await knowledgeService.processUploadedFile(file, companyId, metadata);

      res.json({
        success: true,
        message: 'Archivo procesado exitosamente',
        data: item
      });

    } catch (error) {
      console.error('[KnowledgeController] Error uploading file:', error);
      res.status(400).json({
        success: false,
        message: 'Error procesando archivo',
        error: error.message
      });
    }
  }

  // ========================================
  // SEARCH AND ANALYTICS
  // ========================================

  async searchKnowledge(req, res) {
    try {
      const companyId = req.user.companyId;
      const filters = req.body;

      const result = await knowledgeService.searchKnowledge(companyId, filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[KnowledgeController] Error searching knowledge:', error);
      res.status(500).json({
        success: false,
        message: 'Error en búsqueda de knowledge',
        error: error.message
      });
    }
  }

  async getKnowledgeStats(req, res) {
    try {
      const companyId = req.user.companyId;

      const stats = await knowledgeService.getCompanyKnowledgeStats(companyId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting knowledge stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }

  async getApiInfo(req, res) {
    res.json({
      success: true,
      data: {
        name: 'WhatsApp Bot Knowledge API',
        version: '1.0.0',
        endpoints: [
          'GET /knowledge',
          'GET /knowledge/:id',
          'POST /knowledge',
          'PUT /knowledge/:id',
          'DELETE /knowledge/:id',
          'POST /knowledge/upload',
          'POST /knowledge/search',
          'GET /knowledge/stats'
        ],
        rag_endpoints: [
          'GET /knowledge/rag/status',
          'POST /knowledge/rag/migrate',
          'POST /knowledge/rag/test-search',
          'POST /knowledge/rag/test-embeddings',
          'GET /knowledge/rag/analytics/:botId?'
        ]
      }
    });
  }

  // ========================================
  // BOT KNOWLEDGE ASSIGNMENTS
  // ========================================

  async getBotKnowledge(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;

      await verifyBotOwnership(botId, companyId);

      const knowledge = await knowledgeService.getBotKnowledge(botId);

      res.json({
        success: true,
        data: knowledge
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting bot knowledge:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAvailableKnowledgeForBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;

      await verifyBotOwnership(botId, companyId);

      // Get assigned knowledge
      const assigned = await knowledgeService.getBotKnowledge(botId);
      const assignedIds = assigned.map(item => item.id);

      // Get available knowledge (not assigned to this bot)
      const filters = {
        active_only: true,
        limit: 100
      };
      
      const allKnowledge = await knowledgeService.getCompanyKnowledge(companyId, filters);
      const available = allKnowledge.items.filter(item => !assignedIds.includes(item.id));

      res.json({
        success: true,
        data: {
          assigned,
          available
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting available knowledge:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async assignKnowledgeToBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;
      const { knowledgeItemId, priority = 3 } = req.body;

      await verifyBotOwnership(botId, companyId);

      const assignment = await knowledgeService.assignKnowledgeToBot(botId, knowledgeItemId, priority);

      res.json({
        success: true,
        message: 'Knowledge asignado exitosamente',
        data: assignment
      });

    } catch (error) {
      console.error('[KnowledgeController] Error assigning knowledge:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async unassignKnowledgeFromBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;
      const { knowledgeItemId } = req.body;

      await verifyBotOwnership(botId, companyId);

      const success = await knowledgeService.unassignKnowledgeFromBot(botId, knowledgeItemId);

      if (success) {
        res.json({
          success: true,
          message: 'Knowledge desasignado exitosamente'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Asignación no encontrada'
        });
      }

    } catch (error) {
      console.error('[KnowledgeController] Error unassigning knowledge:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // 🔥 RAG TESTING ENDPOINTS
  // ========================================

  /**
   * Get RAG system status and readiness for company
   */
  async getRAGStatus(req, res) {
    try {
      const companyId = req.user.companyId;

      const status = await knowledgeService.getKnowledgeRAGStatus(companyId);
      const embeddingStats = await embeddingService.getEmbeddingStats(companyId);

      const summary = {
        total_items: status.length,
        items_with_embeddings: status.filter(item => item.embeddings_generated).length,
        processing_items: status.filter(item => item.processing_status === 'processing').length,
        error_items: status.filter(item => item.processing_status === 'error').length,
        ready_for_rag: status.filter(item => item.embeddings_count > 0).length,
        embedding_stats: embeddingStats
      };

      res.json({
        success: true,
        data: {
          summary,
          items: status
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting RAG status:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estado RAG',
        error: error.message
      });
    }
  }

  /**
   * Migrate existing knowledge to RAG (generate embeddings)
   */
  async migrateToRAG(req, res) {
    try {
      const companyId = req.user.companyId;

      console.log(`[RAG Migration] Starting migration for company ${companyId}`);

      const results = await knowledgeService.migrateToRAG(companyId);
      
      const summary = {
        total_processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total_embeddings: results.reduce((sum, r) => sum + (r.embeddingsCount || 0), 0)
      };

      console.log(`[RAG Migration] Completed for company ${companyId}:`, summary);

      res.json({
        success: true,
        message: 'Migración RAG completada',
        data: {
          summary,
          details: results
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error in RAG migration:', error);
      res.status(500).json({
        success: false,
        message: 'Error en migración RAG',
        error: error.message
      });
    }
  }

  /**
   * Test RAG search functionality
   */
  async testRAGSearch(req, res) {
    try {
      const companyId = req.user.companyId;
      const { query, botId, similarityThreshold, maxResults } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query es requerido'
        });
      }

      let results;
      
      if (botId) {
        // Test bot-specific search
        await verifyBotOwnership(botId, companyId);
        results = await ragService.retrieveKnowledgeForBot(botId, query, {
          similarityThreshold: similarityThreshold || 0.7,
          maxResults: maxResults || 5
        });
      } else {
        // Test company-wide search
        results = await ragService.retrieveKnowledgeForCompany(companyId, query, {
          similarityThreshold: similarityThreshold || 0.7,
          limit: maxResults || 5
        });
      }

      res.json({
        success: true,
        message: 'Búsqueda RAG completada',
        data: {
          query,
          context: results.context,
          sources: results.sources,
          metadata: results.metadata
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error testing RAG search:', error);
      res.status(500).json({
        success: false,
        message: 'Error en búsqueda RAG de prueba',
        error: error.message
      });
    }
  }

  /**
   * Test embedding generation for text
   */
  async testEmbeddingGeneration(req, res) {
    try {
      const { text, provider, model } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Text es requerido'
        });
      }

      const startTime = Date.now();

      const result = await embeddingService.generateQueryEmbedding(text, {
        provider: provider || 'openai',
        model: model || 'text-embedding-3-small'
      });

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        message: 'Embedding generado exitosamente',
        data: {
          text,
          embedding_vector_size: result.embedding.length,
          provider: result.provider,
          model: result.model,
          token_count: result.tokenCount,
          generation_time_ms: duration,
          embedding_preview: result.embedding.slice(0, 10) // Solo los primeros 10 valores
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error testing embedding generation:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando embedding de prueba',
        error: error.message
      });
    }
  }

  /**
   * Get RAG analytics and performance metrics
   */
  async getRAGAnalytics(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;
      const { daysBack, limit } = req.query;

      const options = {
        botId: botId || null,
        daysBack: daysBack ? parseInt(daysBack) : 30,
        limit: limit ? parseInt(limit) : 100
      };

      if (botId) {
        await verifyBotOwnership(botId, companyId);
      }

      const analytics = await ragService.getRAGAnalytics(companyId, options);

      res.json({
        success: true,
        data: {
          analytics,
          options
        }
      });

    } catch (error) {
      console.error('[KnowledgeController] Error getting RAG analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo analytics RAG',
        error: error.message
      });
    }
  }
}

module.exports = new KnowledgeController(); 