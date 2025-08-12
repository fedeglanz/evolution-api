const campaignService = require('../services/campaignService');

class CampaignController {
  /**
   * Crear una nueva campaña
   * POST /api/campaigns
   */
  async createCampaign(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        name,
        description,
        groupNameTemplate,
        groupDescription,
        groupImageUrl,
        maxMembersPerGroup,
        autoCreateNewGroups,
        distributorTitle,
        distributorWelcomeMessage
      } = req.body;

      // Validaciones
      if (!name || !groupNameTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y plantilla de grupo son requeridos'
        });
      }

      if (!groupNameTemplate.includes('#{group_number}')) {
        return res.status(400).json({
          success: false,
          message: 'La plantilla del grupo debe incluir #{group_number}'
        });
      }

      const campaignData = {
        companyId,
        name: name.trim(),
        description: description?.trim(),
        groupNameTemplate: groupNameTemplate.trim(),
        groupDescription: groupDescription?.trim(),
        groupImageUrl: groupImageUrl?.trim(),
        maxMembersPerGroup: parseInt(maxMembersPerGroup) || 950,
        autoCreateNewGroups: autoCreateNewGroups !== false,
        distributorTitle: distributorTitle?.trim() || `Únete a ${name.trim()}`,
        distributorWelcomeMessage: distributorWelcomeMessage?.trim() || `Bienvenido a ${name.trim()}`
      };

      const campaign = await campaignService.createCampaign(campaignData);

      res.status(201).json({
        success: true,
        message: 'Campaña creada exitosamente',
        data: campaign
      });

    } catch (error) {
      console.error('Error creando campaña:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear campaña',
        error: error.message
      });
    }
  }

  /**
   * Obtener lista de campañas
   * GET /api/campaigns
   */
  async getCampaigns(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        search = '',
        status = '',
        limit = '20',
        offset = '0'
      } = req.query;

      const filters = {
        search,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const result = await campaignService.getCampaigns(companyId, filters);

      res.json({
        success: true,
        data: result.campaigns,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error obteniendo campañas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener campañas',
        error: error.message
      });
    }
  }

  /**
   * Obtener una campaña específica
   * GET /api/campaigns/:id
   */
  async getCampaign(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const campaign = await campaignService.getCampaign(id, companyId);

      res.json({
        success: true,
        data: campaign
      });

    } catch (error) {
      console.error('Error obteniendo campaña:', error);
      const status = error.message === 'Campaña no encontrada' ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }

  /**
   * Actualizar estado de una campaña
   * PATCH /api/campaigns/:id/status
   */
  async updateCampaignStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const companyId = req.user.companyId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Estado requerido'
        });
      }

      const campaign = await campaignService.updateCampaignStatus(id, companyId, status);

      res.json({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: campaign
      });

    } catch (error) {
      console.error('Error actualizando estado de campaña:', error);
      const status = error.message.includes('no encontrada') ? 404 : 
                    error.message.includes('inválido') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }

  /**
   * Crear un grupo para una campaña
   * POST /api/campaigns/:id/groups
   */
  async createCampaignGroup(req, res) {
    try {
      const { id: campaignId } = req.params;
      const { instanceId } = req.body;
      const companyId = req.user.companyId;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          message: 'ID de instancia requerido'
        });
      }

      const group = await campaignService.createCampaignGroup(campaignId, instanceId, companyId);

      res.status(201).json({
        success: true,
        message: 'Grupo creado exitosamente',
        data: group
      });

    } catch (error) {
      console.error('Error creando grupo de campaña:', error);
      const status = error.message.includes('no encontrada') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de una campaña
   * GET /api/campaigns/:id/stats
   */
  async getCampaignStats(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Obtener campaña con estadísticas
      const campaign = await campaignService.getCampaign(id, companyId);

      // Estadísticas adicionales por período
      const periodsQuery = `
        SELECT 
          DATE_TRUNC('day', cm.invited_at) as date,
          COUNT(*) as registrations
        FROM whatsapp_bot.whatsapp_campaign_members cm
        JOIN whatsapp_bot.whatsapp_campaign_groups cg ON cm.group_id = cg.id
        WHERE cg.campaign_id = $1
          AND cm.invited_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', cm.invited_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const database = require('../database');
      const periodsResult = await database.query(periodsQuery, [id]);

      const stats = {
        ...campaign.stats,
        dailyRegistrations: periodsResult.rows.map(row => ({
          date: row.date,
          registrations: parseInt(row.registrations)
        })),
        conversionRate: campaign.stats.total_members > 0 ? 
          Math.round((campaign.stats.joined_members / campaign.stats.total_members) * 100) : 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de campaña:', error);
      const status = error.message === 'Campaña no encontrada' ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }

  /**
   * Página pública de distribución (sin autenticación)
   * GET /api/campaigns/public/:slug
   */
  async getPublicCampaign(req, res) {
    try {
      const { slug } = req.params;

      const activeGroup = await campaignService.getActiveGroupForDistribution(slug);

      if (!activeGroup) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada o sin grupos disponibles'
        });
      }

      // Datos públicos (sin información sensible)
      const publicData = {
        campaignName: activeGroup.campaign_name,
        distributorTitle: activeGroup.distributor_title,
        distributorWelcomeMessage: activeGroup.distributor_welcome_message,
        groupName: activeGroup.group_name,
        availableSpots: activeGroup.max_members - activeGroup.current_members,
        totalCapacity: activeGroup.max_members
      };

      res.json({
        success: true,
        data: publicData
      });

    } catch (error) {
      console.error('Error obteniendo campaña pública:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Registrar miembro en campaña (sin autenticación)
   * POST /api/campaigns/public/:slug/register
   */
  async registerMember(req, res) {
    try {
      const { slug } = req.params;
      const { phone, name } = req.body;

      // Validaciones
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Número de teléfono requerido'
        });
      }

      // Limpiar número de teléfono
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Número de teléfono inválido'
        });
      }

      // Obtener IP y User Agent para analytics
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const memberData = {
        phone: cleanPhone,
        name: name?.trim() || null,
        ipAddress,
        userAgent
      };

      const result = await campaignService.registerMember(slug, memberData);

      res.json({
        success: true,
        message: result.alreadyRegistered ? 
          'Ya estás registrado en esta campaña' : 
          'Registro exitoso',
        data: {
          groupInviteLink: result.groupInviteLink,
          groupName: result.groupName,
          alreadyRegistered: result.alreadyRegistered,
          distributorInfo: result.distributorInfo
        }
      });

    } catch (error) {
      console.error('Error registrando miembro:', error);
      const status = error.message.includes('no encontrada') ? 404 : 
                    error.message.includes('disponibles') ? 503 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener logs de actividad de una campaña
   * GET /api/campaigns/:id/logs
   */
  async getCampaignLogs(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const { limit = '50', offset = '0', eventType = '' } = req.query;

      // Verificar que la campaña pertenece a la empresa
      const campaign = await campaignService.getCampaign(id, companyId);

      let whereClause = 'WHERE cl.campaign_id = $1';
      let params = [id];
      let paramIndex = 2;

      if (eventType.trim()) {
        whereClause += ` AND cl.event_type = $${paramIndex}`;
        params.push(eventType.trim());
        paramIndex++;
      }

      const query = `
        SELECT 
          cl.*,
          cg.group_name
        FROM whatsapp_bot.whatsapp_campaign_logs cl
        LEFT JOIN whatsapp_bot.whatsapp_campaign_groups cg ON cl.group_id = cg.id
        ${whereClause}
        ORDER BY cl.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(parseInt(limit), parseInt(offset));

      const database = require('../database');
      const result = await database.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: result.rows.length === parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo logs de campaña:', error);
      const status = error.message === 'Campaña no encontrada' ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }

  /**
   * Obtener link directo al grupo activo (sin formulario)
   * GET /api/campaigns/direct/:slug
   */
  async getDirectGroupLink(req, res) {
    try {
      const { slug } = req.params;

      // Obtener grupo activo
      const activeGroup = await campaignService.getActiveGroupForDistribution(slug);

      if (!activeGroup) {
        return res.status(404).json({
          success: false,
          message: 'No hay grupos disponibles para esta campaña'
        });
      }

      // Verificar si el grupo está lleno
      if (activeGroup.current_members >= activeGroup.max_members) {
        // TODO: Implementar creación automática de nuevo grupo
        return res.status(503).json({
          success: false,
          message: 'Grupo lleno. Pronto abriremos un nuevo grupo.'
        });
      }

      // Log de acceso directo
      await campaignService.logCampaignEvent(
        activeGroup.campaign_id,
        activeGroup.group_id,
        'direct_access',
        'Acceso directo al grupo solicitado',
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          timestamp: new Date().toISOString()
        }
      );

      // Redirigir directamente al grupo de WhatsApp
      if (activeGroup.group_invite_link) {
        res.redirect(302, activeGroup.group_invite_link);
      } else {
        // TEMPORAL: Redirigir al formulario si no hay link directo
        console.log(`[Campaign] Link directo no disponible, redirigiendo al formulario para ${slug}`);
        const formUrl = `${req.protocol}://${req.get('host')}/campaigns/public/${slug}`;
        res.redirect(302, formUrl);
      }

    } catch (error) {
      console.error('Error obteniendo link directo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

// Exportar una instancia con métodos bound
const campaignController = new CampaignController();

// Bind all methods to preserve 'this' context
Object.getOwnPropertyNames(Object.getPrototypeOf(campaignController))
  .filter(name => name !== 'constructor' && typeof campaignController[name] === 'function')
  .forEach(name => {
    campaignController[name] = campaignController[name].bind(campaignController);
  });

module.exports = campaignController; 