const database = require('../database');
const config = require('../config');
const evolutionService = require('../services/evolutionService');

class ScheduledMessageController {

  /**
   * Listar mensajes programados con filtros
   * GET /api/scheduled-messages
   */
  async getScheduledMessages(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        search = '',
        status = '',
        instance_id = '',
        contact_id = '',
        date_from = '',
        date_to = '',
        sort_by = 'scheduled_for',
        sort_order = 'asc'
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE sm.company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por búsqueda (mensaje o teléfono)
      if (search.trim()) {
        whereClause += ` AND (sm.message ILIKE $${paramIndex} OR sm.phone ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Filtro por estado
      if (status.trim()) {
        whereClause += ` AND sm.status = $${paramIndex}`;
        params.push(status.trim());
        paramIndex++;
      }

      // Filtro por instancia
      if (instance_id.trim()) {
        whereClause += ` AND sm.instance_id = $${paramIndex}`;
        params.push(instance_id.trim());
        paramIndex++;
      }

      // Filtro por contacto
      if (contact_id.trim()) {
        whereClause += ` AND sm.contact_id = $${paramIndex}`;
        params.push(contact_id.trim());
        paramIndex++;
      }

      // Filtro por fecha desde
      if (date_from.trim()) {
        whereClause += ` AND sm.scheduled_for >= $${paramIndex}`;
        params.push(date_from.trim());
        paramIndex++;
      }

      // Filtro por fecha hasta
      if (date_to.trim()) {
        whereClause += ` AND sm.scheduled_for <= $${paramIndex}`;
        params.push(date_to.trim());
        paramIndex++;
      }

      // Validar ordenamiento
      const validSortFields = ['scheduled_for', 'created_at', 'status', 'sent_at'];
      const validSortOrders = ['asc', 'desc'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'scheduled_for';
      const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'asc';

      // Query para obtener mensajes programados
      const messagesQuery = `
        SELECT 
          sm.id,
          sm.message,
          sm.message_type,
          sm.phone,
          sm.scheduled_for,
          sm.timezone,
          sm.status,
          sm.sent_at,
          sm.error_message,
          sm.created_at,
          sm.updated_at,
          wi.name as instance_name,
          c.name as contact_name,
          u.email as created_by_email
        FROM whatsapp_bot.scheduled_messages sm
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON sm.instance_id = wi.id
        LEFT JOIN whatsapp_bot.contacts c ON sm.contact_id = c.id
        LEFT JOIN whatsapp_bot.users u ON sm.created_by = u.id
        ${whereClause}
        ORDER BY sm.${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Guardar parámetros sin LIMIT y OFFSET para la query de conteo
      const countParams = [...params];
      
      // Agregar LIMIT y OFFSET a los parámetros
      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.scheduled_messages sm
        ${whereClause}
      `;

      // Ejecutar ambas queries
      const [messagesResult, countResult] = await Promise.all([
        database.query(messagesQuery, params),
        database.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          scheduled_messages: messagesResult.rows,
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
      console.error('Error getting scheduled messages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mensajes programados',
        error: error.message
      });
    }
  }

  /**
   * Obtener mensaje programado específico
   * GET /api/scheduled-messages/:id
   */
  async getScheduledMessage(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          sm.*,
          wi.name as instance_name,
          wi.evolution_instance_name,
          c.name as contact_name,
          u.email as created_by_email
        FROM whatsapp_bot.scheduled_messages sm
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON sm.instance_id = wi.id
        LEFT JOIN whatsapp_bot.contacts c ON sm.contact_id = c.id
        LEFT JOIN whatsapp_bot.users u ON sm.created_by = u.id
        WHERE sm.id = $1 AND sm.company_id = $2
      `;

      const result = await database.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
        });
      }

      res.json({
        success: true,
        scheduled_message: result.rows[0]
      });

    } catch (error) {
      console.error('Error getting scheduled message:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mensaje programado',
        error: error.message
      });
    }
  }

  /**
   * Crear nuevo mensaje programado
   * POST /api/scheduled-messages
   */
  async createScheduledMessage(req, res) {
    try {
      const { 
        instance_id, 
        contact_id, 
        phone, 
        message, 
        message_type = 'text',
        scheduled_for, 
        timezone = 'UTC' 
      } = req.body;
      
      const companyId = req.user.companyId;
      const userId = req.user.id;

      // Validaciones básicas
      if (!instance_id || !message || !scheduled_for) {
        return res.status(400).json({
          success: false,
          message: 'Instancia, mensaje y fecha de programación son requeridos'
        });
      }

      if (!contact_id && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar un contacto o número de teléfono'
        });
      }

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await database.query(
        'SELECT id, name FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2',
        [instance_id, companyId]
      );

      if (instanceCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      // Verificar que la fecha de programación sea futura
      if (new Date(scheduled_for) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de programación debe ser futura'
        });
      }

      // Si se especifica contact_id, verificar que pertenece a la empresa
      if (contact_id) {
        const contactCheck = await database.query(
          'SELECT id, phone FROM whatsapp_bot.contacts WHERE id = $1 AND company_id = $2',
          [contact_id, companyId]
        );

        if (contactCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Contacto no encontrado'
          });
        }
      }

      const query = `
        INSERT INTO whatsapp_bot.scheduled_messages (
          company_id, instance_id, contact_id, phone, message, message_type, 
          scheduled_for, timezone, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await database.query(query, [
        companyId, 
        instance_id, 
        contact_id, 
        phone, 
        message, 
        message_type,
        scheduled_for, 
        timezone, 
        userId
      ]);

      res.status(201).json({
        success: true,
        message: 'Mensaje programado creado exitosamente',
        scheduled_message: result.rows[0]
      });

    } catch (error) {
      console.error('Error creating scheduled message:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear mensaje programado',
        error: error.message
      });
    }
  }

  /**
   * Actualizar mensaje programado (solo si está pendiente)
   * PUT /api/scheduled-messages/:id
   */
  async updateScheduledMessage(req, res) {
    try {
      const { id } = req.params;
      const { message, scheduled_for, timezone } = req.body;
      const companyId = req.user.companyId;

      // Verificar que el mensaje existe y pertenece a la empresa
      const existingMessage = await database.query(
        'SELECT * FROM whatsapp_bot.scheduled_messages WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (existingMessage.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
        });
      }

      const currentMessage = existingMessage.rows[0];

      // Solo permitir actualización si está pendiente
      if (currentMessage.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `No es posible actualizar un mensaje con estado '${currentMessage.status}'`
        });
      }

      // Verificar que la nueva fecha sea futura (si se proporciona)
      if (scheduled_for && new Date(scheduled_for) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de programación debe ser futura'
        });
      }

      // Construir campos a actualizar
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (message !== undefined) {
        updates.push(`message = $${paramIndex}`);
        values.push(message);
        paramIndex++;
      }

      if (scheduled_for !== undefined) {
        updates.push(`scheduled_for = $${paramIndex}`);
        values.push(scheduled_for);
        paramIndex++;
      }

      if (timezone !== undefined) {
        updates.push(`timezone = $${paramIndex}`);
        values.push(timezone);
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
        UPDATE whatsapp_bot.scheduled_messages 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(id, companyId);

      const result = await database.query(query, values);

      res.json({
        success: true,
        message: 'Mensaje programado actualizado exitosamente',
        scheduled_message: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating scheduled message:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar mensaje programado',
        error: error.message
      });
    }
  }

  /**
   * Cancelar mensaje programado
   * DELETE /api/scheduled-messages/:id
   */
  async cancelScheduledMessage(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el mensaje existe y está pendiente
      const existingMessage = await database.query(
        'SELECT * FROM whatsapp_bot.scheduled_messages WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (existingMessage.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
        });
      }

      const currentMessage = existingMessage.rows[0];

      // Solo permitir cancelación si está pendiente
      if (currentMessage.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `No es posible cancelar un mensaje con estado '${currentMessage.status}'`
        });
      }

      // Marcar como cancelado en lugar de eliminar
      const result = await database.query(
        `UPDATE whatsapp_bot.scheduled_messages 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND company_id = $2 
         RETURNING *`,
        [id, companyId]
      );

      res.json({
        success: true,
        message: 'Mensaje programado cancelado exitosamente',
        scheduled_message: result.rows[0]
      });

    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar mensaje programado',
        error: error.message
      });
    }
  }

  /**
   * Procesar mensajes pendientes (CRON job interno)
   * POST /api/scheduled-messages/process
   */
  async processScheduledMessages(req, res) {
    try {
      console.log('[ScheduledMessages] Iniciando procesamiento de mensajes programados...');

      // Obtener mensajes que deben enviarse ahora
      const query = `
        SELECT 
          sm.*,
          wi.evolution_instance_name,
          wi.status as instance_status,
          c.phone as contact_phone
        FROM whatsapp_bot.scheduled_messages sm
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON sm.instance_id = wi.id
        LEFT JOIN whatsapp_bot.contacts c ON sm.contact_id = c.id
        WHERE sm.status = 'pending' 
        AND sm.scheduled_for <= NOW()
        ORDER BY sm.scheduled_for ASC
        LIMIT 50
      `;

      const pendingMessages = await database.query(query);
      
      console.log(`[ScheduledMessages] Encontrados ${pendingMessages.rows.length} mensajes para procesar`);

      const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const scheduledMessage of pendingMessages.rows) {
        try {
          results.processed++;

          // Verificar que la instancia esté conectada
          if (scheduledMessage.instance_status !== 'connected') {
            throw new Error(`Instancia ${scheduledMessage.evolution_instance_name} no está conectada`);
          }

          // Determinar número de destino
          const targetPhone = scheduledMessage.contact_phone || scheduledMessage.phone;
          if (!targetPhone) {
            throw new Error('No se pudo determinar el número de destino');
          }

          // Enviar mensaje via Evolution API
          const messageResult = await evolutionService.sendTextMessage(
            scheduledMessage.evolution_instance_name,
            targetPhone,
            scheduledMessage.message
          );

          // Marcar como enviado
          await database.query(
            `UPDATE whatsapp_bot.scheduled_messages 
             SET status = 'sent', sent_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [scheduledMessage.id]
          );

          results.sent++;
          console.log(`[ScheduledMessages] ✅ Mensaje ${scheduledMessage.id} enviado exitosamente`);

        } catch (error) {
          results.failed++;
          
          // Marcar como fallido
          await database.query(
            `UPDATE whatsapp_bot.scheduled_messages 
             SET status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [error.message, scheduledMessage.id]
          );

          results.errors.push({
            id: scheduledMessage.id,
            error: error.message
          });

          console.error(`[ScheduledMessages] ❌ Error enviando mensaje ${scheduledMessage.id}:`, error.message);
        }
      }

      console.log(`[ScheduledMessages] Procesamiento completado:`, results);

      res.json({
        success: true,
        message: 'Procesamiento de mensajes programados completado',
        results
      });

    } catch (error) {
      console.error('Error processing scheduled messages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar mensajes programados',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de mensajes programados
   * GET /api/scheduled-messages/stats
   */
  async getScheduledMessagesStats(req, res) {
    try {
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM whatsapp_bot.scheduled_messages 
        WHERE company_id = $1
        GROUP BY status
        ORDER BY count DESC
      `;

      const result = await database.query(query, [companyId]);

      // Obtener próximos mensajes
      const upcomingQuery = `
        SELECT COUNT(*) as upcoming_count
        FROM whatsapp_bot.scheduled_messages 
        WHERE company_id = $1 
        AND status = 'pending' 
        AND scheduled_for > NOW()
        AND scheduled_for <= NOW() + INTERVAL '24 hours'
      `;

      const upcomingResult = await database.query(upcomingQuery, [companyId]);

      res.json({
        success: true,
        stats: {
          by_status: result.rows,
          upcoming_24h: parseInt(upcomingResult.rows[0].upcoming_count)
        }
      });

    } catch (error) {
      console.error('Error getting scheduled messages stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

module.exports = new ScheduledMessageController(); 