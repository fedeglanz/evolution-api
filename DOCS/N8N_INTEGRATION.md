# 🔄 N8N Integration - Workflow Automation

## 📋 Descripción General

**N8N** es el motor de automatización que conecta **WhatsApp (vía Evolution API)** con nuestro **Backend** para procesar mensajes y generar respuestas automáticas. Actúa como el orquestador central que recibe webhooks, procesa la lógica de negocio, y envía respuestas usando el sistema RAG.

### 🎯 **Funciones Principales**
- **📩 Webhook Receiver** - Recibe mensajes de Evolution API
- **🧠 RAG Processing** - Llama al backend para generar respuestas inteligentes
- **📤 Message Sender** - Envía respuestas de vuelta a WhatsApp
- **📊 Logging & Analytics** - Registra interacciones para análisis
- **🔄 Error Handling** - Manejo robusto de errores y reintentos

---

## 🏗️ Arquitectura N8N

### **Flow de Automatización**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Evolution API  │    │   N8N Webhook   │
│   User Message  │───►│   (WhatsApp      │───►│   Receiver      │
│                 │    │    Gateway)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Evolution API  │    │   Backend API   │
│   Bot Response  │◄───│   Send Message   │◄───│   RAG Process   │
│                 │    │                  │    │   + AI Response │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **N8N Workflow Components**
1. **🎣 Webhook Trigger** - Recibe mensajes de Evolution API
2. **🔍 Message Filter** - Filtra mensajes relevantes (no grupos, etc.)
3. **🧠 Backend Request** - Llama al endpoint `/bot/process-message`
4. **📤 Response Sender** - Envía respuesta vía Evolution API
5. **📊 Analytics Logger** - Registra interacción en base de datos
6. **❌ Error Handler** - Maneja errores y notificaciones

---

## 🔗 Webhook Configuration

### **Evolution API Webhook Setup**
```javascript
// Configuración de webhook en Evolution API
{
  "webhook": {
    "url": "https://n8n.tu-dominio.com/webhook/whatsapp-bot",
    "events": [
      "messages.upsert",
      "connection.update"
    ],
    "base64": false
  }
}
```

### **N8N Webhook Node Configuration**
```json
{
  "parameters": {
    "path": "whatsapp-bot",
    "httpMethod": "POST",
    "responseMode": "responseNode",
    "options": {
      "rawBody": true,
      "allowedOrigins": "*"
    }
  },
  "name": "WhatsApp Webhook",
  "type": "n8n-nodes-base.webhook"
}
```

---

## 📝 Workflow JSON Structure

### **Complete N8N Workflow**
```json
{
  "name": "WhatsApp Bot RAG Workflow",
  "nodes": [
    {
      "parameters": {
        "path": "whatsapp-bot",
        "httpMethod": "POST",
        "responseMode": "responseNode",
        "options": {
          "rawBody": true
        }
      },
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "id": "webhook-trigger"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.data?.messageType }}",
              "operation": "equal",
              "value2": "conversation"
            },
            {
              "value1": "={{ $json.data?.fromMe }}",
              "operation": "equal",
              "value2": false
            }
          ]
        },
        "combineOperation": "all"
      },
      "name": "Filter Valid Messages",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300],
      "id": "message-filter"
    },
    {
      "parameters": {
        "url": "https://whatsapp-bot-backend.onrender.com/api/bot/process-message",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "instance_key",
              "value": "={{ $json.data?.instance }}"
            },
            {
              "name": "from",
              "value": "={{ $json.data?.key?.remoteJid }}"
            },
            {
              "name": "message",
              "value": "={{ $json.data?.message?.conversation }}"
            },
            {
              "name": "message_type",
              "value": "text"
            },
            {
              "name": "timestamp",
              "value": "={{ new Date($json.data?.messageTimestamp * 1000).toISOString() }}"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      },
      "name": "Process with RAG",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [680, 240],
      "id": "rag-processor"
    },
    {
      "parameters": {
        "url": "https://evolution-api.tu-dominio.com/message/sendText/{{ $json.data?.instance }}",
        "authentication": "predefinedCredentialType", 
        "nodeCredentialType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type", 
              "value": "application/json"
            },
            {
              "name": "apikey",
              "value": "{{ $credentials.evolutionApiKey }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "={{ $('WhatsApp Webhook').item.json.data?.key?.remoteJid }}"
            },
            {
              "name": "text", 
              "value": "={{ $json.data?.response }}"
            }
          ]
        }
      },
      "name": "Send Response",
      "type": "n8n-nodes-base.httpRequest", 
      "typeVersion": 3,
      "position": [900, 240],
      "id": "response-sender"
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "=OK"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1, 
      "position": [1120, 240],
      "id": "webhook-response"
    }
  ],
  "connections": {
    "WhatsApp Webhook": {
      "main": [
        [
          {
            "node": "Filter Valid Messages",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filter Valid Messages": {
      "main": [
        [
          {
            "node": "Process with RAG", 
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process with RAG": {
      "main": [
        [
          {
            "node": "Send Response",
            "type": "main", 
            "index": 0
          }
        ]
      ]
    },
    "Send Response": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 🔧 N8N Nodes Explained

### **1. Webhook Trigger Node**
```javascript
// Configuración del nodo webhook
{
  "name": "WhatsApp Webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "whatsapp-bot",
    "httpMethod": "POST",
    "responseMode": "responseNode", // Respuesta manual
    "options": {
      "rawBody": true, // Preserva JSON original
      "allowedOrigins": "*" // Permite Evolution API
    }
  }
}

// Datos recibidos del webhook
{
  "data": {
    "instance": "main_instance_001",
    "messageType": "conversation", 
    "fromMe": false,
    "key": {
      "remoteJid": "5491123456789@c.us",
      "fromMe": false,
      "id": "msg_id_123"
    },
    "message": {
      "conversation": "¿Cuáles son los horarios de atención?"
    },
    "messageTimestamp": 1705747200
  }
}
```

### **2. Message Filter Node**
```javascript
// Filtros para mensajes válidos
{
  "name": "Filter Valid Messages",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.data?.messageType }}",
          "operation": "equal", 
          "value2": "conversation" // Solo mensajes de texto
        },
        {
          "value1": "={{ $json.data?.fromMe }}",
          "operation": "equal",
          "value2": false // No mensajes enviados por nosotros
        },
        {
          "value1": "={{ $json.data?.key?.remoteJid }}",
          "operation": "notContains",
          "value2": "@g.us" // Excluir grupos
        }
      ]
    },
    "combineOperation": "all" // Todas las condiciones deben cumplirse
  }
}
```

### **3. Backend RAG Processor Node**
```javascript
// Llamada al backend para procesamiento RAG
{
  "name": "Process with RAG",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://whatsapp-bot-backend.onrender.com/api/bot/process-message",
    "method": "POST",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth", // JWT Token
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "instance_key",
          "value": "={{ $json.data?.instance }}"
        },
        {
          "name": "from", 
          "value": "={{ $json.data?.key?.remoteJid }}"
        },
        {
          "name": "message",
          "value": "={{ $json.data?.message?.conversation }}"
        },
        {
          "name": "message_type",
          "value": "text"
        },
        {
          "name": "timestamp",
          "value": "={{ new Date($json.data?.messageTimestamp * 1000).toISOString() }}"
        }
      ]
    },
    "options": {
      "timeout": 30000, // 30 segundos timeout
      "retry": {
        "enabled": true,
        "maxRetries": 2
      }
    }
  }
}
```

### **4. Response Sender Node**
```javascript
// Envío de respuesta vía Evolution API
{
  "name": "Send Response",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://evolution-api.tu-dominio.com/message/sendText/{{ $json.data?.instance }}",
    "method": "POST",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "apikey",
          "value": "{{ $credentials.evolutionApiKey }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "number",
          "value": "={{ $('WhatsApp Webhook').item.json.data?.key?.remoteJid }}"
        },
        {
          "name": "text",
          "value": "={{ $('Process with RAG').item.json.data?.response }}"
        }
      ]
    }
  }
}
```

---

## 🔐 Credentials Management

### **Backend API Authentication**
```javascript
// N8N Credential: httpHeaderAuth
{
  "name": "WhatsApp Bot Backend",
  "type": "httpHeaderAuth",
  "data": {
    "name": "Authorization",
    "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### **Evolution API Authentication**
```javascript
// N8N Credential: httpHeaderAuth  
{
  "name": "Evolution API Key",
  "type": "httpHeaderAuth",
  "data": {
    "name": "apikey",
    "value": "tu-evolution-api-key-aqui"
  }
}
```

### **Environment Variables**
```bash
# N8N Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure_password

# Webhook Security
WEBHOOK_TUNNEL_URL=https://n8n.tu-dominio.com
N8N_PAYLOAD_SIZE_MAX=16777216

# Performance
N8N_EXECUTIONS_TIMEOUT=300
N8N_EXECUTIONS_TIMEOUT_MAX=600
```

---

## 📊 Advanced Workflow Features

### **Error Handling Node**
```javascript
// Nodo para manejo de errores
{
  "name": "Error Handler",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.error }}",
          "operation": "exists"
        }
      ]
    }
  },
  "continueOnFail": true,
  "alwaysOutputData": true
}

// Nodo de notificación de errores
{
  "name": "Error Notification",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "method": "POST",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "text",
          "value": "🚨 WhatsApp Bot Error: {{ $json.error?.message }}"
        }
      ]
    }
  }
}
```

### **Analytics Logging Node**
```javascript
// Registro de analytics en base de datos
{
  "name": "Log Analytics",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://whatsapp-bot-backend.onrender.com/api/analytics/log-interaction",
    "method": "POST",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "instance_key",
          "value": "={{ $('WhatsApp Webhook').item.json.data?.instance }}"
        },
        {
          "name": "from",
          "value": "={{ $('WhatsApp Webhook').item.json.data?.key?.remoteJid }}"
        },
        {
          "name": "message",
          "value": "={{ $('WhatsApp Webhook').item.json.data?.message?.conversation }}"
        },
        {
          "name": "response",
          "value": "={{ $('Process with RAG').item.json.data?.response }}"
        },
        {
          "name": "rag_context",
          "value": "={{ $('Process with RAG').item.json.data?.rag_context }}"
        },
        {
          "name": "processing_time_ms",
          "value": "={{ $('Process with RAG').item.json.data?.processing_time_ms }}"
        },
        {
          "name": "timestamp",
          "value": "={{ new Date().toISOString() }}"
        }
      ]
    }
  }
}
```

### **Rate Limiting Node**
```javascript
// Control de rate limiting
{
  "name": "Rate Limit Check",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": `
// Simple rate limiting logic
const from = $input.item.json.data?.key?.remoteJid;
const now = Date.now();
const rateLimit = 5; // 5 mensajes por minuto
const timeWindow = 60000; // 1 minuto

// Get from storage (simplified)
const userRequests = $node['Global'].getAll()[from] || [];

// Filter recent requests
const recentRequests = userRequests.filter(time => now - time < timeWindow);

if (recentRequests.length >= rateLimit) {
  return [{
    json: {
      rateLimited: true,
      message: "Rate limit exceeded. Please wait before sending another message."
    }
  }];
}

// Add current request
recentRequests.push(now);
$node['Global'].set(from, recentRequests);

return $input.all();
    `
  }
}
```

---

## 🔄 Message Types Handling

### **Text Messages**
```javascript
// Handler para mensajes de texto
{
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.data?.messageType }}",
          "operation": "equal",
          "value2": "conversation"
        }
      ]
    }
  },
  "name": "Text Message Handler"
}
```

### **Media Messages**
```javascript
// Handler para imágenes/documentos
{
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.data?.messageType }}",
          "operation": "equal",
          "value2": "imageMessage"
        }
      ]
    }
  },
  "name": "Image Message Handler"
}

// Procesamiento de imagen
{
  "name": "Process Image",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://whatsapp-bot-backend.onrender.com/api/media/process",
    "method": "POST",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "mediaUrl",
          "value": "={{ $json.data?.message?.imageMessage?.url }}"
        },
        {
          "name": "caption",
          "value": "={{ $json.data?.message?.imageMessage?.caption }}"
        }
      ]
    }
  }
}
```

### **Voice Messages**
```javascript
// Handler para mensajes de voz
{
  "name": "Voice Message Handler",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.data?.messageType }}",
          "operation": "equal",
          "value2": "audioMessage"
        }
      ]
    }
  }
}

// Transcripción de audio (futuro)
{
  "name": "Transcribe Audio",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.openai.com/v1/audio/transcriptions",
    "method": "POST",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "file",
          "value": "={{ $json.data?.message?.audioMessage?.url }}"
        },
        {
          "name": "model",
          "value": "whisper-1"
        }
      ]
    }
  }
}
```

---

## 📈 Monitoring & Analytics

### **Performance Monitoring**
```javascript
// Nodo de monitoreo de performance
{
  "name": "Performance Monitor",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": `
const startTime = $input.item.json.startTime || Date.now();
const endTime = Date.now();
const processingTime = endTime - startTime;

// Log metrics
console.log('Processing metrics:', {
  from: $input.item.json.data?.key?.remoteJid,
  message_length: $input.item.json.data?.message?.conversation?.length,
  processing_time_ms: processingTime,
  rag_tokens: $input.item.json.data?.rag_context?.tokens_used,
  timestamp: new Date().toISOString()
});

// Add timing to output
return [{
  json: {
    ...$input.item.json,
    performance: {
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    }
  }
}];
    `
  }
}
```

### **Health Check Workflow**
```javascript
// Workflow de health check
{
  "name": "Health Check Workflow",
  "nodes": [
    {
      "name": "Scheduler",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyMinute",
              "minute": 5
            }
          ]
        }
      }
    },
    {
      "name": "Check Backend",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://whatsapp-bot-backend.onrender.com/health",
        "method": "GET"
      }
    },
    {
      "name": "Check Evolution API",
      "type": "n8n-nodes-base.httpRequest", 
      "parameters": {
        "url": "https://evolution-api.tu-dominio.com/manager/findInstances",
        "method": "GET",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    }
  ]
}
```

---

## 🚀 Deployment & Setup

### **N8N Docker Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_TUNNEL_URL=https://n8n.tu-dominio.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
    volumes:
      - n8n_data:/home/node/.n8n
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  n8n_data:
```

### **Environment Configuration**
```bash
# .env para N8N
N8N_PASSWORD=tu-password-seguro
WEBHOOK_TUNNEL_URL=https://n8n.tu-dominio.com
N8N_ENCRYPTION_KEY=tu-clave-de-encriptacion

# Backend URLs
BACKEND_API_URL=https://whatsapp-bot-backend.onrender.com/api
EVOLUTION_API_URL=https://evolution-api.tu-dominio.com

# Credentials
BACKEND_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EVOLUTION_API_KEY=tu-evolution-api-key
```

---

## 🛠️ Troubleshooting

### **Common Issues**

#### **❌ Webhook Not Receiving Messages**
```javascript
// Debug webhook payload
{
  "name": "Debug Webhook",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": `
console.log('Webhook received:', JSON.stringify($input.all(), null, 2));
return $input.all();
    `
  }
}
```

#### **❌ Backend API Timeout**
```javascript
// Timeout handling
{
  "name": "Backend Request with Retry",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://whatsapp-bot-backend.onrender.com/api/bot/process-message",
    "options": {
      "timeout": 30000,
      "retry": {
        "enabled": true,
        "maxRetries": 3,
        "retryDelay": 2000
      }
    }
  },
  "continueOnFail": true,
  "alwaysOutputData": true
}
```

#### **❌ Evolution API Connection Issues**
```javascript
// Evolution API health check
{
  "name": "Check Evolution API",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://evolution-api.tu-dominio.com/instance/connectionState/{{ $json.instance }}",
    "method": "GET",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth"
  }
}
```

### **Debug Utilities**
```javascript
// General debug function
{
  "name": "Debug Node",
  "type": "n8n-nodes-base.function",
  "parameters": {
    "functionCode": `
// Log all data for debugging
console.log('=== DEBUG INFO ===');
console.log('Input:', JSON.stringify($input.all(), null, 2));
console.log('Node context:', JSON.stringify($node, null, 2));
console.log('Workflow context:', JSON.stringify($workflow, null, 2));
console.log('==================');

return $input.all();
    `
  }
}
```

---

## 📋 Best Practices

### **🔒 Security**
```markdown
✅ **DO:**
- Usar HTTPS para todos los webhooks
- Configurar authentication en todos los nodos HTTP
- Usar credentials manager para API keys
- Validar payloads de webhooks
- Implementar rate limiting

❌ **DON'T:**
- Exponer API keys in plain text
- Permitir webhooks sin autenticación
- Procesar todos los mensajes sin filtrar
- Ignorar errores y timeouts
```

### **⚡ Performance**
```markdown
✅ **Optimización:**
- Usar timeouts apropiados (30s para RAG)
- Implementar retry logic con backoff
- Filtrar mensajes irrelevantes temprano
- Usar async processing cuando sea posible
- Monitorear performance regularmente

📊 **Métricas:**
- Response time < 5 segundos
- Success rate > 95%
- Error rate < 5%
- Memory usage < 512MB
```

### **🔄 Maintenance**
```markdown
📅 **Regular Tasks:**
- [ ] Revisar logs de errores semanalmente
- [ ] Actualizar credentials expirados
- [ ] Verificar webhook endpoints
- [ ] Backup de workflows
- [ ] Performance review mensual

🚀 **Updates:**
- [ ] Mantener N8N actualizado
- [ ] Revisar nuevos nodes disponibles
- [ ] Optimizar workflows obsoletos
- [ ] Documentar cambios importantes
```

---

## 📊 Workflow Templates

### **Basic Bot Workflow**
```bash
# Importar workflow básico
curl -X POST http://n8n.tu-dominio.com/rest/workflows/import \
  -H "Authorization: Basic $(echo -n admin:password | base64)" \
  -H "Content-Type: application/json" \
  -d @n8n_bot_workflow.json
```

### **Multi-Instance Workflow**
```javascript
// Template para múltiples instancias
{
  "name": "Multi-Instance Bot",
  "parameters": {
    "path": "whatsapp-multi",
    "options": {
      "rawBody": true
    }
  },
  "routing": {
    "switch": [
      {
        "mode": "expression",
        "value": "={{ $json.data?.instance }}",
        "rules": [
          {
            "value": "instance_001",
            "output": 0
          },
          {
            "value": "instance_002", 
            "output": 1
          }
        ]
      }
    ]
  }
}
```

---

**📝 Documento actualizado:** Enero 2025  
**🔄 Platform:** N8N + Evolution API + Backend RAG  
**🌐 Webhook URL:** `https://n8n.tu-dominio.com/webhook/whatsapp-bot` 