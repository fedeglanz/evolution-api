const { pool } = require('../database');
const config = require('../config');
const contactSyncService = require('../services/contactSyncService');

class ContactController {

  /**
   * Listar contactos con paginación y filtros
   * GET /api/contacts
   */
  async getContacts(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        search = '',
        tags = '',
        blocked = '',
        instance_id = '',
        sort_by = 'last_message_at',
        sort_order = 'desc',
        date_from = '',
        date_to = ''
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE c.company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por búsqueda (nombre o teléfono)
      if (search.trim()) {
        whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Filtro por tags
      if (tags.trim()) {
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tagsArray.length > 0) {
          whereClause += ` AND c.tags && $${paramIndex}`;
          params.push(tagsArray);
          paramIndex++;
        }
      }

      // Filtro por estado de bloqueo
      if (blocked === 'true') {
        whereClause += ` AND c.is_blocked = true`;
      } else if (blocked === 'false') {
        whereClause += ` AND c.is_blocked = false`;
      }

      // Filtro por instancia
      if (instance_id.trim()) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM conversations conv 
          WHERE conv.contact_id = c.id AND conv.instance_id = $${paramIndex}
        )`;
        params.push(instance_id.trim());
        paramIndex++;
      }

      // Filtro por fecha
      if (date_from.trim()) {
        whereClause += ` AND c.last_message_at >= $${paramIndex}`;
        params.push(date_from.trim());
        paramIndex++;
      }

      if (date_to.trim()) {
        whereClause += ` AND c.last_message_at <= $${paramIndex}`;
        params.push(date_to.trim());
        paramIndex++;
      }

      // Validar ordenamiento
      const validSortFields = ['last_message_at', 'created_at', 'name', 'phone', 'total_messages'];
      const validSortOrders = ['asc', 'desc'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'last_message_at';
      const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

      // Query para obtener contactos
      const contactsQuery = `
        SELECT 
          c.id,
          c.phone,
          c.name,
          c.profile_pic_url,
          c.last_message_at,
          c.total_messages,
          c.is_blocked,
          c.tags,
          c.notes,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM whatsapp_bot.conversations WHERE contact_id = c.id AND is_from_bot = false) as messages_from_contact,
          (SELECT COUNT(*) FROM whatsapp_bot.conversations WHERE contact_id = c.id AND is_from_bot = true) as messages_from_bot
        FROM whatsapp_bot.contacts c
        ${whereClause}
        ORDER BY c.${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Guardar parámetros sin LIMIT y OFFSET para la query de conteo
      const countParams = [...params];
      
      // Agregar LIMIT y OFFSET a los parámetros
      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.contacts c
        ${whereClause}
      `;

      const [contactsResult, countResult] = await Promise.all([
        pool.query(contactsQuery, params),
        pool.query(countQuery, countParams)
      ]);

      const contacts = contactsResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: contacts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          search,
          tags,
          blocked,
          instance_id,
          sort_by: sortField,
          sort_order: sortOrder,
          date_from,
          date_to
        }
      });

    } catch (error) {
      console.error('Error al obtener contactos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener detalle de un contacto específico
   * GET /api/contacts/:id
   */
  async getContact(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el contacto pertenece a la empresa
      const contactQuery = `
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM whatsapp_bot.conversations WHERE contact_id = c.id AND is_from_bot = false) as messages_from_contact,
          (SELECT COUNT(*) FROM whatsapp_bot.conversations WHERE contact_id = c.id AND is_from_bot = true) as messages_from_bot,
          (SELECT message_text FROM whatsapp_bot.conversations WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(DISTINCT instance_id) FROM whatsapp_bot.conversations WHERE contact_id = c.id) as instances_count
        FROM whatsapp_bot.contacts c
        WHERE c.id = $1 AND c.company_id = $2
      `;

      const result = await pool.query(contactQuery, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = result.rows[0];

      // Obtener instancias asociadas
      const instancesQuery = `
        SELECT DISTINCT 
          wi.id,
          wi.instance_name,
          wi.phone_number,
          COUNT(conv.id) as messages_count,
          MAX(conv.created_at) as last_interaction
        FROM whatsapp_bot.conversations conv
        JOIN whatsapp_bot.whatsapp_instances wi ON conv.instance_id = wi.id
        WHERE conv.contact_id = $1 AND conv.company_id = $2
        GROUP BY wi.id, wi.instance_name, wi.phone_number
        ORDER BY last_interaction DESC
      `;

      const instancesResult = await pool.query(instancesQuery, [id, companyId]);

      res.json({
        success: true,
        data: {
          ...contact,
          instances: instancesResult.rows,
          stats: {
            totalMessages: contact.total_messages,
            messagesFromContact: parseInt(contact.messages_from_contact),
            messagesFromBot: parseInt(contact.messages_from_bot),
            instancesCount: parseInt(contact.instances_count)
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar contacto (nombre, tags, notas)
   * PUT /api/contacts/:id
   */
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const { name, tags, notes } = req.body;

      // Verificar que el contacto pertenece a la empresa
      const contactCheck = await pool.query(
        'SELECT id FROM whatsapp_bot.contacts WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Validar datos
      const errors = [];

      if (name !== undefined && name !== null) {
        if (typeof name !== 'string') {
          errors.push('name debe ser una cadena de texto');
        } else if (name.trim().length > 100) {
          errors.push('name no puede exceder 100 caracteres');
        }
      }

      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          errors.push('tags debe ser un array');
        } else if (tags.length > 10) {
          errors.push('no puede tener más de 10 tags');
        } else {
          for (const tag of tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
              errors.push('todos los tags deben ser cadenas de texto no vacías');
              break;
            }
            if (tag.length > 50) {
              errors.push('cada tag no puede exceder 50 caracteres');
              break;
            }
          }
        }
      }

      if (notes !== undefined && notes !== null) {
        if (typeof notes !== 'string') {
          errors.push('notes debe ser una cadena de texto');
        } else if (notes.length > 1000) {
          errors.push('notes no puede exceder 1000 caracteres');
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors
        });
      }

      // Construir query de actualización
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(name?.trim() || null);
      }

      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        params.push(Array.isArray(tags) ? tags : []);
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(notes?.trim() || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron datos para actualizar'
        });
      }

      updates.push(`updated_at = NOW()`);
      params.push(id, companyId);

      const updateQuery = `
        UPDATE whatsapp_bot.contacts 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, params);

      res.json({
        success: true,
        message: 'Contacto actualizado exitosamente',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error al actualizar contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Bloquear/desbloquear contacto
   * POST /api/contacts/:id/block
   */
  async blockContact(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const { blocked = true } = req.body;

      // Verificar que el contacto pertenece a la empresa
      const contactCheck = await pool.query(
        'SELECT id, is_blocked, name, phone FROM whatsapp_bot.contacts WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = contactCheck.rows[0];

      // Actualizar estado de bloqueo
      const updateQuery = `
        UPDATE whatsapp_bot.contacts 
        SET is_blocked = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [blocked, id, companyId]);

      res.json({
        success: true,
        message: `Contacto ${blocked ? 'bloqueado' : 'desbloqueado'} exitosamente`,
        data: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          phone: result.rows[0].phone,
          is_blocked: result.rows[0].is_blocked,
          updated_at: result.rows[0].updated_at
        }
      });

    } catch (error) {
      console.error('Error al bloquear contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de un contacto
   * GET /api/contacts/:id/stats
   */
  async getContactStats(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el contacto pertenece a la empresa
      const contactCheck = await pool.query(
        'SELECT id, name, phone, created_at FROM whatsapp_bot.contacts WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const contact = contactCheck.rows[0];

      // Obtener estadísticas detalladas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as messages_from_contact,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as messages_from_bot,
          COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN message_type = 'audio' THEN 1 END) as audio_messages,
          COUNT(CASE WHEN message_type = 'video' THEN 1 END) as video_messages,
          COUNT(CASE WHEN message_type = 'document' THEN 1 END) as document_messages,
          MIN(created_at) as first_message_at,
          MAX(created_at) as last_message_at,
          COUNT(DISTINCT instance_id) as instances_used,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM whatsapp_bot.conversations
        WHERE contact_id = $1 AND company_id = $2
      `;

      const statsResult = await pool.query(statsQuery, [id, companyId]);
      const stats = statsResult.rows[0];

      // Estadísticas por mes (últimos 12 meses)
      const monthlyStatsQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as messages_count,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as from_contact,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as from_bot
        FROM whatsapp_bot.conversations
        WHERE contact_id = $1 AND company_id = $2
        AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `;

      const monthlyResult = await pool.query(monthlyStatsQuery, [id, companyId]);

      // Estadísticas por instancia
      const instanceStatsQuery = `
        SELECT 
          wi.instance_name,
          wi.phone_number,
          COUNT(conv.id) as messages_count,
          MAX(conv.created_at) as last_interaction
        FROM whatsapp_bot.conversations conv
        JOIN whatsapp_bot.whatsapp_instances wi ON conv.instance_id = wi.id
        WHERE conv.contact_id = $1 AND conv.company_id = $2
        GROUP BY wi.id, wi.instance_name, wi.phone_number
        ORDER BY messages_count DESC
      `;

      const instanceResult = await pool.query(instanceStatsQuery, [id, companyId]);

      res.json({
        success: true,
        data: {
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            created_at: contact.created_at
          },
          overview: {
            totalMessages: parseInt(stats.total_messages),
            messagesFromContact: parseInt(stats.messages_from_contact),
            messagesFromBot: parseInt(stats.messages_from_bot),
            activeDays: parseInt(stats.active_days),
            instancesUsed: parseInt(stats.instances_used),
            firstMessageAt: stats.first_message_at,
            lastMessageAt: stats.last_message_at
          },
          messageTypes: {
            text: parseInt(stats.text_messages),
            image: parseInt(stats.image_messages),
            audio: parseInt(stats.audio_messages),
            video: parseInt(stats.video_messages),
            document: parseInt(stats.document_messages)
          },
          monthlyActivity: monthlyResult.rows.map(row => ({
            month: row.month,
            messagesCount: parseInt(row.messages_count),
            fromContact: parseInt(row.from_contact),
            fromBot: parseInt(row.from_bot)
          })),
          instanceActivity: instanceResult.rows.map(row => ({
            instanceName: row.instance_name,
            phoneNumber: row.phone_number,
            messagesCount: parseInt(row.messages_count),
            lastInteraction: row.last_interaction
          }))
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas del contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Métodos auxiliares

  /**
   * Validar datos de actualización de contacto
   */
  validateContactUpdate(data) {
    const errors = [];

    if (data.name !== undefined && data.name !== null) {
      if (typeof data.name !== 'string') {
        errors.push('name debe ser una cadena de texto');
      } else if (data.name.trim().length > 100) {
        errors.push('name no puede exceder 100 caracteres');
      }
    }

    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push('tags debe ser un array');
      } else if (data.tags.length > 10) {
        errors.push('no puede tener más de 10 tags');
      } else {
        for (const tag of data.tags) {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            errors.push('todos los tags deben ser cadenas de texto no vacías');
            break;
          }
          if (tag.length > 50) {
            errors.push('cada tag no puede exceder 50 caracteres');
            break;
          }
        }
      }
    }

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('notes debe ser una cadena de texto');
      } else if (data.notes.length > 1000) {
        errors.push('notes no puede exceder 1000 caracteres');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sincronizar contactos desde Evolution API
   * POST /api/contacts/sync
   */
  async syncContacts(req, res) {
    try {
      const companyId = req.user.companyId;

      console.log(`[ContactController] Iniciando sincronización de contactos para empresa: ${companyId}`);

      const syncResults = await contactSyncService.syncAllCompanyContacts(companyId);

      res.json({
        success: true,
        message: 'Sincronización de contactos completada',
        data: syncResults
      });

    } catch (error) {
      console.error('Error al sincronizar contactos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar contactos',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de sincronización
   * GET /api/contacts/sync-stats
   */
  async getSyncStats(req, res) {
    try {
      const companyId = req.user.companyId;

      const stats = await contactSyncService.getSyncStats(companyId);

      res.json({
        success: true,
        stats: {
          totalContacts: stats.total_contacts,
          syncedContacts: stats.synced_contacts,
          updatedToday: stats.updated_today,
          lastSync: stats.last_sync,
          syncPercentage: stats.total_contacts > 0 ? 
            Math.round((stats.synced_contacts / stats.total_contacts) * 100) : 0
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de sincronización:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

// Exportar una instancia con métodos bound
const contactController = new ContactController();

// Bind all methods to preserve 'this' context
Object.getOwnPropertyNames(Object.getPrototypeOf(contactController))
  .filter(name => name !== 'constructor' && typeof contactController[name] === 'function')
  .forEach(name => {
    contactController[name] = contactController[name].bind(contactController);
  });

module.exports = contactController;
