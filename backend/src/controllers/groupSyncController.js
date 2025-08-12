const groupSyncService = require('../services/groupSyncService');
const autoGroupService = require('../services/autoGroupService');
const database = require('../database'); // Added missing import

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

  /**
   * Configurar límites para testing
   * POST /api/group-sync/configure-testing
   */
  async configureTesting(req, res) {
    try {
      const { maxMembers, minSize } = req.body;

      if (!maxMembers || maxMembers < 3) {
        return res.status(400).json({
          success: false,
          message: 'maxMembers debe ser al menos 3'
        });
      }

      // Configurar límites de testing
      autoGroupService.setTestingLimits(maxMembers, minSize);

      res.json({
        success: true,
        message: `Límites de testing configurados: máximo ${maxMembers} miembros por grupo`,
        data: {
          maxMembers,
          minSize: Math.max(minSize || 5, 5),
          warning: 'Esta configuración es para testing. En producción usar límites normales.'
        }
      });

    } catch (error) {
      console.error('Error configurando límites de testing:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Forzar creación de grupos automática
   * POST /api/group-sync/force-auto-create
   */
  async forceAutoCreate(req, res) {
    try {
      // Ejecutar auto-creación en background
      autoGroupService.checkAndCreateNewGroups()
        .then(() => {
          console.log('[API] Auto-creación manual completada');
        })
        .catch((error) => {
          console.error('[API] Error en auto-creación manual:', error);
        });

      res.json({
        success: true,
        message: 'Verificación de auto-creación iniciada en segundo plano',
        data: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error iniciando auto-creación manual:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de auto-creación
   * GET /api/group-sync/auto-stats
   */
  async getAutoStats(req, res) {
    try {
      const stats = await autoGroupService.getAutoCreationStats();

      res.json({
        success: true,
        data: stats || {
          totalAutoCreated: 0,
          campaignsWithAutoCreation: 0,
          dailyStats: []
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de auto-creación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Sync inmediato de una campaña específica
   * POST /api/group-sync/campaign/:campaignId
   */
  async syncCampaignNow(req, res) {
    try {
      const { campaignId } = req.params;
      const companyId = req.user.companyId;

      // Verificar que la campaña pertenece a la empresa
      const campaignCheck = await database.query(`
        SELECT id FROM whatsapp_bot.whatsapp_campaigns 
        WHERE id = $1 AND company_id = $2
      `, [campaignId, companyId]);

      if (campaignCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada'
        });
      }

      const result = await groupSyncService.syncCampaignNow(campaignId);

      res.json({
        success: true,
        message: 'Sincronización inmediata completada',
        data: result
      });

    } catch (error) {
      console.error('Error en sync inmediato:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Configurar modo campaña activa
   * POST /api/group-sync/active-mode/:campaignId
   */
  async setActiveCampaignMode(req, res) {
    try {
      const { campaignId } = req.params;
      const { isActive } = req.body;
      const companyId = req.user.companyId;

      // Verificar que la campaña pertenece a la empresa
      const campaignCheck = await database.query(`
        SELECT id FROM whatsapp_bot.whatsapp_campaigns 
        WHERE id = $1 AND company_id = $2
      `, [campaignId, companyId]);

      if (campaignCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Campaña no encontrada'
        });
      }

      groupSyncService.setActiveCampaignMode(campaignId, isActive);

      res.json({
        success: true,
        message: `Modo ${isActive ? 'campaña activa' : 'normal'} configurado`,
        data: {
          campaignId,
          isActive,
          syncInterval: groupSyncService.getCampaignInterval(campaignId)
        }
      });

    } catch (error) {
      console.error('Error configurando modo activo:', error);
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