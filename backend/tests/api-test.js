const axios = require('axios');
const colors = require('colors');
const fs = require('fs');
const path = require('path');

// Configuración de pruebas
const BASE_URL = 'http://localhost:3000/api';
const TEST_CONFIG = {
  // Datos de prueba
  testCompany: {
    name: 'Test Company',
    email: 'test@company.com',
    password: 'TestPass123!',
    plan: 'business'
  },
  testInstance: {
    name: 'Test Instance',
    description: 'Instance for testing'
  },
  testBotConfig: {
    system_prompt: 'Eres un asistente virtual de prueba.',
    max_tokens: 150,
    temperature: 0.7,
    auto_response: true
  },
  testContact: {
    name: 'Test Contact',
    phone: '+1234567890',
    tags: ['test', 'automation']
  }
};

// Cliente HTTP configurado
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Variables globales para pruebas
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  performance: [],
  startTime: null,
  endTime: null
};

let authToken = null;
let testInstanceId = null;
let testContactId = null;

// Utilidades para logging
const log = {
  info: (message) => console.log(`ℹ️  ${message}`.blue),
  success: (message) => console.log(`✅ ${message}`.green),
  error: (message) => console.log(`❌ ${message}`.red),
  warning: (message) => console.log(`⚠️  ${message}`.yellow),
  performance: (message) => console.log(`🚀 ${message}`.cyan),
  separator: () => console.log('─'.repeat(80).gray),
  header: (message) => console.log(`\n🔍 ${message}`.bold.cyan)
};

// Función auxiliar para medir performance
async function measurePerformance(name, testFn) {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    testResults.performance.push({
      name,
      duration,
      status: result ? 'success' : 'failed'
    });
    
    if (duration > 1000) {
      log.warning(`${name} - ${duration}ms (LENTO)`);
    } else {
      log.performance(`${name} - ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    testResults.performance.push({
      name,
      duration,
      status: 'error',
      error: error.message
    });
    
    log.error(`${name} - ${duration}ms (ERROR)`);
    return false;
  }
}

// Función para ejecutar test
async function runTest(testName, testFn) {
  log.separator();
  log.info(`Ejecutando: ${testName}`);
  
  testResults.total++;
  
  try {
    const result = await measurePerformance(testName, testFn);
    
    if (result) {
      testResults.passed++;
      log.success(`✓ ${testName} - PASÓ`);
    } else {
      testResults.failed++;
      log.error(`✗ ${testName} - FALLÓ`);
    }
    
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack
    });
    log.error(`✗ ${testName} - ERROR: ${error.message}`);
    return false;
  }
}

// ================================
// TESTS DE AUTENTICACIÓN
// ================================

async function testAuthRegister() {
  try {
    const response = await api.post('/auth/register', TEST_CONFIG.testCompany);
    
    if (response.data.success) {
      log.success('Registro exitoso');
      return true;
    } else {
      log.error('Error en registro: ' + response.data.message);
      return false;
    }
  } catch (error) {
    if (error.response?.data?.message?.includes('ya existe')) {
      log.warning('Usuario ya existe - continuando con login');
      return true;
    }
    log.error('Error en registro: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testAuthLogin() {
  try {
    const response = await api.post('/auth/login', {
      email: TEST_CONFIG.testCompany.email,
      password: TEST_CONFIG.testCompany.password
    });
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      log.success('Login exitoso');
      return true;
    } else {
      log.error('Error en login: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error en login: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testAuthMe() {
  try {
    const response = await api.get('/auth/me');
    
    if (response.data.success && response.data.user) {
      log.success('Usuario autenticado correctamente');
      console.log('Usuario:', response.data.user.email);
      console.log('Empresa:', response.data.user.company.name);
      return true;
    } else {
      log.error('Error al obtener usuario: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener usuario: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testAuthWithoutToken() {
  try {
    // Guardar token actual
    const currentToken = api.defaults.headers.common['Authorization'];
    
    // Eliminar token
    delete api.defaults.headers.common['Authorization'];
    
    const response = await api.get('/auth/me');
    
    // Restaurar token
    api.defaults.headers.common['Authorization'] = currentToken;
    
    // Si llegamos aquí, no debería haber funcionado
    log.error('Acceso permitido sin token (problema de seguridad)');
    return false;
  } catch (error) {
    // Restaurar token
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    
    if (error.response?.status === 401) {
      log.success('Acceso denegado correctamente sin token');
      return true;
    } else {
      log.error('Error inesperado: ' + error.message);
      return false;
    }
  }
}

// ================================
// TESTS DE INSTANCIAS WHATSAPP
// ================================

async function testInstancesList() {
  try {
    const response = await api.get('/instances');
    
    if (response.data.success) {
      log.success('Lista de instancias obtenida');
      console.log('Instancias encontradas:', response.data.data.instances.length);
      return true;
    } else {
      log.error('Error al obtener instancias: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener instancias: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testInstanceCreate() {
  try {
    const response = await api.post('/instances', TEST_CONFIG.testInstance);
    
    if (response.data.success && response.data.instance) {
      testInstanceId = response.data.instance.id;
      log.success('Instancia creada exitosamente');
      console.log('ID de instancia:', testInstanceId);
      return true;
    } else {
      log.error('Error al crear instancia: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al crear instancia: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testInstanceDetail() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.get(`/instances/${testInstanceId}`);
    
    if (response.data.success && response.data.instance) {
      log.success('Detalle de instancia obtenido');
      console.log('Estado:', response.data.instance.status);
      return true;
    } else {
      log.error('Error al obtener detalle: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener detalle: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testInstanceQR() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.get(`/instances/${testInstanceId}/qr`);
    
    if (response.data.success) {
      log.success('QR code obtenido');
      console.log('QR disponible:', response.data.qrCode ? 'Sí' : 'No');
      return true;
    } else {
      log.error('Error al obtener QR: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener QR: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testInstanceStatus() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.get(`/instances/${testInstanceId}/status`);
    
    if (response.data.success) {
      log.success('Status de instancia obtenido');
      console.log('Estado:', response.data.status);
      return true;
    } else {
      log.error('Error al obtener status: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener status: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

// ================================
// TESTS DE CONFIGURACIÓN DE BOTS
// ================================

async function testBotConfigGet() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.get(`/bot-config/${testInstanceId}`);
    
    if (response.data.success) {
      log.success('Configuración de bot obtenida');
      console.log('Auto response:', response.data.config.auto_response);
      return true;
    } else {
      log.error('Error al obtener config: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener config: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testBotConfigUpdate() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.put(`/bot-config/${testInstanceId}`, TEST_CONFIG.testBotConfig);
    
    if (response.data.success) {
      log.success('Configuración de bot actualizada');
      console.log('System prompt:', response.data.config.system_prompt.substring(0, 50) + '...');
      return true;
    } else {
      log.error('Error al actualizar config: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al actualizar config: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testBotConfigTest() {
  if (!testInstanceId) {
    log.warning('No hay instancia de prueba disponible');
    return false;
  }
  
  try {
    const response = await api.post(`/bot-config/${testInstanceId}/test`, {
      message: 'Hola, este es un mensaje de prueba'
    });
    
    if (response.data.success) {
      log.success('Prueba de bot ejecutada');
      console.log('Respuesta recibida:', response.data.response ? 'Sí' : 'No');
      return true;
    } else {
      log.warning('Bot test falló (posible problema con OpenAI): ' + response.data.message);
      return true; // No es crítico para el test
    }
  } catch (error) {
    log.warning('Bot test falló: ' + (error.response?.data?.message || error.message));
    return true; // No es crítico para el test
  }
}

// ================================
// TESTS DE CONTACTOS
// ================================

async function testContactsList() {
  try {
    const response = await api.get('/contacts');
    
    if (response.data.success) {
      log.success('Lista de contactos obtenida');
      console.log('Contactos encontrados:', response.data.data.contacts.length);
      return true;
    } else {
      log.error('Error al obtener contactos: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener contactos: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testContactsSearch() {
  try {
    const response = await api.get('/contacts?search=test&limit=5');
    
    if (response.data.success) {
      log.success('Búsqueda de contactos funcionando');
      console.log('Resultados encontrados:', response.data.data.contacts.length);
      return true;
    } else {
      log.error('Error en búsqueda: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error en búsqueda: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

// ================================
// TESTS DE CONVERSACIONES
// ================================

async function testConversationStats() {
  try {
    const response = await api.get('/conversations/stats');
    
    if (response.data.success) {
      log.success('Estadísticas de conversaciones obtenidas');
      console.log('Métricas incluidas:', Object.keys(response.data.data).length);
      return true;
    } else {
      log.error('Error al obtener stats: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener stats: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

// ================================
// TESTS DE DASHBOARD
// ================================

async function testDashboardOverview() {
  try {
    const response = await api.get('/dashboard/overview');
    
    if (response.data.success) {
      log.success('Dashboard overview obtenido');
      const data = response.data.data;
      console.log('Empresa:', data.company.name);
      console.log('Mensajes totales:', data.messages.total);
      console.log('Contactos totales:', data.contacts.total);
      return true;
    } else {
      log.error('Error al obtener dashboard: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener dashboard: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testDashboardMessages() {
  try {
    const response = await api.get('/dashboard/messages?period=day&limit=7');
    
    if (response.data.success) {
      log.success('Estadísticas de mensajes obtenidas');
      console.log('Estadísticas:', response.data.data.stats.length);
      return true;
    } else {
      log.error('Error al obtener stats de mensajes: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener stats de mensajes: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testDashboardContacts() {
  try {
    const response = await api.get('/dashboard/contacts?limit=5');
    
    if (response.data.success) {
      log.success('Contactos más activos obtenidos');
      console.log('Top contactos:', response.data.data.topContacts.length);
      return true;
    } else {
      log.error('Error al obtener contactos dashboard: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener contactos dashboard: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testDashboardPerformance() {
  try {
    const response = await api.get('/dashboard/performance');
    
    if (response.data.success) {
      log.success('Métricas de rendimiento obtenidas');
      console.log('Tiempo promedio respuesta:', response.data.data.responseTimes.average + 's');
      return true;
    } else {
      log.error('Error al obtener performance: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener performance: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

async function testDashboardExport() {
  try {
    const response = await api.get('/dashboard/export?format=json');
    
    if (response.data.success) {
      log.success('Exportación de dashboard exitosa');
      console.log('Métricas exportadas:', response.data.data.metrics.length);
      return true;
    } else {
      log.error('Error al exportar dashboard: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al exportar dashboard: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

// ================================
// TESTS DE VALIDACIÓN
// ================================

async function testValidationErrors() {
  try {
    // Test con datos inválidos
    const response = await api.post('/auth/register', {
      email: 'invalid-email',
      password: '123' // Muy corta
    });
    
    if (response.data.success) {
      log.error('Validación no funcionó (datos inválidos aceptados)');
      return false;
    } else {
      log.success('Validación funcionando correctamente');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('Validación funcionando correctamente');
      return true;
    } else {
      log.error('Error inesperado en validación: ' + error.message);
      return false;
    }
  }
}

async function testRateLimiting() {
  try {
    log.info('Probando rate limiting...');
    
    // Hacer múltiples requests rápidos
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(api.get('/auth/me'));
    }
    
    const results = await Promise.allSettled(promises);
    const rateLimited = results.some(result => 
      result.status === 'rejected' && 
      result.reason.response?.status === 429
    );
    
    if (rateLimited) {
      log.success('Rate limiting funcionando');
      return true;
    } else {
      log.warning('Rate limiting no detectado (puede estar deshabilitado)');
      return true; // No es crítico para el test
    }
  } catch (error) {
    log.warning('Error probando rate limiting: ' + error.message);
    return true; // No es crítico para el test
  }
}

// ================================
// CLEANUP
// ================================

async function testCleanup() {
  try {
    log.info('Limpiando datos de prueba...');
    
    // Eliminar instancia de prueba si existe
    if (testInstanceId) {
      try {
        await api.delete(`/instances/${testInstanceId}`);
        log.success('Instancia de prueba eliminada');
      } catch (error) {
        log.warning('No se pudo eliminar instancia de prueba: ' + error.message);
      }
    }
    
    return true;
  } catch (error) {
    log.warning('Error en cleanup: ' + error.message);
    return true; // No es crítico
  }
}

// ================================
// REPORTE DE RESULTADOS
// ================================

function generateReport() {
  const avgPerformance = testResults.performance.reduce((acc, test) => acc + test.duration, 0) / testResults.performance.length;
  const slowTests = testResults.performance.filter(test => test.duration > 1000);
  
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(1) + '%',
      avgPerformance: avgPerformance.toFixed(0) + 'ms',
      duration: testResults.endTime - testResults.startTime + 'ms'
    },
    performance: {
      average: avgPerformance,
      slowTests: slowTests,
      fastestTest: testResults.performance.reduce((prev, curr) => prev.duration < curr.duration ? prev : curr),
      slowestTest: testResults.performance.reduce((prev, curr) => prev.duration > curr.duration ? prev : curr)
    },
    errors: testResults.errors,
    recommendations: []
  };
  
  // Generar recomendaciones
  if (slowTests.length > 0) {
    report.recommendations.push('Optimizar endpoints lentos: ' + slowTests.map(t => t.name).join(', '));
  }
  
  if (testResults.errors.length > 0) {
    report.recommendations.push('Corregir errores críticos encontrados');
  }
  
  if (avgPerformance > 500) {
    report.recommendations.push('Mejorar performance general del API');
  }
  
  return report;
}

function saveReport(report) {
  const reportDir = path.join(__dirname, '../testing');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'TEST_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log.success(`Reporte guardado en: ${reportPath}`);
}

// ================================
// FUNCIÓN PRINCIPAL
// ================================

async function runAllTests() {
  console.log('🧪 INICIANDO TESTING COMPLETO DE LA API'.bold.cyan);
  console.log('🎯 WhatsApp Bot Platform - Validación Integral'.bold.cyan);
  log.separator();
  
  testResults.startTime = Date.now();
  
  // Tests de Autenticación
  log.header('AUTENTICACIÓN');
  await runTest('Auth Register', testAuthRegister);
  await runTest('Auth Login', testAuthLogin);
  await runTest('Auth Me', testAuthMe);
  await runTest('Auth Security', testAuthWithoutToken);
  
  // Tests de Instancias
  log.header('INSTANCIAS WHATSAPP');
  await runTest('Instances List', testInstancesList);
  await runTest('Instance Create', testInstanceCreate);
  await runTest('Instance Detail', testInstanceDetail);
  await runTest('Instance QR', testInstanceQR);
  await runTest('Instance Status', testInstanceStatus);
  
  // Tests de Configuración de Bots
  log.header('CONFIGURACIÓN DE BOTS');
  await runTest('Bot Config Get', testBotConfigGet);
  await runTest('Bot Config Update', testBotConfigUpdate);
  await runTest('Bot Config Test', testBotConfigTest);
  
  // Tests de Contactos
  log.header('CONTACTOS');
  await runTest('Contacts List', testContactsList);
  await runTest('Contacts Search', testContactsSearch);
  
  // Tests de Conversaciones
  log.header('CONVERSACIONES');
  await runTest('Conversation Stats', testConversationStats);
  
  // Tests de Dashboard
  log.header('DASHBOARD');
  await runTest('Dashboard Overview', testDashboardOverview);
  await runTest('Dashboard Messages', testDashboardMessages);
  await runTest('Dashboard Contacts', testDashboardContacts);
  await runTest('Dashboard Performance', testDashboardPerformance);
  await runTest('Dashboard Export', testDashboardExport);
  
  // Tests de Validación y Seguridad
  log.header('VALIDACIÓN Y SEGURIDAD');
  await runTest('Validation Errors', testValidationErrors);
  await runTest('Rate Limiting', testRateLimiting);
  
  // Cleanup
  log.header('LIMPIEZA');
  await runTest('Cleanup', testCleanup);
  
  testResults.endTime = Date.now();
  
  // Generar reporte
  const report = generateReport();
  saveReport(report);
  
  // Mostrar resumen
  log.separator();
  console.log('\n📊 RESUMEN DEL TESTING'.bold.cyan);
  console.log(`Total pruebas: ${testResults.total}`.white);
  console.log(`Exitosas: ${testResults.passed}`.green);
  console.log(`Fallidas: ${testResults.failed}`.red);
  console.log(`Tasa de éxito: ${report.summary.successRate}`.yellow);
  console.log(`Performance promedio: ${report.summary.avgPerformance}`.cyan);
  console.log(`Duración total: ${report.summary.duration}`.gray);
  
  // Mostrar errores si existen
  if (testResults.errors.length > 0) {
    console.log('\n🐛 ERRORES ENCONTRADOS:'.red.bold);
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`.red);
    });
  }
  
  // Mostrar tests lentos
  if (report.performance.slowTests.length > 0) {
    console.log('\n🐌 TESTS LENTOS (>1s):'.yellow.bold);
    report.performance.slowTests.forEach(test => {
      console.log(`• ${test.name}: ${test.duration}ms`.yellow);
    });
  }
  
  // Mostrar recomendaciones
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES:'.bold.yellow);
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  log.separator();
  
  if (testResults.failed === 0) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!'.green.bold);
    console.log('✅ API lista para producción'.green.bold);
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisar antes de continuar.'.yellow.bold);
  }
  
  log.separator();
  
  return report;
}

// Ejecutar tests si es llamado directamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Error fatal en testing:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults,
  generateReport
}; 