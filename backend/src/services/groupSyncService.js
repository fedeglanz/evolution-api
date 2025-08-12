const axios = require('axios');
const database = require('../database');

class GroupSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.EVOLUTION_API_URL = 'https://evolution-api-jz3j.onrender.com';
    this.EVOLUTION_API_KEY = 'F2BC57EB8FBCB89D7BD411D5FA9F5451';
    this.SYNC_INTERVAL_MINUTES = 5; // Sincronizar cada 5 minutos
  }

  /**
   * Iniciar sincronización automática
   */
  start() {
    if (this.isRunning) {
      console.log('[GroupSync] Ya está en ejecución');
      return;
    }

    console.log(`[GroupSync] 🚀 Iniciando sincronización automática (cada ${this.SYNC_INTERVAL_MINUTES} minutos)`);
    this.isRunning = true;

    // Ejecutar inmediatamente
    this.syncAllActiveGroups();

    // Programar ejecuciones periódicas
    this.syncInterval = setInterval(() => {
      this.syncAllActiveGroups();
    }, this.SYNC_INTERVAL_MINUTES * 60 * 1000);
  }

  /**
   * Detener sincronización automática
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[GroupSync] 🛑 Deteniendo sincronización automática');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sincronizar todos los grupos activos
   */
  async syncAllActiveGroups() {
    try {
      console.log('[GroupSync] 🔄 Iniciando sincronización de grupos activos...');

      // Obtener grupos activos de campañas
      const result = await database.query(`
        SELECT 
          cg.id,
          cg.group_name,
          cg.evolution_group_id,
          cg.current_members,
          cg.max_members,
          wi.evolution_instance_name,
          c.name as campaign_name,
          c.distributor_slug
        FROM whatsapp_bot.whatsapp_campaign_groups cg
        JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        JOIN whatsapp_bot.whatsapp_campaigns c ON cg.campaign_id = c.id
        WHERE cg.status = 'active' 
          AND c.status IN ('active', 'draft')
          AND cg.evolution_group_id IS NOT NULL
        ORDER BY c.name, cg.group_number
      `);

      console.log(`[GroupSync] 📊 Encontrados ${result.rows.length} grupos para sincronizar`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const group of result.rows) {
        try {
          const syncResult = await this.syncSingleGroup(group);
          if (syncResult.updated) {
            syncedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`[GroupSync] ❌ Error sincronizando grupo ${group.group_name}:`, error.message);
        }
      }

      console.log(`[GroupSync] ✅ Sincronización completada: ${syncedCount} actualizados, ${errorCount} errores`);

    } catch (error) {
      console.error('[GroupSync] ❌ Error en sincronización general:', error);
    }
  }

  /**
   * Sincronizar un grupo específico
   * @param {Object} group - Datos del grupo
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncSingleGroup(group) {
    try {
      console.log(`[GroupSync] 🔍 Sincronizando: ${group.group_name} (${group.campaign_name})`);

      // Obtener información actual del grupo desde Evolution API
      const groupInfo = await this.getGroupInfoFromEvolution(
        group.evolution_instance_name,
        group.evolution_group_id
      );

      if (!groupInfo) {
        throw new Error('No se pudo obtener información del grupo');
      }

      const currentMembers = groupInfo.participantsCount || 0;
      const previousMembers = group.current_members || 0;

      // Solo actualizar si hay cambios
      if (currentMembers !== previousMembers) {
        await this.updateGroupStats(group.id, {
          current_members: currentMembers,
          participants_data: groupInfo.participants || [],
          last_sync_at: new Date(),
          sync_status: 'success'
        });

        // Log del cambio
        await this.logGroupEvent(
          group.id,
          'member_count_updated',
          `Miembros actualizados: ${previousMembers} → ${currentMembers}`,
          {
            previous_count: previousMembers,
            new_count: currentMembers,
            difference: currentMembers - previousMembers,
            sync_timestamp: new Date().toISOString()
          }
        );

        console.log(`[GroupSync] 📈 ${group.group_name}: ${previousMembers} → ${currentMembers} miembros`);

        // Verificar si está cerca del límite (alertar a 90%)
        const fillPercentage = (currentMembers / group.max_members) * 100;
        if (fillPercentage >= 90) {
          console.log(`[GroupSync] ⚠️  ${group.group_name} está al ${fillPercentage.toFixed(1)}% de capacidad`);
          
          await this.logGroupEvent(
            group.id,
            'capacity_warning',
            `Grupo cerca del límite: ${currentMembers}/${group.max_members} (${fillPercentage.toFixed(1)}%)`,
            {
              current_members: currentMembers,
              max_members: group.max_members,
              fill_percentage: fillPercentage,
              warning_threshold: 90
            }
          );
        }

        return { updated: true, previous: previousMembers, current: currentMembers };
      }

      return { updated: false, current: currentMembers };

    } catch (error) {
      // Actualizar estado de error
      await this.updateGroupStats(group.id, {
        last_sync_at: new Date(),
        sync_status: 'error',
        sync_error: error.message
      });

      throw error;
    }
  }

  /**
   * Obtener información del grupo desde Evolution API
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @returns {Promise<Object>} Información del grupo
   */
  async getGroupInfoFromEvolution(instanceName, groupId) {
    try {
      const response = await axios.get(`${this.EVOLUTION_API_URL}/group/findGroup/${instanceName}`, {
        params: {
          groupJid: groupId
        },
        headers: {
          'apikey': this.EVOLUTION_API_KEY
        },
        timeout: 10000
      });

      if (response.data) {
        return {
          participantsCount: response.data.size || response.data.participants?.length || 0,
          participants: response.data.participants || [],
          groupInfo: response.data
        };
      }

      return null;

    } catch (error) {
      console.error(`[GroupSync] Error obteniendo info del grupo ${groupId}:`, error.message);
      throw error;
    }
  }

  /**
   * Actualizar estadísticas del grupo en base de datos
   * @param {string} groupId - ID del grupo
   * @param {Object} stats - Estadísticas a actualizar
   */
  async updateGroupStats(groupId, stats) {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (stats.current_members !== undefined) {
        updateFields.push(`current_members = $${paramIndex++}`);
        values.push(stats.current_members);
      }

      if (stats.last_sync_at !== undefined) {
        updateFields.push(`updated_at = $${paramIndex++}`);
        values.push(stats.last_sync_at);
      }

      // Agregar campos adicionales si existen en la tabla
      // (sync_status, sync_error, etc. se pueden agregar en futuras migraciones)

      if (updateFields.length > 0) {
        values.push(groupId);
        const query = `
          UPDATE whatsapp_bot.whatsapp_campaign_groups 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;

        await database.query(query, values);
      }

    } catch (error) {
      console.error('[GroupSync] Error actualizando estadísticas:', error);
      throw error;
    }
  }

  /**
   * Registrar evento de grupo
   * @param {string} groupId - ID del grupo
   * @param {string} eventType - Tipo de evento
   * @param {string} description - Descripción
   * @param {Object} metadata - Metadatos adicionales
   */
  async logGroupEvent(groupId, eventType, description, metadata = {}) {
    try {
      // Obtener campaign_id del grupo
      const groupResult = await database.query(`
        SELECT campaign_id FROM whatsapp_bot.whatsapp_campaign_groups WHERE id = $1
      `, [groupId]);

      if (groupResult.rows.length > 0) {
        await database.query(`
          INSERT INTO whatsapp_bot.whatsapp_campaign_logs 
          (campaign_id, group_id, event_type, description, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          groupResult.rows[0].campaign_id,
          groupId,
          eventType,
          description,
          JSON.stringify(metadata)
        ]);
      }

    } catch (error) {
      console.error('[GroupSync] Error logging evento:', error);
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Obtener estado actual del sincronizador
   * @returns {Object} Estado del sincronizador
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncIntervalMinutes: this.SYNC_INTERVAL_MINUTES,
      nextSyncIn: this.isRunning ? this.SYNC_INTERVAL_MINUTES : null
    };
  }
}

module.exports = new GroupSyncService(); 