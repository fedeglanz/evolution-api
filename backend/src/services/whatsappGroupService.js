const evolutionService = require('./evolutionService');
const database = require('../database');

class WhatsAppGroupService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Crear un grupo de WhatsApp a través de Evolution API
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupName - Nombre del grupo
   * @param {string} description - Descripción del grupo
   * @param {string[]} participants - Array de números de teléfono (opcional)
   * @param {string} adminPhone - Número de teléfono del admin/creador (obligatorio)
   * @returns {Promise<Object>} Información del grupo creado
   */
  async createGroup(instanceName, groupName, description = '', participants = [], adminPhone = null) {
    try {
      console.log(`[WhatsAppGroup] Creando grupo "${groupName}" en instancia ${instanceName}`);

      // Preparar lista de participantes (siempre incluir admin)
      let allParticipants = [];
      
      // Agregar admin como participante obligatorio
      if (adminPhone) {
        allParticipants.push(adminPhone);
      }
      
      // Agregar participantes adicionales (evitar duplicados)
      if (participants && participants.length > 0) {
        participants.forEach(phone => {
          if (!allParticipants.includes(phone)) {
            allParticipants.push(phone);
          }
        });
      }

      // Preparar datos del grupo - formato Evolution API
      const groupData = {
        subject: groupName,
        participants: allParticipants // Siempre enviar al menos el admin
      };

      // Solo agregar descripción si no está vacía
      if (description && description.trim()) {
        groupData.description = description.trim();
      }

      console.log(`[WhatsAppGroup] Datos enviados:`, JSON.stringify(groupData, null, 2));

      const response = await evolutionService.makeRequest(
        'POST',
        `/group/create/${instanceName}`,
        groupData
      );

      console.log(`[WhatsAppGroup] Respuesta completa de Evolution API:`, JSON.stringify(response, null, 2));

      // Manejar formato específico de Evolution API
      if (response && response.id) {
        console.log(`[WhatsAppGroup] Grupo creado exitosamente: ${response.id}`);
        
        return {
          success: true,
          groupId: response.id, // ej: "120363402385618270@g.us"
          groupName: response.subject, // ej: "Test 02"
          description: response.desc || null,
          inviteLink: null, // Se obtiene por separado
          participants: response.participants || [],
          metadata: {
            id: response.id,
            subject: response.subject,
            owner: response.owner,
            creation: response.creation,
            size: response.size,
            restrict: response.restrict,
            announce: response.announce,
            participants: response.participants
          }
        };
      }

      // Si llegamos aquí, no pudimos extraer los datos del grupo
      console.warn(`[WhatsAppGroup] Formato de respuesta inesperado:`, response);
      throw new Error(response?.message || 'Error procesando respuesta del grupo creado');

    } catch (error) {
      console.error(`[WhatsAppGroup] Error creando grupo "${groupName}" en instancia ${instanceName}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Mejorar mensaje de error específico
      if (error.response?.status === 404) {
        throw new Error(`Instancia no encontrada en Evolution API`);
      } else if (error.response?.data?.message) {
        throw new Error(`Error de Evolution API: ${error.response.data.message}`);
      } else {
        throw new Error(`Error creando grupo: ${error.message}`);
      }
    }
  }

  /**
   * Obtener link de invitación de un grupo
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo en WhatsApp
   * @returns {Promise<string>} Link de invitación
   */
  async getGroupInviteLink(instanceName, groupId) {
    try {
      console.log(`[WhatsAppGroup] Obteniendo link de invitación para grupo ${groupId}`);

      // Usar la URL real de Evolution API con API key
      const axios = require('axios');
      const response = await axios.get(`https://evolution-api-jz3j.onrender.com/group/inviteCode/${instanceName}`, {
        params: {
          groupJid: groupId
        },
        headers: {
          'apikey': 'F2BC57EB8FBCB89D7BD411D5FA9F5451'
        },
        timeout: 10000
      });

      if (response.data && response.data.inviteUrl) {
        console.log(`[WhatsAppGroup] Link obtenido: ${response.data.inviteUrl}`);
        return response.data.inviteUrl;
      }

      throw new Error('No se pudo obtener el link de invitación');

    } catch (error) {
      console.error(`[WhatsAppGroup] Error obteniendo link de invitación:`, error);
      throw error;
    }
  }

  /**
   * Obtener información de un grupo
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @returns {Promise<Object>} Información del grupo
   */
  async getGroupInfo(instanceName, groupId) {
    try {
      const response = await evolutionService.makeRequest(
        'POST',
        `/group/findGroup/${instanceName}`,
        { groupJid: groupId }
      );

      if (response.success && response.group) {
        return {
          success: true,
          id: response.group.id,
          name: response.group.subject,
          description: response.group.description,
          participantsCount: response.group.participants?.length || 0,
          participants: response.group.participants || [],
          metadata: response.group
        };
      }

      throw new Error('Grupo no encontrado');

    } catch (error) {
      console.error(`[WhatsAppGroup] Error obteniendo info del grupo:`, error);
      throw error;
    }
  }

  /**
   * Agregar participantes a un grupo
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @param {string[]} participants - Array de números de teléfono
   * @returns {Promise<Object>} Resultado de la operación
   */
  async addParticipants(instanceName, groupId, participants) {
    try {
      console.log(`[WhatsAppGroup] Agregando ${participants.length} participantes al grupo ${groupId}`);

      const participantsData = participants.map(phone => ({
        id: `${phone}@s.whatsapp.net`
      }));

      const response = await evolutionService.makeRequest(
        'POST',
        `/group/updateParticipant/${instanceName}`,
        {
          groupJid: groupId,
          action: 'add',
          participants: participantsData
        }
      );

      return {
        success: response.success || true,
        added: response.participants || participants,
        errors: response.errors || []
      };

    } catch (error) {
      console.error(`[WhatsAppGroup] Error agregando participantes:`, error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de un grupo (nombre, descripción)
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @param {Object} updates - Actualizaciones a aplicar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateGroup(instanceName, groupId, updates) {
    try {
      console.log(`[WhatsAppGroup] Actualizando grupo ${groupId}:`, updates);

      const promises = [];

      // Actualizar nombre si se proporciona
      if (updates.subject) {
        promises.push(
          evolutionService.makeRequest(
            'POST',
            `/group/updateGroupSubject/${instanceName}`,
            {
              groupJid: groupId,
              subject: updates.subject
            }
          )
        );
      }

      // Actualizar descripción si se proporciona
      if (updates.description !== undefined) {
        promises.push(
          evolutionService.makeRequest(
            'POST',
            `/group/updateGroupDescription/${instanceName}`,
            {
              groupJid: groupId,
              description: updates.description
            }
          )
        );
      }

      const results = await Promise.all(promises);
      
      return {
        success: true,
        updates: results
      };

    } catch (error) {
      console.error(`[WhatsAppGroup] Error actualizando grupo:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensaje a un grupo
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendGroupMessage(instanceName, groupId, message) {
    try {
      console.log(`[WhatsAppGroup] Enviando mensaje al grupo ${groupId}`);

      const response = await evolutionService.makeRequest(
        'POST',
        `/message/sendText/${instanceName}`,
        {
          number: groupId,
          text: message
        }
      );

      return {
        success: response.success || true,
        messageId: response.key?.id,
        metadata: response
      };

    } catch (error) {
      console.error(`[WhatsAppGroup] Error enviando mensaje:`, error);
      throw error;
    }
  }

  /**
   * Verificar si un grupo está lleno (cerca del límite)
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @param {number} maxMembers - Límite máximo de miembros
   * @returns {Promise<Object>} Estado del grupo
   */
  async checkGroupCapacity(instanceName, groupId, maxMembers = 950) {
    try {
      const groupInfo = await this.getGroupInfo(instanceName, groupId);
      const currentMembers = groupInfo.participantsCount;
      
      return {
        currentMembers,
        maxMembers,
        isFull: currentMembers >= maxMembers,
        isNearFull: currentMembers >= (maxMembers * 0.95), // 95% del límite
        availableSpots: Math.max(0, maxMembers - currentMembers)
      };

    } catch (error) {
      console.error(`[WhatsAppGroup] Error verificando capacidad:`, error);
      throw error;
    }
  }

  /**
   * Obtener lista de grupos de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Array>} Lista de grupos
   */
  async getInstanceGroups(instanceName) {
    try {
      console.log(`[WhatsAppGroup] Obteniendo grupos de instancia ${instanceName}`);

      const response = await evolutionService.makeRequest(
        'GET',
        `/group/fetchAllGroups/${instanceName}`
      );

      if (response.success && Array.isArray(response.groups)) {
        return response.groups.map(group => ({
          id: group.id,
          name: group.subject,
          description: group.description,
          participantsCount: group.participants?.length || 0,
          isAdmin: group.participants?.some(p => p.admin && p.id === group.owner),
          metadata: group
        }));
      }

      return [];

    } catch (error) {
      console.error(`[WhatsAppGroup] Error obteniendo grupos:`, error);
      return [];
    }
  }

  /**
   * Logging de eventos de grupos
   * @param {string} campaignId - ID de la campaña
   * @param {string} groupId - ID del grupo (opcional)
   * @param {string} eventType - Tipo de evento
   * @param {string} description - Descripción del evento
   * @param {Object} metadata - Datos adicionales
   */
  async logGroupEvent(campaignId, groupId, eventType, description, metadata = {}) {
    try {
      await database.query(
        `INSERT INTO whatsapp_bot.whatsapp_campaign_logs 
         (campaign_id, group_id, event_type, description, metadata) 
         VALUES ($1, $2, $3, $4, $5)`,
        [campaignId, groupId, eventType, description, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error(`[WhatsAppGroup] Error logging evento:`, error);
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Agregar un participante a un grupo
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} groupId - ID del grupo
   * @param {string} phone - Número de teléfono del participante (sin @s.whatsapp.net)
   * @returns {Promise<Object>} Resultado de la operación
   */
  async addParticipant(instanceName, groupId, phone) {
    try {
      console.log(`[WhatsAppGroup] Agregando participante ${phone} al grupo ${groupId}`);

      // Formatear el número de teléfono (asegurar que no tenga + al inicio)
      const formattedPhone = phone.replace(/^\+/, '');

      // Usar la URL real de Evolution API con API key
      const axios = require('axios');
      const response = await axios.post(`https://evolution-api-jz3j.onrender.com/group/updateGParticipant/${instanceName}`, {
        groupJid: groupId,
        action: 'add',
        participants: [formattedPhone]
      }, {
        headers: {
          'apikey': 'F2BC57EB8FBCB89D7BD411D5FA9F5451',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`[WhatsAppGroup] Participante agregado exitosamente:`, response.data);
      
      return {
        success: true,
        participant: formattedPhone,
        response: response.data
      };

    } catch (error) {
      console.error(`[WhatsAppGroup] Error agregando participante:`, error);
      
      // Si es un error específico de WhatsApp, proporcionamos más contexto
      const evolutionError = evolutionService.handleApiError(error);
      throw evolutionError;
    }
  }
}

module.exports = new WhatsAppGroupService(); 