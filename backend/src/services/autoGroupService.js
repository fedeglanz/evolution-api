const database = require('../database');
const campaignService = require('./campaignService');
const whatsappGroupService = require('./whatsappGroupService');

class AutoGroupService {
  constructor() {
    this.MIN_GROUP_SIZE = 5; // Mínimo de seguridad para evitar bucles
    this.isProcessing = false;
  }

  /**
   * Verificar si algún grupo necesita expansión automática
   * Se ejecuta desde groupSyncService cuando detecta grupos cerca del límite
   */
  async checkAndCreateNewGroups() {
    if (this.isProcessing) {
      console.log('[AutoGroup] Ya hay un proceso de creación en curso');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('[AutoGroup] 🔍 Verificando grupos que necesitan expansión...');

      // Buscar grupos que estén al 100% de capacidad o muy cerca
      const result = await database.query(`
        SELECT 
          cg.id,
          cg.campaign_id,
          cg.group_name,
          cg.group_number,
          cg.current_members,
          cg.max_members,
          cg.instance_id,
          c.name as campaign_name,
          c.group_name_template,
          c.group_description,
          c.auto_create_new_groups,
          c.max_members_per_group,
          wi.evolution_instance_name
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        JOIN whatsapp_bot.whatsapp_campaigns c ON cg.campaign_id = c.id
        JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        WHERE cg.status = 'active'
          AND c.status = 'active'
          AND c.auto_create_new_groups = true
          AND cg.is_active_for_distribution = true
          AND cg.current_members >= cg.max_members
          AND cg.max_members >= $1
        ORDER BY c.name, cg.group_number
      `, [this.MIN_GROUP_SIZE]);

      console.log(`[AutoGroup] 📊 Encontrados ${result.rows.length} grupos que necesitan expansión`);

      for (const group of result.rows) {
        try {
          await this.createNextGroup(group);
        } catch (error) {
          console.error(`[AutoGroup] ❌ Error creando grupo para ${group.campaign_name}:`, error.message);
        }
      }

    } catch (error) {
      console.error('[AutoGroup] ❌ Error en verificación de grupos:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Crear el siguiente grupo para una campaña
   * @param {Object} currentGroup - Grupo actual lleno
   */
  async createNextGroup(currentGroup) {
    try {
      console.log(`[AutoGroup] 🚀 Creando nuevo grupo para campaña: ${currentGroup.campaign_name}`);

      // Verificar si ya existe un grupo más nuevo
      const existingResult = await database.query(`
        SELECT id, group_number, current_members, max_members
        FROM whatsapp_bot.whatsapp_campaign_groups
        WHERE campaign_id = $1 
          AND group_number > $2
          AND status = 'active'
        ORDER BY group_number DESC
        LIMIT 1
      `, [currentGroup.campaign_id, currentGroup.group_number]);

      if (existingResult.rows.length > 0) {
        const existingGroup = existingResult.rows[0];
        console.log(`[AutoGroup] ⚠️  Ya existe grupo más nuevo: Grupo ${existingGroup.group_number} (${existingGroup.current_members}/${existingGroup.max_members})`);
        
        // Si el grupo existente no está lleno, activarlo para distribución
        if (existingGroup.current_members < existingGroup.max_members) {
          await this.activateGroupForDistribution(existingGroup.id);
        }
        return;
      }

      // Desactivar grupo actual para distribución
      await this.deactivateGroupForDistribution(currentGroup.id);

      // Crear nuevo grupo
      const nextGroupNumber = currentGroup.group_number + 1;
      const newGroupName = currentGroup.group_name_template.replace('#{group_number}', nextGroupNumber);

      console.log(`[AutoGroup] 📝 Creando grupo: ${newGroupName} (Grupo ${nextGroupNumber})`);

      // Usar el servicio de campañas para crear el grupo
      const newGroup = await campaignService.createCampaignGroup(
        currentGroup.campaign_id,
        currentGroup.instance_id,
        nextGroupNumber
      );

      console.log(`[AutoGroup] ✅ Grupo creado exitosamente: ${newGroupName}`);

      // Log del evento
      await this.logAutoCreationEvent(currentGroup, newGroup, nextGroupNumber);

      // Verificar que el nuevo grupo tenga link de invitación
      await this.ensureGroupHasInviteLink(newGroup.id);

      return newGroup;

    } catch (error) {
      console.error(`[AutoGroup] Error creando nuevo grupo:`, error);
      throw error;
    }
  }

  /**
   * Desactivar grupo para distribución (grupo lleno)
   * @param {string} groupId - ID del grupo
   */
  async deactivateGroupForDistribution(groupId) {
    try {
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET is_active_for_distribution = false,
            updated_at = NOW()
        WHERE id = $1
      `, [groupId]);

      console.log(`[AutoGroup] 🔒 Grupo desactivado para distribución: ${groupId}`);

    } catch (error) {
      console.error('[AutoGroup] Error desactivando grupo:', error);
      throw error;
    }
  }

  /**
   * Activar grupo para distribución
   * @param {string} groupId - ID del grupo
   */
  async activateGroupForDistribution(groupId) {
    try {
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET is_active_for_distribution = true,
            updated_at = NOW()
        WHERE id = $1
      `, [groupId]);

      console.log(`[AutoGroup] 🔓 Grupo activado para distribución: ${groupId}`);

    } catch (error) {
      console.error('[AutoGroup] Error activando grupo:', error);
      throw error;
    }
  }

  /**
   * Asegurar que el grupo tenga link de invitación
   * @param {string} groupId - ID del grupo
   */
  async ensureGroupHasInviteLink(groupId) {
    try {
      // Verificar si ya tiene link
      const result = await database.query(`
        SELECT cg.group_invite_link, cg.evolution_group_id, wi.evolution_instance_name
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        WHERE cg.id = $1
      `, [groupId]);

      if (result.rows.length === 0) {
        throw new Error('Grupo no encontrado');
      }

      const group = result.rows[0];

      if (!group.group_invite_link && group.evolution_group_id) {
        console.log(`[AutoGroup] 🔗 Obteniendo link de invitación para nuevo grupo...`);
        
        try {
          const inviteLink = await whatsappGroupService.getGroupInviteLink(
            group.evolution_instance_name,
            group.evolution_group_id
          );

          if (inviteLink) {
            await database.query(`
              UPDATE whatsapp_bot.whatsapp_campaign_groups 
              SET group_invite_link = $1, updated_at = NOW()
              WHERE id = $2
            `, [inviteLink, groupId]);

            console.log(`[AutoGroup] ✅ Link de invitación guardado: ${inviteLink}`);
          }
        } catch (error) {
          console.warn(`[AutoGroup] ⚠️  No se pudo obtener link de invitación: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('[AutoGroup] Error asegurando link de invitación:', error);
    }
  }

  /**
   * Registrar evento de auto-creación
   */
  async logAutoCreationEvent(currentGroup, newGroup, nextGroupNumber) {
    try {
      await database.query(`
        INSERT INTO whatsapp_bot.whatsapp_campaign_logs 
        (campaign_id, group_id, event_type, description, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        currentGroup.campaign_id,
        newGroup.id,
        'auto_group_created',
        `Grupo ${nextGroupNumber} creado automáticamente (grupo anterior lleno: ${currentGroup.current_members}/${currentGroup.max_members})`,
        JSON.stringify({
          previous_group_id: currentGroup.id,
          previous_group_number: currentGroup.group_number,
          previous_group_members: currentGroup.current_members,
          new_group_number: nextGroupNumber,
          auto_created: true,
          timestamp: new Date().toISOString()
        })
      ]);

      console.log(`[AutoGroup] 📝 Evento de auto-creación registrado`);

    } catch (error) {
      console.error('[AutoGroup] Error logging evento:', error);
    }
  }

  /**
   * Configurar límites de grupo para testing
   * @param {number} maxMembers - Máximo de miembros por grupo
   * @param {number} minSize - Mínimo de seguridad
   */
  setTestingLimits(maxMembers, minSize = 5) {
    console.log(`[AutoGroup] 🧪 Configurando límites de testing: max=${maxMembers}, min=${minSize}`);
    this.MIN_GROUP_SIZE = Math.max(minSize, 5); // Nunca menos de 5 por seguridad
  }

  /**
   * Obtener estadísticas de auto-creación
   */
  async getAutoCreationStats() {
    try {
      const result = await database.query(`
        SELECT 
          COUNT(*) as total_auto_created,
          COUNT(DISTINCT campaign_id) as campaigns_with_auto_creation,
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as daily_count
        FROM whatsapp_bot.whatsapp_campaign_logs
        WHERE event_type = 'auto_group_created'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);

      return {
        totalAutoCreated: result.rows.reduce((sum, row) => sum + parseInt(row.daily_count), 0),
        campaignsWithAutoCreation: result.rows.length > 0 ? parseInt(result.rows[0].campaigns_with_auto_creation) : 0,
        dailyStats: result.rows
      };

    } catch (error) {
      console.error('[AutoGroup] Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

module.exports = new AutoGroupService(); 