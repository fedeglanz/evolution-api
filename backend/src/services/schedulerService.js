const database = require('../database');
const scheduledMessageController = require('../controllers/scheduledMessageController');

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
   * Procesar mensajes programados usando el controlador existente
   */
  async processMessages() {
    try {
      console.log(`[${new Date().toISOString()}] 🔄 Procesando mensajes programados...`);

      // Crear objetos req y res simulados para usar el controlador existente
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          if (data.success) {
            console.log(`✅ Mensajes procesados - Enviados: ${data.results?.sent || 0}, Fallidos: ${data.results?.failed || 0}`);
          } else {
            console.error('❌ Error procesando mensajes:', data.message);
          }
          return data;
        },
        status: (code) => ({
          json: (data) => {
            console.error(`❌ Error ${code} procesando mensajes:`, data.message);
            return data;
          }
        })
      };

      // Llamar al método del controlador
      await scheduledMessageController.processScheduledMessages(mockReq, mockRes);

    } catch (error) {
      console.error('❌ Error en scheduler de mensajes programados:', error);
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