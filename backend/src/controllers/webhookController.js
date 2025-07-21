const webhookService = require('../services/webhookService');
const pool = require('../database');

class WebhookController {

  /**
   * Configurar webhook de n8n para una instancia específica
   * POST /api/webhooks/configure/:instanceId
   */
  async configureInstanceWebhook(req, res) {
    try {
      const { instanceId } = req.params;
      const { n8nWebhookPath } = req.body; // ej: "webhook/whatsapp-instance1"
      const companyId = req.user.companyId;

      console.log(`[WebhookController] Configuring webhook for instance: ${instanceId}`);

      // Verificar que la instancia pertenece a la empresa
      const instanceQuery = await pool.query(`
        SELECT evolution_instance_name, instance_name, status
        FROM whatsapp_bot.whatsapp_instances 
        WHERE id = $1 AND company_id = $2
      `, [instanceId, companyId]);

      if (instanceQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceQuery.rows[0];
      
      if (instance.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'La instancia debe estar conectada para configurar webhook'
        });
      }

      // Configurar webhook usando el servicio
      const result = await webhookService.configureInstanceWebhook(
        instance.evolution_instance_name,
        n8nWebhookPath
      );

      // Actualizar la BD con la info del webhook configurado
      await pool.query(`
        UPDATE whatsapp_bot.whatsapp_instances 
        SET webhook_url = $2, updated_at = NOW()
        WHERE id = $1
      `, [instanceId, result.webhookUrl]);

      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        data: {
          instanceName: instance.instance_name,
          webhookUrl: result.webhookUrl,
          n8nPath: n8nWebhookPath
        }
      });

    } catch (error) {
      console.error('[WebhookController] Error configuring webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error al configurar webhook',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar webhooks de todas las instancias activas
   * POST /api/webhooks/sync-all
   */
  async syncAllWebhooks(req, res) {
    try {
      const companyId = req.user.companyId;

      console.log(`[WebhookController] Syncing all webhooks for company: ${companyId}`);

      const results = await webhookService.syncAllInstanceWebhooks(companyId);

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      res.json({
        success: true,
        message: `Sincronización completada: ${successCount}/${totalCount} webhooks configurados`,
        data: {
          totalInstances: totalCount,
          successfullyConfigured: successCount,
          results: results
        }
      });

    } catch (error) {
      console.error('[WebhookController] Error syncing webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar webhooks',
        error: error.message
      });
    }
  }

  /**
   * Obtener estado del webhook de una instancia
   * GET /api/webhooks/status/:instanceId
   */
  async getWebhookStatus(req, res) {
    try {
      const { instanceId } = req.params;
      const companyId = req.user.companyId;

      // Obtener info de la instancia
      const instanceQuery = await pool.query(`
        SELECT evolution_instance_name, instance_name, webhook_url, status
        FROM whatsapp_bot.whatsapp_instances 
        WHERE id = $1 AND company_id = $2
      `, [instanceId, companyId]);

      if (instanceQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceQuery.rows[0];

      // Obtener estado actual del webhook desde Evolution API
      const webhookInfo = await webhookService.getInstanceWebhookInfo(instance.evolution_instance_name);

      // Generar recomendaciones de configuración
      const setupInstructions = webhookService.getN8NSetupInstructions(instance.evolution_instance_name);

      res.json({
        success: true,
        data: {
          instanceName: instance.instance_name,
          evolutionInstanceName: instance.evolution_instance_name,
          currentWebhook: {
            configured: webhookInfo.isConfigured,
            url: webhookInfo.currentWebhook,
            inDatabase: instance.webhook_url
          },
          recommended: {
            n8nPath: setupInstructions.instructions.step2.description,
            fullUrl: setupInstructions.urls.webhookUrl
          },
          setupInstructions: setupInstructions,
          canConfigure: instance.status === 'connected'
        }
      });

    } catch (error) {
      console.error('[WebhookController] Error getting webhook status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado del webhook',
        error: error.message
      });
    }
  }

  /**
   * Generar instrucciones de configuración para n8n
   * GET /api/webhooks/setup-instructions/:instanceId
   */
  async getSetupInstructions(req, res) {
    try {
      const { instanceId } = req.params;
      const companyId = req.user.companyId;

      const instanceQuery = await pool.query(`
        SELECT evolution_instance_name, instance_name
        FROM whatsapp_bot.whatsapp_instances 
        WHERE id = $1 AND company_id = $2
      `, [instanceId, companyId]);

      if (instanceQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceQuery.rows[0];
      const instructions = webhookService.getN8NSetupInstructions(instance.evolution_instance_name);

      res.json({
        success: true,
        data: {
          instanceName: instance.instance_name,
          ...instructions
        }
      });

    } catch (error) {
      console.error('[WebhookController] Error generating instructions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar instrucciones',
        error: error.message
      });
    }
  }
}

module.exports = new WebhookController(); 