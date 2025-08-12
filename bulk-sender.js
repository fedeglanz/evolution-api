#!/usr/bin/env node

/**
 * Script Avanzado para Envío Masivo de Mensajes
 * Evolution API Bulk Sender
 * 
 * Uso:
 * node bulk-sender.js --instance mi-whatsapp --csv contacts.csv --message "Hola {{name}}"
 * node bulk-sender.js --instance mi-whatsapp --interactive
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const yargs = require('yargs');

// Configuración por defecto
const CONFIG = {
  API_BASE: 'http://localhost:8080',
  API_KEY: 'evolution-api-key-123',
  DELAY_BETWEEN_MESSAGES: 2000, // 2 segundos
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 50,
  LOG_FILE: 'bulk-sender.log'
};

// Configurar argumentos de línea de comandos
const argv = yargs
  .option('instance', {
    alias: 'i',
    describe: 'Nombre de la instancia de WhatsApp',
    type: 'string',
    demandOption: true
  })
  .option('csv', {
    alias: 'c',
    describe: 'Archivo CSV con contactos',
    type: 'string'
  })
  .option('message', {
    alias: 'm',
    describe: 'Mensaje a enviar (puede usar {{name}} para personalizar)',
    type: 'string'
  })
  .option('interactive', {
    describe: 'Modo interactivo',
    type: 'boolean',
    default: false
  })
  .option('delay', {
    alias: 'd',
    describe: 'Delay entre mensajes en milisegundos',
    type: 'number',
    default: CONFIG.DELAY_BETWEEN_MESSAGES
  })
  .option('batch', {
    alias: 'b',
    describe: 'Tamaño del lote',
    type: 'number',
    default: CONFIG.BATCH_SIZE
  })
  .help()
  .argv;

// Actualizar configuración con argumentos
CONFIG.DELAY_BETWEEN_MESSAGES = argv.delay;
CONFIG.BATCH_SIZE = argv.batch;

// Clase para manejo de logs
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logEntry);
    this.logStream.write(logEntry + '\n');
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
      this.logStream.write(JSON.stringify(data, null, 2) + '\n');
    }
  }

  info(message, data) { this.log('INFO', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  success(message, data) { this.log('SUCCESS', message, data); }

  close() {
    this.logStream.end();
  }
}

// Clase principal para envío masivo
class BulkSender {
  constructor(instanceName, logger) {
    this.instanceName = instanceName;
    this.logger = logger;
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now()
    };
  }

  // Verificar que la instancia esté conectada
  async checkInstance() {
    try {
      const response = await axios.get(`${CONFIG.API_BASE}/instance/fetchInstances`, {
        headers: { 'apikey': CONFIG.API_KEY }
      });

      const instance = response.data.find(i => i.instanceName === this.instanceName);
      
      if (!instance) {
        throw new Error(`Instancia '${this.instanceName}' no encontrada`);
      }

      if (instance.status !== 'open') {
        throw new Error(`Instancia '${this.instanceName}' no está conectada. Estado: ${instance.status}`);
      }

      this.logger.success(`Instancia '${this.instanceName}' está conectada`);
      return true;
    } catch (error) {
      this.logger.error('Error verificando instancia:', error.message);
      return false;
    }
  }

  // Validar número de teléfono
  validatePhoneNumber(number) {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  // Personalizar mensaje
  personalizarMensaje(template, contact) {
    let message = template;
    
    // Reemplazar variables
    message = message.replace(/\{\{name\}\}/g, contact.name || contact.number);
    message = message.replace(/\{\{number\}\}/g, contact.number);
    message = message.replace(/\{\{email\}\}/g, contact.email || '');
    message = message.replace(/\{\{company\}\}/g, contact.company || '');
    
    return message;
  }

  // Enviar mensaje individual
  async sendMessage(contact, message, retryCount = 0) {
    try {
      if (!this.validatePhoneNumber(contact.number)) {
        throw new Error('Número de teléfono inválido');
      }

      const personalizedMessage = this.personalizarMensaje(message, contact);

      const response = await axios.post(
        `${CONFIG.API_BASE}/message/sendText/${this.instanceName}`,
        {
          number: contact.number,
          text: personalizedMessage
        },
        {
          headers: {
            'apikey': CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos timeout
        }
      );

      this.stats.sent++;
      this.logger.success(`Mensaje enviado a ${contact.name || contact.number}`);
      
      return {
        success: true,
        contact: contact,
        response: response.data
      };

    } catch (error) {
      if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        this.logger.warn(`Reintentando envío a ${contact.name || contact.number} (${retryCount + 1}/${CONFIG.MAX_RETRY_ATTEMPTS})`);
        await this.delay(CONFIG.DELAY_BETWEEN_MESSAGES * (retryCount + 1));
        return this.sendMessage(contact, message, retryCount + 1);
      }

      this.stats.failed++;
      this.logger.error(`Error enviando mensaje a ${contact.name || contact.number}:`, error.message);
      
      return {
        success: false,
        contact: contact,
        error: error.message
      };
    }
  }

  // Delay entre mensajes
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Procesar lote de contactos
  async processBatch(batch, message) {
    const results = [];
    
    for (let i = 0; i < batch.length; i++) {
      const contact = batch[i];
      
      this.logger.info(`Procesando ${i + 1}/${batch.length}: ${contact.name || contact.number}`);
      
      const result = await this.sendMessage(contact, message);
      results.push(result);
      
      // Delay entre mensajes (excepto el último)
      if (i < batch.length - 1) {
        await this.delay(CONFIG.DELAY_BETWEEN_MESSAGES);
      }
    }
    
    return results;
  }

  // Envío masivo principal
  async sendBulkMessages(contacts, message) {
    this.logger.info(`Iniciando envío masivo a ${contacts.length} contactos`);
    this.stats.total = contacts.length;
    
    const allResults = [];
    
    // Dividir en lotes
    for (let i = 0; i < contacts.length; i += CONFIG.BATCH_SIZE) {
      const batch = contacts.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(contacts.length / CONFIG.BATCH_SIZE);
      
      this.logger.info(`Procesando lote ${batchNum}/${totalBatches} (${batch.length} contactos)`);
      
      try {
        const batchResults = await this.processBatch(batch, message);
        allResults.push(...batchResults);
        
        // Delay entre lotes
        if (i + CONFIG.BATCH_SIZE < contacts.length) {
          this.logger.info(`Esperando ${CONFIG.DELAY_BETWEEN_MESSAGES * 2}ms antes del siguiente lote...`);
          await this.delay(CONFIG.DELAY_BETWEEN_MESSAGES * 2);
        }
        
      } catch (error) {
        this.logger.error(`Error procesando lote ${batchNum}:`, error.message);
      }
    }
    
    return allResults;
  }

  // Mostrar estadísticas finales
  showStats() {
    const duration = Date.now() - this.stats.startTime;
    const durationMinutes = Math.floor(duration / 60000);
    const durationSeconds = Math.floor((duration % 60000) / 1000);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 ESTADÍSTICAS FINALES');
    console.log('='.repeat(50));
    console.log(`📱 Total de contactos: ${this.stats.total}`);
    console.log(`✅ Mensajes enviados: ${this.stats.sent}`);
    console.log(`❌ Mensajes fallidos: ${this.stats.failed}`);
    console.log(`⏭️ Mensajes omitidos: ${this.stats.skipped}`);
    console.log(`⏱️ Tiempo total: ${durationMinutes}m ${durationSeconds}s`);
    console.log(`📈 Tasa de éxito: ${((this.stats.sent / this.stats.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    this.logger.info('Estadísticas finales:', this.stats);
  }

  // Generar reporte
  generateReport(results) {
    const reportFile = `bulk-report-${Date.now()}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      instance: this.instanceName,
      stats: this.stats,
      results: results
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.logger.info(`Reporte generado: ${reportFile}`);
  }
}

// Función para leer contactos desde CSV
async function readContactsFromCSV(csvFile) {
  return new Promise((resolve, reject) => {
    const contacts = [];
    
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        // Mapear columnas (flexible)
        const contact = {
          name: row.name || row.nombre || row.Name || '',
          number: row.number || row.numero || row.phone || row.telefono || row.Number || row.Phone || '',
          email: row.email || row.correo || row.Email || '',
          company: row.company || row.empresa || row.Company || ''
        };
        
        if (contact.number) {
          contacts.push(contact);
        }
      })
      .on('end', () => {
        console.log(`📋 Cargados ${contacts.length} contactos desde ${csvFile}`);
        resolve(contacts);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Función para crear CSV de ejemplo
function createExampleCSV() {
  const exampleFile = 'contacts-example.csv';
  const csvContent = `name,number,email,company
Juan Pérez,5491123456789,juan@example.com,Empresa A
María García,5491123456790,maria@example.com,Empresa B
Carlos López,5491123456791,carlos@example.com,Empresa C
Ana Rodríguez,5491123456792,ana@example.com,Empresa D
Luis Martínez,5491123456793,luis@example.com,Empresa E`;
  
  fs.writeFileSync(exampleFile, csvContent);
  console.log(`📄 Archivo de ejemplo creado: ${exampleFile}`);
}

// Modo interactivo
async function runInteractiveMode(instanceName) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const ask = (question) => new Promise(resolve => rl.question(question, resolve));
  
  console.log('\n🚀 Modo Interactivo - Envío Masivo WhatsApp');
  console.log('==========================================\n');
  
  try {
    // Verificar si existe archivo CSV
    const csvFile = await ask('📄 Archivo CSV con contactos: ');
    
    if (!fs.existsSync(csvFile)) {
      console.log('❌ Archivo no encontrado. ¿Quieres crear un ejemplo?');
      const createExample = await ask('Crear ejemplo (s/n): ');
      
      if (createExample.toLowerCase() === 's') {
        createExampleCSV();
      }
      
      rl.close();
      return;
    }
    
    // Leer mensaje
    const message = await ask('💬 Mensaje (usa {{name}} para personalizar): ');
    
    // Configuraciones adicionales
    const delay = await ask(`⏱️ Delay entre mensajes en ms (${CONFIG.DELAY_BETWEEN_MESSAGES}): `);
    const batch = await ask(`📦 Tamaño del lote (${CONFIG.BATCH_SIZE}): `);
    
    if (delay) CONFIG.DELAY_BETWEEN_MESSAGES = parseInt(delay);
    if (batch) CONFIG.BATCH_SIZE = parseInt(batch);
    
    // Confirmación
    console.log('\n📋 Resumen:');
    console.log(`Instancia: ${instanceName}`);
    console.log(`Archivo CSV: ${csvFile}`);
    console.log(`Mensaje: ${message}`);
    console.log(`Delay: ${CONFIG.DELAY_BETWEEN_MESSAGES}ms`);
    console.log(`Lote: ${CONFIG.BATCH_SIZE}`);
    
    const confirm = await ask('\n¿Continuar con el envío? (s/n): ');
    
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Envío cancelado');
      rl.close();
      return;
    }
    
    rl.close();
    
    // Ejecutar envío
    const contacts = await readContactsFromCSV(csvFile);
    const logger = new Logger(CONFIG.LOG_FILE);
    const bulkSender = new BulkSender(instanceName, logger);
    
    if (await bulkSender.checkInstance()) {
      const results = await bulkSender.sendBulkMessages(contacts, message);
      bulkSender.showStats();
      bulkSender.generateReport(results);
    }
    
    logger.close();
    
  } catch (error) {
    console.error('❌ Error en modo interactivo:', error.message);
    rl.close();
  }
}

// Función principal
async function main() {
  console.log('🚀 Evolution API - Bulk Sender');
  console.log('==============================\n');
  
  try {
    // Verificar dependencias
    if (!fs.existsSync('node_modules/axios')) {
      console.log('❌ Axios no encontrado. Instala con: npm install axios csv-parser yargs');
      return;
    }
    
    if (argv.interactive) {
      await runInteractiveMode(argv.instance);
      return;
    }
    
    // Verificar argumentos obligatorios
    if (!argv.csv || !argv.message) {
      console.log('❌ Faltan argumentos obligatorios');
      console.log('Uso: node bulk-sender.js --instance mi-whatsapp --csv contacts.csv --message "Hola {{name}}"');
      console.log('O usa: node bulk-sender.js --instance mi-whatsapp --interactive');
      return;
    }
    
    // Ejecutar envío masivo
    const contacts = await readContactsFromCSV(argv.csv);
    const logger = new Logger(CONFIG.LOG_FILE);
    const bulkSender = new BulkSender(argv.instance, logger);
    
    if (await bulkSender.checkInstance()) {
      const results = await bulkSender.sendBulkMessages(contacts, argv.message);
      bulkSender.showStats();
      bulkSender.generateReport(results);
    }
    
    logger.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { BulkSender, CONFIG }; 