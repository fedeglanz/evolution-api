const axios = require('axios');
const config = require('../config');

class EvolutionService {
  constructor() {
    this.baseURL = config.EVOLUTION_API_URL;
    this.apiKey = config.EVOLUTION_API_KEY;
    
    // Configurar cliente axios
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      }
    });

    // Interceptor para logging de requests
    this.client.interceptors.request.use(
      (request) => {
        console.log(`[Evolution API] ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      },
      (error) => {
        console.error('[Evolution API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para manejo de respuestas
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Evolution API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Evolution API] Response error:', error.response?.data || error.message);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Maneja errores de la API y los convierte en errores más descriptivos
   */
  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Solicitud inválida: ${data.message || 'Datos incorrectos'}`);
        case 401:
          return new Error('API Key inválida o no autorizada');
        case 404:
          return new Error('Instancia no encontrada en Evolution API');
        case 409:
          return new Error('La instancia ya existe o conflicto en el estado');
        case 429:
          return new Error('Límite de rate limiting alcanzado en Evolution API');
        case 500:
          return new Error('Error interno en Evolution API');
        default:
          return new Error(`Error en Evolution API (${status}): ${data.message || error.message}`);
      }
    } else if (error.request) {
      return new Error('No se pudo conectar con Evolution API - Verificar conectividad');
    } else {
      return new Error(`Error inesperado: ${error.message}`);
    }
  }

  /**
   * Crear nueva instancia de WhatsApp
   * @param {string} instanceName - Nombre único de la instancia
   * @param {string|null} webhookUrl - URL del webhook (opcional)
   * @param {string|null} phoneNumber - Número de teléfono (opcional, para pairing code)
   * @returns {Promise<Object>} Datos de la instancia creada
   */
  async createInstance(instanceName, webhookUrl = null, phoneNumber = null) {
    try {
      // Limpiar número de teléfono (quitar + si está presente)
      let cleanedPhoneNumber = null;
      if (phoneNumber) {
        cleanedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
        console.log(`[Evolution API] Phone number cleaned: ${phoneNumber} → ${cleanedPhoneNumber}`);
      }

      const payload = {
        instanceName: instanceName,
        token: this.apiKey, // Evolution API necesita el token en el body
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true, // Siempre habilitar QR code
        ...(cleanedPhoneNumber && { number: cleanedPhoneNumber }), // Número sin +
        ...(webhookUrl && {
          webhook: {
            url: webhookUrl,
            events: [
              'APPLICATION_STARTUP',
              'QRCODE_UPDATED',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
              'CONTACTS_SET',
              'CONTACTS_UPSERT',
              'CONTACTS_UPDATE',
              'PRESENCE_UPDATE',
              'CHATS_SET',
              'CHATS_UPSERT',
              'CHATS_UPDATE',
              'CHATS_DELETE',
              'CONNECTION_UPDATE'
            ]
          }
        })
      };

      console.log(`[Evolution API] Creating instance with payload:`, {
        instanceName,
        hasWebhook: !!webhookUrl,
        hasPhoneNumber: !!phoneNumber,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}...${phoneNumber.substring(-4)}` : null,
        cleanedPhoneNumber: cleanedPhoneNumber ? `${cleanedPhoneNumber.substring(0, 4)}...` : null,
        payloadKeys: Object.keys(payload)
      });

      const response = await this.client.post('/instance/create', payload);
      
      console.log(`[Evolution API] Create response status:`, response.status);
      console.log(`[Evolution API] Create response data:`, JSON.stringify(response.data, null, 2));
      
      // Extraer datos correctamente según la estructura real de Evolution API
      const qrCodeData = response.data.qrcode || {};
      
      return {
        instanceName: response.data.instance?.instanceName || instanceName,
        status: response.data.instance?.status || 'created',
        qrCode: qrCodeData.base64 || null,
        pairingCode: qrCodeData.pairingCode || null, // Aquí está el pairing code
        hash: response.data.hash || null,
        webhook: response.data.instance?.webhook || null,
        // Pasar toda la respuesta para debugging
        _rawResponse: response.data
      };
    } catch (error) {
      console.error(`[Evolution API] Error creating instance:`, {
        instanceName,
        phoneNumber,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Error al crear instancia: ${error.message}`);
    }
  }

  /**
   * Obtener información de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Información de la instancia
   */
  async getInstance(instanceName) {
    try {
      const response = await this.client.get(`/instance/fetchInstances?instanceName=${instanceName}`);
      
      if (response.data && response.data.length > 0) {
        const instance = response.data[0];
        return {
          instanceName: instance.instanceName,
          status: instance.status,
          profileName: instance.profileName || null,
          profilePicture: instance.profilePicture || null,
          phone: instance.phone || null,
          webhook: instance.webhook || null
        };
      }
      
      throw new Error('Instancia no encontrada');
    } catch (error) {
      throw new Error(`Error al obtener instancia: ${error.message}`);
    }
  }

  /**
   * Obtener el código QR de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Código QR en base64
   */
  async getQRCode(instanceName) {
    try {
      const response = await this.client.get(`/instance/connect/${instanceName}`);
      
      return {
        qrCode: response.data.qrcode || response.data.base64 || null,
        status: response.data.status || 'connecting'
      };
    } catch (error) {
      throw new Error(`Error al obtener QR code: ${error.message}`);
    }
  }

  /**
   * Obtener códigos de conexión (QR y pairing code)
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} QR code y pairing code
   */
  async getConnectionCodes(instanceName) {
    try {
      console.log(`[Evolution API] Getting connection codes for instance: ${instanceName}`);
      
      // Obtener QR code y datos de conexión
      const qrResponse = await this.client.get(`/instance/connect/${instanceName}`);
      
      console.log(`[Evolution API] QR Response status:`, qrResponse.status);
      console.log(`[Evolution API] QR Response data:`, JSON.stringify(qrResponse.data, null, 2));
      
      // Extraer datos según la estructura real de Evolution API
      const qrCodeData = qrResponse.data.qrcode || qrResponse.data || {};
      
      const result = {
        qrCode: qrCodeData.base64 || qrCodeData.qrcode || null,
        pairingCode: qrCodeData.pairingCode || null,
        status: qrResponse.data.status || 'connecting',
        message: 'Códigos de conexión obtenidos',
        _qrRawResponse: qrResponse.data
      };
      
      console.log(`[Evolution API] Final connection codes result:`, {
        hasQR: !!result.qrCode,
        hasPairingCode: !!result.pairingCode,
        status: result.status,
        pairingCode: result.pairingCode ? `${result.pairingCode.substring(0, 4)}...` : null
      });
      
      return result;
    } catch (error) {
      console.error(`[Evolution API] Error getting connection codes:`, {
        instanceName,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Error al obtener códigos de conexión: ${error.message}`);
    }
  }

  /**
   * Obtener solo el pairing code
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Pairing code alfanumérico
   */
  async getPairingCode(instanceName) {
    try {
      const response = await this.client.post(`/instance/code/${instanceName}`, {});
      
      return {
        pairingCode: response.data.code || response.data.pairingCode || null,
        status: response.data.status || 'connecting',
        expiresIn: response.data.expiresIn || 120 // segundos
      };
    } catch (error) {
      throw new Error(`Error al obtener pairing code: ${error.message}`);
    }
  }

  /**
   * Conectar/reconectar una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Estado de la conexión
   */
  async connectInstance(instanceName) {
    try {
      const response = await this.client.get(`/instance/connect/${instanceName}`);
      
      return {
        status: response.data.status || 'connecting',
        qrCode: response.data.qrcode || response.data.base64 || null,
        message: response.data.message || 'Iniciando conexión'
      };
    } catch (error) {
      throw new Error(`Error al conectar instancia: ${error.message}`);
    }
  }

  /**
   * Obtener el estado de conexión de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Estado actual de la instancia
   */
  async getConnectionStatus(instanceName) {
    try {
      // Obtener estado de conexión
      const stateResponse = await this.client.get(`/instance/connectionState/${instanceName}`);
      const state = stateResponse.data.instance?.state || 'unknown';
      
      // Si está conectada, obtener información adicional
      let phone = null;
      let profileName = null;
      
      if (state === 'open') {
        try {
          const instanceInfo = await this.client.get(`/instance/fetchInstances?instanceName=${instanceName}`);
          if (instanceInfo.data && instanceInfo.data.length > 0) {
            const instance = instanceInfo.data[0];
            phone = instance.ownerJid ? instance.ownerJid.replace('@s.whatsapp.net', '') : null;
            profileName = instance.profileName || null;
          }
        } catch (infoError) {
          console.warn('No se pudo obtener información adicional de la instancia:', infoError.message);
        }
      }
      
      return {
        instanceName: instanceName,
        status: state,
        connected: state === 'open',
        phone: phone,
        profileName: profileName
      };
    } catch (error) {
      throw new Error(`Error al obtener estado: ${error.message}`);
    }
  }

  /**
   * Enviar mensaje de texto
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} number - Número de teléfono (con código de país)
   * @param {string} text - Texto del mensaje
   * @returns {Promise<Object>} Información del mensaje enviado
   */
  async sendTextMessage(instanceName, number, text) {
    try {
      const payload = {
        number: number,
        text: text
      };

      const response = await this.client.post(`/message/sendText/${instanceName}`, payload);
      
      return {
        messageId: response.data.key?.id || null,
        status: response.data.status || 'sent',
        timestamp: response.data.timestamp || Date.now(),
        number: number,
        text: text
      };
    } catch (error) {
      throw new Error(`Error al enviar mensaje: ${error.message}`);
    }
  }

  /**
   * Eliminar una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteInstance(instanceName) {
    try {
      await this.client.delete(`/instance/delete/${instanceName}`);
      return true;
    } catch (error) {
      // Si la instancia no existe, consideramos que está "eliminada"
      if (error.message.includes('no encontrada') || error.message.includes('404')) {
        return true;
      }
      throw new Error(`Error al eliminar instancia: ${error.message}`);
    }
  }

  /**
   * Desconectar una instancia (logout)
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<boolean>} True si se desconectó correctamente
   */
  async logoutInstance(instanceName) {
    try {
      await this.client.delete(`/instance/logout/${instanceName}`);
      return true;
    } catch (error) {
      throw new Error(`Error al desconectar instancia: ${error.message}`);
    }
  }

  /**
   * Reiniciar una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Estado después del reinicio
   */
  async restartInstance(instanceName) {
    try {
      const response = await this.client.put(`/instance/restart/${instanceName}`);
      
      return {
        status: response.data.status || 'restarting',
        message: response.data.message || 'Instancia reiniciada'
      };
    } catch (error) {
      throw new Error(`Error al reiniciar instancia: ${error.message}`);
    }
  }

  /**
   * Verificar que la API esté disponible
   * @returns {Promise<boolean>} True si la API responde
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      console.error('Evolution API no disponible:', error.message);
      return false;
    }
  }

  /**
   * Obtener todas las instancias
   * @returns {Promise<Array>} Lista de todas las instancias
   */
  async getAllInstances() {
    try {
      const response = await this.client.get('/instance/fetchInstances');
      
      return response.data.map(instance => ({
        instanceName: instance.instanceName,
        status: instance.status,
        profileName: instance.profileName || null,
        phone: instance.phone || null,
        webhook: instance.webhook || null
      }));
    } catch (error) {
      throw new Error(`Error al obtener instancias: ${error.message}`);
    }
  }

  /**
   * Obtener el estado actual de una instancia desde Evolution API
   * @param {string} instanceName - Nombre de la instancia en Evolution API
   * @returns {Promise<Object>} Estado actual de la instancia
   */
  async getInstanceState(instanceName) {
    try {
      console.log(`[Evolution API] Getting instance state for: ${instanceName}`);
      
      const response = await this.client.get(`/instance/fetchInstances?instanceName=${instanceName}`);
      
      console.log(`[Evolution API] Instance state response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.length > 0) {
        const instance = response.data[0];
        
        // CORRECCIÓN: Leer connectionStatus en lugar de status
        const connectionStatus = instance.connectionStatus || instance.status || 'unknown';
        
        return {
          instanceName: instance.instanceName,
          status: connectionStatus,
          profileName: instance.profileName || null,
          profilePictureUrl: instance.profilePicUrl || null,
          phone: instance.number || null,
          isConnected: connectionStatus === 'open' || connectionStatus === 'connected',
          lastSeen: instance.lastSeen || null,
          _rawData: instance
        };
      } else {
        console.warn(`[Evolution API] No data found for instance: ${instanceName}`);
        return {
          instanceName,
          status: 'not_found',
          isConnected: false,
          _rawData: null
        };
      }
    } catch (error) {
      console.error(`[Evolution API] Error getting instance state:`, {
        instanceName,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });
      
      return {
        instanceName,
        status: 'error',
        isConnected: false,
        error: error.message,
        _rawData: null
      };
    }
  }

  /**
   * Actualizar webhook de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @param {string} webhookUrl - URL del webhook
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateInstanceWebhook(instanceName, webhookUrl) {
    try {
      console.log(`[Evolution API] Updating webhook for instance: ${instanceName}`);
      console.log(`[Evolution API] New webhook URL: ${webhookUrl}`);

      const response = await this.client.put(`/webhook/set/${instanceName}`, {
        webhook: webhookUrl,
        webhook_by_events: false,
        events: [
          "APPLICATION_STARTUP",
          "QRCODE_UPDATED", 
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE"
        ]
      });

      console.log(`[Evolution API] Webhook updated successfully for: ${instanceName}`);
      
      return {
        success: true,
        instanceName,
        webhookUrl,
        evolutionResponse: response.data
      };

    } catch (error) {
      console.error(`[Evolution API] Error updating webhook for ${instanceName}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to update webhook: ${error.message}`);
    }
  }

  /**
   * Obtener información detallada de una instancia
   * @param {string} instanceName - Nombre de la instancia
   * @returns {Promise<Object>} Información de la instancia
   */
  async getInstanceInfo(instanceName) {
    try {
      console.log(`[Evolution API] Getting info for instance: ${instanceName}`);

      const response = await this.client.get(`/instance/fetchInstances?instanceName=${instanceName}`);

      if (response.data && response.data.length > 0) {
        const instance = response.data[0];
        
        return {
          instanceName: instance.instanceName || instance.name,
          status: instance.connectionStatus || instance.status,
          profileName: instance.profileName,
          phone: instance.number,
          webhook_url: instance.webhook?.webhook_url || instance.webhook,
          webhook_events: instance.webhook?.events || [],
          created_at: instance.createdAt,
          updated_at: instance.updatedAt,
          _rawData: instance
        };
      } else {
        throw new Error(`Instance ${instanceName} not found`);
      }

    } catch (error) {
      console.error(`[Evolution API] Error getting instance info for ${instanceName}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to get instance info: ${error.message}`);
    }
  }
}

module.exports = new EvolutionService();
