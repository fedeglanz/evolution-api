#!/usr/bin/env node

/**
 * Script para probar Evolution API
 * Ejecutar: node test-api.js
 */

const axios = require('axios');
const readline = require('readline');

// Configuración
const API_BASE = 'http://localhost:8080';
const API_KEY = 'evolution-api-key-123';

// Configurar readline para entrada de usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer peticiones HTTP
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method: method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Función para preguntar al usuario
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Función para mostrar el menú
function showMenu() {
  console.log('\n🚀 Evolution API - Menú de Pruebas');
  console.log('=====================================');
  console.log('1. Probar conexión a la API');
  console.log('2. Crear instancia de WhatsApp');
  console.log('3. Listar instancias');
  console.log('4. Conectar instancia (obtener QR)');
  console.log('5. Enviar mensaje de texto');
  console.log('6. Enviar imagen');
  console.log('7. Obtener contactos');
  console.log('8. Configurar webhook');
  console.log('9. Salir');
  console.log('=====================================');
}

// Función para probar la conexión
async function testConnection() {
  console.log('\n📡 Probando conexión a la API...');
  
  const result = await makeRequest('GET', '/');
  
  if (result.success) {
    console.log('✅ Conexión exitosa!');
    console.log('Datos:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error de conexión:', result.error);
  }
}

// Función para crear instancia
async function createInstance() {
  console.log('\n📱 Creando instancia de WhatsApp...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  const token = await askQuestion('Token (opcional, presiona enter para usar por defecto): ') || 'my-token';
  
  const data = {
    instanceName: instanceName,
    token: token,
    qrcode: true,
    webhook: {
      url: 'https://webhook.site/your-webhook-url',
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
    }
  };

  const result = await makeRequest('POST', '/instance/create', data);
  
  if (result.success) {
    console.log('✅ Instancia creada exitosamente!');
    console.log('Datos:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error al crear instancia:', result.error);
  }
}

// Función para listar instancias
async function listInstances() {
  console.log('\n📋 Listando instancias...');
  
  const result = await makeRequest('GET', '/instance/fetchInstances');
  
  if (result.success) {
    console.log('✅ Instancias encontradas:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error al obtener instancias:', result.error);
  }
}

// Función para conectar instancia
async function connectInstance() {
  console.log('\n🔗 Conectando instancia...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  
  const result = await makeRequest('GET', `/instance/connect/${instanceName}`);
  
  if (result.success) {
    console.log('✅ Código QR generado!');
    console.log('Estado:', result.data.instance?.status || 'Conectando...');
    
    if (result.data.qrcode) {
      console.log('\n📱 Escanea este código QR con WhatsApp:');
      console.log('Base64 QR Code:', result.data.qrcode.base64?.substring(0, 100) + '...');
      console.log('\nO visita esta URL para ver el QR completo:');
      console.log(`data:image/png;base64,${result.data.qrcode.base64}`);
    }
  } else {
    console.log('❌ Error al conectar instancia:', result.error);
  }
}

// Función para enviar mensaje
async function sendMessage() {
  console.log('\n💬 Enviando mensaje de texto...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  const number = await askQuestion('Número (con código de país, ej: 5491123456789): ');
  const text = await askQuestion('Mensaje: ');
  
  const data = {
    number: number,
    text: text
  };

  const result = await makeRequest('POST', `/message/sendText/${instanceName}`, data);
  
  if (result.success) {
    console.log('✅ Mensaje enviado exitosamente!');
    console.log('Respuesta:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error al enviar mensaje:', result.error);
  }
}

// Función para enviar imagen
async function sendImage() {
  console.log('\n🖼️ Enviando imagen...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  const number = await askQuestion('Número (con código de país): ');
  const mediaUrl = await askQuestion('URL de la imagen: ');
  const caption = await askQuestion('Pie de foto (opcional): ');
  
  const data = {
    number: number,
    mediatype: 'image',
    media: mediaUrl,
    caption: caption
  };

  const result = await makeRequest('POST', `/message/sendMedia/${instanceName}`, data);
  
  if (result.success) {
    console.log('✅ Imagen enviada exitosamente!');
    console.log('Respuesta:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error al enviar imagen:', result.error);
  }
}

// Función para obtener contactos
async function getContacts() {
  console.log('\n👥 Obteniendo contactos...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  
  const result = await makeRequest('GET', `/chat/fetchContacts/${instanceName}`);
  
  if (result.success) {
    console.log('✅ Contactos obtenidos!');
    console.log(`Total: ${result.data.length} contactos`);
    
    // Mostrar los primeros 5 contactos
    result.data.slice(0, 5).forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name || contact.remoteJid} (${contact.remoteJid})`);
    });
    
    if (result.data.length > 5) {
      console.log(`... y ${result.data.length - 5} más`);
    }
  } else {
    console.log('❌ Error al obtener contactos:', result.error);
  }
}

// Función para configurar webhook
async function configureWebhook() {
  console.log('\n🔗 Configurando webhook...');
  
  const instanceName = await askQuestion('Nombre de la instancia: ');
  const webhookUrl = await askQuestion('URL del webhook: ');
  
  const data = {
    url: webhookUrl,
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'SEND_MESSAGE'],
    webhook_by_events: true
  };

  const result = await makeRequest('POST', `/webhook/set/${instanceName}`, data);
  
  if (result.success) {
    console.log('✅ Webhook configurado exitosamente!');
    console.log('Respuesta:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error al configurar webhook:', result.error);
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de Evolution API...');
  console.log(`📡 API Base: ${API_BASE}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  
  while (true) {
    showMenu();
    const choice = await askQuestion('\nSelecciona una opción: ');
    
    switch (choice) {
      case '1':
        await testConnection();
        break;
      case '2':
        await createInstance();
        break;
      case '3':
        await listInstances();
        break;
      case '4':
        await connectInstance();
        break;
      case '5':
        await sendMessage();
        break;
      case '6':
        await sendImage();
        break;
      case '7':
        await getContacts();
        break;
      case '8':
        await configureWebhook();
        break;
      case '9':
        console.log('👋 ¡Hasta luego!');
        rl.close();
        return;
      default:
        console.log('❌ Opción no válida');
    }
    
    await askQuestion('\nPresiona Enter para continuar...');
  }
}

// Verificar si axios está instalado
try {
  require('axios');
} catch (error) {
  console.log('❌ Axios no está instalado. Ejecuta: npm install axios');
  process.exit(1);
}

// Ejecutar el programa
main().catch(console.error); 