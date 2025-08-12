# 🔗 Integración Evolution API + n8n

## Introducción

Esta guía te mostrará cómo integrar Evolution API con n8n para crear automatizaciones poderosas con WhatsApp.

## Configuración Inicial

### 1. Instalar n8n

```bash
# Opción 1: Instalar globalmente
npm install n8n -g

# Opción 2: Usar Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Ejecutar n8n

```bash
# Si instalaste globalmente
n8n start

# Acceder a: http://localhost:5678
```

### 3. Configurar Evolution API

Asegúrate de que Evolution API esté funcionando en `http://localhost:8080` con una instancia de WhatsApp conectada.

## Workflows Básicos

### Workflow 1: Respuesta Automática

#### Paso 1: Configurar Webhook en Evolution API

```bash
curl -X POST http://localhost:8080/webhook/set/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "url": "http://localhost:5678/webhook-test/whatsapp",
    "events": ["MESSAGES_UPSERT"],
    "webhook_by_events": true
  }'
```

#### Paso 2: Crear Workflow en n8n

1. **Nodo Webhook**:
   - Agregar nodo "Webhook"
   - Configurar método: POST
   - Configurar ruta: `whatsapp`
   - Respuesta: Immediately

2. **Nodo Procesamiento**:
   - Agregar nodo "Code"
   - Configurar código JavaScript:

```javascript
// Procesar mensaje de WhatsApp
const data = $input.all()[0].json;

// Verificar si es un mensaje válido
if (data.event === 'MESSAGES_UPSERT' && data.data.messages) {
  const message = data.data.messages[0];
  
  // Solo procesar mensajes que no son míos
  if (!message.key.fromMe) {
    return [{
      json: {
        instanceName: data.instance,
        from: message.key.remoteJid,
        message: message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || 
                 'Media message',
        timestamp: message.messageTimestamp,
        messageId: message.key.id
      }
    }];
  }
}

return [];
```

3. **Nodo Respuesta**:
   - Agregar nodo "HTTP Request"
   - Configurar:
     - URL: `http://localhost:8080/message/sendText/mi-whatsapp`
     - Método: POST
     - Headers: `apikey: evolution-api-key-123`
     - Body:

```json
{
  "number": "{{$node['Code'].json.from}}",
  "text": "¡Hola! Recibí tu mensaje: {{$node['Code'].json.message}}"
}
```

### Workflow 2: Chatbot con Respuestas Inteligentes

#### Configuración del Workflow

1. **Nodo Webhook**: Igual que el anterior

2. **Nodo Procesamiento Avanzado**:

```javascript
// Procesar mensaje y determinar respuesta
const data = $input.all()[0].json;

if (data.event === 'MESSAGES_UPSERT' && data.data.messages) {
  const message = data.data.messages[0];
  
  if (!message.key.fromMe) {
    const text = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || '';
    
    let response = '';
    
    // Respuestas automáticas basadas en palabras clave
    if (text.toLowerCase().includes('hola') || text.toLowerCase().includes('hello')) {
      response = '¡Hola! 👋 ¿En qué puedo ayudarte hoy?';
    } else if (text.toLowerCase().includes('precio') || text.toLowerCase().includes('costo')) {
      response = 'Para información sobre precios, escríbeme "precios" y te envío la lista completa 💰';
    } else if (text.toLowerCase().includes('precios')) {
      response = '📋 **Lista de Precios:**\n• Producto A: $100\n• Producto B: $200\n• Producto C: $300';
    } else if (text.toLowerCase().includes('horario')) {
      response = '🕐 **Horarios de Atención:**\nLun-Vie: 9:00 - 18:00\nSáb: 9:00 - 14:00\nDom: Cerrado';
    } else if (text.toLowerCase().includes('contacto')) {
      response = '📞 **Contacto:**\nTeléfono: +54 11 1234-5678\nEmail: info@empresa.com\nDirección: Av. Principal 123';
    } else if (text.toLowerCase().includes('gracias')) {
      response = '¡De nada! 😊 Si necesitas algo más, no dudes en escribirme.';
    } else {
      response = 'Gracias por tu mensaje. Te responderé pronto. Para ayuda inmediata, escribe "ayuda" 🤖';
    }
    
    return [{
      json: {
        instanceName: data.instance,
        from: message.key.remoteJid,
        originalMessage: text,
        response: response,
        timestamp: message.messageTimestamp
      }
    }];
  }
}

return [];
```

3. **Nodo Respuesta**: Igual que el anterior

### Workflow 3: Integración con Base de Datos

#### Configuración

1. **Nodo Webhook**: Igual que los anteriores

2. **Nodo Guardar en Base de Datos**:
   - Agregar nodo "MySQL" o "PostgreSQL"
   - Configurar conexión a base de datos
   - Configurar query:

```sql
INSERT INTO mensajes_whatsapp (
  instancia, 
  numero, 
  mensaje, 
  timestamp
) VALUES (
  '{{$node["Code"].json.instanceName}}',
  '{{$node["Code"].json.from}}',
  '{{$node["Code"].json.message}}',
  FROM_UNIXTIME({{$node["Code"].json.timestamp}})
);
```

3. **Nodo Respuesta Personalizada**:
   - Agregar nodo "Code" para generar respuesta basada en historial

```javascript
// Generar respuesta basada en historial
const userData = $input.all()[0].json;
const userNumber = userData.from;

// Aquí podrías consultar el historial del usuario
// Para este ejemplo, usaremos una respuesta simple
let response = '';

if (userData.message.toLowerCase().includes('historial')) {
  response = 'Revisando tu historial de mensajes... 📋';
} else {
  response = 'Mensaje recibido y guardado en nuestra base de datos ✅';
}

return [{
  json: {
    instanceName: userData.instanceName,
    from: userData.from,
    response: response
  }
}];
```

### Workflow 4: Envío Masivo Programado

#### Configuración

1. **Nodo Cron**:
   - Agregar nodo "Cron"
   - Configurar: `0 9 * * 1` (Lunes a las 9 AM)

2. **Nodo Obtener Contactos**:
   - Agregar nodo "HTTP Request"
   - Configurar:
     - URL: `http://localhost:8080/chat/fetchContacts/mi-whatsapp`
     - Método: GET
     - Headers: `apikey: evolution-api-key-123`

3. **Nodo Procesar Contactos**:

```javascript
// Filtrar contactos activos
const contacts = $input.all()[0].json;
const activeContacts = contacts.filter(contact => 
  contact.name && 
  !contact.name.includes('Grupo') &&
  contact.remoteJid.includes('@s.whatsapp.net')
);

// Tomar solo los primeros 10 para evitar spam
const selectedContacts = activeContacts.slice(0, 10);

return selectedContacts.map(contact => ({
  json: {
    number: contact.remoteJid,
    name: contact.name || contact.remoteJid.split('@')[0],
    message: `¡Hola ${contact.name || 'amigo'}! 👋\n\n` +
             `Espero que tengas una excelente semana.\n\n` +
             `No olvides revisar nuestras ofertas especiales:\n` +
             `🎯 20% de descuento en todos los productos\n` +
             `🎁 Envío gratis en compras superiores a $500\n\n` +
             `¡Que tengas un gran día! 😊`
  }
}));
```

4. **Nodo Enviar Mensajes**:
   - Agregar nodo "HTTP Request"
   - Configurar:
     - URL: `http://localhost:8080/message/sendText/mi-whatsapp`
     - Método: POST
     - Headers: `apikey: evolution-api-key-123`
     - Body:

```json
{
  "number": "{{$json.number}}",
  "text": "{{$json.message}}"
}
```

5. **Nodo Delay** (opcional):
   - Agregar nodo "Wait"
   - Configurar: 3 segundos
   - Esto evita enviar mensajes muy rápido

### Workflow 5: Bot de Soporte con Tickets

#### Configuración

1. **Nodo Webhook**: Igual que los anteriores

2. **Nodo Procesar Solicitud**:

```javascript
// Sistema de tickets básico
const data = $input.all()[0].json;

if (data.event === 'MESSAGES_UPSERT' && data.data.messages) {
  const message = data.data.messages[0];
  
  if (!message.key.fromMe) {
    const text = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || '';
    const userNumber = message.key.remoteJid;
    
    // Generar ID de ticket
    const ticketId = 'TK-' + Date.now().toString().slice(-6);
    
    let response = '';
    let createTicket = false;
    
    if (text.toLowerCase().includes('problema') || 
        text.toLowerCase().includes('error') || 
        text.toLowerCase().includes('soporte')) {
      
      response = `🎫 **Ticket Creado:** ${ticketId}\n\n` +
                 `Tu solicitud ha sido registrada:\n` +
                 `"${text}"\n\n` +
                 `Nuestro equipo te responderá en un máximo de 24 horas.\n\n` +
                 `Para consultar el estado de tu ticket, escribe: STATUS ${ticketId}`;
      
      createTicket = true;
    } else if (text.toUpperCase().includes('STATUS TK-')) {
      const searchTicket = text.match(/STATUS (TK-\d+)/i);
      if (searchTicket) {
        response = `🔍 **Estado del Ticket:** ${searchTicket[1]}\n\n` +
                   `Estado: En proceso\n` +
                   `Asignado a: Equipo de soporte\n` +
                   `Prioridad: Media\n\n` +
                   `Te notificaremos cuando haya actualizaciones.`;
      }
    } else {
      response = 'Hola! 👋 Si tienes algún problema, escribe "problema" seguido de tu consulta para crear un ticket de soporte.';
    }
    
    return [{
      json: {
        instanceName: data.instance,
        from: userNumber,
        response: response,
        ticketId: createTicket ? ticketId : null,
        originalMessage: text,
        createTicket: createTicket
      }
    }];
  }
}

return [];
```

3. **Nodo Guardar Ticket** (condicional):
   - Agregar nodo "MySQL" con condición
   - Configurar para ejecutar solo si `createTicket` es true

```sql
INSERT INTO tickets (
  ticket_id,
  user_number,
  message,
  status,
  created_at
) VALUES (
  '{{$node["Code"].json.ticketId}}',
  '{{$node["Code"].json.from}}',
  '{{$node["Code"].json.originalMessage}}',
  'open',
  NOW()
);
```

## Configuración Avanzada

### Webhook con Múltiples Eventos

```bash
curl -X POST http://localhost:8080/webhook/set/mi-whatsapp \
  -H "Content-Type: application/json" \
  -H "apikey: evolution-api-key-123" \
  -d '{
    "url": "http://localhost:5678/webhook-test/whatsapp-advanced",
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "CONNECTION_UPDATE",
      "PRESENCE_UPDATE"
    ],
    "webhook_by_events": true
  }'
```

### Procesamiento de Diferentes Tipos de Mensaje

```javascript
// Procesar diferentes tipos de mensajes
const data = $input.all()[0].json;

if (data.event === 'MESSAGES_UPSERT' && data.data.messages) {
  const message = data.data.messages[0];
  
  if (!message.key.fromMe) {
    let messageType = 'text';
    let content = '';
    
    if (message.message?.conversation) {
      messageType = 'text';
      content = message.message.conversation;
    } else if (message.message?.extendedTextMessage) {
      messageType = 'text';
      content = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
      messageType = 'image';
      content = message.message.imageMessage.caption || 'Imagen recibida';
    } else if (message.message?.videoMessage) {
      messageType = 'video';
      content = message.message.videoMessage.caption || 'Video recibido';
    } else if (message.message?.audioMessage) {
      messageType = 'audio';
      content = 'Audio recibido';
    } else if (message.message?.documentMessage) {
      messageType = 'document';
      content = `Documento recibido: ${message.message.documentMessage.fileName}`;
    }
    
    // Respuesta basada en tipo de mensaje
    let response = '';
    switch (messageType) {
      case 'text':
        response = `Mensaje de texto recibido: "${content}"`;
        break;
      case 'image':
        response = '📸 Imagen recibida! Te responderé pronto.';
        break;
      case 'video':
        response = '🎬 Video recibido! Procesando...';
        break;
      case 'audio':
        response = '🎵 Audio recibido! Escuchando...';
        break;
      case 'document':
        response = '📄 Documento recibido! Revisando...';
        break;
    }
    
    return [{
      json: {
        instanceName: data.instance,
        from: message.key.remoteJid,
        messageType: messageType,
        content: content,
        response: response
      }
    }];
  }
}

return [];
```

## Monitoreo y Logs

### Workflow de Monitoreo

1. **Nodo Cron**: Cada 5 minutos

2. **Nodo Verificar Estado**:

```javascript
// Verificar estado de la instancia
const response = await fetch('http://localhost:8080/instance/fetchInstances', {
  headers: {
    'apikey': 'evolution-api-key-123'
  }
});

const instances = await response.json();
const instance = instances.find(i => i.instanceName === 'mi-whatsapp');

return [{
  json: {
    instanceName: 'mi-whatsapp',
    status: instance?.status || 'unknown',
    timestamp: new Date().toISOString(),
    isOnline: instance?.status === 'open'
  }
}];
```

3. **Nodo Alerta** (condicional):
   - Ejecutar solo si `isOnline` es false
   - Enviar notificación por email o Slack

## Buenas Prácticas

### 1. Manejo de Errores

```javascript
// Envolver en try-catch
try {
  const response = await fetch('http://localhost:8080/message/sendText/mi-whatsapp', {
    method: 'POST',
    headers: {
      'apikey': 'evolution-api-key-123',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: userNumber,
      text: responseText
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  return [{ json: { success: true, result } }];
  
} catch (error) {
  console.error('Error:', error);
  return [{ json: { success: false, error: error.message } }];
}
```

### 2. Rate Limiting

```javascript
// Implementar delay entre mensajes
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Antes de enviar mensaje
await delay(2000); // Esperar 2 segundos
```

### 3. Validación de Números

```javascript
// Validar formato de número
function validatePhoneNumber(number) {
  const cleaned = number.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

if (!validatePhoneNumber(userNumber)) {
  return [{ json: { error: 'Número de teléfono inválido' } }];
}
```

## Troubleshooting

### Error: Webhook no recibe datos

**Solución:**
1. Verificar que n8n esté ejecutándose en el puerto correcto
2. Verificar que la URL del webhook sea accesible
3. Verificar logs de n8n y Evolution API

### Error: Mensajes no se envían

**Solución:**
1. Verificar que la instancia esté conectada
2. Verificar API key
3. Verificar formato de la petición

### Error: Workflow muy lento

**Solución:**
1. Optimizar código JavaScript
2. Implementar cache para consultas repetitivas
3. Usar delays apropriados

## Ejemplos de Uso

### E-commerce

- Confirmación de pedidos
- Seguimiento de envíos
- Soporte al cliente
- Ofertas personalizadas

### Servicios

- Citas y recordatorios
- Notificaciones de estado
- Encuestas de satisfacción
- Soporte técnico

### Educación

- Recordatorios de clases
- Entrega de tareas
- Comunicación con padres
- Anuncios importantes

¡Con estas configuraciones ya tienes una base sólida para automatizar WhatsApp con n8n! 🚀 