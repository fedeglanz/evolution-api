const database = require('../database');
const config = require('../config');
const evolutionService = require('../services/evolutionService');

class MassMessagingController {
  constructor() {
    // Bind all methods to maintain 'this' context
    this.getMessagingOptions = this.getMessagingOptions.bind(this);
    this.createMassMessage = this.createMassMessage.bind(this);
    this.processTemplate = this.processTemplate.bind(this);
    this.getRecipients = this.getRecipients.bind(this);
    this.createIndividualMessages = this.createIndividualMessages.bind(this);
    this.processMassMessage = this.processMassMessage.bind(this);
    this.sendIndividualMessage = this.sendIndividualMessage.bind(this);
    this.getMassMessageHistory = this.getMassMessageHistory.bind(this);
    this.getMassMessageDetails = this.getMassMessageDetails.bind(this);
    this.cancelMassMessage = this.cancelMassMessage.bind(this);
    this.getMassMessagingStats = this.getMassMessagingStats.bind(this);
  }

  /**
   * Obtener opciones disponibles para mensajería masiva
   * GET /api/mass-messaging/options
   */
  async getMessagingOptions(req, res) {
    try {
      const companyId = req.user.companyId;
      console.log(`[MassMessaging] 🔄 Obteniendo opciones para empresa: ${companyId}`);

      // Obtener templates activos
      console.log('[MassMessaging] 📋 Consultando templates...');
      const templatesQuery = await database.query(`
        SELECT id, name, category, content, variables, usage_count
        FROM whatsapp_bot.message_templates 
        WHERE company_id = $1 AND is_active = true 
        ORDER BY usage_count DESC, name ASC
      `, [companyId]);
      console.log(`[MassMessaging] ✅ Templates encontrados: ${templatesQuery.rows.length}`);

      // Obtener campañas activas con grupos
      console.log('[MassMessaging] 🎯 Consultando campañas...');
      const campaignsQuery = await database.query(`
        SELECT 
          c.id,
          c.name,
          c.status,
          COUNT(cg.id) as total_groups,
          COUNT(cg.id) FILTER (WHERE cg.is_active_for_distribution = true) as active_groups,
          SUM(cg.current_members) as total_members
        FROM whatsapp_bot.whatsapp_campaigns c
        LEFT JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id AND cg.status = 'active'
        WHERE c.company_id = $1 AND c.status IN ('active', 'paused')
        GROUP BY c.id, c.name, c.status
        ORDER BY c.name ASC
      `, [companyId]);
      console.log(`[MassMessaging] ✅ Campañas encontradas: ${campaignsQuery.rows.length}`);

      // Obtener instancias activas
      console.log('[MassMessaging] 📱 Consultando instancias...');
      const instancesQuery = await database.query(`
        SELECT id, instance_name, evolution_instance_name, status, phone_number
        FROM whatsapp_bot.whatsapp_instances 
        WHERE company_id = $1 AND status = 'connected'
        ORDER BY instance_name ASC
      `, [companyId]);
      console.log(`[MassMessaging] ✅ Instancias encontradas: ${instancesQuery.rows.length}`);

      // Obtener estadísticas de contactos
      console.log('[MassMessaging] 👥 Consultando contactos...');
      const contactsStatsQuery = await database.query(`
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(*) FILTER (WHERE tags IS NOT NULL AND tags::text != '[]') as tagged_contacts
        FROM whatsapp_bot.contacts 
        WHERE company_id = $1
      `, [companyId]);
      console.log(`[MassMessaging] ✅ Contactos encontrados: ${contactsStatsQuery.rows[0]?.total_contacts || 0}`);

      const responseData = {
        templates: templatesQuery.rows,
        campaigns: campaignsQuery.rows,
        instances: instancesQuery.rows,
        contactsStats: contactsStatsQuery.rows[0] || { total_contacts: 0, tagged_contacts: 0 }
      };

      console.log('[MassMessaging] 🎉 Opciones obtenidas exitosamente');
      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error obteniendo opciones de mensajería:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Crear mensaje masivo (inmediato o programado)
   * POST /api/mass-messaging/create
   */
  async createMassMessage(req, res) {
    try {
      const {
        // Contenido del mensaje
        messageType = 'custom', // 'template' o 'custom'
        templateId = null,
        templateVariables = {},
        customMessage = '',
        
        // Destinatarios
        targetType, // 'contacts', 'campaigns', 'manual'
        contactIds = [],
        campaignIds = [],
        manualPhones = [],
        
        // Instancia
        instanceId,
        
        // Programación
        schedulingType = 'immediate', // 'immediate' o 'scheduled'
        scheduledFor = null,
        timezone = 'UTC',
        
        // Configuración
        delayBetweenGroups = 10, // segundos
        delayBetweenMessages = 2, // segundos
        
        // Metadata
        title = '',
        description = ''
      } = req.body;

      const companyId = req.user.companyId;
      const userId = req.user.userId;

      console.log(`[MassMessaging] 🔄 Creando mensaje masivo para empresa: ${companyId}`);
      console.log(`[MassMessaging] 👤 Usuario: ${userId} (${typeof userId})`);
      console.log(`[MassMessaging] 🏢 Empresa: ${companyId} (${typeof companyId})`);
      
      // Validar que tenemos los datos del usuario
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Error de autenticación: ID de usuario no disponible'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Error de autenticación: ID de empresa no disponible'
        });
      }

      // Validaciones básicas
      if (!targetType || !instanceId) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de destinatario e instancia son requeridos'
        });
      }

      if (messageType === 'template' && !templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID es requerido para mensajes tipo template'
        });
      }

      if (messageType === 'custom' && !customMessage.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mensaje personalizado es requerido'
        });
      }

      // Procesar mensaje final
      let finalMessage = '';
      let usedTemplateId = null;

      if (messageType === 'template') {
        const template = await this.processTemplate(templateId, templateVariables, companyId);
        finalMessage = template.processedContent;
        usedTemplateId = templateId;
      } else {
        finalMessage = customMessage.trim();
      }

      // Obtener destinatarios según el tipo
      const recipients = await this.getRecipients(targetType, {
        contactIds,
        campaignIds,
        manualPhones,
        companyId
      });

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron destinatarios válidos'
        });
      }

      // Crear registro de mensaje masivo
      const massMessageQuery = `
        INSERT INTO whatsapp_bot.mass_messages (
          company_id, created_by, title, description, message_type, template_id, 
          custom_message, final_message, target_type, instance_id, 
          scheduling_type, scheduled_for, timezone, delay_between_groups, 
          delay_between_messages, total_recipients, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const massMessageResult = await database.query(massMessageQuery, [
        companyId, userId, title, description, messageType, usedTemplateId,
        messageType === 'custom' ? customMessage : null, finalMessage, targetType, instanceId,
        schedulingType, schedulingType === 'immediate' ? null : scheduledFor, timezone, delayBetweenGroups, delayBetweenMessages,
        recipients.length, schedulingType === 'immediate' ? 'processing' : 'scheduled'
      ]);

      const massMessage = massMessageResult.rows[0];

      // Crear registros individuales para cada destinatario
      await this.createIndividualMessages(massMessage.id, recipients, finalMessage, scheduledFor, timezone);

      // Si es inmediato, procesar ahora
      if (schedulingType === 'immediate') {
        console.log(`[MassMessaging] 🚀 Procesando mensaje inmediato: ${massMessage.id}`);
        // Procesar en background
        setImmediate(() => {
          console.log(`[MassMessaging] 🔄 Ejecutando processMassMessage para: ${massMessage.id}`);
          this.processMassMessage(massMessage.id).catch(error => {
            console.error(`[MassMessaging] ❌ Error procesando mensaje ${massMessage.id}:`, error);
          });
        });

        res.status(201).json({
          success: true,
          message: 'Mensaje masivo creado y enviándose en segundo plano',
          data: {
            massMessageId: massMessage.id,
            totalRecipients: recipients.length,
            status: 'processing'
          }
        });
      } else {
        res.status(201).json({
          success: true,
          message: 'Mensaje masivo programado exitosamente',
          data: {
            massMessageId: massMessage.id,
            totalRecipients: recipients.length,
            scheduledFor: scheduledFor,
            status: 'scheduled'
          }
        });
      }

    } catch (error) {
      console.error('Error creando mensaje masivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear mensaje masivo',
        error: error.message
      });
    }
  }

  /**
   * Procesar template con variables
   */
  async processTemplate(templateId, variables, companyId) {
    const templateQuery = await database.query(`
      SELECT id, name, content, variables as template_variables
      FROM whatsapp_bot.message_templates 
      WHERE id = $1 AND company_id = $2 AND is_active = true
    `, [templateId, companyId]);

    if (templateQuery.rows.length === 0) {
      throw new Error('Template no encontrado o inactivo');
    }

    const template = templateQuery.rows[0];
    let processedContent = template.content;

    // Reemplazar variables en el contenido
    const templateVars = JSON.parse(template.template_variables || '[]');
    
    for (const variable of templateVars) {
      const variableName = variable.name;
      const variableValue = variables[variableName] || variable.default_value || `{${variableName}}`;
      
      // Reemplazar todas las ocurrencias de {variableName}
      const regex = new RegExp(`\\{${variableName}\\}`, 'g');
      processedContent = processedContent.replace(regex, variableValue);
    }

    // Actualizar contador de uso
    await database.query(
      'UPDATE whatsapp_bot.message_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [templateId]
    );

    return {
      ...template,
      processedContent
    };
  }

  /**
   * Obtener destinatarios según el tipo
   */
  async getRecipients(targetType, options) {
    const { contactIds, campaignIds, manualPhones, companyId } = options;
    let recipients = [];

    switch (targetType) {
      case 'contacts':
        if (contactIds.length > 0) {
          const contactsQuery = await database.query(`
            SELECT id, phone, name, 'contact' as type
            FROM whatsapp_bot.contacts 
            WHERE company_id = $1 AND id = ANY($2)
          `, [companyId, contactIds]);
          recipients = contactsQuery.rows;
        }
        break;

      case 'campaigns':
        if (campaignIds.length > 0) {
          const groupsQuery = await database.query(`
            SELECT 
              cg.id,
              cg.evolution_group_id as phone,
              cg.group_name as name,
              'group' as type,
              c.name as campaign_name,
              cg.current_members
            FROM whatsapp_bot.whatsapp_campaign_groups cg
            JOIN whatsapp_bot.whatsapp_campaigns c ON cg.campaign_id = c.id
            WHERE c.company_id = $1 AND c.id = ANY($2) AND cg.status = 'active'
            ORDER BY c.name, cg.group_number
          `, [companyId, campaignIds]);
          recipients = groupsQuery.rows;
        }
        break;

      case 'manual':
        if (manualPhones.length > 0) {
          recipients = manualPhones.map((phone, index) => ({
            id: `manual_${index}`,
            phone: phone.trim(),
            name: phone.trim(),
            type: 'manual'
          }));
        }
        break;
    }

    return recipients;
  }

  /**
   * Crear mensajes individuales para cada destinatario
   */
  async createIndividualMessages(massMessageId, recipients, finalMessage, scheduledFor, timezone) {
    const insertPromises = recipients.map((recipient, index) => {
      // Calcular delay acumulativo para grupos
      const delayMinutes = recipient.type === 'group' ? Math.floor(index / 10) : 0; // 10 segundos entre grupos
      const adjustedScheduledFor = scheduledFor ? 
        new Date(new Date(scheduledFor).getTime() + (delayMinutes * 10 * 1000)) : 
        new Date(Date.now() + (delayMinutes * 10 * 1000));

      return database.query(`
        INSERT INTO whatsapp_bot.mass_message_recipients (
          mass_message_id, recipient_type, recipient_id, recipient_phone, 
          recipient_name, message_content, scheduled_for, timezone, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        massMessageId, recipient.type, recipient.id, recipient.phone,
        recipient.name, finalMessage, adjustedScheduledFor, timezone, 'pending'
      ]);
    });

    await Promise.all(insertPromises);
  }

  /**
   * Procesar mensaje masivo (envío inmediato)
   */
  async processMassMessage(massMessageId) {
    try {
      console.log(`[MassMessage] Procesando mensaje masivo: ${massMessageId}`);

      // Obtener mensaje masivo y sus destinatarios
      const massMessageQuery = await database.query(`
        SELECT mm.*, wi.evolution_instance_name
        FROM whatsapp_bot.mass_messages mm
        JOIN whatsapp_bot.whatsapp_instances wi ON mm.instance_id = wi.id
        WHERE mm.id = $1
      `, [massMessageId]);

      if (massMessageQuery.rows.length === 0) {
        throw new Error('Mensaje masivo no encontrado');
      }

      const massMessage = massMessageQuery.rows[0];

      // Obtener destinatarios pendientes
      const recipientsQuery = await database.query(`
        SELECT * FROM whatsapp_bot.mass_message_recipients 
        WHERE mass_message_id = $1 AND status = 'pending'
        ORDER BY scheduled_for ASC
      `, [massMessageId]);

      const recipients = recipientsQuery.rows;
      console.log(`[MassMessage] Enviando a ${recipients.length} destinatarios`);

      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          // Delay entre mensajes/grupos
          if (sentCount > 0) {
            const delay = recipient.recipient_type === 'group' ? 
              massMessage.delay_between_groups * 1000 : 
              massMessage.delay_between_messages * 1000;
            
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Enviar mensaje
          await this.sendIndividualMessage(recipient, massMessage);
          
          // Actualizar estado
          await database.query(`
            UPDATE whatsapp_bot.mass_message_recipients 
            SET status = 'sent', sent_at = NOW() 
            WHERE id = $1
          `, [recipient.id]);

          sentCount++;
          console.log(`[MassMessage] ✅ Enviado a ${recipient.recipient_name} (${sentCount}/${recipients.length})`);

        } catch (error) {
          console.error(`[MassMessage] ❌ Error enviando a ${recipient.recipient_name}:`, error.message);
          
          // Actualizar estado con error
          await database.query(`
            UPDATE whatsapp_bot.mass_message_recipients 
            SET status = 'failed', error_message = $1, sent_at = NOW() 
            WHERE id = $2
          `, [error.message, recipient.id]);

          failedCount++;
        }
      }

      // Actualizar estado final del mensaje masivo
      await database.query(`
        UPDATE whatsapp_bot.mass_messages 
        SET status = 'completed', sent_count = $1, failed_count = $2, completed_at = NOW() 
        WHERE id = $3
      `, [sentCount, failedCount, massMessageId]);

      console.log(`[MassMessage] ✅ Procesamiento completado: ${sentCount} enviados, ${failedCount} fallidos`);

    } catch (error) {
      console.error(`[MassMessage] ❌ Error procesando mensaje masivo ${massMessageId}:`, error);
      
      // Marcar como fallido
      await database.query(`
        UPDATE whatsapp_bot.mass_messages 
        SET status = 'failed', error_message = $1 
        WHERE id = $2
      `, [error.message, massMessageId]);
    }
  }

  /**
   * Enviar mensaje individual
   */
  async sendIndividualMessage(recipient, massMessage) {
    console.log(`[MassMessage] 📤 Enviando a ${recipient.recipient_name}:`, {
      type: recipient.recipient_type,
      phone: recipient.recipient_phone,
      message: recipient.message_content
    });

    if (recipient.recipient_type === 'group') {
      const payload = {
        number: recipient.recipient_phone, // evolution_group_id con @g.us
        text: recipient.message_content
      };
      
      console.log(`[MassMessage] 📋 Payload para grupo:`, payload);
      
      // Enviar a grupo
      await evolutionService.makeRequest(
        'POST',
        `/message/sendText/${massMessage.evolution_instance_name}`,
        payload
      );
    } else {
      const payload = {
        number: recipient.recipient_phone.replace(/\D/g, ''), // Solo números
        text: recipient.message_content
      };
      
      console.log(`[MassMessage] 📋 Payload para contacto:`, payload);
      
      // Enviar a contacto individual
      await evolutionService.makeRequest(
        'POST',
        `/message/sendText/${massMessage.evolution_instance_name}`,
        payload
      );
    }
  }

  /**
   * Obtener historial de mensajes masivos
   * GET /api/mass-messaging/history
   */
  async getMassMessageHistory(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = 20,
        status = '',
        target_type = '',
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir filtros
      let whereClause = 'WHERE mm.company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      if (status.trim()) {
        whereClause += ` AND mm.status = $${paramIndex}`;
        params.push(status.trim());
        paramIndex++;
      }

      if (target_type.trim()) {
        whereClause += ` AND mm.target_type = $${paramIndex}`;
        params.push(target_type.trim());
        paramIndex++;
      }

      // Query principal
      const messagesQuery = `
        SELECT 
          mm.*,
          u.email as created_by_email,
          wi.instance_name,
          mt.name as template_name
        FROM whatsapp_bot.mass_messages mm
        LEFT JOIN whatsapp_bot.users u ON mm.created_by = u.id
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON mm.instance_id = wi.id
        LEFT JOIN whatsapp_bot.message_templates mt ON mm.template_id = mt.id
        ${whereClause}
        ORDER BY mm.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.mass_messages mm
        ${whereClause}
      `;

      const [messagesResult, countResult] = await Promise.all([
        database.query(messagesQuery, [...params, limitNum, offset]),
        database.query(countQuery, params)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: messagesResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener detalles de mensaje masivo específico
   * GET /api/mass-messaging/:id
   */
  async getMassMessageDetails(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Obtener mensaje masivo
      const messageQuery = `
        SELECT 
          mm.*,
          u.email as created_by_email,
          wi.instance_name,
          wi.evolution_instance_name,
          mt.name as template_name,
          mt.content as template_content
        FROM whatsapp_bot.mass_messages mm
        LEFT JOIN whatsapp_bot.users u ON mm.created_by = u.id
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON mm.instance_id = wi.id
        LEFT JOIN whatsapp_bot.message_templates mt ON mm.template_id = mt.id
        WHERE mm.id = $1 AND mm.company_id = $2
      `;

      const messageResult = await database.query(messageQuery, [id, companyId]);

      if (messageResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje masivo no encontrado'
        });
      }

      // Obtener estadísticas de destinatarios
      const recipientsStatsQuery = `
        SELECT 
          recipient_type,
          status,
          COUNT(*) as count
        FROM whatsapp_bot.mass_message_recipients 
        WHERE mass_message_id = $1
        GROUP BY recipient_type, status
        ORDER BY recipient_type, status
      `;

      const recipientsStatsResult = await database.query(recipientsStatsQuery, [id]);

      // Obtener muestra de destinatarios
      const recipientsSampleQuery = `
        SELECT *
        FROM whatsapp_bot.mass_message_recipients 
        WHERE mass_message_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const recipientsSampleResult = await database.query(recipientsSampleQuery, [id]);

      res.json({
        success: true,
        data: {
          message: messageResult.rows[0],
          recipientsStats: recipientsStatsResult.rows,
          recipientsSample: recipientsSampleResult.rows
        }
      });

    } catch (error) {
      console.error('Error obteniendo detalles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cancelar mensaje masivo
   * POST /api/mass-messaging/:id/cancel
   */
  async cancelMassMessage(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el mensaje existe y puede ser cancelado
      const messageQuery = await database.query(`
        SELECT id, status, title
        FROM whatsapp_bot.mass_messages 
        WHERE id = $1 AND company_id = $2
      `, [id, companyId]);

      if (messageQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje masivo no encontrado'
        });
      }

      const message = messageQuery.rows[0];

      if (!['scheduled', 'processing'].includes(message.status)) {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden cancelar mensajes programados o en proceso'
        });
      }

      // Cancelar mensaje masivo y destinatarios pendientes
      await database.query('BEGIN');

      await database.query(`
        UPDATE whatsapp_bot.mass_messages 
        SET status = 'cancelled', completed_at = NOW()
        WHERE id = $1
      `, [id]);

      await database.query(`
        UPDATE whatsapp_bot.mass_message_recipients 
        SET status = 'cancelled'
        WHERE mass_message_id = $1 AND status = 'pending'
      `, [id]);

      await database.query('COMMIT');

      res.json({
        success: true,
        message: `Mensaje masivo "${message.title}" cancelado exitosamente`
      });

    } catch (error) {
      await database.query('ROLLBACK');
      console.error('Error cancelando mensaje masivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas generales
   * GET /api/mass-messaging/stats/overview
   */
  async getMassMessagingStats(req, res) {
    try {
      const companyId = req.user.companyId;

      // Usar la vista creada en la migración
      const statsQuery = await database.query(`
        SELECT * FROM whatsapp_bot.mass_messaging_stats 
        WHERE company_id = $1
      `, [companyId]);

      // Estadísticas adicionales por período
      const periodsQuery = `
        SELECT 
          DATE_TRUNC('day', mm.created_at) as date,
          COUNT(*) as campaigns_created,
          SUM(mm.total_recipients) as total_recipients,
          SUM(mm.sent_count) as total_sent
        FROM whatsapp_bot.mass_messages mm
        WHERE mm.company_id = $1
          AND mm.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', mm.created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const periodsResult = await database.query(periodsQuery, [companyId]);

      // Templates más utilizados
      const topTemplatesQuery = `
        SELECT 
          mt.name,
          mt.category,
          COUNT(mm.id) as usage_count
        FROM whatsapp_bot.mass_messages mm
        JOIN whatsapp_bot.message_templates mt ON mm.template_id = mt.id
        WHERE mm.company_id = $1
        GROUP BY mt.id, mt.name, mt.category
        ORDER BY usage_count DESC
        LIMIT 5
      `;

      const topTemplatesResult = await database.query(topTemplatesQuery, [companyId]);

      const stats = statsQuery.rows[0] || {
        total_campaigns: 0,
        completed_campaigns: 0,
        processing_campaigns: 0,
        scheduled_campaigns: 0,
        failed_campaigns: 0,
        total_recipients_all_time: 0,
        total_sent_all_time: 0,
        total_failed_all_time: 0,
        success_rate_percentage: 0
      };

      res.json({
        success: true,
        data: {
          overview: stats,
          dailyStats: periodsResult.rows,
          topTemplates: topTemplatesResult.rows
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new MassMessagingController(); 