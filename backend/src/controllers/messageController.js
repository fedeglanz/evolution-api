const pool = require('../database');
const axios = require('axios');
const config = require('../config');

class MessageController {
  
  /**
   * Enviar mensaje a través de Evolution API
   * POST /api/instances/:id/messages/send
   */
  async sendMessage(req, res) {
    try {
      const { id: instanceId } = req.params;
      const { to, message, type = 'text' } = req.body;
      const companyId = req.user.companyId;

      // Validar datos requeridos
      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'Número de destino y mensaje son requeridos'
        });
      }

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      const instance = instanceCheck.instance;

      // Verificar que la instancia esté conectada consultando Evolution API directamente
      try {
        const evolutionService = require('../services/evolutionService');
        const connectionStatus = await evolutionService.getConnectionStatus(instance.evolution_instance_name);
        
        if (!connectionStatus.connected) {
          return res.status(400).json({
            success: false,
            message: 'La instancia de WhatsApp no está conectada',
            details: `Estado actual: ${connectionStatus.status}`
          });
        }
      } catch (error) {
        console.warn('No se pudo verificar estado con Evolution API, usando estado de BD');
        // Fallback: usar estado de BD, aceptar tanto 'connected' como 'open'
        if (!['connected', 'open'].includes(instance.status)) {
          return res.status(400).json({
            success: false,
            message: 'La instancia de WhatsApp no está conectada'
          });
        }
      }

      // Preparar datos para Evolution API
      const messageData = {
        number: to,
        text: message
      };

      // Enviar mensaje a través de Evolution API
      const evolutionResponse = await this.sendMessageToEvolution(instance.evolution_instance_name, messageData);

      // Guardar mensaje en la base de datos
      const savedMessage = await this.saveMessage({
        companyId,
        instanceId,
        to,
        message,
        type,
        evolutionMessageId: evolutionResponse.key?.id,
        status: 'sent'
      });

      res.json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: {
          messageId: savedMessage.id,
          evolutionMessageId: evolutionResponse.key?.id,
          to: to,
          message: message,
          type: type,
          status: 'sent',
          timestamp: savedMessage.created_at
        }
      });

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error.message
      });
    }
  }

  /**
   * Obtener historial de mensajes
   * GET /api/instances/:id/messages
   */
  async getMessages(req, res) {
    try {
      const { id: instanceId } = req.params;
      const companyId = req.user.companyId;
      const { page = 1, limit = 50, contact } = req.query;

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      const offset = (page - 1) * limit;

      // Construir query con filtros opcionales
      let query = `
        SELECT 
          m.*,
          c.name as contact_name,
          c.phone as contact_phone
        FROM whatsapp_bot.messages m
        LEFT JOIN whatsapp_bot.contacts c ON m.contact_phone = c.phone AND m.company_id = c.company_id
        WHERE m.company_id = $1 AND m.instance_id = $2
      `;
      
      const queryParams = [companyId, instanceId];
      let paramIndex = 3;

      if (contact) {
        query += ` AND m.contact_phone = $${paramIndex++}`;
        queryParams.push(contact);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Obtener total de mensajes para paginación
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM whatsapp_bot.messages 
        WHERE company_id = $1 AND instance_id = $2
      `;
      const countParams = [companyId, instanceId];
      
      if (contact) {
        countQuery += ` AND contact_phone = $3`;
        countParams.push(contact);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          messages: result.rows.map(msg => ({
            id: msg.id,
            contactPhone: msg.contact_phone,
            contactName: msg.contact_name,
            message: msg.message,
            type: msg.type,
            direction: msg.direction,
            status: msg.status,
            evolutionMessageId: msg.evolution_message_id,
            createdAt: msg.created_at
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de mensajes',
        error: error.message
      });
    }
  }

  // Métodos auxiliares

  /**
   * Verificar que la instancia pertenece a la empresa del usuario
   */
  async verifyInstanceOwnership(companyId, instanceId) {
    try {
      const query = `
        SELECT id, instance_name, status, company_id, evolution_instance_name
        FROM whatsapp_bot.whatsapp_instances 
        WHERE id = $1 AND company_id = $2
      `;
      const result = await pool.query(query, [instanceId, companyId]);

      if (result.rows.length === 0) {
        return {
          valid: false,
          statusCode: 404,
          message: 'Instancia de WhatsApp no encontrada'
        };
      }

      const instance = result.rows[0];
      
      return {
        valid: true,
        instance: instance
      };
    } catch (error) {
      console.error('Error al verificar propiedad de la instancia:', error);
      return {
        valid: false,
        statusCode: 500,
        message: 'Error al verificar propiedad de la instancia'
      };
    }
  }

  /**
   * Enviar mensaje a través de Evolution API
   */
  async sendMessageToEvolution(evolutionInstanceName, messageData) {
    try {
      const evolutionUrl = `${config.EVOLUTION_API_URL}/message/sendText/${evolutionInstanceName}`;
      
      const response = await axios.post(evolutionUrl, messageData, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.EVOLUTION_API_KEY
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error al comunicarse con Evolution API:', error.response?.data || error.message);
      
      // Proporcionar mensajes de error más específicos
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData?.message && errorData.message.includes('not found')) {
          throw new Error(`El número ${messageData.number} no es válido o no está registrado en WhatsApp`);
        }
        throw new Error(`Error de validación: ${errorData?.message || 'Datos inválidos'}`);
      } else if (error.response?.status === 404) {
        throw new Error('Instancia no encontrada en Evolution API');
      } else if (error.response?.status === 500) {
        throw new Error('Error interno de Evolution API');
      }
      
      throw new Error(`Error al enviar mensaje: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Guardar mensaje en la base de datos
   */
  async saveMessage(data) {
    const query = `
      INSERT INTO whatsapp_bot.messages (
        company_id, instance_id, contact_phone, message, type, direction, 
        status, evolution_message_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.companyId,
      data.instanceId,
      data.to,
      data.message,
      data.type,
      'outbound',
      data.status,
      data.evolutionMessageId
    ]);

    return result.rows[0];
  }
}

const messageController = new MessageController();

module.exports = {
  sendMessage: messageController.sendMessage.bind(messageController),
  getMessages: messageController.getMessages.bind(messageController)
}; 