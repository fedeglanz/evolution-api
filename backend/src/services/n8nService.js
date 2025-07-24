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
      
      await axios.post(
        `${this.n8nApiUrl}/workflows/${workflowId}/activate`,
        {},
        { headers: this.authHeaders }
      );
      
      console.log(`[N8N API] Workflow activated successfully`);
      
    } catch (error) {
      console.error(`[N8N API] Error activating workflow:`, error.response?.data);
      throw error;
    }
  }

  /**
   * Desactivar workflow en N8N
   * @param {string} workflowId - ID del workflow
   */
  async deactivateWorkflow(workflowId) {
    try {
      console.log(`[N8N API] Deactivating workflow: ${workflowId}`);
      
      await axios.post(
        `${this.n8nApiUrl}/workflows/${workflowId}/deactivate`,
        {},
        { headers: this.authHeaders }
      );
      
      console.log(`[N8N API] Workflow deactivated successfully`);
      
    } catch (error) {
      console.error(`[N8N API] Error deactivating workflow:`, error.response?.data);
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
    
    return {
      name: workflowName,
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: webhookPath,
            options: {}
          },
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [-1000, 260],
          id: "30a246c9-043e-44d5-8ff4-595e2433cd4c",
          name: "Webhook WhatsApp Production",
          webhookId: "auto-generated"
        },
        {
          parameters: {
            conditions: {
              string: [
                {
                  value1: "={{ $json.body.event }}",
                  value2: "messages.upsert"
                }
              ],
              boolean: [
                {
                  value1: "={{ $json.body.data.key.fromMe }}"
                }
              ]
            }
          },
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [-740, 260],
          id: "42735bbe-3d11-4316-9613-809e869e0bb2",
          name: "Filter Incoming Messages"
        },
        {
          parameters: {
            jsCode: "// Extraer datos del mensaje de WhatsApp\nconst data = $input.first().json.body;\nconst messageData = data.data;\n\n// Extraer contenido del mensaje de diferentes tipos\nlet messageContent = '';\nif (messageData.message?.conversation) {\n  messageContent = messageData.message.conversation;\n} else if (messageData.message?.extendedTextMessage?.text) {\n  messageContent = messageData.message.extendedTextMessage.text;\n} else if (messageData.message?.imageMessage?.caption) {\n  messageContent = messageData.message.imageMessage.caption || '[Imagen]';\n} else if (messageData.message?.audioMessage) {\n  messageContent = '[Audio]';\n} else if (messageData.message?.documentMessage) {\n  messageContent = messageData.message.documentMessage.fileName || '[Documento]';\n} else {\n  messageContent = '[Mensaje no compatible]';\n}\n\n// Retornar datos estructurados\nreturn {\n  // Datos básicos del mensaje\n  phone: messageData.key.remoteJid.replace('@s.whatsapp.net', ''),\n  message: messageContent,\n  instance: data.instance,\n  timestamp: data.date_time,\n  messageId: messageData.key.id,\n  senderName: messageData.pushName || 'Usuario',\n  \n  // URLs del sistema\n  evolutionApiUrl: data.server_url,\n  backendUrl: 'https://whatsapp-bot-backend-fnte.onrender.com',\n  \n  // Tipo de mensaje\n  messageType: Object.keys(messageData.message || {})[0] || 'text',\n  \n  // Para Evolution API response\n  remoteJid: messageData.key.remoteJid,\n  isGroup: messageData.key.remoteJid.includes('@g.us'),\n  \n  // Debug info\n  rawEventType: data.event,\n  hasMessage: !!messageContent\n};"
          },
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [-480, 160],
          id: "2a622423-cbf5-42f9-a788-fde76a9df1bc",
          name: "Extract Message Data"
        },
        {
          parameters: {
            authentication: "headerAuth",
            requestMethod: "POST",
            url: "https://whatsapp-bot-backend-fnte.onrender.com/api/bot/process-message",
            options: {
              timeout: 30000
            },
            bodyParametersUi: {
              parameter: [
                {
                  name: "instance",
                  value: "={{ $json.instance }}"
                },
                {
                  name: "phone",
                  value: "={{ $json.phone }}"
                },
                {
                  name: "message",
                  value: "={{ $json.message }}"
                },
                {
                  name: "senderName",
                  value: "={{ $json.senderName }}"
                },
                {
                  name: "messageType",
                  value: "={{ $json.messageType }}"
                },
                {
                  name: "messageId",
                  value: "={{ $json.messageId }}"
                }
              ]
            }
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 1,
          position: [-240, 160],
          id: "8bc15ce4-f0ae-4f76-9b9b-db104e5319ea",
          name: "Backend: Process Message",
          credentials: {
            httpHeaderAuth: {
              id: "4gqWh89TP60cGGCa",
              name: "Evolution Backend API Key"
            }
          }
        },
        {
          parameters: {
            conditions: {
              boolean: [
                {
                  value1: "={{ $json.shouldRespond === true }}",
                  value2: true
                }
              ]
            }
          },
          type: "n8n-nodes-base.if",
          typeVersion: 1,
          position: [-20, 160],
          id: "cc60979e-5fa3-4251-b767-5753caec633f",
          name: "Should Respond?"
        },
        {
          parameters: {
            authentication: "headerAuth",
            requestMethod: "POST",
            url: "={{ $('Extract Message Data').first().json.evolutionApiUrl }}/message/sendText/{{ $('Extract Message Data').first().json.instance }}",
            options: {
              timeout: 15000
            },
            bodyParametersUi: {
              parameter: [
                {
                  name: "text",
                  value: "={{ $('Backend: Process Message').first().json.response }}"
                },
                {
                  name: "number",
                  value: "={{ $('Extract Message Data').first().json.remoteJid }}"
                }
              ]
            }
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 1,
          position: [200, 160],
          id: "86d53d5b-9434-4365-9013-687e87961b3a",
          name: "Send WhatsApp Response",
          credentials: {
            httpHeaderAuth: {
              id: "mxZT2f13tOsMe4c0",
              name: "Evolution API "
            }
          }
        },
        {
          parameters: {
            authentication: "headerAuth",
            requestMethod: "POST",
            url: "https://whatsapp-bot-backend-fnte.onrender.com/api/bot/log-interaction",
            options: {
              timeout: 10000
            },
            bodyParametersUi: {
              parameter: [
                {
                  name: "instance",
                  value: "={{ $('Extract Message Data').first().json.instance }}"
                },
                {
                  name: "phone",
                  value: "={{ $('Extract Message Data').first().json.phone }}"
                },
                {
                  name: "userMessage",
                  value: "={{ $('Extract Message Data').first().json.message }}"
                },
                {
                  name: "botResponse",
                  value: "={{ $('Backend: Process Message').first().json.response }}"
                },
                {
                  name: "responseTime",
                  value: "={{ $('Backend: Process Message').first().json.metadata?.responseTime || 0 }}"
                },
                {
                  name: "tokensUsed",
                  value: "={{ $('Backend: Process Message').first().json.metadata?.tokensUsed || 0 }}"
                }
              ]
            }
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 1,
          position: [420, 160],
          id: "6e364dcb-e527-4958-adb9-560a3ef074f2",
          name: "Backend: Log Interaction",
          credentials: {
            httpHeaderAuth: {
              id: "4gqWh89TP60cGGCa",
              name: "Evolution Backend API Key"
            }
          }
        },
        {
          parameters: {
            jsCode: "// Log final del flujo completado\nconst extractedData = $('Extract Message Data').first().json;\nconst backendResponse = $('Backend: Process Message').first().json;\nconst whatsappResponse = $('Send WhatsApp Response').first().json;\n\nconsole.log('✅ Flujo completado exitosamente:');\nconsole.log('📱 De:', extractedData.phone, '(' + extractedData.senderName + ')');\nconsole.log('💬 Mensaje:', extractedData.message.substring(0, 50) + '...');\nconsole.log('🤖 Respuesta:', backendResponse.response.substring(0, 50) + '...');\nconsole.log('⚡ Tokens:', backendResponse.metadata?.tokensUsed || 0);\nconsole.log('⏱️ Tiempo:', backendResponse.metadata?.responseTime + 'ms');\nconsole.log('📤 Enviado vía Evolution:', whatsappResponse.message || 'OK');\n\nreturn {\n  success: true,\n  summary: {\n    phone: extractedData.phone,\n    userMessage: extractedData.message,\n    botResponse: backendResponse.response,\n    tokensUsed: backendResponse.metadata?.tokensUsed || 0,\n    responseTime: backendResponse.metadata?.responseTime || 0,\n    timestamp: new Date().toISOString()\n  }\n};"
          },
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [640, 160],
          id: "4ca95340-bc3f-4a9b-83e2-6c19d8fe1481",
          name: "Final Success Log"
        }
      ],
      connections: {
        "Webhook WhatsApp Production": {
          main: [
            [
              {
                node: "Filter Incoming Messages",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Filter Incoming Messages": {
          main: [
            [
              {
                node: "Extract Message Data",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Extract Message Data": {
          main: [
            [
              {
                node: "Backend: Process Message",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Backend: Process Message": {
          main: [
            [
              {
                node: "Should Respond?",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Should Respond?": {
          main: [
            [
              {
                node: "Send WhatsApp Response",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Send WhatsApp Response": {
          main: [
            [
              {
                node: "Backend: Log Interaction",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "Backend: Log Interaction": {
          main: [
            [
              {
                node: "Final Success Log",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: "v1"
      }
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