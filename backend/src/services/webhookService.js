const axios = require('axios');
const evolutionService = require('./evolutionService');

class WebhookService {
  constructor() {
    this.n8nBaseUrl = process.env.N8N_URL || 'https://n8n-automation-bhdl.onrender.com';
    this.n8nApiKey = process.env.N8N_API_KEY || null; // API key de n8n (si la tiene)
  }

  /**
   * Configurar webhook de n8n en Evolution API para una instancia
   * @param {string} instanceName - Nombre de instancia en Evolution API
   * @param {string} n8nWebhookPath - Path del webhook de n8n (ej: "webhook/whatsapp-v2")
   * @returns {Promise<Object>} Resultado de la configuración
   */
  async configureInstanceWebhook(instanceName, n8nWebhookPath) {
    try {
      console.log(`[Webhook] Configuring webhook for instance: ${instanceName}`);

      // Construir URL completa del webhook de n8n
      const webhookUrl = `${this.n8nBaseUrl}/${n8nWebhookPath.replace(/^\/+/, '')}`;
      
      console.log(`[Webhook] Setting webhook URL: ${webhookUrl}`);

      // Configurar webhook en Evolution API
      const result = await evolutionService.updateInstanceWebhook(instanceName, webhookUrl);

      console.log(`[Webhook] Successfully configured webhook for ${instanceName}`);

      return {
        success: true,
        instanceName,
        webhookUrl,
        evolutionResponse: result
      };

    } catch (error) {
      console.error(`[Webhook] Error configuring webhook for ${instanceName}:`, error.message);
      throw new Error(`Failed to configure webhook: ${error.message}`);
    }
  }

  /**
   * Obtener información del webhook configurado en una instancia
   * @param {string} instanceName - Nombre de instancia en Evolution API
   * @returns {Promise<Object>} Información del webhook actual
   */
  async getInstanceWebhookInfo(instanceName) {
    try {
      const instanceInfo = await evolutionService.getInstanceInfo(instanceName);
      
      return {
        success: true,
        instanceName,
        currentWebhook: instanceInfo.webhook_url || null,
        isConfigured: !!instanceInfo.webhook_url,
        expectedN8NUrl: `${this.n8nBaseUrl}/webhook/whatsapp-${instanceName}`
      };

    } catch (error) {
      console.error(`[Webhook] Error getting webhook info for ${instanceName}:`, error.message);
      return {
        success: false,
        instanceName,
        error: error.message
      };
    }
  }

  /**
   * Generar URL de webhook recomendada para n8n
   * @param {string} instanceName - Nombre de instancia
   * @returns {string} Path recomendado para el webhook
   */
  generateWebhookPath(instanceName) {
    // Crear un path único por instancia para mejor organización
    const cleanInstanceName = instanceName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    
    return `webhook/whatsapp-${cleanInstanceName}`;
  }

  /**
   * Sincronizar todos los webhooks de instancias activas
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Array>} Resultados de sincronización
   */
  async syncAllInstanceWebhooks(companyId) {
    try {
      const pool = require('../database');
      
      // Obtener todas las instancias activas de la empresa
      const instancesQuery = await pool.query(`
        SELECT 
          wi.evolution_instance_name,
          wi.instance_name,
          bc.auto_response
        FROM whatsapp_bot.whatsapp_instances wi
        LEFT JOIN whatsapp_bot.bot_configs bc ON bc.instance_id = wi.id
        WHERE wi.company_id = $1 AND wi.status = 'connected'
      `, [companyId]);

      const results = [];

      for (const instance of instancesQuery.rows) {
        try {
          // Solo configurar webhook si auto_response está habilitado
          if (!instance.auto_response) {
            results.push({
              instanceName: instance.instance_name,
              evolutionInstanceName: instance.evolution_instance_name,
              skipped: true,
              reason: 'auto_response disabled'
            });
            continue;
          }

          const webhookPath = this.generateWebhookPath(instance.evolution_instance_name);
          const result = await this.configureInstanceWebhook(
            instance.evolution_instance_name, 
            webhookPath
          );

          results.push({
            instanceName: instance.instance_name,
            evolutionInstanceName: instance.evolution_instance_name,
            ...result,
            recommendedPath: webhookPath
          });

        } catch (error) {
          results.push({
            instanceName: instance.instance_name,
            evolutionInstanceName: instance.evolution_instance_name,
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('[Webhook] Error syncing all webhooks:', error.message);
      throw error;
    }
  }

  /**
   * Crear instrucciones para configurar n8n workflow
   * @param {string} instanceName - Nombre de instancia
   * @returns {Object} Instrucciones detalladas
   */
  getN8NSetupInstructions(instanceName) {
    const webhookPath = this.generateWebhookPath(instanceName);
    const fullWebhookUrl = `${this.n8nBaseUrl}/${webhookPath}`;

    return {
      instanceName,
      instructions: {
        step1: {
          title: "Importar el workflow en n8n",
          description: "Importa el archivo 'WhatsApp AI Bot v2 - Backend Integration.json'"
        },
        step2: {
          title: "Configurar webhook path",
          description: `Cambiar el path del webhook a: "${webhookPath}"`,
          note: "Esto se hace en el nodo 'Webhook WhatsApp' → Settings → Path"
        },
        step3: {
          title: "Configurar credenciales Backend API",
          description: "Crear credencial 'HTTP Header Auth'",
          details: {
            name: "Backend API Auth",
            headerName: "Authorization", 
            headerValue: "Bearer [API_KEY_FROM_/api/bot/n8n-config]"
          }
        },
        step4: {
          title: "Activar el workflow",
          description: "Activar el workflow en n8n"
        },
        step5: {
          title: "Configurar en Evolution API",
          description: `El webhook será: ${fullWebhookUrl}`,
          note: "Esto se puede hacer automáticamente desde nuestro backend"
        }
      },
      urls: {
        n8nDashboard: this.n8nBaseUrl,
        webhookUrl: fullWebhookUrl,
        backendConfig: `${process.env.BACKEND_URL || 'https://whatsapp-bot-backend-fnte.onrender.com'}/api/bot/n8n-config`
      }
    };
  }
}

module.exports = new WebhookService(); 