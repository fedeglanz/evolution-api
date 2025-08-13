const database = require('../database');
const scheduledMessageController = require('../controllers/scheduledMessageController');
const massMessagingController = require('../controllers/massMessagingController');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Iniciar el scheduler automático
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler ya está ejecutándose');
      return;
    }

    console.log('🕐 Iniciando scheduler automático de mensajes programados...');
    this.isRunning = true;

    // Ejecutar inmediatamente una vez
    this.processMessages();

    // Configurar ejecución cada minuto (60 segundos)
    this.intervalId = setInterval(() => {
      this.processMessages();
    }, 60 * 1000); // 60 segundos

    console.log('✅ Scheduler iniciado - procesará mensajes cada 60 segundos');
  }

  /**
   * Detener el scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Deteniendo scheduler de mensajes programados...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('✅ Scheduler detenido');
  }

  /**
   * Procesar mensajes programados (legacy + mass messaging)
   */
  async processMessages() {
    try {
      console.log(`[${new Date().toISOString()}] 🔄 Procesando mensajes programados...`);

      // Procesar mensajes individuales (legacy)
      await this.processLegacyMessages();
      
      // Procesar mensajes masivos (nuevo sistema)
      await this.processMassMessages();

    } catch (error) {
      console.error('❌ Error en scheduler de mensajes programados:', error);
    }
  }

  /**
   * Procesar mensajes individuales programados (sistema legacy)
   */
  async processLegacyMessages() {
    try {
      // Crear objetos req y res simulados para usar el controlador existente
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          if (data.success) {
            console.log(`✅ Mensajes individuales procesados - Enviados: ${data.results?.sent || 0}, Fallidos: ${data.results?.failed || 0}`);
          } else {
            console.error('❌ Error procesando mensajes individuales:', data.message);
          }
          return data;
        },
        status: (code) => ({
          json: (data) => {
            console.error(`❌ Error ${code} procesando mensajes individuales:`, data.message);
            return data;
          }
        })
      };

      // Llamar al método del controlador legacy
      await scheduledMessageController.processScheduledMessages(mockReq, mockRes);

    } catch (error) {
      console.error('❌ Error procesando mensajes individuales:', error);
    }
  }

  /**
   * Procesar mensajes masivos programados (nuevo sistema)
   */
  async processMassMessages() {
    try {
      console.log(`[MassMessage] 🔍 Buscando mensajes masivos programados...`);

      // Buscar mensajes masivos que deben enviarse ahora
      const query = `
        SELECT *
        FROM whatsapp_bot.mass_messages 
        WHERE status = 'scheduled' 
        AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT 10
      `;

      const result = await database.query(query);
      const pendingMessages = result.rows;

      console.log(`[MassMessage] 📋 Encontrados ${pendingMessages.length} mensajes masivos para procesar`);

      if (pendingMessages.length === 0) {
        return;
      }

      // Usar la instancia del controller (ya es una instancia, no una clase)
      const controller = massMessagingController;

      // Procesar cada mensaje masivo
      for (const message of pendingMessages) {
        try {
          console.log(`[MassMessage] ⚡ Procesando mensaje masivo: "${message.title}" (ID: ${message.id})`);

          // Actualizar estado a 'processing'
          await database.query(`
            UPDATE whatsapp_bot.mass_messages 
            SET status = 'processing', started_at = NOW()
            WHERE id = $1
          `, [message.id]);

          // Procesar el mensaje usando el método existente
          await controller.processMassMessage(message);

          console.log(`[MassMessage] ✅ Mensaje masivo procesado: "${message.title}"`);

        } catch (error) {
          console.error(`[MassMessage] ❌ Error procesando mensaje masivo "${message.title}":`, error);
          
          // Marcar como fallido
          await database.query(`
            UPDATE whatsapp_bot.mass_messages 
            SET status = 'failed', completed_at = NOW(), error_message = $2
            WHERE id = $1
          `, [message.id, error.message]);
        }
      }

    } catch (error) {
      console.error('❌ Error procesando mensajes masivos:', error);
    }
  }

  /**
   * Obtener estado del scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
      nextRun: this.isRunning ? new Date(Date.now() + 60000).toISOString() : null
    };
  }
}

// Crear instancia única (singleton)
const schedulerService = new SchedulerService();

module.exports = schedulerService; 