const database = require('../database');
const whatsappGroupService = require('./whatsappGroupService');
const evolutionService = require('./evolutionService');

class CampaignService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Crear una nueva campaña
   * @param {Object} campaignData - Datos de la campaña
   * @returns {Promise<Object>} Campaña creada
   */
  async createCampaign(campaignData) {
    try {
      const {
        companyId,
        name,
        description,
        groupNameTemplate,
        groupDescription,
        groupImageUrl,
        maxMembersPerGroup = 950,
        autoCreateNewGroups = true,
        distributorTitle,
        distributorWelcomeMessage
      } = campaignData;

      // Generar slug único
      const distributorSlug = await this.generateUniqueSlug(name, companyId);

      const query = `
        INSERT INTO whatsapp_bot.whatsapp_campaigns (
          company_id, name, description, group_name_template, group_description,
          group_image_url, max_members_per_group, auto_create_new_groups,
          distributor_slug, distributor_title, distributor_welcome_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        companyId, name, description, groupNameTemplate, groupDescription,
        groupImageUrl, maxMembersPerGroup, autoCreateNewGroups,
        distributorSlug, distributorTitle, distributorWelcomeMessage
      ];

      const result = await database.query(query, values);
      const campaign = result.rows[0];

      // Log de creación
      await whatsappGroupService.logGroupEvent(
        campaign.id,
        null,
        'campaign_created',
        `Campaña "${name}" creada`,
        { distributorSlug, maxMembersPerGroup }
      );

      return campaign;

    } catch (error) {
      console.error('[Campaign] Error creando campaña:', error);
      throw error;
    }
  }

  /**
   * Obtener campañas con paginación y filtros
   * @param {string} companyId - ID de la empresa
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Object>} Lista paginada de campañas
   */
  async getCampaigns(companyId, filters = {}) {
    try {
      const { search = '', status = '', limit = 20, offset = 0 } = filters;

      // Construir condiciones WHERE y parámetros
      let whereConditions = ['c.company_id = $1'];
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por búsqueda
      if (search.trim()) {
        whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Filtro por estado
      if (status.trim()) {
        whereConditions.push(`c.status = $${paramIndex}`);
        params.push(status.trim());
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Query principal con estadísticas
      const query = `
        SELECT 
          c.*,
          COUNT(cg.id) as groups_count,
          COALESCE(SUM(cg.current_members), 0) as total_members,
          COUNT(cg.id) FILTER (WHERE cg.status = 'active') as active_groups_count,
          COUNT(cg.id) FILTER (WHERE cg.is_active_for_distribution = true) as distributing_groups_count
        FROM whatsapp_bot.whatsapp_campaigns c
        LEFT JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const queryParams = [...params, limit, offset];
      const result = await database.query(query, queryParams);

      // Query para contar total (solo con los parámetros del WHERE)
      const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM whatsapp_bot.whatsapp_campaigns c
        ${whereClause}
      `;

      const countResult = await database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      return {
        campaigns: result.rows.map(row => ({
          ...row,
          groups_count: parseInt(row.groups_count),
          total_members: parseInt(row.total_members),
          active_groups_count: parseInt(row.active_groups_count),
          distributing_groups_count: parseInt(row.distributing_groups_count)
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      console.error('[Campaign] Error obteniendo campañas:', error);
      throw error;
    }
  }

  /**
   * Obtener una campaña específica con detalles completos
   * @param {string} campaignId - ID de la campaña
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Campaña con detalles
   */
  async getCampaign(campaignId, companyId) {
    try {
      // Obtener campaña principal
      const campaignQuery = `
        SELECT * FROM whatsapp_bot.whatsapp_campaigns 
        WHERE id = $1 AND company_id = $2
      `;
      const campaignResult = await database.query(campaignQuery, [campaignId, companyId]);

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaña no encontrada');
      }

      const campaign = campaignResult.rows[0];

      // Obtener grupos de la campaña
      const groupsQuery = `
        SELECT 
          cg.*,
          wi.instance_name,
          wi.phone_number,
          COUNT(cm.id) as members_count
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        LEFT JOIN whatsapp_bot.whatsapp_campaign_members cm ON cg.id = cm.group_id
        WHERE cg.campaign_id = $1
        GROUP BY cg.id, wi.instance_name, wi.phone_number
        ORDER BY cg.group_number ASC
      `;
      const groupsResult = await database.query(groupsQuery, [campaignId]);

      // Obtener estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT cg.id) as total_groups,
          COUNT(DISTINCT cg.id) FILTER (WHERE cg.status = 'active') as active_groups,
          COUNT(DISTINCT cm.id) as total_members,
          COUNT(DISTINCT cm.id) FILTER (WHERE cm.status = 'joined') as joined_members,
          MAX(cm.joined_at) as last_join
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        LEFT JOIN whatsapp_bot.whatsapp_campaign_members cm ON cg.id = cm.group_id
        WHERE cg.campaign_id = $1
      `;
      const statsResult = await database.query(statsQuery, [campaignId]);
      const stats = statsResult.rows[0];

      return {
        ...campaign,
        groups: groupsResult.rows.map(row => ({
          ...row,
          members_count: parseInt(row.members_count)
        })),
        stats: {
          total_groups: parseInt(stats.total_groups || 0),
          active_groups: parseInt(stats.active_groups || 0),
          total_members: parseInt(stats.total_members || 0),
          joined_members: parseInt(stats.joined_members || 0),
          last_join: stats.last_join
        }
      };

    } catch (error) {
      console.error('[Campaign] Error obteniendo campaña:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo grupo para una campaña
   * @param {string} campaignId - ID de la campaña
   * @param {string} instanceId - ID de la instancia de WhatsApp
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Grupo creado
   */
  async createCampaignGroup(campaignId, instanceId, companyId) {
    try {
      // Verificar que la campaña pertenece a la empresa
      const campaignResult = await database.query(
        'SELECT * FROM whatsapp_bot.whatsapp_campaigns WHERE id = $1 AND company_id = $2',
        [campaignId, companyId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaña no encontrada');
      }

      const campaign = campaignResult.rows[0];

      // Obtener instancia
      const instanceResult = await database.query(
        'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2',
        [instanceId, companyId]
      );

      if (instanceResult.rows.length === 0) {
        throw new Error('Instancia no encontrada');
      }

      const instance = instanceResult.rows[0];
      const evolutionInstanceName = instance.evolution_instance_name || instance.instance_name;
      
      console.log(`[Campaign] Instancia en BD:`, {
        id: instance.id,
        instance_name: instance.instance_name,
        evolution_instance_name: evolutionInstanceName,
        status: instance.status
      });

      // Verificar que la instancia esté conectada en Evolution API
      try {
        await evolutionService.getInstanceInfo(evolutionInstanceName);
        console.log(`[Campaign] Instancia ${evolutionInstanceName} verificada en Evolution API`);
      } catch (evolutionError) {
        console.error(`[Campaign] Error verificando instancia ${evolutionInstanceName}:`, evolutionError);
        console.error(`[Campaign] Instancia esperada en Evolution API: algo como "2ea324e7-7ea7-437e-8e44-14c4002c72eb_federico_esp"`);
        throw new Error(`Instancia no encontrada en Evolution API. BD tiene: "${instance.instance_name}", Evolution espera: "${evolutionInstanceName}"`);
      }

      // Obtener el siguiente número de grupo
      const groupNumberResult = await database.query(
        'SELECT COALESCE(MAX(group_number), 0) + 1 as next_number FROM whatsapp_bot.whatsapp_campaign_groups WHERE campaign_id = $1',
        [campaignId]
      );
      const groupNumber = groupNumberResult.rows[0].next_number;

      // Generar nombre del grupo
      const groupName = campaign.group_name_template.replace('#{group_number}', groupNumber);

      // Crear grupo en WhatsApp (incluyendo admin como participante)
      const adminPhone = instance.phone_number ? instance.phone_number.replace('+', '') : null;
      
      if (!adminPhone) {
        throw new Error('La instancia no tiene número de teléfono configurado');
      }

      const whatsappGroup = await whatsappGroupService.createGroup(
        evolutionInstanceName,
        groupName,
        campaign.group_description || '',
        [], // Sin participantes adicionales por ahora
        adminPhone // Admin obligatorio
      );

      // Obtener link de invitación
      let inviteLink = null;
      try {
        inviteLink = await whatsappGroupService.getGroupInviteLink(
          evolutionInstanceName,
          whatsappGroup.groupId
        );
      } catch (error) {
        console.warn('[Campaign] No se pudo obtener link de invitación:', error.message);
      }

      // Guardar en base de datos
      const insertQuery = `
        INSERT INTO whatsapp_bot.whatsapp_campaign_groups (
          campaign_id, instance_id, group_number, group_name, group_description,
          evolution_group_id, group_invite_link, status, max_members
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const insertValues = [
        campaignId, instanceId, groupNumber, groupName, campaign.group_description,
        whatsappGroup.groupId, inviteLink, 'active', campaign.max_members_per_group
      ];

      const result = await database.query(insertQuery, insertValues);
      const dbGroup = result.rows[0];

      // Actualizar contador de grupos en campaña
      await database.query(
        'UPDATE whatsapp_bot.whatsapp_campaigns SET total_groups = total_groups + 1 WHERE id = $1',
        [campaignId]
      );

      // Log del evento
      await whatsappGroupService.logGroupEvent(
        campaignId,
        dbGroup.id,
        'group_created',
        `Grupo "${groupName}" creado exitosamente`,
        { 
          groupNumber, 
          whatsappGroupId: whatsappGroup.groupId,
          instanceName: instance.instance_name 
        }
      );

      return {
        ...dbGroup,
        instance_name: instance.instance_name,
        whatsapp_metadata: whatsappGroup.metadata
      };

    } catch (error) {
      console.error('[Campaign] Error creando grupo de campaña:', error);
      throw error;
    }
  }

  /**
   * Obtener el grupo activo para distribución de una campaña
   * @param {string} campaignSlug - Slug de la campaña
   * @returns {Promise<Object>} Grupo activo o null
   */
  async getActiveGroupForDistribution(campaignSlug) {
    try {
      const query = `
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          c.distributor_title,
          c.distributor_welcome_message,
          c.max_members_per_group,
          cg.id as group_id,
          cg.group_name,
          cg.group_invite_link,
          cg.current_members,
          cg.max_members,
          wi.instance_name
        FROM whatsapp_bot.whatsapp_campaigns c
        JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id
        JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        WHERE c.distributor_slug = $1 
          AND c.status = 'active'
          AND cg.status = 'active'
          AND cg.is_active_for_distribution = true
          AND cg.current_members < cg.max_members
        ORDER BY cg.group_number ASC
        LIMIT 1
      `;

      const result = await database.query(query, [campaignSlug]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];

    } catch (error) {
      console.error('[Campaign] Error obteniendo grupo activo:', error);
      throw error;
    }
  }

  /**
   * Generar slug único para una campaña
   * @param {string} name - Nombre de la campaña
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<string>} Slug único
   */
  async generateUniqueSlug(name, companyId) {
    try {
      // Generar slug base
      let baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!baseSlug) {
        baseSlug = 'campaign';
      }

      let slug = baseSlug;
      let counter = 0;

      // Verificar unicidad
      while (true) {
        const existingResult = await database.query(
          'SELECT id FROM whatsapp_bot.whatsapp_campaigns WHERE distributor_slug = $1',
          [slug]
        );

        if (existingResult.rows.length === 0) {
          break;
        }

        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      return slug;

    } catch (error) {
      console.error('[Campaign] Error generando slug:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de una campaña
   * @param {string} campaignId - ID de la campaña
   * @param {string} companyId - ID de la empresa
   * @param {string} status - Nuevo estado
   * @returns {Promise<Object>} Campaña actualizada
   */
  async updateCampaignStatus(campaignId, companyId, status) {
    try {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
      
      if (!validStatuses.includes(status)) {
        throw new Error('Estado inválido');
      }

      const query = `
        UPDATE whatsapp_bot.whatsapp_campaigns 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `;

      const result = await database.query(query, [status, campaignId, companyId]);

      if (result.rows.length === 0) {
        throw new Error('Campaña no encontrada');
      }

      const campaign = result.rows[0];

      // Log del cambio de estado
      await whatsappGroupService.logGroupEvent(
        campaignId,
        null,
        'status_changed',
        `Estado de campaña cambiado a: ${status}`,
        { newStatus: status }
      );

      return campaign;

    } catch (error) {
      console.error('[Campaign] Error actualizando estado:', error);
      throw error;
    }
  }

  /**
   * Registrar un miembro en una campaña pública
   * @param {string} campaignSlug - Slug de la campaña
   * @param {Object} memberData - Datos del miembro {phone, name, ipAddress, userAgent}
   * @returns {Promise<Object>} Resultado del registro
   */
  async registerMember(campaignSlug, memberData) {
    try {
      const { phone, name, ipAddress, userAgent } = memberData;

      // Obtener grupo activo para distribución
      const activeGroup = await this.getActiveGroupForDistribution(campaignSlug);
      
      if (!activeGroup) {
        throw new Error('No hay grupos disponibles para esta campaña');
      }

      // Verificar si el miembro ya está registrado en esta campaña
      const existingMember = await database.query(`
        SELECT cm.id, cg.group_invite_link, cg.group_name
        FROM whatsapp_bot.whatsapp_campaign_members cm
        JOIN whatsapp_bot.whatsapp_campaign_groups cg ON cm.group_id = cg.id
        WHERE cm.campaign_id = $1 AND cm.phone = $2
      `, [activeGroup.campaign_id, phone]);

      if (existingMember.rows.length > 0) {
        const existing = existingMember.rows[0];
        return {
          success: true,
          alreadyRegistered: true,
          groupInviteLink: existing.group_invite_link,
          groupName: existing.group_name
        };
      }

      // Registrar nuevo miembro
      const memberResult = await database.query(`
        INSERT INTO whatsapp_bot.whatsapp_campaign_members 
        (campaign_id, group_id, phone, name, status, joined_via, ip_address, user_agent, invited_at)
        VALUES ($1, $2, $3, $4, 'invited', 'distributor_link', $5, $6, NOW())
        RETURNING id
      `, [
        activeGroup.campaign_id,
        activeGroup.group_id,
        phone,
        name,
        ipAddress,
        userAgent
      ]);

      // Actualizar contador de miembros del grupo
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET current_members = current_members + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [activeGroup.group_id]);

      // Log de actividad
      await database.query(`
        INSERT INTO whatsapp_bot.whatsapp_campaign_logs 
        (campaign_id, group_id, event_type, description, metadata)
        VALUES ($1, $2, 'member_registered', $3, $4)
      `, [
        activeGroup.campaign_id,
        activeGroup.group_id,
        `Nuevo miembro registrado: ${name || phone}`,
        JSON.stringify({
          memberId: memberResult.rows[0].id,
          phone,
          name,
          ipAddress,
          userAgent
        })
      ]);

      console.log(`[Campaign] Miembro registrado: ${phone} en campaña ${campaignSlug}`);

      return {
        success: true,
        alreadyRegistered: false,
        groupInviteLink: activeGroup.group_invite_link,
        groupName: activeGroup.group_name,
        memberId: memberResult.rows[0].id
      };

    } catch (error) {
      console.error('[Campaign] Error registrando miembro:', error);
      throw error;
    }
  }
}

module.exports = new CampaignService(); 