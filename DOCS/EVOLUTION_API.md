# 📱 Evolution API - WhatsApp Integration

## 📋 Descripción General

**Evolution API** es la puerta de entrada a **WhatsApp Business** que permite conectar números de teléfono, gestionar instancias, enviar/recibir mensajes, y configurar webhooks. Es una API RESTful self-hosted que se comunica directamente con WhatsApp Web via web scraping, proporcionando una integración robusta y escalable.

### 🎯 **Funciones Principales**
- **📱 Multi-Instance** - Múltiples números WhatsApp por servidor
- **🔗 QR Code Connection** - Vinculación fácil de dispositivos
- **📩 Message Handling** - Envío/recepción de texto, media, documentos
- **🎣 Webhooks** - Notificaciones en tiempo real
- **👥 Contact Management** - Gestión de contactos y grupos
- **📊 Status Monitoring** - Estado de conexión y health checks

---

## 🏗️ Arquitectura Evolution API

### **Integration Flow**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Evolution API  │    │   Backend API   │
│   Web/Mobile    │◄──►│   (Self-hosted)  │◄──►│   (Our System)  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      N8N Workflow                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Webhook    │  │  Message    │  │    RAG Processing      │  │
│  │  Receiver   │  │  Filter     │  │    + Response          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### **Core Components**
- **🏗️ Manager** - Instance management and configuration
- **📱 Instance** - Individual WhatsApp connection
- **🎣 Webhook** - Real-time event notifications  
- **📤 Message** - Send/receive message handling
- **👥 Chat** - Contact and group management
- **📊 Monitor** - Health checks and status

---

## 🔧 Instance Management

### **Create Instance**
```http
POST /manager/createInstance
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "instanceName": "main_instance_001",
  "token": "optional-custom-token",
  "qrcode": true,
  "webhook_url": "https://n8n.tu-dominio.com/webhook/whatsapp-bot"
}
```

**Response:**
```json
{
  "instance": {
    "instanceName": "main_instance_001",
    "status": "created"
  },
  "hash": {
    "apikey": "generated-api-key-hash"
  },
  "webhook": {
    "webhook_url": "https://n8n.tu-dominio.com/webhook/whatsapp-bot",
    "events": ["messages.upsert", "connection.update"]
  },
  "qrcode": {
    "pairingCode": null,
    "code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

### **List Instances**
```http
GET /manager/findInstances
apikey: tu-evolution-api-key
```

**Response:**
```json
[
  {
    "instance": {
      "instanceName": "main_instance_001",
      "status": "open"
    },
    "connection": {
      "state": "open",
      "statusReason": 200
    },
    "profilePictureUrl": "https://pps.whatsapp.net/v/t61.24694-24/...",
    "profileName": "Mi Bot WhatsApp",
    "profileStatus": "Disponible 24/7",
    "number": "5491123456789"
  }
]
```

### **Get QR Code**
```http
GET /instance/connect/{instanceName}
apikey: tu-evolution-api-key
```

**Response:**
```json
{
  "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "code": "iVBORw0KGgoAAAANSUhEUgAA...",
  "pairingCode": null
}
```

### **Connection Status**
```http
GET /instance/connectionState/{instanceName}
apikey: tu-evolution-api-key
```

**Response:**
```json
{
  "instance": {
    "instanceName": "main_instance_001",
    "state": "open"
  },
  "connection": {
    "state": "open",
    "statusReason": 200,
    "isNewLogin": false,
    "qr": null,
    "urlCode": null
  }
}
```

### **Delete Instance**
```http
DELETE /manager/deleteInstance/{instanceName}
apikey: tu-evolution-api-key
```

---

## 📩 Message Handling

### **Send Text Message**
```http
POST /message/sendText/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "number": "5491123456789",
  "text": "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?",
  "delay": 0
}
```

**Response:**
```json
{
  "key": {
    "remoteJid": "5491123456789@c.us",
    "fromMe": true,
    "id": "msg_id_123456"
  },
  "message": {
    "conversation": "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?"
  },
  "messageTimestamp": 1705747200,
  "status": "PENDING"
}
```

### **Send Media Message**
```http
POST /message/sendMedia/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "number": "5491123456789",
  "mediatype": "image",
  "media": "https://tu-dominio.com/images/producto.jpg",
  "caption": "¡Mira nuestro nuevo producto!",
  "fileName": "producto.jpg"
}
```

### **Send Document**
```http
POST /message/sendMedia/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "number": "5491123456789", 
  "mediatype": "document",
  "media": "https://tu-dominio.com/docs/catalogo.pdf",
  "fileName": "Catálogo de Productos 2024.pdf",
  "caption": "Aquí tienes nuestro catálogo completo"
}
```

### **Send Audio/Voice**
```http
POST /message/sendWhatsAppAudio/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "number": "5491123456789",
  "audio": "https://tu-dominio.com/audio/welcome.mp3",
  "ptt": true
}
```

### **Send Location**
```http
POST /message/sendLocation/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "number": "5491123456789",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "name": "Oficina Central",
  "address": "Av. Corrientes 1234, Buenos Aires"
}
```

---

## 🎣 Webhook Configuration

### **Set Webhook**
```http
POST /webhook/set/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "webhook": {
    "url": "https://n8n.tu-dominio.com/webhook/whatsapp-bot",
    "events": [
      "messages.upsert",
      "messages.update", 
      "connection.update",
      "contacts.upsert",
      "chats.upsert"
    ],
    "base64": false
  }
}
```

### **Webhook Events**

#### **Message Received**
```json
{
  "event": "messages.upsert",
  "instance": "main_instance_001",
  "data": {
    "key": {
      "remoteJid": "5491123456789@c.us",
      "fromMe": false,
      "id": "msg_received_123"
    },
    "pushName": "Juan Pérez",
    "message": {
      "conversation": "¿Cuáles son sus horarios de atención?"
    },
    "messageType": "conversation",
    "messageTimestamp": 1705747200,
    "instanceId": "main_instance_001",
    "source": "web"
  }
}
```

#### **Message Status Update**
```json
{
  "event": "messages.update", 
  "instance": "main_instance_001",
  "data": {
    "key": {
      "remoteJid": "5491123456789@c.us",
      "fromMe": true,
      "id": "msg_sent_456"
    },
    "update": {
      "status": "READ",
      "statusTimestamp": 1705747260
    }
  }
}
```

#### **Connection Update**
```json
{
  "event": "connection.update",
  "instance": "main_instance_001", 
  "data": {
    "state": "open",
    "statusReason": 200,
    "isNewLogin": false
  }
}
```

#### **Image Message Received**
```json
{
  "event": "messages.upsert",
  "instance": "main_instance_001",
  "data": {
    "key": {
      "remoteJid": "5491123456789@c.us",
      "fromMe": false,
      "id": "img_msg_789"
    },
    "message": {
      "imageMessage": {
        "url": "https://mmg.whatsapp.net/v/t62.7118-24/...",
        "mimetype": "image/jpeg",
        "caption": "¿Qué opinas de este producto?",
        "fileLength": 45678,
        "height": 1080,
        "width": 1920
      }
    },
    "messageType": "imageMessage",
    "messageTimestamp": 1705747200
  }
}
```

---

## 👥 Contact & Chat Management

### **Get Contacts**
```http
GET /chat/findContacts/{instanceName}
apikey: tu-evolution-api-key
```

**Response:**
```json
[
  {
    "id": "5491123456789@c.us",
    "name": "Juan Pérez",
    "pushName": "Juan",
    "profilePictureUrl": "https://pps.whatsapp.net/v/t61.24694-24/...",
    "status": "Disponible",
    "isMyContact": true,
    "isUser": true,
    "isWAContact": true
  }
]
```

### **Get Profile Picture**
```http
GET /chat/getProfilePicture/{instanceName}
?number=5491123456789
apikey: tu-evolution-api-key
```

### **Update Profile**
```http
POST /chat/updateProfilePicture/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "picture": "https://tu-dominio.com/images/bot-avatar.jpg"
}
```

### **Set Profile Status**
```http
POST /chat/updateProfileStatus/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "status": "🤖 Bot inteligente disponible 24/7"
}
```

---

## 📊 Monitoring & Health Checks

### **Instance Status**
```http
GET /instance/fetchInstances
apikey: tu-evolution-api-key
```

**Response:**
```json
[
  {
    "instanceName": "main_instance_001",
    "connectionStatus": "open",
    "ownerJid": "5491123456789@c.us",
    "profileName": "Mi Bot WhatsApp",
    "profilePictureUrl": "https://pps.whatsapp.net/v/t61.24694-24/...",
    "integration": "WHATSAPP-BAILEYS"
  }
]
```

### **Health Check**
```http
GET /{instanceName}/status
apikey: tu-evolution-api-key
```

**Response:**
```json
{
  "status": "healthy",
  "connection": "open",
  "instance": "main_instance_001",
  "uptime": "2d 14h 30m",
  "lastSeen": "2024-01-20T15:30:00Z",
  "messagesProcessed": 1250,
  "webhookStatus": "active"
}
```

---

## 🔧 Advanced Configuration

### **Instance Settings**
```http
POST /settings/set/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "reject_call": true,
  "msg_call": "Lo siento, este número no acepta llamadas. Por favor, envía un mensaje de texto.",
  "groups_ignore": true,
  "always_online": true,
  "read_messages": true,
  "read_status": false
}
```

### **Webhook Advanced Config**
```http
POST /webhook/set/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "webhook": {
    "url": "https://n8n.tu-dominio.com/webhook/whatsapp-bot",
    "events": [
      "messages.upsert",
      "messages.update",
      "connection.update"
    ],
    "base64": false,
    "headers": {
      "Authorization": "Bearer webhook-secret-token",
      "X-Instance": "main_instance_001"
    }
  }
}
```

### **Proxy Configuration**
```http
POST /settings/set/{instanceName}
Content-Type: application/json
apikey: tu-evolution-api-key

{
  "proxy": {
    "enabled": true,
    "host": "proxy.tu-dominio.com",
    "port": 8080,
    "protocol": "http",
    "username": "proxy_user",
    "password": "proxy_pass"
  }
}
```

---

## 🚀 Deployment & Infrastructure

### **Docker Compose Setup**
```yaml
# docker-compose.yml
version: '3.8'

services:
  evolution-api:
    image: davidalvesdev/evolution-api:latest
    container_name: evolution_api
    ports:
      - "8080:8080"
    environment:
      # Server
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - SERVER_URL=https://evolution-api.tu-dominio.com
      
      # Database
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://user:password@postgres:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_FILE_STATUS=true
      
      # Redis Cache
      - REDIS_ENABLED=true
      - REDIS_URI=redis://redis:6379
      - REDIS_PREFIX_KEY=evolution
      
      # Authentication
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=evolution-api-key-super-secret
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      
      # Webhook
      - WEBHOOK_GLOBAL_URL=https://n8n.tu-dominio.com/webhook/whatsapp-global
      - WEBHOOK_GLOBAL_ENABLED=false
      - WEBHOOK_EVENTS_APPLICATION_STARTUP=false
      - WEBHOOK_EVENTS_INSTANCE_CREATE=true
      - WEBHOOK_EVENTS_INSTANCE_DELETE=true
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true
      - WEBHOOK_EVENTS_MESSAGES_SET=true
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_UPDATE=true
      - WEBHOOK_EVENTS_SEND_MESSAGE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      
      # Log
      - LOG_LEVEL=ERROR
      - LOG_COLOR=true
      - LOG_BAILEYS=error
      
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    container_name: postgres_evolution
    environment:
      - POSTGRES_DB=evolution
      - POSTGRES_USER=evolution_user
      - POSTGRES_PASSWORD=evolution_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis_evolution
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  evolution_instances:
  evolution_store:
  postgres_data:
  redis_data:
```

### **Environment Variables**
```bash
# Evolution API Core
SERVER_URL=https://evolution-api.tu-dominio.com
AUTHENTICATION_API_KEY=evolution-api-key-super-secret

# Database
DATABASE_CONNECTION_URI=postgresql://user:password@localhost:5432/evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true

# Redis
REDIS_URI=redis://localhost:6379
REDIS_PREFIX_KEY=evolution

# Webhook Global
WEBHOOK_GLOBAL_URL=https://n8n.tu-dominio.com/webhook/whatsapp-global
WEBHOOK_GLOBAL_ENABLED=false

# Security
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true
```

---

## 🔍 Message Types Reference

### **Text Messages**
```json
{
  "messageType": "conversation",
  "message": {
    "conversation": "Texto del mensaje"
  }
}
```

### **Extended Text (with preview)**
```json
{
  "messageType": "extendedTextMessage",
  "message": {
    "extendedTextMessage": {
      "text": "Mensaje con preview de link",
      "matchedText": "https://ejemplo.com",
      "canonicalUrl": "https://ejemplo.com",
      "description": "Descripción del link",
      "title": "Título del link"
    }
  }
}
```

### **Image Messages**
```json
{
  "messageType": "imageMessage",
  "message": {
    "imageMessage": {
      "url": "https://mmg.whatsapp.net/v/...",
      "mimetype": "image/jpeg",
      "caption": "Descripción de la imagen",
      "fileLength": 123456,
      "height": 1080,
      "width": 1920,
      "mediaKey": "encrypted_media_key",
      "fileEncSha256": "file_hash",
      "directPath": "/v/t62.7118-24/..."
    }
  }
}
```

### **Audio Messages**
```json
{
  "messageType": "audioMessage",
  "message": {
    "audioMessage": {
      "url": "https://mmg.whatsapp.net/v/...",
      "mimetype": "audio/ogg; codecs=opus",
      "fileLength": 45678,
      "seconds": 15,
      "ptt": true,
      "mediaKey": "encrypted_media_key"
    }
  }
}
```

### **Document Messages**
```json
{
  "messageType": "documentMessage",
  "message": {
    "documentMessage": {
      "url": "https://mmg.whatsapp.net/v/...",
      "mimetype": "application/pdf",
      "title": "Documento.pdf",
      "fileLength": 789012,
      "pageCount": 5,
      "fileName": "Documento.pdf"
    }
  }
}
```

### **Location Messages**
```json
{
  "messageType": "locationMessage",
  "message": {
    "locationMessage": {
      "degreesLatitude": -34.6037,
      "degreesLongitude": -58.3816,
      "name": "Ubicación",
      "address": "Dirección completa"
    }
  }
}
```

---

## 🛠️ Troubleshooting

### **Common Issues**

#### **❌ QR Code Expired**
```http
GET /instance/connect/{instanceName}
apikey: tu-evolution-api-key
```

#### **❌ Instance Disconnected**
```http
POST /instance/restart/{instanceName}
apikey: tu-evolution-api-key
```

#### **❌ Webhook Not Working**
```javascript
// Test webhook endpoint
curl -X POST https://n8n.tu-dominio.com/webhook/whatsapp-bot \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "instance": "main_instance_001",
    "data": {
      "message": "Webhook test"
    }
  }'
```

#### **❌ Message Sending Failed**
```http
GET /instance/connectionState/{instanceName}
apikey: tu-evolution-api-key

# Check if status is "open"
# If not, reconnect instance
```

### **Debug Tools**

#### **Instance Logs**
```http
GET /instance/fetchInstances
apikey: tu-evolution-api-key

# Check logs in Docker
docker logs evolution_api --tail 100 -f
```

#### **Message History**
```http
GET /chat/findMessages/{instanceName}
?number=5491123456789&page=1&limit=20
apikey: tu-evolution-api-key
```

#### **Connection Monitoring**
```javascript
// Monitor connection status
setInterval(async () => {
  const response = await fetch(
    'https://evolution-api.tu-dominio.com/instance/connectionState/main_instance_001',
    {
      headers: {
        'apikey': 'evolution-api-key-super-secret'
      }
    }
  );
  
  const status = await response.json();
  console.log('Connection status:', status.connection.state);
  
  if (status.connection.state !== 'open') {
    console.error('⚠️ Instance disconnected!');
    // Trigger reconnection
  }
}, 30000); // Check every 30 seconds
```

---

## 📋 Best Practices

### **🔒 Security**
```markdown
✅ **Security Checklist:**
- [ ] Usar API keys fuertes y únicos
- [ ] Configurar CORS apropiadamente
- [ ] Usar HTTPS para todos los endpoints
- [ ] Configurar webhooks con authentication
- [ ] Rotar API keys regularmente
- [ ] Monitorear accesos no autorizados

🛡️ **Network Security:**
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] Reverse proxy con SSL termination
- [ ] Rate limiting en endpoints públicos
- [ ] VPN para acceso administrativo
```

### **⚡ Performance**
```markdown
📊 **Performance Targets:**
- Message delivery: < 2 seconds
- QR generation: < 5 seconds  
- Webhook response: < 1 second
- Instance startup: < 30 seconds

🔧 **Optimization:**
- [ ] Usar Redis para caching
- [ ] Configurar connection pooling
- [ ] Implementar message queuing
- [ ] Monitorear memory usage
- [ ] Configurar log rotation
```

### **🔄 Maintenance**
```markdown
📅 **Regular Tasks:**
- [ ] Backup de instancias semanalmente
- [ ] Revisar logs de errores
- [ ] Actualizar Evolution API
- [ ] Verificar estado de conexiones
- [ ] Limpiar mensajes antiguos
- [ ] Monitorear uso de recursos

🚨 **Alerts Setup:**
- [ ] Instancia desconectada > 5 min
- [ ] Memory usage > 80%
- [ ] Disk space < 20%
- [ ] Webhook failures > 10/hour
```

---

## 📚 API Reference Summary

### **Instance Management**
- `POST /manager/createInstance` - Crear instancia
- `GET /manager/findInstances` - Listar instancias  
- `DELETE /manager/deleteInstance/{instance}` - Eliminar instancia
- `GET /instance/connect/{instance}` - Obtener QR code
- `GET /instance/connectionState/{instance}` - Estado conexión

### **Message Operations**
- `POST /message/sendText/{instance}` - Enviar texto
- `POST /message/sendMedia/{instance}` - Enviar media
- `POST /message/sendWhatsAppAudio/{instance}` - Enviar audio
- `POST /message/sendLocation/{instance}` - Enviar ubicación

### **Webhook Configuration**
- `POST /webhook/set/{instance}` - Configurar webhook
- `GET /webhook/find/{instance}` - Ver webhook actual

### **Chat Management**
- `GET /chat/findContacts/{instance}` - Obtener contactos
- `GET /chat/findMessages/{instance}` - Historial mensajes
- `GET /chat/getProfilePicture/{instance}` - Foto de perfil

---

**📝 Documento actualizado:** Enero 2025  
**📱 API Version:** Evolution API v2.0+  
**🌐 Base URL:** `https://evolution-api.tu-dominio.com`  
**🔑 Authentication:** API Key in header 