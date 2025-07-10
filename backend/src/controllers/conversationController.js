const { pool } = require('../database');
const config = require('../config');
const evolutionService = require('../services/evolutionService');

class ConversationController {

  /**
   * Obtener historial de conversaciones de un contacto
   * GET /api/conversations/:contactId
   */
  async getConversations(req, res) {
    try {
      const { contactId } = req.params;
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        instance_id = '',
        date_from = '',
        date_to = '',
        message_type = '',
        is_from_bot = ''
      } = req.query;

      // Validar que el contacto pertenece a la empresa
      const contactCheck = await pool.query(
        'SELECT id, name, phone FROM contacts WHERE id = $1 AND company_id = $2',
        [contactId, companyId]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = contactCheck.rows[0];

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE conv.contact_id = $1 AND conv.company_id = $2';
      let params = [contactId, companyId];
      let paramIndex = 3;

      // Filtros
      if (instance_id.trim()) {
        whereClause += ` AND conv.instance_id = $${paramIndex++}`;
        params.push(instance_id.trim());
      }

      if (date_from.trim()) {
        whereClause += ` AND conv.created_at >= $${paramIndex++}`;
        params.push(date_from.trim());
      }

      if (date_to.trim()) {
        whereClause += ` AND conv.created_at <= $${paramIndex++}`;
        params.push(date_to.trim());
      }

      if (message_type.trim()) {
        whereClause += ` AND conv.message_type = $${paramIndex++}`;
        params.push(message_type.trim());
      }

      if (is_from_bot === 'true') {
        whereClause += ` AND conv.is_from_bot = true`;
      } else if (is_from_bot === 'false') {
        whereClause += ` AND conv.is_from_bot = false`;
      }

      // Query para obtener conversaciones
      const conversationsQuery = `
        SELECT 
          conv.id,
          conv.message_id,
          conv.message_text,
          conv.message_type,
          conv.is_from_bot,
          conv.metadata,
          conv.created_at,
          wi.instance_name,
          wi.phone_number as instance_phone
        FROM conversations conv
        JOIN whatsapp_instances wi ON conv.instance_id = wi.id
        ${whereClause}
        ORDER BY conv.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM conversations conv
        ${whereClause}
      `;

      const [conversationsResult, countResult] = await Promise.all([
        pool.query(conversationsQuery, params),
        pool.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      const conversations = conversationsResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone
          },
          conversations: conversations
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          instance_id,
          date_from,
          date_to,
          message_type,
          is_from_bot
        }
      });

    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Enviar mensaje manual
   * POST /api/conversations/:contactId/send
   */
  async sendMessage(req, res) {
    try {
      const { contactId } = req.params;
      const companyId = req.user.companyId;
      const { message_text, instance_id, message_type = 'text' } = req.body;

      // Validar datos requeridos
      if (!message_text || !message_text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El mensaje no puede estar vacío'
        });
      }

      if (!instance_id) {
        return res.status(400).json({
          success: false,
          message: 'instance_id es requerido'
        });
      }

      // Verificar que el contacto pertenece a la empresa
      const contactResult = await pool.query(
        'SELECT id, phone, name FROM contacts WHERE id = $1 AND company_id = $2',
        [contactId, companyId]
      );

      if (contactResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = contactResult.rows[0];

      // Verificar que la instancia pertenece a la empresa
      const instanceResult = await pool.query(
        'SELECT id, instance_name, status FROM whatsapp_instances WHERE id = $1 AND company_id = $2',
        [instance_id, companyId]
      );

      if (instanceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceResult.rows[0];

      if (instance.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'La instancia no está conectada. Estado actual: ' + instance.status
        });
      }

      try {
        // Enviar mensaje a través de Evolution API
        const evolutionResponse = await evolutionService.sendTextMessage(
          instance.instance_name,
          contact.phone,
          message_text.trim()
        );

        // Guardar mensaje en base de datos
        const saveMessageQuery = `
          INSERT INTO conversations (
            company_id, contact_id, instance_id, message_id, message_text, 
            message_type, is_from_bot, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *
        `;

        const messageResult = await pool.query(saveMessageQuery, [
          companyId,
          contactId,
          instance_id,
          evolutionResponse.message_id || null,
          message_text.trim(),
          message_type,
          false, // is_from_bot = false para mensajes manuales
          {
            sent_manually: true,
            sent_by: req.user.email,
            evolution_response: evolutionResponse
          }
        ]);

        // Actualizar estadísticas del contacto
        await pool.query(
          'UPDATE contacts SET total_messages = total_messages + 1, last_message_at = NOW(), updated_at = NOW() WHERE id = $1',
          [contactId]
        );

        res.json({
          success: true,
          message: 'Mensaje enviado exitosamente',
          data: {
            conversation: messageResult.rows[0],
            evolution_response: evolutionResponse,
            contact: {
              id: contact.id,
              name: contact.name,
              phone: contact.phone
            },
            instance: {
              id: instance.id,
              name: instance.instance_name
            }
          }
        });

      } catch (evolutionError) {
        console.error('Error al enviar mensaje a Evolution API:', evolutionError);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar mensaje a WhatsApp',
          error: evolutionError.message
        });
      }

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener métricas generales de conversaciones
   * GET /api/conversations/stats
   */
  async getConversationStats(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        date_from = '',
        date_to = '',
        instance_id = ''
      } = req.query;

      // Construir filtros de fecha
      let dateFilter = '';
      let params = [companyId];
      let paramIndex = 2;

      if (date_from.trim()) {
        dateFilter += ` AND created_at >= $${paramIndex++}`;
        params.push(date_from.trim());
      }

      if (date_to.trim()) {
        dateFilter += ` AND created_at <= $${paramIndex++}`;
        params.push(date_to.trim());
      }

      if (instance_id.trim()) {
        dateFilter += ` AND instance_id = $${paramIndex++}`;
        params.push(instance_id.trim());
      }

      // Estadísticas generales
      const overviewQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as messages_from_contacts,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as messages_from_bots,
          COUNT(DISTINCT contact_id) as unique_contacts,
          COUNT(DISTINCT instance_id) as active_instances,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM conversations
        WHERE company_id = $1 ${dateFilter}
      `;

      // Estadísticas por tipo de mensaje
      const messageTypesQuery = `
        SELECT 
          message_type,
          COUNT(*) as count,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as from_contacts,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as from_bots
        FROM conversations
        WHERE company_id = $1 ${dateFilter}
        GROUP BY message_type
        ORDER BY count DESC
      `;

      // Estadísticas por instancia
      const instanceStatsQuery = `
        SELECT 
          wi.instance_name,
          wi.phone_number,
          COUNT(conv.id) as messages_count,
          COUNT(CASE WHEN conv.is_from_bot = false THEN 1 END) as from_contacts,
          COUNT(CASE WHEN conv.is_from_bot = true THEN 1 END) as from_bots,
          COUNT(DISTINCT conv.contact_id) as unique_contacts
        FROM conversations conv
        JOIN whatsapp_instances wi ON conv.instance_id = wi.id
        WHERE conv.company_id = $1 ${dateFilter}
        GROUP BY wi.id, wi.instance_name, wi.phone_number
        ORDER BY messages_count DESC
      `;

      // Actividad diaria (últimos 30 días)
      const dailyActivityQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as messages_count,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as from_contacts,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as from_bots,
          COUNT(DISTINCT contact_id) as unique_contacts
        FROM conversations
        WHERE company_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
        ${date_from.trim() ? `AND created_at >= '${date_from.trim()}'` : ''}
        ${date_to.trim() ? `AND created_at <= '${date_to.trim()}'` : ''}
        ${instance_id.trim() ? `AND instance_id = '${instance_id.trim()}'` : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const [overviewResult, messageTypesResult, instanceStatsResult, dailyActivityResult] = await Promise.all([
        pool.query(overviewQuery, params),
        pool.query(messageTypesQuery, params),
        pool.query(instanceStatsQuery, params),
        pool.query(dailyActivityQuery, [companyId])
      ]);

      const overview = overviewResult.rows[0];

      res.json({
        success: true,
        data: {
          overview: {
            totalMessages: parseInt(overview.total_messages),
            messagesFromContacts: parseInt(overview.messages_from_contacts),
            messagesFromBots: parseInt(overview.messages_from_bots),
            uniqueContacts: parseInt(overview.unique_contacts),
            activeInstances: parseInt(overview.active_instances),
            activeDays: parseInt(overview.active_days)
          },
          messageTypes: messageTypesResult.rows.map(row => ({
            type: row.message_type,
            count: parseInt(row.count),
            fromContacts: parseInt(row.from_contacts),
            fromBots: parseInt(row.from_bots)
          })),
          instanceStats: instanceStatsResult.rows.map(row => ({
            instanceName: row.instance_name,
            phoneNumber: row.phone_number,
            messagesCount: parseInt(row.messages_count),
            fromContacts: parseInt(row.from_contacts),
            fromBots: parseInt(row.from_bots),
            uniqueContacts: parseInt(row.unique_contacts)
          })),
          dailyActivity: dailyActivityResult.rows.map(row => ({
            date: row.date,
            messagesCount: parseInt(row.messages_count),
            fromContacts: parseInt(row.from_contacts),
            fromBots: parseInt(row.from_bots),
            uniqueContacts: parseInt(row.unique_contacts)
          }))
        },
        filters: {
          date_from,
          date_to,
          instance_id
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de conversaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Exportar historial de conversaciones (CSV)
   * GET /api/conversations/export
   */
  async exportConversations(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        contact_id = '',
        instance_id = '',
        date_from = '',
        date_to = '',
        format = 'csv'
      } = req.query;

      // Construir filtros
      let whereClause = 'WHERE conv.company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      if (contact_id.trim()) {
        whereClause += ` AND conv.contact_id = $${paramIndex++}`;
        params.push(contact_id.trim());
      }

      if (instance_id.trim()) {
        whereClause += ` AND conv.instance_id = $${paramIndex++}`;
        params.push(instance_id.trim());
      }

      if (date_from.trim()) {
        whereClause += ` AND conv.created_at >= $${paramIndex++}`;
        params.push(date_from.trim());
      }

      if (date_to.trim()) {
        whereClause += ` AND conv.created_at <= $${paramIndex++}`;
        params.push(date_to.trim());
      }

      // Query para exportar
      const exportQuery = `
        SELECT 
          conv.id,
          conv.message_id,
          conv.message_text,
          conv.message_type,
          conv.is_from_bot,
          conv.created_at,
          c.name as contact_name,
          c.phone as contact_phone,
          wi.instance_name,
          wi.phone_number as instance_phone
        FROM conversations conv
        JOIN contacts c ON conv.contact_id = c.id
        JOIN whatsapp_instances wi ON conv.instance_id = wi.id
        ${whereClause}
        ORDER BY conv.created_at DESC
        LIMIT 10000
      `;

      const result = await pool.query(exportQuery, params);

      if (format === 'csv') {
        // Generar CSV
        const csvHeader = 'ID,Message ID,Message Text,Message Type,Is From Bot,Created At,Contact Name,Contact Phone,Instance Name,Instance Phone\n';
        const csvRows = result.rows.map(row => {
          return [
            row.id,
            row.message_id || '',
            `"${(row.message_text || '').replace(/"/g, '""')}"`,
            row.message_type,
            row.is_from_bot,
            row.created_at,
            `"${(row.contact_name || '').replace(/"/g, '""')}"`,
            row.contact_phone,
            row.instance_name,
            row.instance_phone
          ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Configurar headers para descarga
        const filename = `conversations_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);

      } else if (format === 'json') {
        // Respuesta JSON
        res.json({
          success: true,
          data: result.rows,
          total: result.rows.length,
          exported_at: new Date().toISOString(),
          filters: {
            contact_id,
            instance_id,
            date_from,
            date_to
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Formato no soportado. Use csv o json'
        });
      }

    } catch (error) {
      console.error('Error al exportar conversaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener resumen de conversación de un contacto
   * GET /api/conversations/:contactId/summary
   */
  async getConversationSummary(req, res) {
    try {
      const { contactId } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el contacto pertenece a la empresa
      const contactCheck = await pool.query(
        'SELECT id, name, phone FROM contacts WHERE id = $1 AND company_id = $2',
        [contactId, companyId]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = contactCheck.rows[0];

      // Obtener resumen de la conversación
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as from_contact,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as from_bot,
          MIN(created_at) as first_message_at,
          MAX(created_at) as last_message_at,
          COUNT(DISTINCT instance_id) as instances_used,
          COUNT(DISTINCT message_type) as message_types_used
        FROM conversations
        WHERE contact_id = $1 AND company_id = $2
      `;

      // Últimos 5 mensajes
      const recentMessagesQuery = `
        SELECT 
          conv.message_text,
          conv.message_type,
          conv.is_from_bot,
          conv.created_at,
          wi.instance_name
        FROM conversations conv
        JOIN whatsapp_instances wi ON conv.instance_id = wi.id
        WHERE conv.contact_id = $1 AND conv.company_id = $2
        ORDER BY conv.created_at DESC
        LIMIT 5
      `;

      const [summaryResult, recentMessagesResult] = await Promise.all([
        pool.query(summaryQuery, [contactId, companyId]),
        pool.query(recentMessagesQuery, [contactId, companyId])
      ]);

      const summary = summaryResult.rows[0];

      res.json({
        success: true,
        data: {
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone
          },
          summary: {
            totalMessages: parseInt(summary.total_messages),
            fromContact: parseInt(summary.from_contact),
            fromBot: parseInt(summary.from_bot),
            firstMessageAt: summary.first_message_at,
            lastMessageAt: summary.last_message_at,
            instancesUsed: parseInt(summary.instances_used),
            messageTypesUsed: parseInt(summary.message_types_used)
          },
          recentMessages: recentMessagesResult.rows
        }
      });

    } catch (error) {
      console.error('Error al obtener resumen de conversación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new ConversationController();
