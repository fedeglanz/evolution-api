const { pool } = require('../database');
const config = require('../config');

class DashboardController {

  /**
   * Obtener métricas generales del dashboard
   * GET /api/dashboard/overview
   */
  async getOverview(req, res) {
    try {
      const companyId = req.user.companyId;
      const { date_from, date_to, instance_id } = req.query;

      // Obtener información básica de la empresa
      const companyQuery = `
        SELECT 
          name,
          plan,
          max_instances,
          max_messages,
          created_at
        FROM companies
        WHERE id = $1
      `;
      const companyResult = await pool.query(companyQuery, [companyId]);
      const company = companyResult.rows[0];

      // Construir filtros de fecha
      const dateFilter = this.buildDateFilter(date_from, date_to);
      const instanceFilter = instance_id ? `AND instance_id = '${instance_id}'` : '';

      // Métricas de mensajes
      const messageStatsQuery = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as messages_received,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as messages_sent,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as messages_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as messages_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as messages_month
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
      `;

      // Métricas de contactos
      const contactStatsQuery = `
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(CASE WHEN is_blocked = false THEN 1 END) as active_contacts,
          COUNT(CASE WHEN is_blocked = true THEN 1 END) as blocked_contacts,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_contacts_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_contacts_week,
          COUNT(CASE WHEN last_message_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_contacts_week
        FROM contacts
        WHERE company_id = $1
      `;

      // Métricas de instancias
      const instanceStatsQuery = `
        SELECT 
          COUNT(*) as total_instances,
          COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_instances,
          COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnected_instances,
          COUNT(CASE WHEN status = 'connecting' THEN 1 END) as connecting_instances,
          COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '1 hour' THEN 1 END) as recently_active
        FROM whatsapp_instances
        WHERE company_id = $1
      `;

      // Métricas de bot
      const botStatsQuery = `
        SELECT 
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as bot_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as user_messages,
          COUNT(DISTINCT contact_id) as unique_contacts_served,
          AVG(CASE WHEN is_from_bot = true THEN EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY contact_id ORDER BY created_at))) END) as avg_response_time
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
      `;

      // Ejecutar queries en paralelo
      const [messageStats, contactStats, instanceStats, botStats] = await Promise.all([
        pool.query(messageStatsQuery, [companyId]),
        pool.query(contactStatsQuery, [companyId]),
        pool.query(instanceStatsQuery, [companyId]),
        pool.query(botStatsQuery, [companyId])
      ]);

      const messageData = messageStats.rows[0];
      const contactData = contactStats.rows[0];
      const instanceData = instanceStats.rows[0];
      const botData = botStats.rows[0];

      // Calcular métricas adicionales
      const messageUsage = {
        used: parseInt(messageData.messages_month),
        limit: company.max_messages,
        percentage: company.max_messages ? (parseInt(messageData.messages_month) / company.max_messages * 100).toFixed(1) : 0
      };

      const instanceUsage = {
        used: parseInt(instanceData.total_instances),
        limit: company.max_instances,
        percentage: company.max_instances ? (parseInt(instanceData.total_instances) / company.max_instances * 100).toFixed(1) : 0
      };

      const botEffectiveness = {
        responseRate: botData.user_messages > 0 ? (parseInt(botData.bot_messages) / parseInt(botData.user_messages) * 100).toFixed(1) : 0,
        avgResponseTime: botData.avg_response_time ? parseFloat(botData.avg_response_time).toFixed(2) : 0,
        contactsServed: parseInt(botData.unique_contacts_served)
      };

      res.json({
        success: true,
        data: {
          company: {
            name: company.name,
            plan: company.plan,
            memberSince: company.created_at
          },
          messages: {
            total: parseInt(messageData.total_messages),
            received: parseInt(messageData.messages_received),
            sent: parseInt(messageData.messages_sent),
            today: parseInt(messageData.messages_today),
            week: parseInt(messageData.messages_week),
            month: parseInt(messageData.messages_month),
            usage: messageUsage
          },
          contacts: {
            total: parseInt(contactData.total_contacts),
            active: parseInt(contactData.active_contacts),
            blocked: parseInt(contactData.blocked_contacts),
            newToday: parseInt(contactData.new_contacts_today),
            newWeek: parseInt(contactData.new_contacts_week),
            activeWeek: parseInt(contactData.active_contacts_week)
          },
          instances: {
            total: parseInt(instanceData.total_instances),
            connected: parseInt(instanceData.connected_instances),
            disconnected: parseInt(instanceData.disconnected_instances),
            connecting: parseInt(instanceData.connecting_instances),
            recentlyActive: parseInt(instanceData.recently_active),
            usage: instanceUsage
          },
          bot: botEffectiveness,
          filters: {
            dateFrom: date_from || null,
            dateTo: date_to || null,
            instanceId: instance_id || null
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener overview del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de mensajes por período
   * GET /api/dashboard/messages
   */
  async getMessageStats(req, res) {
    try {
      const companyId = req.user.companyId;
      const { 
        period = 'day', 
        date_from, 
        date_to, 
        instance_id,
        limit = 30 
      } = req.query;

      const dateFilter = this.buildDateFilter(date_from, date_to);
      const instanceFilter = instance_id ? `AND instance_id = '${instance_id}'` : '';

      // Validar período
      const validPeriods = ['hour', 'day', 'week', 'month'];
      const selectedPeriod = validPeriods.includes(period) ? period : 'day';

      // Query para estadísticas por período
      const messageStatsQuery = `
        SELECT 
          DATE_TRUNC('${selectedPeriod}', created_at) as period,
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as messages_received,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as messages_sent,
          COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN message_type = 'audio' THEN 1 END) as audio_messages,
          COUNT(CASE WHEN message_type = 'video' THEN 1 END) as video_messages,
          COUNT(CASE WHEN message_type = 'document' THEN 1 END) as document_messages,
          COUNT(DISTINCT contact_id) as unique_contacts
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        GROUP BY DATE_TRUNC('${selectedPeriod}', created_at)
        ORDER BY period DESC
        LIMIT $2
      `;

      // Query para horarios de mayor actividad
      const hourlyActivityQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as messages_count,
          COUNT(DISTINCT contact_id) as unique_contacts
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY messages_count DESC
      `;

      // Query para días de la semana más activos
      const weeklyActivityQuery = `
        SELECT 
          EXTRACT(DOW FROM created_at) as day_of_week,
          TO_CHAR(created_at, 'Day') as day_name,
          COUNT(*) as messages_count,
          COUNT(DISTINCT contact_id) as unique_contacts
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        GROUP BY EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
        ORDER BY messages_count DESC
      `;

      const [messageStats, hourlyActivity, weeklyActivity] = await Promise.all([
        pool.query(messageStatsQuery, [companyId, limit]),
        pool.query(hourlyActivityQuery, [companyId]),
        pool.query(weeklyActivityQuery, [companyId])
      ]);

      res.json({
        success: true,
        data: {
          period: selectedPeriod,
          stats: messageStats.rows.map(row => ({
            period: row.period,
            totalMessages: parseInt(row.total_messages),
            messagesReceived: parseInt(row.messages_received),
            messagesSent: parseInt(row.messages_sent),
            messageTypes: {
              text: parseInt(row.text_messages),
              image: parseInt(row.image_messages),
              audio: parseInt(row.audio_messages),
              video: parseInt(row.video_messages),
              document: parseInt(row.document_messages)
            },
            uniqueContacts: parseInt(row.unique_contacts)
          })),
          hourlyActivity: hourlyActivity.rows.map(row => ({
            hour: parseInt(row.hour),
            messagesCount: parseInt(row.messages_count),
            uniqueContacts: parseInt(row.unique_contacts)
          })),
          weeklyActivity: weeklyActivity.rows.map(row => ({
            dayOfWeek: parseInt(row.day_of_week),
            dayName: row.day_name.trim(),
            messagesCount: parseInt(row.messages_count),
            uniqueContacts: parseInt(row.unique_contacts)
          })),
          filters: {
            period: selectedPeriod,
            dateFrom: date_from || null,
            dateTo: date_to || null,
            instanceId: instance_id || null,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de mensajes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener contactos más activos
   * GET /api/dashboard/contacts
   */
  async getTopContacts(req, res) {
    try {
      const companyId = req.user.companyId;
      const { 
        limit = 10, 
        date_from, 
        date_to, 
        instance_id,
        sort_by = 'messages',
        include_blocked = 'false'
      } = req.query;

      const dateFilter = this.buildDateFilter(date_from, date_to, 'conv');
      const instanceFilter = instance_id ? `AND conv.instance_id = '${instance_id}'` : '';
      const blockedFilter = include_blocked === 'true' ? '' : 'AND c.is_blocked = false';

      // Validar ordenamiento
      const validSortFields = ['messages', 'recent_activity', 'bot_interactions'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'messages';

      let orderBy = 'total_messages DESC';
      if (sortField === 'recent_activity') {
        orderBy = 'last_message_at DESC';
      } else if (sortField === 'bot_interactions') {
        orderBy = 'bot_messages DESC';
      }

      const topContactsQuery = `
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.profile_pic_url,
          c.tags,
          c.is_blocked,
          c.last_message_at,
          COUNT(conv.id) as total_messages,
          COUNT(CASE WHEN conv.is_from_bot = false THEN 1 END) as messages_from_contact,
          COUNT(CASE WHEN conv.is_from_bot = true THEN 1 END) as bot_messages,
          COUNT(DISTINCT conv.instance_id) as instances_used,
          COUNT(DISTINCT DATE(conv.created_at)) as active_days,
          MAX(conv.created_at) as last_interaction,
          MIN(conv.created_at) as first_interaction
        FROM contacts c
        LEFT JOIN conversations conv ON c.id = conv.contact_id
        WHERE c.company_id = $1 ${dateFilter} ${instanceFilter} ${blockedFilter}
        GROUP BY c.id, c.name, c.phone, c.profile_pic_url, c.tags, c.is_blocked, c.last_message_at
        HAVING COUNT(conv.id) > 0
        ORDER BY ${orderBy}
        LIMIT $2
      `;

      // Query para nuevos contactos
      const newContactsQuery = `
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.created_at,
          c.total_messages,
          c.last_message_at
        FROM contacts c
        WHERE c.company_id = $1 
        AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY c.created_at DESC
        LIMIT 10
      `;

      // Query para contactos más activos por instancia
      const contactsByInstanceQuery = `
        SELECT 
          wi.instance_name,
          wi.phone_number,
          COUNT(DISTINCT conv.contact_id) as unique_contacts,
          COUNT(conv.id) as total_messages,
          MAX(conv.created_at) as last_activity
        FROM conversations conv
        JOIN whatsapp_instances wi ON conv.instance_id = wi.id
        WHERE conv.company_id = $1 ${dateFilter.replace('conv.', '')}
        GROUP BY wi.id, wi.instance_name, wi.phone_number
        ORDER BY unique_contacts DESC
      `;

      const [topContacts, newContacts, contactsByInstance] = await Promise.all([
        pool.query(topContactsQuery, [companyId, limit]),
        pool.query(newContactsQuery, [companyId]),
        pool.query(contactsByInstanceQuery, [companyId])
      ]);

      res.json({
        success: true,
        data: {
          topContacts: topContacts.rows.map(row => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            profilePicUrl: row.profile_pic_url,
            tags: row.tags,
            isBlocked: row.is_blocked,
            lastMessageAt: row.last_message_at,
            stats: {
              totalMessages: parseInt(row.total_messages),
              messagesFromContact: parseInt(row.messages_from_contact),
              botMessages: parseInt(row.bot_messages),
              instancesUsed: parseInt(row.instances_used),
              activeDays: parseInt(row.active_days),
              firstInteraction: row.first_interaction,
              lastInteraction: row.last_interaction
            }
          })),
          newContacts: newContacts.rows.map(row => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            createdAt: row.created_at,
            totalMessages: row.total_messages,
            lastMessageAt: row.last_message_at
          })),
          contactsByInstance: contactsByInstance.rows.map(row => ({
            instanceName: row.instance_name,
            phoneNumber: row.phone_number,
            uniqueContacts: parseInt(row.unique_contacts),
            totalMessages: parseInt(row.total_messages),
            lastActivity: row.last_activity
          })),
          filters: {
            limit: parseInt(limit),
            dateFrom: date_from || null,
            dateTo: date_to || null,
            instanceId: instance_id || null,
            sortBy: sortField,
            includeBlocked: include_blocked === 'true'
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener contactos más activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener métricas de rendimiento del bot
   * GET /api/dashboard/performance
   */
  async getBotPerformance(req, res) {
    try {
      const companyId = req.user.companyId;
      const { date_from, date_to, instance_id } = req.query;

      const dateFilter = this.buildDateFilter(date_from, date_to);
      const instanceFilter = instance_id ? `AND instance_id = '${instance_id}'` : '';

      // Tiempos de respuesta del bot
      const responseTimeQuery = `
        WITH response_times AS (
          SELECT 
            contact_id,
            created_at,
            is_from_bot,
            LAG(created_at) OVER (PARTITION BY contact_id ORDER BY created_at) as prev_message_time,
            LAG(is_from_bot) OVER (PARTITION BY contact_id ORDER BY created_at) as prev_is_from_bot
          FROM conversations
          WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        )
        SELECT 
          AVG(EXTRACT(EPOCH FROM (created_at - prev_message_time))) as avg_response_time,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (created_at - prev_message_time))) as median_response_time,
          MIN(EXTRACT(EPOCH FROM (created_at - prev_message_time))) as min_response_time,
          MAX(EXTRACT(EPOCH FROM (created_at - prev_message_time))) as max_response_time,
          COUNT(*) as total_responses
        FROM response_times
        WHERE is_from_bot = true 
        AND prev_is_from_bot = false
        AND prev_message_time IS NOT NULL
        AND EXTRACT(EPOCH FROM (created_at - prev_message_time)) < 3600
      `;

      // Efectividad del bot
      const effectivenessQuery = `
        SELECT 
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as bot_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as user_messages,
          COUNT(DISTINCT contact_id) as unique_contacts_served,
          COUNT(DISTINCT CASE WHEN is_from_bot = true THEN contact_id END) as contacts_responded_to,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
      `;

      // Horarios de mayor actividad del bot
      const botActivityQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as bot_messages,
          COUNT(DISTINCT contact_id) as unique_contacts,
          AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY contact_id ORDER BY created_at)))) as avg_response_time
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        AND is_from_bot = true
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY bot_messages DESC
      `;

      // Configuración de bots por instancia
      const botConfigQuery = `
        SELECT 
          wi.instance_name,
          wi.phone_number,
          bc.auto_response,
          bc.max_tokens,
          bc.temperature,
          COUNT(conv.id) as messages_handled,
          COUNT(DISTINCT conv.contact_id) as unique_contacts
        FROM whatsapp_instances wi
        LEFT JOIN bot_configs bc ON wi.id = bc.instance_id
        LEFT JOIN conversations conv ON wi.id = conv.instance_id 
          AND conv.is_from_bot = true ${dateFilter.replace('AND ', 'AND conv.')}
        WHERE wi.company_id = $1
        GROUP BY wi.id, wi.instance_name, wi.phone_number, bc.auto_response, bc.max_tokens, bc.temperature
        ORDER BY messages_handled DESC
      `;

      const [responseTime, effectiveness, botActivity, botConfig] = await Promise.all([
        pool.query(responseTimeQuery, [companyId]),
        pool.query(effectivenessQuery, [companyId]),
        pool.query(botActivityQuery, [companyId]),
        pool.query(botConfigQuery, [companyId])
      ]);

      const responseData = responseTime.rows[0];
      const effectivenessData = effectiveness.rows[0];

      // Calcular métricas de efectividad
      const userMessages = parseInt(effectivenessData.user_messages);
      const botMessages = parseInt(effectivenessData.bot_messages);
      const uniqueContacts = parseInt(effectivenessData.unique_contacts_served);
      const contactsRespondedTo = parseInt(effectivenessData.contacts_responded_to);

      const responseRate = userMessages > 0 ? (botMessages / userMessages * 100).toFixed(1) : 0;
      const contactCoverage = uniqueContacts > 0 ? (contactsRespondedTo / uniqueContacts * 100).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          responseTimes: {
            average: responseData.avg_response_time ? parseFloat(responseData.avg_response_time).toFixed(2) : 0,
            median: responseData.median_response_time ? parseFloat(responseData.median_response_time).toFixed(2) : 0,
            min: responseData.min_response_time ? parseFloat(responseData.min_response_time).toFixed(2) : 0,
            max: responseData.max_response_time ? parseFloat(responseData.max_response_time).toFixed(2) : 0,
            totalResponses: parseInt(responseData.total_responses)
          },
          effectiveness: {
            responseRate: parseFloat(responseRate),
            contactCoverage: parseFloat(contactCoverage),
            botMessages: botMessages,
            userMessages: userMessages,
            uniqueContactsServed: uniqueContacts,
            contactsRespondedTo: contactsRespondedTo,
            activeDays: parseInt(effectivenessData.active_days)
          },
          hourlyActivity: botActivity.rows.map(row => ({
            hour: parseInt(row.hour),
            botMessages: parseInt(row.bot_messages),
            uniqueContacts: parseInt(row.unique_contacts),
            avgResponseTime: row.avg_response_time ? parseFloat(row.avg_response_time).toFixed(2) : 0
          })),
          botConfigurations: botConfig.rows.map(row => ({
            instanceName: row.instance_name,
            phoneNumber: row.phone_number,
            autoResponse: row.auto_response,
            maxTokens: row.max_tokens,
            temperature: row.temperature,
            messagesHandled: parseInt(row.messages_handled),
            uniqueContacts: parseInt(row.unique_contacts)
          })),
          filters: {
            dateFrom: date_from || null,
            dateTo: date_to || null,
            instanceId: instance_id || null
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener métricas de rendimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Exportar métricas del dashboard
   * GET /api/dashboard/export
   */
  async exportDashboard(req, res) {
    try {
      const companyId = req.user.companyId;
      const { 
        format = 'json', 
        date_from, 
        date_to, 
        instance_id,
        include_details = 'false'
      } = req.query;

      if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Formato no soportado. Use json o csv'
        });
      }

      const dateFilter = this.buildDateFilter(date_from, date_to);
      const instanceFilter = instance_id ? `AND instance_id = '${instance_id}'` : '';

      // Query para exportar métricas principales
      const exportQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_from_bot = false THEN 1 END) as messages_received,
          COUNT(CASE WHEN is_from_bot = true THEN 1 END) as messages_sent,
          COUNT(DISTINCT contact_id) as unique_contacts,
          COUNT(DISTINCT instance_id) as instances_used
        FROM conversations
        WHERE company_id = $1 ${dateFilter} ${instanceFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 1000
      `;

      const result = await pool.query(exportQuery, [companyId]);

      if (format === 'csv') {
        // Generar CSV
        const csvHeader = 'Date,Total Messages,Messages Received,Messages Sent,Unique Contacts,Instances Used\n';
        const csvRows = result.rows.map(row => {
          return [
            row.date,
            row.total_messages,
            row.messages_received,
            row.messages_sent,
            row.unique_contacts,
            row.instances_used
          ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        const filename = `dashboard_metrics_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);

      } else {
        // Respuesta JSON
        const exportData = {
          metrics: result.rows.map(row => ({
            date: row.date,
            totalMessages: parseInt(row.total_messages),
            messagesReceived: parseInt(row.messages_received),
            messagesSent: parseInt(row.messages_sent),
            uniqueContacts: parseInt(row.unique_contacts),
            instancesUsed: parseInt(row.instances_used)
          })),
          exportedAt: new Date().toISOString(),
          filters: {
            dateFrom: date_from || null,
            dateTo: date_to || null,
            instanceId: instance_id || null
          }
        };

        // Incluir detalles adicionales si se solicita
        if (include_details === 'true') {
          const detailsQuery = `
            SELECT 
              c.name as contact_name,
              c.phone as contact_phone,
              COUNT(conv.id) as total_messages,
              MAX(conv.created_at) as last_interaction
            FROM contacts c
            JOIN conversations conv ON c.id = conv.contact_id
            WHERE c.company_id = $1 ${dateFilter.replace('AND ', 'AND conv.')} ${instanceFilter.replace('AND ', 'AND conv.')}
            GROUP BY c.id, c.name, c.phone
            ORDER BY total_messages DESC
            LIMIT 100
          `;

          const detailsResult = await pool.query(detailsQuery, [companyId]);
          exportData.topContacts = detailsResult.rows.map(row => ({
            contactName: row.contact_name,
            contactPhone: row.contact_phone,
            totalMessages: parseInt(row.total_messages),
            lastInteraction: row.last_interaction
          }));
        }

        res.json({
          success: true,
          data: exportData
        });
      }

    } catch (error) {
      console.error('Error al exportar métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Métodos auxiliares

  /**
   * Construir filtro de fecha para queries
   */
  buildDateFilter(date_from, date_to, prefix = '') {
    let filter = '';
    const column = prefix ? `${prefix}.created_at` : 'created_at';

    if (date_from) {
      filter += ` AND ${column} >= '${date_from}'`;
    }

    if (date_to) {
      filter += ` AND ${column} <= '${date_to}'`;
    }

    return filter;
  }

  /**
   * Calcular porcentaje de crecimiento
   */
  calculateGrowthPercentage(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  }

  /**
   * Formatear tiempo en segundos a formato legible
   */
  formatResponseTime(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }
}

module.exports = new DashboardController();
