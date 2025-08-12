const axios = require('axios');
const database = require('../database');

class GroupBulkUpdateService {
  constructor() {
    this.EVOLUTION_API_URL = 'https://evolution-api-jz3j.onrender.com';
    this.EVOLUTION_API_KEY = 'F2BC57EB8FBCB89D7BD411D5FA9F5451';
    this.isProcessing = false;
    this.currentProgress = null;
  }

  /**
   * Actualizar campaña y todos sus grupos de forma humanizada
   * @param {string} campaignId - ID de la campaña
   * @param {Object} updates - Cambios a aplicar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateCampaignAndGroups(campaignId, updates) {
    if (this.isProcessing) {
      throw new Error('Ya hay una actualización masiva en proceso');
    }

    try {
      this.isProcessing = true;
      console.log(`[BulkUpdate] 🚀 Iniciando actualización masiva para campaña ${campaignId}`);

      // Obtener datos de la campaña y sus grupos
      const campaignData = await this.getCampaignWithGroups(campaignId);
      if (!campaignData) {
        throw new Error('Campaña no encontrada');
      }

      // Inicializar progreso
      this.currentProgress = {
        campaignId,
        totalGroups: campaignData.groups.length,
        processedGroups: 0,
        errors: [],
        startTime: new Date(),
        status: 'processing',
        updates: updates
      };

      // Log del inicio
      await this.logBulkUpdateEvent(campaignId, 'bulk_update_started', 
        `Iniciando actualización masiva de ${campaignData.groups.length} grupos`, {
          updates,
          totalGroups: campaignData.groups.length
        });

      // 1. Actualizar datos de la campaña en DB
      await this.updateCampaignInDB(campaignId, updates);

      // 2. Actualizar grupos de forma humanizada
      const results = [];
      for (let i = 0; i < campaignData.groups.length; i++) {
        const group = campaignData.groups[i];
        
        try {
          console.log(`[BulkUpdate] 📝 Procesando grupo ${i + 1}/${campaignData.groups.length}: ${group.group_name}`);
          
          const result = await this.updateSingleGroup(group, updates, campaignData);
          results.push({ groupId: group.id, success: true, result });
          
          this.currentProgress.processedGroups++;
          
          // Delay humanizado entre grupos (2-5 segundos)
          if (i < campaignData.groups.length - 1) {
            const delay = this.getHumanizedDelay();
            console.log(`[BulkUpdate] ⏱️  Esperando ${delay}ms antes del siguiente grupo...`);
            await this.sleep(delay);
          }

        } catch (error) {
          console.error(`[BulkUpdate] ❌ Error en grupo ${group.group_name}:`, error.message);
          results.push({ groupId: group.id, success: false, error: error.message });
          this.currentProgress.errors.push({
            groupId: group.id,
            groupName: group.group_name,
            error: error.message
          });
        }
      }

      // Finalizar progreso
      this.currentProgress.status = 'completed';
      this.currentProgress.endTime = new Date();
      this.currentProgress.duration = this.currentProgress.endTime - this.currentProgress.startTime;

      // Log del final
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      await this.logBulkUpdateEvent(campaignId, 'bulk_update_completed', 
        `Actualización masiva completada: ${successCount} éxitos, ${errorCount} errores`, {
          totalGroups: campaignData.groups.length,
          successCount,
          errorCount,
          duration: this.currentProgress.duration,
          results
        });

      console.log(`[BulkUpdate] ✅ Actualización masiva completada: ${successCount}/${campaignData.groups.length} grupos actualizados`);

      return {
        success: true,
        totalGroups: campaignData.groups.length,
        successCount,
        errorCount,
        duration: this.currentProgress.duration,
        results,
        errors: this.currentProgress.errors
      };

    } catch (error) {
      console.error('[BulkUpdate] ❌ Error en actualización masiva:', error);
      
      if (this.currentProgress) {
        this.currentProgress.status = 'error';
        this.currentProgress.error = error.message;
      }

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Actualizar un solo grupo
   * @param {Object} group - Datos del grupo
   * @param {Object} updates - Cambios a aplicar
   * @param {Object} campaignData - Datos de la campaña
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateSingleGroup(group, updates, campaignData) {
    const results = {};

    // 1. Actualizar nombre del grupo
    if (updates.name && updates.name !== campaignData.name) {
      const newGroupName = campaignData.group_name_template
        .replace('#{group_number}', group.group_number)
        .replace(campaignData.name, updates.name);
      
      if (newGroupName !== group.group_name) {
        await this.updateGroupSubject(group, newGroupName);
        results.nameUpdated = { from: group.group_name, to: newGroupName };
      }
    }

    // 1.1. Actualizar template de nombre (independiente del nombre de campaña)
    if (updates.group_name_template && updates.group_name_template !== campaignData.group_name_template) {
      const newGroupName = updates.group_name_template
        .replace('#{group_number}', group.group_number);
      
      if (newGroupName !== group.group_name) {
        await this.updateGroupSubject(group, newGroupName);
        results.templateUpdated = { from: group.group_name, to: newGroupName };
      }
    }

    // 2. Actualizar descripción
    if (updates.group_description !== undefined) {
      await this.updateGroupDescription(group, updates.group_description);
      results.descriptionUpdated = { to: updates.group_description };
    }

    // 3. Actualizar configuración de solo admins
    if (updates.only_admins !== undefined) {
      await this.updateGroupSettings(group, { onlyAdmins: updates.only_admins });
      results.onlyAdminsUpdated = { to: updates.only_admins };
    }

    // 4. Actualizar imagen (si se proporciona)
    if (updates.group_image_url) {
      await this.updateGroupPicture(group, updates.group_image_url);
      results.pictureUpdated = { to: updates.group_image_url };
    }

    // 5. Actualizar máximo de miembros en DB
    if (updates.max_members_per_group && updates.max_members_per_group !== group.max_members) {
      await this.updateGroupMaxMembers(group.id, updates.max_members_per_group);
      results.maxMembersUpdated = { from: group.max_members, to: updates.max_members_per_group };
    }

    return results;
  }

  /**
   * Actualizar nombre/subject del grupo
   */
  async updateGroupSubject(group, newSubject) {
    try {
      await axios.post(`${this.EVOLUTION_API_URL}/group/updateGroupSubject/${group.evolution_instance_name}`, {
        groupJid: group.evolution_group_id,
        subject: newSubject
      }, {
        headers: {
          'apikey': this.EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      // Actualizar en DB
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET group_name = $1, updated_at = NOW()
        WHERE id = $2
      `, [newSubject, group.id]);

      console.log(`[BulkUpdate] ✅ Nombre actualizado: ${group.group_name} → ${newSubject}`);

    } catch (error) {
      console.error(`[BulkUpdate] ❌ Error actualizando nombre del grupo:`, error.message);
      throw error;
    }
  }

  /**
   * Actualizar descripción del grupo
   */
  async updateGroupDescription(group, newDescription) {
    try {
      await axios.post(`${this.EVOLUTION_API_URL}/group/updateGroupDescription/${group.evolution_instance_name}`, {
        groupJid: group.evolution_group_id,
        description: newDescription || ''
      }, {
        headers: {
          'apikey': this.EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`[BulkUpdate] ✅ Descripción actualizada para grupo ${group.group_name}`);

    } catch (error) {
      console.error(`[BulkUpdate] ❌ Error actualizando descripción:`, error.message);
      throw error;
    }
  }

  /**
   * Actualizar configuración del grupo (solo admins, etc.)
   */
  async updateGroupSettings(group, settings) {
    try {
      console.log(`[BulkUpdate] 🔒 Configurando grupo ${group.group_name}:`, settings);
      
      // Configurar si solo admins pueden enviar mensajes
      if (settings.onlyAdmins !== undefined) {
        // Usar el endpoint correcto y formato correcto
        const action = settings.onlyAdmins ? 'announcement' : 'not_announcement';
        
        console.log(`[BulkUpdate] 📡 Enviando request a Evolution API:`);
        console.log(`   URL: ${this.EVOLUTION_API_URL}/group/updateSetting/${group.evolution_instance_name}`);
        console.log(`   Params: groupJid=${group.evolution_group_id}`);
        console.log(`   Body: { action: "${action}" }`);
        
        const response = await axios.post(`${this.EVOLUTION_API_URL}/group/updateSetting/${group.evolution_instance_name}`, {
          action: action
        }, {
          params: {
            groupJid: group.evolution_group_id
          },
          headers: {
            'apikey': this.EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        console.log(`[BulkUpdate] 📡 Respuesta de Evolution API:`, response.data);
        console.log(`[BulkUpdate] ✅ Solo admins configurado: ${settings.onlyAdmins} (${action}) para grupo ${group.group_name}`);
      }

    } catch (error) {
      console.error(`[BulkUpdate] ❌ Error actualizando configuración:`, error.message);
      if (error.response) {
        console.error(`[BulkUpdate] ❌ Response status:`, error.response.status);
        console.error(`[BulkUpdate] ❌ Response data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Actualizar imagen del grupo
   */
  async updateGroupPicture(group, imageUrl) {
    try {
      console.log(`[BulkUpdate] 🖼️ Actualizando imagen del grupo ${group.group_name} con: ${imageUrl}`);
      
      // Usar el método y formato correcto según Postman collection
      const response = await axios.post(`${this.EVOLUTION_API_URL}/group/updateGroupPicture/${group.evolution_instance_name}`, {
        image: imageUrl
      }, {
        params: {
          groupJid: group.evolution_group_id
        },
        headers: {
          'apikey': this.EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 20000 // Más tiempo para subida de imagen
      });

      console.log(`[BulkUpdate] 📡 Respuesta de Evolution API (imagen):`, response.data);
      console.log(`[BulkUpdate] ✅ Imagen actualizada para grupo ${group.group_name}`);

    } catch (error) {
      console.error(`[BulkUpdate] ❌ Error actualizando imagen:`, error.message);
      if (error.response) {
        console.error(`[BulkUpdate] ❌ Response status:`, error.response.status);
        console.error(`[BulkUpdate] ❌ Response data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Actualizar máximo de miembros en DB
   */
  async updateGroupMaxMembers(groupId, maxMembers) {
    try {
      await database.query(`
        UPDATE whatsapp_bot.whatsapp_campaign_groups 
        SET max_members = $1, updated_at = NOW()
        WHERE id = $2
      `, [maxMembers, groupId]);

    } catch (error) {
      console.error(`[BulkUpdate] ❌ Error actualizando max_members:`, error.message);
      throw error;
    }
  }

  /**
   * Actualizar campaña en base de datos
   */
  async updateCampaignInDB(campaignId, updates) {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.group_name_template) {
        updateFields.push(`group_name_template = $${paramIndex++}`);
        values.push(updates.group_name_template);
      }

      if (updates.group_description !== undefined) {
        updateFields.push(`group_description = $${paramIndex++}`);
        values.push(updates.group_description);
      }

      if (updates.group_image_url !== undefined) {
        updateFields.push(`group_image_url = $${paramIndex++}`);
        values.push(updates.group_image_url);
      }

      if (updates.max_members_per_group) {
        updateFields.push(`max_members_per_group = $${paramIndex++}`);
        values.push(updates.max_members_per_group);
      }

      if (updates.only_admins !== undefined) {
        updateFields.push(`only_admins_can_send = $${paramIndex++}`);
        values.push(updates.only_admins);
      }

      if (updates.sync_interval_seconds !== undefined) {
        updateFields.push(`sync_interval_seconds = $${paramIndex++}`);
        values.push(updates.sync_interval_seconds);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        values.push(campaignId);

        const query = `
          UPDATE whatsapp_bot.whatsapp_campaigns 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;

        await database.query(query, values);
        console.log(`[BulkUpdate] ✅ Campaña actualizada en DB`);
        
        // Aplicar configuración de sync automáticamente
        if (updates.sync_interval_seconds !== undefined) {
          const groupSyncService = require('./groupSyncService');
          groupSyncService.setCampaignSyncInterval(campaignId, updates.sync_interval_seconds);
          console.log(`[BulkUpdate] ⚙️ Configuración de sync aplicada: ${updates.sync_interval_seconds} segundos`);
        }
      }

    } catch (error) {
      console.error('[BulkUpdate] ❌ Error actualizando campaña:', error);
      throw error;
    }
  }

  /**
   * Obtener datos de campaña con sus grupos
   */
  async getCampaignWithGroups(campaignId) {
    try {
      const result = await database.query(`
        SELECT 
          c.*,
          json_agg(
            json_build_object(
              'id', cg.id,
              'group_name', cg.group_name,
              'group_number', cg.group_number,
              'evolution_group_id', cg.evolution_group_id,
              'evolution_instance_name', wi.evolution_instance_name,
              'max_members', cg.max_members,
              'current_members', cg.current_members
            ) ORDER BY cg.group_number
          ) as groups
        FROM whatsapp_bot.whatsapp_campaigns c
        LEFT JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id AND cg.status = 'active'
        LEFT JOIN whatsapp_bot.whatsapp_instances wi ON cg.instance_id = wi.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [campaignId]);

      if (result.rows.length === 0) {
        return null;
      }

      const campaign = result.rows[0];
      campaign.groups = campaign.groups.filter(g => g.id !== null); // Filtrar grupos null

      return campaign;

    } catch (error) {
      console.error('[BulkUpdate] Error obteniendo datos de campaña:', error);
      throw error;
    }
  }

  /**
   * Generar delay humanizado
   */
  getHumanizedDelay() {
    // Entre 2 y 5 segundos, con variación aleatoria
    return Math.floor(Math.random() * 3000) + 2000;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Registrar evento de actualización masiva
   */
  async logBulkUpdateEvent(campaignId, eventType, description, metadata = {}) {
    try {
      await database.query(`
        INSERT INTO whatsapp_bot.whatsapp_campaign_logs 
        (campaign_id, group_id, event_type, description, metadata)
        VALUES ($1, NULL, $2, $3, $4)
      `, [campaignId, eventType, description, JSON.stringify(metadata)]);

    } catch (error) {
      console.error('[BulkUpdate] Error logging evento:', error);
    }
  }

  /**
   * Obtener progreso actual
   */
  getCurrentProgress() {
    return this.currentProgress;
  }

  /**
   * Verificar si hay proceso en curso
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }
}

module.exports = new GroupBulkUpdateService(); 