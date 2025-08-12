# 📱 Evolution API - Documentación en Español

## Índice

1. [Introducción](#introducción)
2. [Configuración Inicial](#configuración-inicial)
3. [Instalación y Despliegue](#instalación-y-despliegue)
4. [Configuración de WhatsApp](#configuración-de-whatsapp)
5. [API y Endpoints](#api-y-endpoints)
6. [Integración con n8n](#integración-con-n8n)
7. [Envío Masivo de Mensajes](#envío-masivo-de-mensajes)
8. [Deployment en la Nube](#deployment-en-la-nube)
9. [Troubleshooting](#troubleshooting)

---

## Introducción

Evolution API es una potente API de WhatsApp que permite integrar funcionalidades de WhatsApp en tus aplicaciones y automatizaciones. Soporta múltiples tipos de conexiones y se integra con herramientas como n8n, Typebot, Chatwoot, OpenAI y más.

### Características Principales

- ✅ **Conexión WhatsApp Web** (Baileys)
- ✅ **WhatsApp Business API** (Meta)
- ✅ **Múltiples instancias**
- ✅ **WebSocket y Webhooks**
- ✅ **Integración con n8n**
- ✅ **Envío masivo de mensajes**
- ✅ **Gestión de contactos y grupos**
- ✅ **Soporte para media (imágenes, videos, audio)**

---

## Configuración Inicial

### 1. Requisitos Previos

- Docker y Docker Compose
- Node.js 20.x (opcional, para desarrollo)
- Puerto 8080 disponible
- Al menos 2GB de RAM libre

### 2. Estructura del Proyecto

```
evolution-api/
├── docker-compose.yaml     # Configuración Docker
├── .env                   # Variables de entorno
├── src/                   # Código fuente
├── prisma/               # Esquemas de base de datos
└── public/               # Archivos estáticos
```

### 3. Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto copiando el contenido de `env-config.txt`:

```bash
cp env-config.txt .env
```

**Variables más importantes:**

- `AUTHENTICATION_API_KEY`: Clave de autenticación para la API
- `DATABASE_CONNECTION_URI`: URI de conexión a PostgreSQL
- `CACHE_REDIS_URI`: URI de conexión a Redis
- `SERVER_URL`: URL base del servidor
- `N8N_ENABLED=true`: Habilitado para integración con n8n

---

## Instalación y Despliegue

### Opción 1: Con Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 2. Crear archivo .env
cp env-config.txt .env

# 3. Levantar los servicios
docker-compose up -d

# 4. Verificar estado
docker-compose ps
```

### Opción 2: Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos
npm run db:generate
npm run db:deploy

# 3. Ejecutar en modo desarrollo
npm run dev:server

# 4. Ejecutar en producción
npm run build
npm run start:prod
```

### Verificación de la Instalación

Una vez levantado, la API estará disponible en:

- **API Base**: http://localhost:8080
- **Documentación**: http://localhost:8080/docs
- **Manager**: http://localhost:8080/manager

---

## Configuración de WhatsApp

### 1. Crear una Instancia

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "instanceName": "mi-whatsapp",
    "token": "mi-token-secreto",
    "qrcode": true,
    "webhook": {
      "url": "https://webhook.site/your-webhook-url",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

### 2. Conectar WhatsApp

```bash
# Obtener QR Code
curl -X GET http://localhost:8080/instance/connect/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

**Respuesta:**
```json
{
  "instance": {
    "instanceName": "mi-whatsapp",
    "status": "connecting"
  },
  "qrcode": {
    "code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

### 3. Verificar Estado de la Conexión

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: evolution-api-key-123"
```

---

## API y Endpoints

### Autenticación

Todas las peticiones requieren el header `apikey`:

```bash
-H "apikey: evolution-api-key-123"
```

### Endpoints Principales

#### 📝 Gestión de Instancias

- `POST /instance/create` - Crear instancia
- `GET /instance/fetchInstances` - Listar instancias
- `DELETE /instance/delete/{instanceName}` - Eliminar instancia
- `GET /instance/connect/{instanceName}` - Conectar instancia

#### 💬 Mensajes

- `POST /message/sendText/{instanceName}` - Enviar mensaje de texto
- `POST /message/sendMedia/{instanceName}` - Enviar imagen/video
- `GET /message/findMessages/{instanceName}` - Obtener mensajes

#### 👥 Contactos

- `GET /chat/fetchContacts/{instanceName}` - Obtener contactos
- `POST /chat/updateContactName/{instanceName}` - Actualizar contacto

#### 🎯 Grupos

- `POST /group/create/{instanceName}` - Crear grupo
- `GET /group/fetchAllGroups/{instanceName}` - Listar grupos
- `POST /group/addParticipant/{instanceName}` - Agregar participante

### Ejemplo: Enviar Mensaje de Texto

```bash
curl -X POST http://localhost:8080/message/sendText/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "text": "¡Hola desde Evolution API! 👋"
  }'
```

### Ejemplo: Enviar Imagen

```bash
curl -X POST http://localhost:8080/message/sendMedia/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "mediatype": "image",
    "media": "https://example.com/image.jpg",
    "caption": "Imagen enviada desde Evolution API"
  }'
```

---

## Integración con n8n

### 1. Configurar n8n

```bash
# Instalar n8n
npm install n8n -g

# Ejecutar n8n
n8n start
```

### 2. Configurar Webhook en Evolution API

```bash
curl -X POST http://localhost:8080/webhook/set/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "url": "http://localhost:5678/webhook/whatsapp",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    "webhook_by_events": true
  }'
```

### 3. Configurar Workflow n8n

#### Nodo 1: Webhook Trigger
- **URL**: `http://localhost:5678/webhook/whatsapp`
- **Method**: POST
- **Response**: Inmediato

#### Nodo 2: Procesar Mensaje
```javascript
// Código JavaScript para procesar el mensaje
const data = $input.all()[0].json;

if (data.data && data.data.messages) {
  const message = data.data.messages[0];
  
  return [{
    json: {
      instanceName: data.instance,
      from: message.key.remoteJid,
      message: message.message?.conversation || message.message?.extendedTextMessage?.text,
      timestamp: message.messageTimestamp
    }
  }];
}

return [];
```

#### Nodo 3: Respuesta Automática
- **URL**: `http://localhost:8080/message/sendText/mi-whatsapp`
- **Method**: POST
- **Headers**: `apikey: evolution-api-key-123`
- **Body**:
```json
{
  "number": "{{$node['Procesar Mensaje'].json.from}}",
  "text": "Gracias por tu mensaje: {{$node['Procesar Mensaje'].json.message}}"
}
```

---

## Envío Masivo de Mensajes

### 1. Script de Envío Masivo

```javascript
// bulk-sender.js
const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';
const INSTANCE_NAME = 'mi-whatsapp';

// Lista de contactos
const contacts = [
  { number: '5491123456789', name: 'Juan Pérez' },
  { number: '5491123456790', name: 'María García' },
  { number: '5491123456791', name: 'Carlos López' }
];

async function sendBulkMessage(message) {
  const results = [];
  
  for (const contact of contacts) {
    try {
      const response = await axios.post(
        `${API_BASE}/message/sendText/${INSTANCE_NAME}`,
        {
          number: contact.number,
          text: message.replace('{{name}}', contact.name)
        },
        {
          headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      results.push({
        contact: contact.name,
        status: 'success',
        response: response.data
      });
      
      // Esperar 2 segundos entre mensajes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      results.push({
        contact: contact.name,
        status: 'error',
        error: error.response?.data || error.message
      });
    }
  }
  
  return results;
}

// Ejecutar
(async () => {
  const message = 'Hola {{name}}, este es un mensaje masivo desde Evolution API!';
  const results = await sendBulkMessage(message);
  
  console.log('Resultados del envío masivo:');
  console.log(JSON.stringify(results, null, 2));
})();
```

### 2. Ejecutar el Script

```bash
npm install axios
node bulk-sender.js
```

### 3. Interfaz Web para Envío Masivo

```html
<!DOCTYPE html>
<html>
<head>
    <title>Envío Masivo - Evolution API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        textarea { width: 100%; height: 100px; margin: 10px 0; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        .result { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Envío Masivo WhatsApp</h1>
        
        <div>
            <label>Números (uno por línea):</label>
            <textarea id="numbers" placeholder="5491123456789&#10;5491123456790&#10;5491123456791"></textarea>
        </div>
        
        <div>
            <label>Mensaje:</label>
            <textarea id="message" placeholder="Hola, este es un mensaje masivo!"></textarea>
        </div>
        
        <button onclick="sendBulkMessage()">Enviar Mensajes</button>
        
        <div id="results"></div>
    </div>

    <script>
        const API_BASE = 'http://localhost:8080';
        const API_KEY = 'evolution-api-key-123';
        const INSTANCE_NAME = 'mi-whatsapp';
        
        async function sendBulkMessage() {
            const numbers = document.getElementById('numbers').value.split('\n').filter(n => n.trim());
            const message = document.getElementById('message').value;
            const resultsDiv = document.getElementById('results');
            
            resultsDiv.innerHTML = '<p>Enviando mensajes...</p>';
            
            for (let i = 0; i < numbers.length; i++) {
                const number = numbers[i].trim();
                if (!number) continue;
                
                try {
                    const response = await fetch(`${API_BASE}/message/sendText/${INSTANCE_NAME}`, {
                        method: 'POST',
                        headers: {
                            'apikey': API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            number: number,
                            text: message
                        })
                    });
                    
                    const result = await response.json();
                    
                    resultsDiv.innerHTML += `
                        <div class="result success">
                            ✅ ${number}: Mensaje enviado correctamente
                        </div>
                    `;
                    
                } catch (error) {
                    resultsDiv.innerHTML += `
                        <div class="result error">
                            ❌ ${number}: Error - ${error.message}
                        </div>
                    `;
                }
                
                // Esperar 2 segundos entre mensajes
                if (i < numbers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    </script>
</body>
</html>
```

---

## Deployment en la Nube

### 1. Render.com

1. **Crear cuenta en Render**
2. **Conectar repositorio de GitHub**
3. **Configurar variables de entorno**:
   - `DATABASE_CONNECTION_URI`: URI de PostgreSQL
   - `CACHE_REDIS_URI`: URI de Redis
   - `AUTHENTICATION_API_KEY`: Tu API key
   - `SERVER_URL`: https://tu-app.onrender.com

4. **Configurar Docker**:
   ```yaml
   # render.yaml
   services:
     - type: web
       name: evolution-api
       env: docker
       dockerfilePath: ./Dockerfile
       envVars:
         - key: DATABASE_CONNECTION_URI
           value: your-postgres-uri
         - key: CACHE_REDIS_URI
           value: your-redis-uri
   ```

### 2. Digital Ocean

1. **Crear Droplet**
2. **Instalar Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Configurar firewall**:
   ```bash
   ufw allow 8080
   ufw enable
   ```

4. **Desplegar**:
   ```bash
   git clone https://github.com/EvolutionAPI/evolution-api.git
   cd evolution-api
   cp env-config.txt .env
   # Editar .env con datos de producción
   docker-compose up -d
   ```

### 3. Variables de Entorno para Producción

```env
# Producción
NODE_ENV=PROD
SERVER_URL=https://tu-dominio.com
AUTHENTICATION_API_KEY=tu-api-key-super-segura

# Base de datos externa
DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/evolution

# Redis externo
CACHE_REDIS_URI=redis://host:6379

# SSL (opcional)
SERVER_TYPE=https
SSL_CONF_PRIVKEY=/path/to/privkey.pem
SSL_CONF_FULLCHAIN=/path/to/fullchain.pem
```

---

## Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a la Base de Datos
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solución**: Verificar que PostgreSQL esté ejecutándose y la URI sea correcta.

#### 2. QR Code no Aparece
```
Error: QR code generation failed
```
**Solución**: Verificar que el navegador soporte WebSocket y que no haya proxy bloqueando.

#### 3. Mensajes no se Envían
```
Error: Instance not connected
```
**Solución**: Verificar que la instancia esté conectada a WhatsApp.

#### 4. Error de Autenticación
```
Error: Unauthorized
```
**Solución**: Verificar que el header `apikey` sea correcto.

### Comandos Útiles

```bash
# Ver logs
docker-compose logs -f evolution_api

# Reiniciar servicios
docker-compose restart

# Verificar estado de contenedores
docker-compose ps

# Limpiar datos
docker-compose down -v
```

### Monitoreo

```bash
# Verificar salud de la API
curl -X GET http://localhost:8080/health \
  -H "apikey: evolution-api-key-123"

# Verificar instancias activas
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: evolution-api-key-123"
```

---

## Conclusión

Evolution API es una herramienta poderosa para integrar WhatsApp en tus aplicaciones. Con esta documentación puedes:

- ✅ Configurar y desplegar la API
- ✅ Conectar instancias de WhatsApp
- ✅ Enviar mensajes individuales y masivos
- ✅ Integrar con n8n para automatizaciones
- ✅ Desplegar en la nube

Para soporte adicional, consulta la [documentación oficial](https://doc.evolution-api.com) o únete a la [comunidad Discord](https://evolution-api.com/discord).

---

## Recursos Adicionales

- [Documentación Oficial](https://doc.evolution-api.com)
- [Repositorio GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Colección Postman](https://evolution-api.com/postman)
- [Comunidad Discord](https://evolution-api.com/discord)
- [Ejemplos de Código](https://github.com/EvolutionAPI/evolution-api/tree/main/examples)

*Documentación creada por la comunidad para facilitar el uso de Evolution API en español.* 