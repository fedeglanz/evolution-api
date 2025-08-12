const groupSyncService = require('../services/groupSyncService');

class GroupSyncController {
  /**
   * Obtener estado de la sincronización
   * GET /api/group-sync/status
   */
  async getStatus(req, res) {
    try {
      const status = groupSyncService.getStatus();
      
      res.json({
        success: true,
        data: {
          ...status,
          message: status.isRunning ? 
            `Sincronización activa (cada ${status.syncIntervalMinutes} minutos)` :
            'Sincronización detenida'
        }
      });

    } catch (error) {
      console.error('Error obteniendo estado de sincronización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Forzar sincronización manual
   * POST /api/group-sync/sync
   */
  async forcSync(req, res) {
    try {
      // Ejecutar sincronización en background
      groupSyncService.syncAllActiveGroups()
        .then(() => {
          console.log('[API] Sincronización manual completada');
        })
        .catch((error) => {
          console.error('[API] Error en sincronización manual:', error);
        });

      res.json({
        success: true,
        message: 'Sincronización iniciada en segundo plano',
        data: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error iniciando sincronización manual:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Iniciar sincronización automática
   * POST /api/group-sync/start
   */
  async start(req, res) {
    try {
      groupSyncService.start();

      res.json({
        success: true,
        message: 'Sincronización automática iniciada',
        data: groupSyncService.getStatus()
      });

    } catch (error) {
      console.error('Error iniciando sincronización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Detener sincronización automática
   * POST /api/group-sync/stop
   */
  async stop(req, res) {
    try {
      groupSyncService.stop();

      res.json({
        success: true,
        message: 'Sincronización automática detenida',
        data: groupSyncService.getStatus()
      });

    } catch (error) {
      console.error('Error deteniendo sincronización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

// Bind methods to preserve context
const groupSyncController = new GroupSyncController();
Object.getOwnPropertyNames(GroupSyncController.prototype)
  .filter(method => method !== 'constructor')
  .forEach(method => {
    groupSyncController[method] = groupSyncController[method].bind(groupSyncController);
  });

module.exports = groupSyncController; 