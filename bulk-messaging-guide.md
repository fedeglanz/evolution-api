# 📬 Guía Completa - Envío Masivo de Mensajes

## Introducción

Esta guía te mostrará cómo enviar mensajes masivos de WhatsApp usando Evolution API de forma eficiente y respetando las mejores prácticas.

## ⚠️ Consideraciones Importantes

### Límites de WhatsApp
- **Máximo 20 mensajes por minuto** por número
- **Evitar spam**: Implementar delays entre mensajes
- **Respetar políticas**: No enviar mensajes no solicitados
- **Verificar números**: Asegurarse de que están en WhatsApp

### Buenas Prácticas
- **Personalizar mensajes**: Usar nombres y variables
- **Segmentar audiencias**: Enviar mensajes relevantes
- **Horarios apropiados**: Enviar en horas laborales
- **Monitorear resultados**: Seguir métricas de entrega

## Instalación de Dependencias

```bash
# Instalar dependencias necesarias
npm install axios csv-parser yargs
```

## Método 1: Script Avanzado (Recomendado)

### Uso Básico

```bash
# Instalar dependencias
npm install axios csv-parser yargs

# Usar modo interactivo
node bulk-sender.js --instance mi-whatsapp --interactive

# Usar con archivo CSV
node bulk-sender.js --instance mi-whatsapp --csv contacts.csv --message "Hola {{name}}"
```

### Formato del Archivo CSV

```csv
name,number,email,company
Juan Pérez,5491123456789,juan@example.com,Empresa A
María García,5491123456790,maria@example.com,Empresa B
Carlos López,5491123456791,carlos@example.com,Empresa C
```

**Columnas soportadas:**
- `name`, `nombre`, `Name`: Nombre del contacto
- `number`, `numero`, `phone`, `telefono`: Número de teléfono
- `email`, `correo`: Email del contacto
- `company`, `empresa`: Empresa del contacto

### Variables en Mensajes

```text
Hola {{name}}, espero que estés bien.

Tu empresa {{company}} está invitada a nuestro evento.

Confirma tu asistencia a {{email}}

Saludos!
```

### Opciones del Script

```bash
# Opciones disponibles
--instance, -i    # Nombre de la instancia (obligatorio)
--csv, -c         # Archivo CSV con contactos
--message, -m     # Mensaje a enviar
--interactive     # Modo interactivo
--delay, -d       # Delay entre mensajes (ms)
--batch, -b       # Tamaño del lote
--help           # Mostrar ayuda
```

### Ejemplos de Uso

```bash
# Envío básico
node bulk-sender.js -i mi-whatsapp -c contacts.csv -m "Hola {{name}}"

# Con delay personalizado (5 segundos)
node bulk-sender.js -i mi-whatsapp -c contacts.csv -m "Hola {{name}}" -d 5000

# Con lotes más pequeños
node bulk-sender.js -i mi-whatsapp -c contacts.csv -m "Hola {{name}}" -b 10
```

## Método 2: Script Simple

### Crear Script Básico

```javascript
// simple-bulk.js
const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';
const INSTANCE_NAME = 'mi-whatsapp';

// Lista de contactos
const contacts = [
  { name: 'Juan Pérez', number: '5491123456789' },
  { name: 'María García', number: '5491123456790' },
  { name: 'Carlos López', number: '5491123456791' }
];

async function sendBulkMessages() {
  const message = 'Hola {{name}}, este es un mensaje masivo!';
  
  for (const contact of contacts) {
    try {
      const personalizedMessage = message.replace('{{name}}', contact.name);
      
      const response = await axios.post(
        `${API_BASE}/message/sendText/${INSTANCE_NAME}`,
        {
          number: contact.number,
          text: personalizedMessage
        },
        {
          headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Mensaje enviado a ${contact.name}`);
      
      // Esperar 3 segundos antes del siguiente mensaje
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ Error enviando a ${contact.name}:`, error.message);
    }
  }
}

sendBulkMessages();
```

### Ejecutar Script Simple

```bash
node simple-bulk.js
```

## Método 3: Interfaz Web

### Crear Interfaz HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>Envío Masivo WhatsApp</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; margin-bottom: 10px; }
        button { background: #25D366; color: white; padding: 12px 24px; border: none; cursor: pointer; border-radius: 4px; }
        button:hover { background: #128C7E; }
        .result { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .progress { background: #f0f0f0; height: 20px; border-radius: 10px; margin: 10px 0; }
        .progress-bar { background: #25D366; height: 100%; border-radius: 10px; transition: width 0.3s; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Envío Masivo WhatsApp - Evolution API</h1>
        
        <div class="form-group">
            <label>Instancia de WhatsApp:</label>
            <input type="text" id="instance" value="mi-whatsapp" placeholder="Nombre de la instancia">
        </div>
        
        <div class="form-group">
            <label>Contactos (un número por línea con nombre opcional):</label>
            <textarea id="contacts" rows="8" placeholder="5491123456789,Juan Pérez&#10;5491123456790,María García&#10;5491123456791,Carlos López"></textarea>
        </div>
        
        <div class="form-group">
            <label>Mensaje (usa {{name}} para personalizar):</label>
            <textarea id="message" rows="4" placeholder="Hola {{name}}, este es un mensaje masivo desde Evolution API!"></textarea>
        </div>
        
        <div class="form-group">
            <label>Delay entre mensajes (segundos):</label>
            <input type="number" id="delay" value="3" min="1" max="60">
        </div>
        
        <button onclick="sendBulkMessages()" id="sendButton">Enviar Mensajes</button>
        
        <div class="progress" id="progressContainer" style="display: none;">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        
        <div class="stats" id="stats" style="display: none;">
            <div class="stat-item">
                <strong id="totalCount">0</strong>
                <div>Total</div>
            </div>
            <div class="stat-item">
                <strong id="sentCount">0</strong>
                <div>Enviados</div>
            </div>
            <div class="stat-item">
                <strong id="errorCount">0</strong>
                <div>Errores</div>
            </div>
            <div class="stat-item">
                <strong id="successRate">0%</strong>
                <div>Éxito</div>
            </div>
        </div>
        
        <div id="results"></div>
    </div>

    <script>
        const API_BASE = 'http://localhost:8080';
        const API_KEY = 'evolution-api-key-123';
        
        let stats = {
            total: 0,
            sent: 0,
            errors: 0
        };
        
        function parseContacts(contactsText) {
            const lines = contactsText.split('\n').filter(line => line.trim());
            return lines.map(line => {
                const [number, name] = line.split(',').map(s => s.trim());
                return { number, name: name || number };
            });
        }
        
        function updateStats() {
            document.getElementById('totalCount').textContent = stats.total;
            document.getElementById('sentCount').textContent = stats.sent;
            document.getElementById('errorCount').textContent = stats.errors;
            
            const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
            document.getElementById('successRate').textContent = successRate + '%';
            
            const progress = stats.total > 0 ? ((stats.sent + stats.errors) / stats.total) * 100 : 0;
            document.getElementById('progressBar').style.width = progress + '%';
        }
        
        function addResult(contact, success, message) {
            const resultDiv = document.createElement('div');
            resultDiv.className = `result ${success ? 'success' : 'error'}`;
            resultDiv.innerHTML = `
                <strong>${contact.name} (${contact.number})</strong>: ${message}
            `;
            document.getElementById('results').appendChild(resultDiv);
            
            // Scroll to bottom
            resultDiv.scrollIntoView({ behavior: 'smooth' });
        }
        
        async function sendBulkMessages() {
            const instance = document.getElementById('instance').value;
            const contactsText = document.getElementById('contacts').value;
            const messageTemplate = document.getElementById('message').value;
            const delay = parseInt(document.getElementById('delay').value) * 1000;
            
            if (!instance || !contactsText || !messageTemplate) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            const contacts = parseContacts(contactsText);
            
            // Reset stats
            stats = { total: contacts.length, sent: 0, errors: 0 };
            
            // Show progress
            document.getElementById('progressContainer').style.display = 'block';
            document.getElementById('stats').style.display = 'flex';
            document.getElementById('results').innerHTML = '';
            document.getElementById('sendButton').disabled = true;
            document.getElementById('sendButton').textContent = 'Enviando...';
            
            updateStats();
            
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                
                try {
                    const personalizedMessage = messageTemplate.replace(/\{\{name\}\}/g, contact.name);
                    
                    const response = await fetch(`${API_BASE}/message/sendText/${instance}`, {
                        method: 'POST',
                        headers: {
                            'apikey': API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            number: contact.number,
                            text: personalizedMessage
                        })
                    });
                    
                    if (response.ok) {
                        stats.sent++;
                        addResult(contact, true, 'Mensaje enviado correctamente');
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                } catch (error) {
                    stats.errors++;
                    addResult(contact, false, `Error: ${error.message}`);
                }
                
                updateStats();
                
                // Delay between messages (except last one)
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            document.getElementById('sendButton').disabled = false;
            document.getElementById('sendButton').textContent = 'Enviar Mensajes';
            
            // Show final message
            const finalMessage = document.createElement('div');
            finalMessage.className = 'result success';
            finalMessage.innerHTML = `
                <strong>🎉 Envío completado!</strong><br>
                Total: ${stats.total} | Enviados: ${stats.sent} | Errores: ${stats.errors}
            `;
            document.getElementById('results').appendChild(finalMessage);
        }
    </script>
</body>
</html>
```

## Método 4: Integración con Base de Datos

### Script con MySQL

```javascript
// db-bulk-sender.js
const mysql = require('mysql2/promise');
const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';
const INSTANCE_NAME = 'mi-whatsapp';

// Configuración de base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'contacts_db'
};

async function getContactsFromDB() {
  const connection = await mysql.createConnection(dbConfig);
  
  const [rows] = await connection.execute(`
    SELECT name, phone_number as number, email, company 
    FROM contacts 
    WHERE active = 1 AND phone_number IS NOT NULL
  `);
  
  await connection.end();
  return rows;
}

async function logMessageToDB(contact, status, message) {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(`
    INSERT INTO message_log (contact_id, phone_number, status, message, sent_at)
    VALUES (?, ?, ?, ?, NOW())
  `, [contact.id, contact.number, status, message]);
  
  await connection.end();
}

async function sendBulkFromDB() {
  const contacts = await getContactsFromDB();
  const messageTemplate = 'Hola {{name}}, mensaje desde la base de datos!';
  
  for (const contact of contacts) {
    try {
      const personalizedMessage = messageTemplate.replace('{{name}}', contact.name);
      
      const response = await axios.post(
        `${API_BASE}/message/sendText/${INSTANCE_NAME}`,
        {
          number: contact.number,
          text: personalizedMessage
        },
        {
          headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      await logMessageToDB(contact, 'sent', personalizedMessage);
      console.log(`✅ Mensaje enviado a ${contact.name}`);
      
    } catch (error) {
      await logMessageToDB(contact, 'failed', error.message);
      console.error(`❌ Error enviando a ${contact.name}:`, error.message);
    }
    
    // Delay
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

sendBulkFromDB();
```

## Método 5: Envío Programado

### Script con Cron

```javascript
// scheduled-bulk.js
const cron = require('node-cron');
const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';
const INSTANCE_NAME = 'mi-whatsapp';

const contacts = [
  { name: 'Juan Pérez', number: '5491123456789' },
  { name: 'María García', number: '5491123456790' }
];

async function sendScheduledMessage() {
  const message = 'Buenos días {{name}}! Que tengas un excelente día 🌞';
  
  console.log('Enviando mensajes programados...');
  
  for (const contact of contacts) {
    try {
      const personalizedMessage = message.replace('{{name}}', contact.name);
      
      await axios.post(
        `${API_BASE}/message/sendText/${INSTANCE_NAME}`,
        {
          number: contact.number,
          text: personalizedMessage
        },
        {
          headers: {
            'apikey': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Mensaje enviado a ${contact.name}`);
      
    } catch (error) {
      console.error(`❌ Error enviando a ${contact.name}:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Programar envío todos los días a las 9:00 AM
cron.schedule('0 9 * * *', sendScheduledMessage);

// Programar envío los lunes a las 2:00 PM
cron.schedule('0 14 * * 1', () => {
  console.log('Enviando mensaje semanal...');
  sendScheduledMessage();
});

console.log('Scheduler iniciado. Presiona Ctrl+C para detener.');
```

## Monitoreo y Análisis

### Script de Monitoreo

```javascript
// monitor-bulk.js
const fs = require('fs');
const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';
const INSTANCE_NAME = 'mi-whatsapp';

async function checkInstanceStatus() {
  try {
    const response = await axios.get(`${API_BASE}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });
    
    const instance = response.data.find(i => i.instanceName === INSTANCE_NAME);
    
    if (instance && instance.status === 'open') {
      console.log('✅ Instancia conectada correctamente');
      return true;
    } else {
      console.log('❌ Instancia desconectada');
      return false;
    }
  } catch (error) {
    console.error('Error verificando instancia:', error.message);
    return false;
  }
}

async function getMessageHistory() {
  try {
    const response = await axios.get(`${API_BASE}/message/findMessages/${INSTANCE_NAME}`, {
      headers: { 'apikey': API_KEY }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error obteniendo historial:', error.message);
    return [];
  }
}

async function generateDailyReport() {
  console.log('📊 Generando reporte diario...');
  
  const isConnected = await checkInstanceStatus();
  const messages = await getMessageHistory();
  
  const today = new Date().toISOString().split('T')[0];
  const todayMessages = messages.filter(msg => 
    msg.timestamp && msg.timestamp.startsWith(today)
  );
  
  const report = {
    date: today,
    instanceStatus: isConnected ? 'connected' : 'disconnected',
    totalMessages: todayMessages.length,
    sentMessages: todayMessages.filter(msg => msg.status === 'sent').length,
    failedMessages: todayMessages.filter(msg => msg.status === 'failed').length
  };
  
  fs.writeFileSync(`report-${today}.json`, JSON.stringify(report, null, 2));
  console.log('📄 Reporte guardado:', `report-${today}.json`);
}

// Ejecutar reporte
generateDailyReport();
```

## Mejores Prácticas

### 1. Validación de Números

```javascript
function validatePhoneNumber(number) {
  // Remover caracteres no numéricos
  const cleaned = number.replace(/\D/g, '');
  
  // Verificar longitud
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Verificar que empiece con código de país
  if (!cleaned.startsWith('54')) { // Argentina
    return false;
  }
  
  return true;
}
```

### 2. Manejo de Errores Robusto

```javascript
async function sendWithRetry(contact, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(/* ... */);
      return { success: true, response: response.data };
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}
```

### 3. Rate Limiting

```javascript
class RateLimiter {
  constructor(maxRequests = 20, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async checkLimit() {
    const now = Date.now();
    
    // Limpiar requests antiguos
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      console.log(`Rate limit alcanzado. Esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## Troubleshooting

### Error: "Instance not connected"
```bash
# Verificar estado de la instancia
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: evolution-api-key-123"
```

### Error: "Rate limit exceeded"
```bash
# Aumentar delay entre mensajes
node bulk-sender.js --delay 5000
```

### Error: "Invalid phone number"
```bash
# Verificar formato de números en CSV
# Deben incluir código de país: 5491123456789
```

## Ejemplos de Uso

### E-commerce
```text
Hola {{name}}! 🛒

Tu pedido #1234 ha sido procesado.
Estado: En preparación
Estimado de entrega: 2-3 días

Gracias por tu compra!
```

### Servicios Médicos
```text
Estimado/a {{name}},

Le recordamos su cita médica:
📅 Fecha: Mañana 10:00 AM
👨‍⚕️ Doctor: Dr. Smith
📍 Consultorio: Av. Principal 123

Confirme su asistencia respondiendo SÍ
```

### Eventos
```text
¡Hola {{name}}! 🎉

Estás invitado/a a nuestro evento:
"{{event_name}}"

📅 Fecha: {{date}}
🕐 Hora: {{time}}
📍 Lugar: {{location}}

¡Esperamos verte allí!
```

¡Con estas herramientas ya puedes crear campañas de envío masivo efectivas y profesionales! 📱✨ 