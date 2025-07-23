const axios = require('axios');
const config = require('../config');

class N8NService {
  constructor() {
    // URLs y configuración N8N
    this.n8nBaseUrl = process.env.N8N_BASE_URL || 'https://n8n.tu-dominio.com';
    this.n8nApiUrl = `${this.n8nBaseUrl}/api/v1`;
    this.n8nUsername = process.env.N8N_USERNAME || 'admin';
    this.n8nPassword = process.env.N8N_PASSWORD || 'password';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
    
    // Headers para autenticación N8N (API Key + Basic Auth)
    this.authHeaders = {
      'Authorization': `Basic ${Buffer.from(`${this.n8nUsername}:${this.n8nPassword}`).toString('base64')}`,
      'X-N8N-API-KEY': this.n8nApiKey,
      'Content-Type': 'application/json'
    };
    
    console.log(`[N8N Service] Initialized with base URL: ${this.n8nBaseUrl}`);
    console.log(`[N8N Service] API Key configured: ${this.n8nApiKey ? 'Yes' : 'No'}`);
  }

  /**
   * Crear workflow automático para una instancia
   * @param {Object} instanceData - Datos de la instancia
   * @returns {Promise<Object>} Datos del workflow creado
   */
  async createWorkflowForInstance(instanceData) {
    try {
      const { evolution_instance_name, instance_name, company_id, id } = instanceData;
      
      console.log(`[N8N] Creating workflow for instance: ${instance_name}`);
      
      // Generar nombre único para el workflow
      const workflowName = `WhatsApp Bot - ${instance_name}`;
      const webhookPath = `whatsapp-${evolution_instance_name}`;
      
      // Crear el workflow template
      const workflowData = this.createWorkflowTemplate({
        instanceName: evolution_instance_name,
        workflowName: workflowName,
        webhookPath: webhookPath,
        companyId: company_id,
        instanceId: id
      });
      
      // Crear workflow en N8N
      const workflow = await this.createWorkflowInN8N(workflowData);
      
      // Activar el workflow
      await this.activateWorkflow(workflow.id);
      
      // Construir URL del webhook
      const webhookUrl = `${this.n8nBaseUrl}/webhook/${webhookPath}`;
      
      console.log(`[N8N] Workflow created successfully:`, {
        workflowId: workflow.id,
        workflowName: workflow.name,
        webhookUrl: webhookUrl
      });
      
      return {
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          webhookUrl: webhookUrl,
          webhookPath: webhookPath,
          isActive: true
        }
      };
      
    } catch (error) {
      console.error(`[N8N] Error creating workflow:`, error.message);
      throw new Error(`Failed to create N8N workflow: ${error.message}`);
    }
  }
  
  /**
   * Crear workflow en N8N via API
   * @param {Object} workflowData - Datos del workflow
   * @returns {Promise<Object>} Workflow creado
   */
  async createWorkflowInN8N(workflowData) {
    try {
      console.log(`[N8N API] Creating workflow: ${workflowData.name}`);
      
      const response = await axios.post(
        `${this.n8nApiUrl}/workflows`,
        workflowData,
        { headers: this.authHeaders }
      );
      
      console.log(`[N8N API] Workflow created with ID: ${response.data.id}`);
      return response.data;
      
    } catch (error) {
      console.error(`[N8N API] Error creating workflow:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }
  
  /**
   * Activar workflow en N8N
   * @param {string} workflowId - ID del workflow
   */
  async activateWorkflow(workflowId) {
    try {
      console.log(`[N8N API] Activating workflow: ${workflowId}`);
      
      await axios.patch(
        `${this.n8nApiUrl}/workflows/${workflowId}/activate`,
        { active: true },
        { headers: this.authHeaders }
      );
      
      console.log(`[N8N API] Workflow activated successfully`);
      
    } catch (error) {
      console.error(`[N8N API] Error activating workflow:`, error.response?.data);
      throw error;
    }
  }
  
  /**
   * Crear template de workflow para WhatsApp Bot
   * @param {Object} config - Configuración del workflow
   * @returns {Object} Template del workflow
   */
  createWorkflowTemplate(config) {
    const { instanceName, workflowName, webhookPath, companyId, instanceId } = config;
    const backendUrl = process.env.BACKEND_URL || 'https://whatsapp-bot-backend.onrender.com';
    const evolutionApiUrl = process.env.EVOLUTION_API_URL || 'https://evolution-api.tu-dominio.com';
    const backendApiKey = process.env.N8N_BACKEND_API_KEY || 'n8n-backend-integration-key';
    
    return {
      name: workflowName,
      active: false, // Se activará después
      nodes: [
        {
          id: "webhook-node",
          name: "WhatsApp Webhook",
          type: "n8n-nodes-base.webhook",
          position: [100, 200],
          parameters: {
            path: webhookPath,
            httpMethod: "POST",
            responseMode: "responseNode"
          }
        },
        {
          id: "filter-node", 
          name: "Filter Valid Messages",
          type: "n8n-nodes-base.if",
          position: [300, 200],
          parameters: {
            conditions: {
              string: [
                {
                  value1: "={{ $json.event }}",
                  operation: "equal",
                  value2: "messages.upsert"
                },
                {
                  value1: "={{ $json.data?.key?.fromMe }}",
                  operation: "equal",
                  value2: false
                },
                {
                  value1: "={{ $json.data?.key?.remoteJid }}",
                  operation: "notContains", 
                  value2: "@g.us"
                }
              ]
            },
            combineOperation: "all"
          }
        },
        {
          id: "extract-node",
          name: "Extract Message Data", 
          type: "n8n-nodes-base.function",
          position: [500, 200],
          parameters: {
            functionCode: `
// Extraer datos del mensaje
const messageData = $input.first().json.data;
const phone = messageData.key.remoteJid;
const message = messageData.message?.conversation || 
                messageData.message?.extendedTextMessage?.text || '';
const instance = $input.first().json.instance;

return {
  instance_key: instance,
  from: phone, 
  message: message,
  message_type: 'text',
  timestamp: new Date(messageData.messageTimestamp * 1000).toISOString(),
  sender_name: messageData.pushName || 'Usuario',
  message_id: messageData.key.id
};
            `
          }
        },
        {
          id: "backend-node",
          name: "Backend RAG Process",
          type: "n8n-nodes-base.httpRequest", 
          position: [700, 200],
          parameters: {
            url: `${backendUrl}/api/bot/process-message`,
            method: "POST",
            authentication: "predefinedCredentialType",
            nodeCredentialType: "httpHeaderAuth",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Content-Type",
                  value: "application/json"
                },
                {
                  name: "Authorization", 
                  value: `Bearer ${backendApiKey}`
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "instance_key",
                  value: "={{ $json.instance_key }}"
                },
                {
                  name: "from",
                  value: "={{ $json.from }}"
                },
                {
                  name: "message", 
                  value: "={{ $json.message }}"
                },
                {
                  name: "message_type",
                  value: "={{ $json.message_type }}"
                },
                {
                  name: "timestamp",
                  value: "={{ $json.timestamp }}"
                }
              ]
            },
            options: {
              timeout: 30000
            }
          }
        },
        {
          id: "check-response-node",
          name: "Should Respond?",
          type: "n8n-nodes-base.if",
          position: [900, 200], 
          parameters: {
            conditions: {
              boolean: [
                {
                  value1: "={{ $json.data?.response !== undefined && $json.data?.response !== null && $json.data?.response !== '' }}",
                  operation: "equal",
                  value2: true
                }
              ]
            }
          }
        },
        {
          id: "send-response-node",
          name: "Send WhatsApp Response",
          type: "n8n-nodes-base.httpRequest",
          position: [1100, 160],
          parameters: {
            url: `${evolutionApiUrl}/message/sendText/${instanceName}`,
            method: "POST", 
            authentication: "predefinedCredentialType",
            nodeCredentialType: "httpHeaderAuth",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Content-Type",
                  value: "application/json"
                },
                {
                  name: "apikey",
                  value: process.env.EVOLUTION_API_KEY || "evolution-api-key"
                }
              ]
            },
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "number",
                  value: "={{ $('Extract Message Data').item.json.from }}"
                },
                {
                  name: "text",
                  value: "={{ $('Backend RAG Process').item.json.data.response }}"
                }
              ]
            }
          }
        },
        {
          id: "log-analytics-node",
          name: "Log Analytics",
          type: "n8n-nodes-base.httpRequest",
          position: [1300, 160],
          parameters: {
            url: `${backendUrl}/api/analytics/log-interaction`,
            method: "POST",
            authentication: "predefinedCredentialType", 
            nodeCredentialType: "httpHeaderAuth",
            continueOnFail: true,
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: "instance_key",
                  value: "={{ $('Extract Message Data').item.json.instance_key }}"
                },
                {
                  name: "interaction_data",
                  value: "={{ $('Backend RAG Process').item.json.data }}"
                }
              ]
            }
          }
        },
        {
          id: "webhook-response-node",
          name: "Webhook Response",
          type: "n8n-nodes-base.respondToWebhook",
          position: [1500, 200],
          parameters: {
            respondWith: "text",
            responseBody: "OK"
          }
        },
        {
          id: "no-response-node",
          name: "No Response Needed",
          type: "n8n-nodes-base.noOp", 
          position: [1100, 280],
          parameters: {}
        }
      ],
      connections: {
        "WhatsApp Webhook": {
          main: [["Filter Valid Messages"]]
        },
        "Filter Valid Messages": {
          main: [["Extract Message Data"]]
        },
        "Extract Message Data": {
          main: [["Backend RAG Process"]]
        },
        "Backend RAG Process": {
          main: [["Should Respond?"]]
        },
        "Should Respond?": {
          main: [["Send WhatsApp Response"], ["No Response Needed"]]
        },
        "Send WhatsApp Response": {
          main: [["Log Analytics"]]
        },
        "Log Analytics": {
          main: [["Webhook Response"]]
        },
        "No Response Needed": {
          main: [["Webhook Response"]]
        }
      },
      settings: {
        executionOrder: "v1"
      },
      tags: [`whatsapp`, `bot`, `company-${companyId}`, `instance-${instanceId}`]
    };
  }
  
  /**
   * Eliminar workflow de N8N
   * @param {string} workflowId - ID del workflow
   */
  async deleteWorkflow(workflowId) {
    try {
      console.log(`[N8N API] Deleting workflow: ${workflowId}`);
      
      await axios.delete(
        `${this.n8nApiUrl}/workflows/${workflowId}`,
        { headers: this.authHeaders }
      );
      
      console.log(`[N8N API] Workflow deleted successfully`);
      
    } catch (error) {
      console.error(`[N8N API] Error deleting workflow:`, error.response?.data);
      throw error;
    }
  }
  
  /**
   * Obtener información de un workflow
   * @param {string} workflowId - ID del workflow
   * @returns {Promise<Object>} Datos del workflow
   */
  async getWorkflow(workflowId) {
    try {
      const response = await axios.get(
        `${this.n8nApiUrl}/workflows/${workflowId}`,
        { headers: this.authHeaders }
      );
      
      return response.data;
      
    } catch (error) {
      console.error(`[N8N API] Error getting workflow:`, error.response?.data);
      throw error;
    }
  }
  
  /**
   * Test de conectividad con N8N
   * @returns {Promise<boolean>} Estado de la conexión
   */
  async testConnection() {
    try {
      console.log(`[N8N] Testing connection to: ${this.n8nApiUrl}`);
      
      const response = await axios.get(
        `${this.n8nApiUrl}/workflows`,
        { 
          headers: this.authHeaders,
          timeout: 5000
        }
      );
      
      console.log(`[N8N] Connection successful - Found ${response.data.length} workflows`);
      return true;
      
    } catch (error) {
      console.error(`[N8N] Connection failed:`, error.message);
      return false;
    }
  }
  
  /**
   * Generar URL de webhook única para instancia
   * @param {string} instanceName - Nombre de instancia
   * @returns {string} URL del webhook
   */
  generateWebhookUrl(instanceName) {
    const webhookPath = `whatsapp-${instanceName}`;
    return `${this.n8nBaseUrl}/webhook/${webhookPath}`;
  }
}

module.exports = new N8NService(); 