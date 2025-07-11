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
   * Crear una nueva instancia en Evolution API
   * @param {string} instanceName - Nombre único de la instancia
   * @param {string} webhookUrl - URL del webhook para recibir eventos
   * @returns {Promise<Object>} Datos de la instancia creada
   */
  async createInstance(instanceName, webhookUrl = null) {
    try {
      const payload = {
        instanceName: instanceName,
        integration: 'WHATSAPP-BAILEYS',
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

      const response = await this.client.post('/instance/create', payload);
      
      return {
        instanceName: response.data.instance.instanceName,
        status: response.data.instance.status || 'created',
        qrCode: response.data.qrcode || null,
        hash: response.data.hash || null,
        webhook: response.data.instance.webhook || null
      };
    } catch (error) {
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
}

module.exports = new EvolutionService();
