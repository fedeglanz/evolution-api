const knowledgeService = require('../services/knowledgeService');

class KnowledgeController {

  // ========================================
  // KNOWLEDGE ITEMS MANAGEMENT
  // ========================================

  /**
   * Obtener todos los knowledge items de la empresa
   * GET /api/knowledge
   */
  async getKnowledgeItems(req, res) {
    try {
      const companyId = req.user.companyId;
      const filters = {
        active_only: req.query.active_only,
        content_type: req.query.content_type,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const result = await knowledgeService.getCompanyKnowledge(companyId, filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Knowledge API] Error getting knowledge items:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener knowledge item específico
   * GET /api/knowledge/:id
   */
  async getKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const item = await knowledgeService.getKnowledgeItem(id, companyId);

      res.json({
        success: true,
        data: { item }
      });

    } catch (error) {
      console.error('[Knowledge API] Error getting knowledge item:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Crear nuevo knowledge item manualmente
   * POST /api/knowledge
   */
  async createKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { title, content, tags } = req.body;

      const item = await knowledgeService.createKnowledgeItem(companyId, {
        title,
        content,
        content_type: 'manual',
        tags: Array.isArray(tags) ? tags : []
      });

      res.status(201).json({
        success: true,
        message: 'Knowledge item creado exitosamente',
        data: { item }
      });

    } catch (error) {
      console.error('[Knowledge API] Error creating knowledge item:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Actualizar knowledge item
   * PUT /api/knowledge/:id
   */
  async updateKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const updateData = req.body;

      const item = await knowledgeService.updateKnowledgeItem(id, companyId, updateData);

      res.json({
        success: true,
        message: 'Knowledge item actualizado exitosamente',
        data: { item }
      });

    } catch (error) {
      console.error('[Knowledge API] Error updating knowledge item:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Eliminar knowledge item
   * DELETE /api/knowledge/:id
   */
  async deleteKnowledgeItem(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const result = await knowledgeService.deleteKnowledgeItem(id, companyId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('[Knowledge API] Error deleting knowledge item:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // FILE UPLOAD AND PROCESSING
  // ========================================

  /**
   * Subir archivo y crear knowledge item
   * POST /api/knowledge/upload
   */
  async uploadFile(req, res) {
    try {
      const companyId = req.user.companyId;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo'
        });
      }

      // Metadata opcional del formulario
      const metadata = {
        title: req.body.title,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      const item = await knowledgeService.processUploadedFile(req.file, companyId, metadata);

      res.status(201).json({
        success: true,
        message: 'Archivo procesado exitosamente',
        data: { item }
      });

    } catch (error) {
      console.error('[Knowledge API] Error uploading file:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // BOT ASSIGNMENTS
  // ========================================

  /**
   * Obtener knowledge items asignados a un bot
   * GET /api/knowledge/bots/:botId
   */
  async getBotKnowledge(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;

      // Verificar que el bot pertenece a la empresa
      await this.verifyBotOwnership(botId, companyId);

      const items = await knowledgeService.getBotKnowledge(botId);

      res.json({
        success: true,
        data: { items, total: items.length }
      });

    } catch (error) {
      console.error('[Knowledge API] Error getting bot knowledge:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Asignar knowledge item a bot
   * POST /api/knowledge/bots/:botId/assign
   */
  async assignKnowledgeToBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;
      const { knowledge_item_id, priority = 3 } = req.body;

      // Verificar que el bot pertenece a la empresa
      await this.verifyBotOwnership(botId, companyId);

      const assignment = await knowledgeService.assignKnowledgeToBot(
        botId, 
        knowledge_item_id, 
        priority
      );

      res.json({
        success: true,
        message: 'Knowledge asignado al bot exitosamente',
        data: { assignment }
      });

    } catch (error) {
      console.error('[Knowledge API] Error assigning knowledge to bot:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Quitar knowledge item de bot
   * DELETE /api/knowledge/bots/:botId/assign/:knowledgeItemId
   */
  async unassignKnowledgeFromBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId, knowledgeItemId } = req.params;

      // Verificar que el bot pertenece a la empresa
      await this.verifyBotOwnership(botId, companyId);

      const result = await knowledgeService.unassignKnowledgeFromBot(botId, knowledgeItemId);

      res.json({
        success: true,
        message: 'Knowledge removido del bot exitosamente',
        data: { result }
      });

    } catch (error) {
      console.error('[Knowledge API] Error unassigning knowledge from bot:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener knowledge items disponibles para asignar a un bot
   * GET /api/knowledge/bots/:botId/available
   */
  async getAvailableKnowledgeForBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { botId } = req.params;

      // Verificar que el bot pertenece a la empresa
      await this.verifyBotOwnership(botId, companyId);

      // Obtener todos los knowledge items de la empresa
      const allItems = await knowledgeService.getCompanyKnowledge(companyId, { active_only: 'true' });

      // Obtener knowledge items ya asignados a este bot
      const assignedItems = await knowledgeService.getBotKnowledge(botId);
      const assignedIds = new Set(assignedItems.map(item => item.id));

      // Filtrar items disponibles (no asignados)
      const availableItems = allItems.items.filter(item => !assignedIds.has(item.id));

      res.json({
        success: true,
        data: { 
          available: availableItems, 
          assigned: assignedItems,
          total_available: availableItems.length,
          total_assigned: assignedItems.length
        }
      });

    } catch (error) {
      console.error('[Knowledge API] Error getting available knowledge:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // STATISTICS AND ANALYTICS
  // ========================================

  /**
   * Obtener estadísticas de knowledge base de la empresa
   * GET /api/knowledge/stats
   */
  async getKnowledgeStats(req, res) {
    try {
      const companyId = req.user.companyId;

      const stats = await knowledgeService.getCompanyKnowledgeStats(companyId);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('[Knowledge API] Error getting knowledge stats:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // SEARCH AND DISCOVERY
  // ========================================

  /**
   * Buscar en knowledge base
   * POST /api/knowledge/search
   */
  async searchKnowledge(req, res) {
    try {
      const companyId = req.user.companyId;
      const { query, content_types, limit = 20 } = req.body;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const filters = {
        search: query.trim(),
        active_only: 'true',
        limit: parseInt(limit)
      };

      if (content_types && Array.isArray(content_types)) {
        // TODO: Implementar filtro por múltiples content_types
        // Por ahora usar el primer tipo
        filters.content_type = content_types[0];
      }

      const result = await knowledgeService.getCompanyKnowledge(companyId, filters);

      res.json({
        success: true,
        data: {
          query,
          results: result.items,
          total: result.total,
          search_performed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[Knowledge API] Error searching knowledge:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Verificar que un bot pertenece a la empresa del usuario
   */
  async verifyBotOwnership(botId, companyId) {
    const { pool } = require('../database');
    
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

  /**
   * Endpoint de información (para debugging)
   * GET /api/knowledge/info
   */
  async getApiInfo(req, res) {
    try {
      res.json({
        service: 'Knowledge Base API',
        version: '1.0.0',
        features: [
          'Gestión completa de knowledge items',
          'Upload y procesamiento de archivos (PDF, DOCX, TXT)',
          'Asignación dinámica a bots',
          'Búsqueda inteligente',
          'Estadísticas y analytics',
          'Integración con OpenAI (preparado para RAG)'
        ],
        endpoints: {
          'GET /api/knowledge': 'Listar knowledge items',
          'POST /api/knowledge': 'Crear knowledge item',
          'GET /api/knowledge/:id': 'Obtener knowledge item',
          'PUT /api/knowledge/:id': 'Actualizar knowledge item',
          'DELETE /api/knowledge/:id': 'Eliminar knowledge item',
          'POST /api/knowledge/upload': 'Subir archivo',
          'GET /api/knowledge/bots/:botId': 'Knowledge de bot',
          'POST /api/knowledge/bots/:botId/assign': 'Asignar knowledge a bot',
          'DELETE /api/knowledge/bots/:botId/assign/:knowledgeItemId': 'Quitar knowledge de bot',
          'GET /api/knowledge/bots/:botId/available': 'Knowledge disponible para bot',
          'GET /api/knowledge/stats': 'Estadísticas',
          'POST /api/knowledge/search': 'Buscar knowledge'
        },
        supported_file_types: ['pdf', 'docx', 'txt'],
        max_file_size: '10MB',
        company_id: req.user?.companyId || 'Not authenticated'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new KnowledgeController(); 