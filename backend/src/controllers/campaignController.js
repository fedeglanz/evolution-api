const campaignService = require('../services/campaignService');
const groupBulkUpdateService = require('../services/groupBulkUpdateService');
const database = require('../database');
const whatsappGroupService = require('../services/whatsappGroupService');

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
        distributorWelcomeMessage,
        onlyAdminsCanSend,
        syncIntervalSeconds
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
        distributorWelcomeMessage: distributorWelcomeMessage?.trim() || `Bienvenido a ${name.trim()}`,
        onlyAdminsCanSend: onlyAdminsCanSend !== false, // Assuming onlyAdminsCanSend is a boolean
        syncIntervalSeconds: parseInt(syncIntervalSeconds) || 300 // Default to 5 minutes
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

  /**
   * Actualizar campaña y todos sus grupos
   * PUT /api/campaigns/:id
   */
  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const updates = req.body;

      // Verificar que la campaña pertenece a la empresa
      const campaignExists = await campaignService.getCampaign(id, companyId);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada'
        });
      }

      // Validaciones básicas
      if (updates.name && updates.name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 3 caracteres'
        });
      }

      if (updates.max_members_per_group && (updates.max_members_per_group < 5 || updates.max_members_per_group > 1000)) {
        return res.status(400).json({
          success: false,
          message: 'El máximo de miembros debe estar entre 5 y 1000'
        });
      }

      // Iniciar actualización masiva en background
      groupBulkUpdateService.updateCampaignAndGroups(id, updates)
        .then((result) => {
          console.log(`[API] Actualización masiva completada para campaña ${id}:`, result);
        })
        .catch((error) => {
          console.error(`[API] Error en actualización masiva para campaña ${id}:`, error);
        });

      res.json({
        success: true,
        message: 'Actualización masiva iniciada en segundo plano',
        data: {
          campaignId: id,
          updates: updates,
          timestamp: new Date().toISOString(),
          note: 'La actualización puede tomar varios minutos dependiendo del número de grupos'
        }
      });

    } catch (error) {
      console.error('Error actualizando campaña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener progreso de actualización masiva
   * GET /api/campaigns/:id/update-progress
   */
  async getUpdateProgress(req, res) {
    try {
      const { id } = req.params;
      const progress = groupBulkUpdateService.getCurrentProgress();

      if (!progress || progress.campaignId !== id) {
        return res.json({
          success: true,
          data: {
            status: 'idle',
            message: 'No hay actualizaciones en proceso para esta campaña'
          }
        });
      }

      res.json({
        success: true,
        data: {
          ...progress,
          progressPercentage: progress.totalGroups > 0 ? 
            Math.round((progress.processedGroups / progress.totalGroups) * 100) : 0
        }
      });

    } catch (error) {
      console.error('Error obteniendo progreso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de actualización masiva
   * GET /api/campaigns/:id/update-stats
   */
  async getUpdateStats(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Obtener logs de actualización masiva de esta campaña
      const result = await database.query(`
        SELECT 
          event_type,
          description,
          metadata,
          created_at
        FROM whatsapp_bot.whatsapp_campaign_logs cl
        JOIN whatsapp_bot.whatsapp_campaigns c ON cl.campaign_id = c.id
        WHERE c.id = $1 
          AND c.company_id = $2
          AND cl.event_type IN ('bulk_update_started', 'bulk_update_completed')
        ORDER BY cl.created_at DESC
        LIMIT 10
      `, [id, companyId]);

      res.json({
        success: true,
        data: {
          recentUpdates: result.rows,
          isProcessing: groupBulkUpdateService.isCurrentlyProcessing(),
          currentProgress: groupBulkUpdateService.getCurrentProgress()
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

  /**
   * Obtener grupos de una campaña
   * GET /api/campaigns/:id/groups
   */
  async getCampaignGroups(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que la campaña pertenece a la empresa
      const campaignExists = await campaignService.getCampaign(id, companyId);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada'
        });
      }

      const result = await database.query(`
        SELECT 
          cg.id,
          cg.group_name,
          cg.group_number,
          cg.current_members,
          cg.max_members,
          cg.is_active_for_distribution,
          cg.status,
          cg.group_invite_link,
          cg.created_at,
          wi.instance_name,
          wi.evolution_instance_name
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        WHERE cg.campaign_id = $1 
          AND cg.status = 'active'
        ORDER BY cg.group_number
      `, [id]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error obteniendo grupos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar grupo activo para distribución
   * PUT /api/campaigns/:campaignId/groups/:groupId/active
   */
  async setActiveGroup(req, res) {
    try {
      const { campaignId, groupId } = req.params;
      const companyId = req.user.companyId;

      // Verificar que la campaña pertenece a la empresa
      const campaignExists = await campaignService.getCampaign(campaignId, companyId);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada'
        });
      }

      // Verificar que el grupo pertenece a la campaña
      const groupCheck = await database.query(`
        SELECT id FROM whatsapp_bot.whatsapp_campaign_groups 
        WHERE id = $1 AND campaign_id = $2 AND status = 'active'
      `, [groupId, campaignId]);

      if (groupCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Grupo no encontrado en esta campaña'
        });
      }

      // Desactivar todos los grupos de la campaña
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET is_active_for_distribution = false, updated_at = NOW()
        WHERE campaign_id = $1
      `, [campaignId]);

      // Activar el grupo seleccionado
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET is_active_for_distribution = true, updated_at = NOW()
        WHERE id = $1
      `, [groupId]);

      // Log del cambio
      const logResult = await database.query(`
        SELECT group_name FROM whatsapp_bot.whatsapp_campaign_groups WHERE id = $1
      `, [groupId]);

      const groupName = logResult.rows[0]?.group_name || 'Grupo';

      await whatsappGroupService.logGroupEvent(
        campaignId,
        groupId,
        'group_activated',
        `${groupName} activado para distribución`,
        { activatedBy: 'manual', userId: req.user.id }
      );

      res.json({
        success: true,
        message: `${groupName} activado para distribución`,
        data: {
          campaignId,
          groupId,
          groupName
        }
      });

    } catch (error) {
      console.error('Error activando grupo:', error);
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