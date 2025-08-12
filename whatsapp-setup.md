# 📱 Configuración de WhatsApp - Evolution API

## Introducción

Esta guía te ayudará a configurar WhatsApp con Evolution API paso a paso, incluyendo la creación de instancias, conexión y gestión de mensajes.

## Tipos de Conexión WhatsApp

### 1. WhatsApp Web (Baileys) - Recomendado para Desarrollo

- ✅ **Gratuito**
- ✅ **Fácil configuración**
- ✅ **Múltiples funcionalidades**
- ⚠️ **Limitaciones de WhatsApp Web**

### 2. WhatsApp Business API (Meta)

- ✅ **Oficial de Meta**
- ✅ **Mayor estabilidad**
- ✅ **Soporte comercial**
- ❌ **Requiere aprobación**
- ❌ **Costo por mensaje**

## Configuración Inicial

### Paso 1: Verificar que la API está funcionando

```bash
# Probar conexión
curl -X GET http://localhost:8080/ \
  -H "apikey: evolution-api-key-123"

# Debería responder con información de la API
```

### Paso 2: Crear una Instancia de WhatsApp

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "instanceName": "mi-whatsapp",
    "token": "mi-token-secreto",
    "qrcode": true,
    "webhook": {
      "url": "https://webhook.site/unique-id",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

**Respuesta exitosa:**
```json
{
  "instance": {
    "instanceName": "mi-whatsapp",
    "status": "created"
  }
}
```

### Paso 3: Obtener el Código QR

```bash
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

### Paso 4: Escanear el QR con WhatsApp

1. **Abrir WhatsApp** en tu teléfono
2. **Ir a Dispositivos vinculados**
3. **Tocar "Vincular un dispositivo"**
4. **Escanear el código QR** mostrado en la respuesta

### Paso 5: Verificar la Conexión

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: evolution-api-key-123"
```

**Respuesta cuando está conectado:**
```json
[
  {
    "instanceName": "mi-whatsapp",
    "status": "open",
    "serverUrl": "http://localhost:8080",
    "apikey": "evolution-api-key-123"
  }
]
```

## Gestión de Mensajes

### Enviar Mensaje de Texto

```bash
curl -X POST http://localhost:8080/message/sendText/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "text": "¡Hola! Este es un mensaje de prueba 📱"
  }'
```

### Enviar Imagen

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

### Enviar Video

```bash
curl -X POST http://localhost:8080/message/sendMedia/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "mediatype": "video",
    "media": "https://example.com/video.mp4",
    "caption": "Video enviado desde Evolution API"
  }'
```

### Enviar Documento

```bash
curl -X POST http://localhost:8080/message/sendMedia/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "mediatype": "document",
    "media": "https://example.com/document.pdf",
    "fileName": "documento.pdf"
  }'
```

### Enviar Audio

```bash
curl -X POST http://localhost:8080/message/sendMedia/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "5491123456789",
    "mediatype": "audio",
    "media": "https://example.com/audio.mp3"
  }'
```

## Gestión de Contactos

### Obtener Contactos

```bash
curl -X GET http://localhost:8080/chat/fetchContacts/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

### Verificar si un número está en WhatsApp

```bash
curl -X POST http://localhost:8080/chat/whatsappNumbers/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "numbers": ["5491123456789", "5491123456790"]
  }'
```

## Gestión de Grupos

### Crear Grupo

```bash
curl -X POST http://localhost:8080/group/create/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "subject": "Mi Grupo de Prueba",
    "description": "Grupo creado desde Evolution API",
    "participants": ["5491123456789", "5491123456790"]
  }'
```

### Listar Grupos

```bash
curl -X GET http://localhost:8080/group/fetchAllGroups/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

### Agregar Participante

```bash
curl -X POST http://localhost:8080/group/addParticipant/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "groupJid": "120363000000000000@g.us",
    "participants": ["5491123456791"]
  }'
```

### Enviar Mensaje a Grupo

```bash
curl -X POST http://localhost:8080/message/sendText/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "number": "120363000000000000@g.us",
    "text": "¡Hola grupo! 👋"
  }'
```

## Configuración de Webhooks

### Configurar Webhook

```bash
curl -X POST http://localhost:8080/webhook/set/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "url": "https://tu-servidor.com/webhook",
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
      "SEND_MESSAGE"
    ],
    "webhook_by_events": true
  }'
```

### Ejemplo de Webhook Recibido

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "mi-whatsapp",
  "data": {
    "messages": [
      {
        "key": {
          "remoteJid": "5491123456789@s.whatsapp.net",
          "fromMe": false,
          "id": "message-id"
        },
        "message": {
          "conversation": "Hola, ¿cómo estás?"
        },
        "messageTimestamp": "1640995200"
      }
    ]
  }
}
```

## Estados de Conexión

### Estados Posibles

- `connecting`: Conectando a WhatsApp
- `open`: Conectado y funcionando
- `close`: Desconectado
- `qr`: Esperando escaneo del código QR

### Monitorear Estado

```bash
# Verificar estado específico
curl -X GET http://localhost:8080/instance/connectionState/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

## Múltiples Instancias

### Crear Segunda Instancia

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "instanceName": "whatsapp-empresa",
    "token": "token-empresa-123",
    "qrcode": true
  }'
```

### Listar Todas las Instancias

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: evolution-api-key-123"
```

## Buenas Prácticas

### 1. Gestión de Sesiones

- **Mantener sesiones activas**: No desconectar frecuentemente
- **Backup de sesiones**: Guardar datos de sesión importantes
- **Monitoreo continuo**: Verificar estado de conexión

### 2. Límites de WhatsApp

- **Máximo 20 mensajes por minuto** por número
- **Evitar spam**: Implementar delays entre mensajes
- **Respetar políticas**: No enviar mensajes no solicitados

### 3. Manejo de Errores

```javascript
// Ejemplo de manejo de errores
async function sendMessage(number, text) {
  try {
    const response = await fetch(`${API_BASE}/message/sendText/mi-whatsapp`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number, text })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    throw error;
  }
}
```

## Troubleshooting

### Problema: QR Code no aparece

**Solución:**
1. Verificar que la instancia esté creada
2. Verificar conexión a internet
3. Reiniciar la instancia si es necesario

```bash
# Reiniciar instancia
curl -X POST http://localhost:8080/instance/restart/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

### Problema: Mensajes no se envían

**Solución:**
1. Verificar que la instancia esté conectada
2. Verificar formato del número
3. Verificar que el contacto esté en WhatsApp

```bash
# Verificar estado de conexión
curl -X GET http://localhost:8080/instance/connectionState/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

### Problema: Instancia se desconecta frecuentemente

**Solución:**
1. Verificar estabilidad de internet
2. Verificar que WhatsApp esté actualizado
3. Considerar usar WhatsApp Business API

## Comandos Útiles

```bash
# Reiniciar instancia
curl -X POST http://localhost:8080/instance/restart/mi-whatsapp \
  -H "apikey: evolution-api-key-123"

# Eliminar instancia
curl -X DELETE http://localhost:8080/instance/delete/mi-whatsapp \
  -H "apikey: evolution-api-key-123"

# Logout de WhatsApp
curl -X POST http://localhost:8080/instance/logout/mi-whatsapp \
  -H "apikey: evolution-api-key-123"
```

¡Listo! Ya tienes WhatsApp funcionando con Evolution API. Puedes proceder a configurar automatizaciones con n8n o crear scripts de envío masivo. 