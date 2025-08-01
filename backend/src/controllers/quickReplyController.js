const database = require('../database');
const config = require('../config');

class QuickReplyController {

  /**
   * Listar respuestas rápidas con filtros
   * GET /api/quick-replies
   */
  async getQuickReplies(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        search = '',
        category = '',
        is_active = '',
        sort_by = 'usage_count',
        sort_order = 'desc'
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por búsqueda (shortcut o mensaje)
      if (search.trim()) {
        whereClause += ` AND (shortcut ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Filtro por categoría
      if (category.trim()) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category.trim());
        paramIndex++;
      }

      // Filtro por estado activo
      if (is_active === 'true') {
        whereClause += ` AND is_active = true`;
      } else if (is_active === 'false') {
        whereClause += ` AND is_active = false`;
      }

      // Validar ordenamiento
      const validSortFields = ['created_at', 'shortcut', 'category', 'usage_count', 'updated_at'];
      const validSortOrders = ['asc', 'desc'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'usage_count';
      const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

      // Query para obtener respuestas rápidas
      const quickRepliesQuery = `
        SELECT 
          q.id,
          q.shortcut,
          q.message,
          q.category,
          q.is_active,
          q.usage_count,
          q.created_at,
          q.updated_at,
          u.email as created_by_email
        FROM whatsapp_bot.quick_replies q
        LEFT JOIN whatsapp_bot.users u ON q.created_by = u.id
        ${whereClause}
        ORDER BY q.${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Guardar parámetros sin LIMIT y OFFSET para la query de conteo
      const countParams = [...params];
      
      // Agregar LIMIT y OFFSET a los parámetros
      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.quick_replies
        ${whereClause}
      `;

      // Ejecutar ambas queries
      const [quickRepliesResult, countResult] = await Promise.all([
        database.query(quickRepliesQuery, params),
        database.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          quick_replies: quickRepliesResult.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting quick replies:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener respuestas rápidas',
        error: error.message
      });
    }
  }

  /**
   * Obtener respuesta rápida específica
   * GET /api/quick-replies/:id
   */
  async getQuickReply(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          q.*,
          u.email as created_by_email
        FROM whatsapp_bot.quick_replies q
        LEFT JOIN whatsapp_bot.users u ON q.created_by = u.id
        WHERE q.id = $1 AND q.company_id = $2
      `;

      const result = await database.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta rápida no encontrada'
        });
      }

      res.json({
        success: true,
        quick_reply: result.rows[0]
      });

    } catch (error) {
      console.error('Error getting quick reply:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener respuesta rápida',
        error: error.message
      });
    }
  }

  /**
   * Crear nueva respuesta rápida
   * POST /api/quick-replies
   */
  async createQuickReply(req, res) {
    try {
      const { shortcut, message, category = 'general' } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      // Validaciones
      if (!shortcut || !message) {
        return res.status(400).json({
          success: false,
          message: 'Shortcut y mensaje son requeridos'
        });
      }

      // Validar formato del shortcut
      if (!this.isValidShortcut(shortcut)) {
        return res.status(400).json({
          success: false,
          message: 'El shortcut debe empezar con "/" y contener solo letras, números y guiones'
        });
      }

      // Verificar que no existe un shortcut con el mismo nombre
      const existingCheck = await database.query(
        'SELECT id FROM whatsapp_bot.quick_replies WHERE company_id = $1 AND shortcut = $2',
        [companyId, shortcut]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una respuesta rápida con ese shortcut'
        });
      }

      const query = `
        INSERT INTO whatsapp_bot.quick_replies (
          company_id, shortcut, message, category, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await database.query(query, [
        companyId, 
        shortcut, 
        message, 
        category,
        userId
      ]);

      res.status(201).json({
        success: true,
        message: 'Respuesta rápida creada exitosamente',
        quick_reply: result.rows[0]
      });

    } catch (error) {
      console.error('Error creating quick reply:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear respuesta rápida',
        error: error.message
      });
    }
  }

  /**
   * Actualizar respuesta rápida existente
   * PUT /api/quick-replies/:id
   */
  async updateQuickReply(req, res) {
    try {
      const { id } = req.params;
      const { shortcut, message, category, is_active } = req.body;
      const companyId = req.user.companyId;

      // Verificar que la respuesta rápida existe y pertenece a la empresa
      const existingQuickReply = await database.query(
        'SELECT * FROM whatsapp_bot.quick_replies WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (existingQuickReply.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta rápida no encontrada'
        });
      }

      // Validar shortcut si se está actualizando
      if (shortcut && !this.isValidShortcut(shortcut)) {
        return res.status(400).json({
          success: false,
          message: 'El shortcut debe empezar con "/" y contener solo letras, números y guiones'
        });
      }

      // Verificar shortcut único (excluyendo el actual)
      if (shortcut) {
        const shortcutCheck = await database.query(
          'SELECT id FROM whatsapp_bot.quick_replies WHERE company_id = $1 AND shortcut = $2 AND id != $3',
          [companyId, shortcut, id]
        );

        if (shortcutCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otra respuesta rápida con ese shortcut'
          });
        }
      }

      // Construir campos a actualizar
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (shortcut !== undefined) {
        updates.push(`shortcut = $${paramIndex}`);
        values.push(shortcut);
        paramIndex++;
      }

      if (message !== undefined) {
        updates.push(`message = $${paramIndex}`);
        values.push(message);
        paramIndex++;
      }

      if (category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updates.push(`updated_at = NOW()`);

      const query = `
        UPDATE whatsapp_bot.quick_replies 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(id, companyId);

      const result = await database.query(query, values);

      res.json({
        success: true,
        message: 'Respuesta rápida actualizada exitosamente',
        quick_reply: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating quick reply:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar respuesta rápida',
        error: error.message
      });
    }
  }

  /**
   * Eliminar respuesta rápida
   * DELETE /api/quick-replies/:id
   */
  async deleteQuickReply(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const result = await database.query(
        'DELETE FROM whatsapp_bot.quick_replies WHERE id = $1 AND company_id = $2 RETURNING *',
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta rápida no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Respuesta rápida eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error deleting quick reply:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar respuesta rápida',
        error: error.message
      });
    }
  }

  /**
   * Buscar respuesta rápida por shortcut
   * GET /api/quick-replies/search/:shortcut
   */
  async searchByShortcut(req, res) {
    try {
      const { shortcut } = req.params;
      const companyId = req.user.companyId;

      const query = `
        SELECT *
        FROM whatsapp_bot.quick_replies
        WHERE company_id = $1 AND shortcut = $2 AND is_active = true
      `;

      const result = await database.query(query, [companyId, shortcut]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Respuesta rápida no encontrada'
        });
      }

      // Incrementar contador de uso
      await this.incrementUsage(result.rows[0].id);

      res.json({
        success: true,
        quick_reply: result.rows[0]
      });

    } catch (error) {
      console.error('Error searching quick reply:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar respuesta rápida',
        error: error.message
      });
    }
  }

  /**
   * Obtener categorías disponibles
   * GET /api/quick-replies/categories
   */
  async getCategories(req, res) {
    try {
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          category,
          COUNT(*) as count
        FROM whatsapp_bot.quick_replies 
        WHERE company_id = $1 AND is_active = true
        GROUP BY category
        ORDER BY count DESC, category ASC
      `;

      const result = await database.query(query, [companyId]);

      res.json({
        success: true,
        categories: result.rows
      });

    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }

  /**
   * Obtener shortcuts más usados
   * GET /api/quick-replies/popular
   */
  async getPopularShortcuts(req, res) {
    try {
      const companyId = req.user.companyId;
      const { limit = 10 } = req.query;

      const query = `
        SELECT 
          shortcut,
          message,
          category,
          usage_count
        FROM whatsapp_bot.quick_replies 
        WHERE company_id = $1 AND is_active = true
        ORDER BY usage_count DESC, created_at DESC
        LIMIT $2
      `;

      const result = await database.query(query, [companyId, parseInt(limit)]);

      res.json({
        success: true,
        popular_shortcuts: result.rows
      });

    } catch (error) {
      console.error('Error getting popular shortcuts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener shortcuts populares',
        error: error.message
      });
    }
  }

  // === MÉTODOS HELPER ===

  /**
   * Validar formato del shortcut
   * Debe empezar con "/" y contener solo letras, números y guiones
   */
  isValidShortcut(shortcut) {
    const shortcutRegex = /^\/[a-zA-Z0-9-]+$/;
    return shortcutRegex.test(shortcut);
  }

  /**
   * Incrementar contador de uso
   */
  async incrementUsage(quickReplyId) {
    try {
      await database.query(
        'UPDATE whatsapp_bot.quick_replies SET usage_count = usage_count + 1 WHERE id = $1',
        [quickReplyId]
      );
    } catch (error) {
      console.error('Error incrementing quick reply usage:', error);
    }
  }

  /**
   * Buscar respuesta rápida por shortcut (método interno)
   */
  async findByShortcut(companyId, shortcut) {
    try {
      const result = await database.query(
        'SELECT * FROM whatsapp_bot.quick_replies WHERE company_id = $1 AND shortcut = $2 AND is_active = true',
        [companyId, shortcut]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding quick reply by shortcut:', error);
      return null;
    }
  }

  /**
   * Procesar mensaje para detectar shortcuts
   */
  async processShortcuts(companyId, message) {
    try {
      // Buscar shortcuts en el mensaje (empiezan con "/" y terminan con espacio o final de línea)
      const shortcutsFound = message.match(/\/[a-zA-Z0-9-]+/g);
      
      if (!shortcutsFound || shortcutsFound.length === 0) {
        return null;
      }

      // Buscar el primer shortcut válido
      for (const shortcut of shortcutsFound) {
        const quickReply = await this.findByShortcut(companyId, shortcut);
        if (quickReply) {
          // Incrementar uso
          await this.incrementUsage(quickReply.id);
          return quickReply;
        }
      }

      return null;
    } catch (error) {
      console.error('Error processing shortcuts:', error);
      return null;
    }
  }
}

// Exportar una instancia con métodos bound
const quickReplyController = new QuickReplyController();

// Bind all methods to preserve 'this' context
Object.getOwnPropertyNames(Object.getPrototypeOf(quickReplyController))
  .filter(name => name !== 'constructor' && typeof quickReplyController[name] === 'function')
  .forEach(name => {
    quickReplyController[name] = quickReplyController[name].bind(quickReplyController);
  });

module.exports = quickReplyController; 