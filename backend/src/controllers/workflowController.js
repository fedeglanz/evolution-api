const { pool } = require('../database');
const config = require('../config');

class WorkflowController {

  /**
   * Generar workflow básico para una instancia
   * POST /api/workflows/generate-basic
   */
  async generateBasicWorkflow(req, res) {
    try {
      const companyId = req.user.companyId;
      const { instance_id } = req.body;

      // Verificar que la instancia pertenece a la empresa
      const instanceQuery = await pool.query(`
        SELECT 
          wi.*,
          c.plan,
          c.name as company_name
        FROM whatsapp_bot.whatsapp_instances wi
        JOIN whatsapp_bot.companies c ON wi.company_id = c.id
        WHERE wi.id = $1 AND wi.company_id = $2
      `, [instance_id, companyId]);

      if (instanceQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada o no tienes acceso a ella'
        });
      }

      const instance = instanceQuery.rows[0];
      
      // Generar workflow básico
      const workflowTemplate = this.createBasicWorkflowTemplate(instance);

      // TODO: En el futuro, aquí se crearía el workflow en N8N automáticamente
      // const n8nResponse = await this.createWorkflowInN8N(workflowTemplate);

      // Guardar configuración del workflow en BD
      await pool.query(`
        INSERT INTO whatsapp_bot.workflows (
          instance_id, workflow_type, workflow_config, n8n_workflow_id,
          webhook_url, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (instance_id) 
        DO UPDATE SET 
          workflow_config = EXCLUDED.workflow_config,
          updated_at = NOW()
        RETURNING *
      `, [
        instance_id,
        'basic_bot',
        JSON.stringify(workflowTemplate),
        null, // Se llenará cuando integremos con N8N API
        this.generateWebhookUrl(instance.evolution_instance_name),
        true
      ]);

      res.json({
        success: true,
        message: 'Workflow básico generado exitosamente',
        data: {
          workflow: workflowTemplate,
          webhookUrl: this.generateWebhookUrl(instance.evolution_instance_name),
          instance: {
            id: instance.id,
            name: instance.instance_name,
            evolution_name: instance.evolution_instance_name
          }
        }
      });

    } catch (error) {
      console.error('Error generando workflow básico:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener workflows de una instancia
   * GET /api/workflows/instance/:instanceId
   */
  async getWorkflowsByInstance(req, res) {
    try {
      const companyId = req.user.companyId;
      const { instanceId } = req.params;

      // Verificar ownership
      const instanceCheck = await pool.query(`
        SELECT id FROM whatsapp_bot.whatsapp_instances 
        WHERE id = $1 AND company_id = $2
      `, [instanceId, companyId]);

      if (instanceCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada o no tienes acceso'
        });
      }

      // Obtener workflows
      const workflowsQuery = await pool.query(`
        SELECT * FROM whatsapp_bot.workflows 
        WHERE instance_id = $1
        ORDER BY created_at DESC
      `, [instanceId]);

      res.json({
        success: true,
        data: {
          workflows: workflowsQuery.rows,
          total: workflowsQuery.rows.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Activar/desactivar workflow
   * PUT /api/workflows/:id/toggle
   */
  async toggleWorkflow(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const { is_active } = req.body;

      // Verificar ownership del workflow
      const workflowQuery = await pool.query(`
        SELECT w.*, wi.company_id 
        FROM whatsapp_bot.workflows w
        JOIN whatsapp_bot.whatsapp_instances wi ON w.instance_id = wi.id
        WHERE w.id = $1
      `, [id]);

      if (workflowQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Workflow no encontrado'
        });
      }

      const workflow = workflowQuery.rows[0];

      if (workflow.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este workflow'
        });
      }

      // Actualizar estado
      await pool.query(`
        UPDATE whatsapp_bot.workflows 
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2
      `, [Boolean(is_active), id]);

      res.json({
        success: true,
        message: `Workflow ${is_active ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error) {
      console.error('Error cambiando estado del workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Crear plantilla de workflow básico
   */
  createBasicWorkflowTemplate(instance) {
    const baseUrl = process.env.BACKEND_URL || 'https://whatsapp-bot-backend-fnte.onrender.com';
    const webhookUrl = this.generateWebhookUrl(instance.evolution_instance_name);

    return {
      name: `WhatsApp Bot - ${instance.instance_name}`,
      active: true,
      nodes: [
        {
          id: 'webhook',
          name: 'Webhook Evolution API',
          type: 'n8n-nodes-base.webhook',
          position: [100, 200],
          parameters: {
            httpMethod: 'POST',
            path: webhookUrl.split('/webhook/')[1],
            responseMode: 'responseNode'
          }
        },
        {
          id: 'process_message',
          name: 'Procesar Mensaje',
          type: 'n8n-nodes-base.httpRequest',
          position: [300, 200],
          parameters: {
            url: `${baseUrl}/api/bot/process-message`,
            method: 'POST',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Content-Type',
                  value: 'application/json'
                },
                {
                  name: 'Authorization',
                  value: `Bearer ${process.env.N8N_API_KEY || 'n8n-whatsapp-bot-2024-secure-key-4e334562d4843d15908669c2b6e6a879'}`
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'instance',
                  value: '={{ $json.instanceName }}'
                },
                {
                  name: 'phone',
                  value: '={{ $json.data.key.remoteJid }}'
                },
                {
                  name: 'message',
                  value: '={{ $json.data.message.conversation || $json.data.message.extendedTextMessage?.text }}'
                },
                {
                  name: 'senderName',
                  value: '={{ $json.data.pushName }}'
                },
                {
                  name: 'messageType',
                  value: '={{ $json.data.messageType }}'
                },
                {
                  name: 'messageId',
                  value: '={{ $json.data.key.id }}'
                }
              ]
            }
          }
        },
        {
          id: 'check_response',
          name: 'Verificar Respuesta',
          type: 'n8n-nodes-base.if',
          position: [500, 200],
          parameters: {
            conditions: {
              boolean: [
                {
                  value1: '={{ $json.shouldRespond }}',
                  operation: 'equal',
                  value2: true
                }
              ]
            }
          }
        },
        {
          id: 'send_message',
          name: 'Enviar Respuesta',
          type: 'n8n-nodes-base.httpRequest',
          position: [700, 100],
          parameters: {
            url: `${process.env.EVOLUTION_API_URL}/message/sendText/${instance.evolution_instance_name}`,
            method: 'POST',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Content-Type',
                  value: 'application/json'
                },
                {
                  name: 'apikey',
                  value: process.env.EVOLUTION_API_KEY
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'number',
                  value: '={{ $node["Webhook Evolution API"].json["data"]["key"]["remoteJid"] }}'
                },
                {
                  name: 'text',
                  value: '={{ $node["Procesar Mensaje"].json["response"] }}'
                }
              ]
            }
          }
        },
        {
          id: 'log_interaction',
          name: 'Registrar Interacción',
          type: 'n8n-nodes-base.httpRequest',
          position: [900, 100],
          parameters: {
            url: `${baseUrl}/api/bot/log-interaction`,
            method: 'POST',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: 'Content-Type',
                  value: 'application/json'
                },
                {
                  name: 'Authorization',
                  value: `Bearer ${process.env.N8N_API_KEY || 'n8n-whatsapp-bot-2024-secure-key-4e334562d4843d15908669c2b6e6a879'}`
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'instance',
                  value: '={{ $node["Webhook Evolution API"].json["instanceName"] }}'
                },
                {
                  name: 'phone',
                  value: '={{ $node["Webhook Evolution API"].json["data"]["key"]["remoteJid"] }}'
                },
                {
                  name: 'userMessage',
                  value: '={{ $node["Webhook Evolution API"].json["data"]["message"]["conversation"] || $node["Webhook Evolution API"].json["data"]["message"]["extendedTextMessage"]["text"] }}'
                },
                {
                  name: 'botResponse',
                  value: '={{ $node["Procesar Mensaje"].json["response"] }}'
                },
                {
                  name: 'responseTime',
                  value: '={{ $node["Procesar Mensaje"].json["metadata"]["responseTime"] }}'
                },
                {
                  name: 'tokensUsed',
                  value: '={{ $node["Procesar Mensaje"].json["metadata"]["tokensUsed"] }}'
                }
              ]
            }
          }
        },
        {
          id: 'no_response',
          name: 'Sin Respuesta',
          type: 'n8n-nodes-base.noOp',
          position: [700, 300],
          parameters: {}
        }
      ],
      connections: {
        'Webhook Evolution API': {
          main: [['Procesar Mensaje']]
        },
        'Procesar Mensaje': {
          main: [['Verificar Respuesta']]
        },
        'Verificar Respuesta': {
          main: [['Enviar Respuesta'], ['Sin Respuesta']]
        },
        'Enviar Respuesta': {
          main: [['Registrar Interacción']]
        }
      },
      settings: {
        executionOrder: 'v1'
      },
      staticData: null,
      tags: ['whatsapp', 'bot', instance.evolution_instance_name],
      triggerCount: 1,
      updatedAt: new Date().toISOString(),
      versionId: '1'
    };
  }

  /**
   * Generar URL de webhook única para la instancia
   */
  generateWebhookUrl(evolutionInstanceName) {
    const n8nBaseUrl = process.env.N8N_BASE_URL || 'https://n8n-automation-bhdl.onrender.com';
    // Usar el mismo formato que ya funciona
    return `${n8nBaseUrl}/webhook/${evolutionInstanceName}`;
  }

  /**
   * Obtener plantillas de workflow disponibles
   * GET /api/workflows/templates
   */
  async getWorkflowTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'basic_bot',
          name: 'Bot Básico',
          description: 'Workflow simple: recibir mensaje → procesar con IA → responder',
          features: ['Respuesta automática', 'Registro de interacciones', 'OpenAI integration'],
          suitable_plans: ['free_trial', 'trial', 'starter', 'business', 'pro', 'enterprise']
        },
        {
          id: 'business_hours',
          name: 'Bot con Horarios',
          description: 'Bot que respeta horarios comerciales y escala fuera de horario',
          features: ['Horarios comerciales', 'Escalación automática', 'Respuestas diferenciadas'],
          suitable_plans: ['business', 'pro', 'enterprise']
        },
        {
          id: 'lead_capture',
          name: 'Captura de Leads',
          description: 'Bot especializado en capturar información de contactos',
          features: ['Formularios dinámicos', 'CRM integration', 'Lead scoring'],
          suitable_plans: ['pro', 'enterprise']
        },
        {
          id: 'custom_advanced',
          name: 'Workflow Personalizado',
          description: 'Workflow completamente personalizable con nodos avanzados',
          features: ['Nodos personalizados', 'Integraciones múltiples', 'Lógica compleja'],
          suitable_plans: ['enterprise']
        }
      ];

      res.json({
        success: true,
        data: { templates }
      });

    } catch (error) {
      console.error('Error obteniendo plantillas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new WorkflowController(); 