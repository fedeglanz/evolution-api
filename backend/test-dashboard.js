const axios = require('axios');
const colors = require('colors');

// Configuración
const BASE_URL = 'http://localhost:3000/api';
const TEST_CONFIG = {
  email: 'test@example.com',
  password: 'password123'
};

// Cliente HTTP configurado
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Variables globales para tests
let authToken = null;

/**
 * Utilidades para logging
 */
const log = {
  info: (message) => console.log(`ℹ️  ${message}`.blue),
  success: (message) => console.log(`✅ ${message}`.green),
  error: (message) => console.log(`❌ ${message}`.red),
  warning: (message) => console.log(`⚠️  ${message}`.yellow),
  separator: () => console.log('─'.repeat(60).gray)
};

/**
 * Función para hacer login y obtener token
 */
async function login() {
  try {
    log.info('Iniciando sesión...');
    const response = await api.post('/auth/login', {
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password
    });

    if (response.data.success) {
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

/**
 * Probar información de rutas del dashboard
 */
async function testDashboardInfo() {
  try {
    log.info('Probando endpoint de información del dashboard...');
    const response = await api.get('/dashboard/info');
    
    if (response.data.success) {
      log.success('Información del dashboard obtenida');
      console.log('Rutas disponibles:', response.data.availableRoutes.length);
      console.log('Cache configurado:', response.data.caching ? 'Sí' : 'No');
      return true;
    } else {
      log.error('Error en info del dashboard: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error en info del dashboard: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar métricas generales del dashboard
 */
async function testDashboardOverview() {
  try {
    log.info('Probando métricas generales del dashboard...');
    const response = await api.get('/dashboard/overview');
    
    if (response.data.success) {
      log.success('Métricas generales obtenidas');
      const data = response.data.data;
      
      console.log('Empresa:', data.company.name);
      console.log('Plan:', data.company.plan);
      console.log('Mensajes totales:', data.messages.total);
      console.log('Contactos totales:', data.contacts.total);
      console.log('Instancias totales:', data.instances.total);
      console.log('Uso de mensajes:', `${data.messages.usage.used}/${data.messages.usage.limit} (${data.messages.usage.percentage}%)`);
      console.log('Uso de instancias:', `${data.instances.usage.used}/${data.instances.usage.limit} (${data.instances.usage.percentage}%)`);
      console.log('Tasa de respuesta del bot:', `${data.bot.responseRate}%`);
      console.log('Tiempo promedio de respuesta:', `${data.bot.avgResponseTime}s`);
      
      return true;
    } else {
      log.error('Error al obtener métricas: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener métricas: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar estadísticas de mensajes
 */
async function testMessageStats() {
  try {
    log.info('Probando estadísticas de mensajes...');
    const response = await api.get('/dashboard/messages?period=day&limit=7');
    
    if (response.data.success) {
      log.success('Estadísticas de mensajes obtenidas');
      const data = response.data.data;
      
      console.log('Período:', data.period);
      console.log('Estadísticas:', data.stats.length, 'registros');
      console.log('Actividad por hora:', data.hourlyActivity.length, 'horas');
      console.log('Actividad semanal:', data.weeklyActivity.length, 'días');
      
      if (data.stats.length > 0) {
        const latest = data.stats[0];
        console.log('Último período:');
        console.log('- Total mensajes:', latest.totalMessages);
        console.log('- Mensajes recibidos:', latest.messagesReceived);
        console.log('- Mensajes enviados:', latest.messagesSent);
        console.log('- Contactos únicos:', latest.uniqueContacts);
      }
      
      return true;
    } else {
      log.error('Error al obtener estadísticas de mensajes: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener estadísticas de mensajes: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar contactos más activos
 */
async function testTopContacts() {
  try {
    log.info('Probando contactos más activos...');
    const response = await api.get('/dashboard/contacts?limit=5&sort_by=messages');
    
    if (response.data.success) {
      log.success('Contactos más activos obtenidos');
      const data = response.data.data;
      
      console.log('Top contactos:', data.topContacts.length);
      console.log('Nuevos contactos:', data.newContacts.length);
      console.log('Contactos por instancia:', data.contactsByInstance.length);
      
      if (data.topContacts.length > 0) {
        console.log('Top 3 contactos:');
        data.topContacts.slice(0, 3).forEach((contact, index) => {
          console.log(`${index + 1}. ${contact.name || contact.phone}`);
          console.log(`   Mensajes: ${contact.stats.totalMessages}`);
          console.log(`   Días activos: ${contact.stats.activeDays}`);
        });
      }
      
      return true;
    } else {
      log.error('Error al obtener contactos activos: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener contactos activos: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar métricas de rendimiento del bot
 */
async function testBotPerformance() {
  try {
    log.info('Probando métricas de rendimiento del bot...');
    const response = await api.get('/dashboard/performance');
    
    if (response.data.success) {
      log.success('Métricas de rendimiento obtenidas');
      const data = response.data.data;
      
      console.log('Tiempos de respuesta:');
      console.log('- Promedio:', data.responseTimes.average + 's');
      console.log('- Mediana:', data.responseTimes.median + 's');
      console.log('- Mínimo:', data.responseTimes.min + 's');
      console.log('- Máximo:', data.responseTimes.max + 's');
      console.log('- Total respuestas:', data.responseTimes.totalResponses);
      
      console.log('Efectividad:');
      console.log('- Tasa de respuesta:', data.effectiveness.responseRate + '%');
      console.log('- Cobertura de contactos:', data.effectiveness.contactCoverage + '%');
      console.log('- Mensajes del bot:', data.effectiveness.botMessages);
      console.log('- Mensajes de usuarios:', data.effectiveness.userMessages);
      console.log('- Contactos servidos:', data.effectiveness.uniqueContactsServed);
      
      console.log('Actividad por hora:', data.hourlyActivity.length, 'horas');
      console.log('Configuraciones de bots:', data.botConfigurations.length);
      
      return true;
    } else {
      log.error('Error al obtener métricas de rendimiento: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al obtener métricas de rendimiento: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar exportación de métricas
 */
async function testExportMetrics() {
  try {
    log.info('Probando exportación de métricas (JSON)...');
    const response = await api.get('/dashboard/export?format=json&include_details=true');
    
    if (response.data.success) {
      log.success('Exportación de métricas exitosa');
      const data = response.data.data;
      
      console.log('Métricas exportadas:', data.metrics.length);
      console.log('Fecha de exportación:', data.exportedAt);
      console.log('Top contactos incluidos:', data.topContacts ? data.topContacts.length : 'No incluidos');
      
      if (data.metrics.length > 0) {
        console.log('Últimas métricas:');
        const latest = data.metrics[0];
        console.log('- Fecha:', latest.date);
        console.log('- Mensajes totales:', latest.totalMessages);
        console.log('- Contactos únicos:', latest.uniqueContacts);
      }
      
      return true;
    } else {
      log.error('Error al exportar métricas: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error al exportar métricas: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar filtros de fecha
 */
async function testDateFilters() {
  try {
    log.info('Probando filtros de fecha...');
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 7);
    const dateTo = new Date();
    
    const response = await api.get(`/dashboard/overview?date_from=${dateFrom.toISOString().split('T')[0]}&date_to=${dateTo.toISOString().split('T')[0]}`);
    
    if (response.data.success) {
      log.success('Filtros de fecha funcionando');
      const filters = response.data.data.filters;
      console.log('Filtros aplicados:');
      console.log('- Desde:', filters.dateFrom);
      console.log('- Hasta:', filters.dateTo);
      
      return true;
    } else {
      log.error('Error con filtros de fecha: ' + response.data.message);
      return false;
    }
  } catch (error) {
    log.error('Error con filtros de fecha: ' + (error.response?.data?.message || error.message));
    return false;
  }
}

/**
 * Probar diferentes períodos
 */
async function testDifferentPeriods() {
  try {
    log.info('Probando diferentes períodos...');
    const periods = ['hour', 'day', 'week', 'month'];
    let successCount = 0;
    
    for (const period of periods) {
      try {
        const response = await api.get(`/dashboard/messages?period=${period}&limit=5`);
        if (response.data.success) {
          successCount++;
          console.log(`✓ Período ${period}: ${response.data.data.stats.length} registros`);
        }
      } catch (error) {
        console.log(`✗ Período ${period}: Error`);
      }
    }
    
    log.success(`Períodos probados: ${successCount}/${periods.length}`);
    return successCount > 0;
  } catch (error) {
    log.error('Error probando períodos: ' + error.message);
    return false;
  }
}

/**
 * Función principal de pruebas
 */
async function runTests() {
  console.log('🚀 INICIANDO PRUEBAS DEL DASHBOARD API'.bold.cyan);
  log.separator();

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Array de pruebas
  const tests = [
    { name: 'Login', fn: login },
    { name: 'Info dashboard', fn: testDashboardInfo },
    { name: 'Métricas generales', fn: testDashboardOverview },
    { name: 'Estadísticas mensajes', fn: testMessageStats },
    { name: 'Contactos activos', fn: testTopContacts },
    { name: 'Rendimiento bot', fn: testBotPerformance },
    { name: 'Exportar métricas', fn: testExportMetrics },
    { name: 'Filtros fecha', fn: testDateFilters },
    { name: 'Diferentes períodos', fn: testDifferentPeriods }
  ];

  // Ejecutar pruebas
  for (const test of tests) {
    log.separator();
    log.info(`Ejecutando: ${test.name}`);
    
    try {
      const result = await test.fn();
      results.total++;
      
      if (result) {
        results.passed++;
        log.success(`✓ ${test.name} - PASÓ`);
      } else {
        results.failed++;
        log.error(`✗ ${test.name} - FALLÓ`);
      }
    } catch (error) {
      results.total++;
      results.failed++;
      log.error(`✗ ${test.name} - ERROR: ${error.message}`);
    }
  }

  // Mostrar resumen
  log.separator();
  console.log('\n📊 RESUMEN DE PRUEBAS DEL DASHBOARD'.bold.cyan);
  console.log(`Total: ${results.total}`.white);
  console.log(`Pasadas: ${results.passed}`.green);
  console.log(`Fallidas: ${results.failed}`.red);
  console.log(`Éxito: ${((results.passed / results.total) * 100).toFixed(1)}%`.yellow);

  if (results.failed === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL DASHBOARD PASARON!'.green.bold);
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisar configuración.'.yellow.bold);
  }

  log.separator();
  
  // Mostrar recomendaciones
  console.log('\n💡 RECOMENDACIONES PARA PRODUCCIÓN'.bold.yellow);
  console.log('• Configurar Redis para cache del dashboard');
  console.log('• Implementar índices en base de datos para queries pesadas');
  console.log('• Configurar monitoring para métricas críticas');
  console.log('• Implementar alertas para límites de plan');
  console.log('• Considerar vistas materializadas para métricas complejas');
  console.log('• Configurar backup automático de métricas históricas');
  
  log.separator();
}

// Ejecutar pruebas
if (require.main === module) {
  runTests().catch(error => {
    console.error('Error fatal en pruebas del dashboard:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  login,
  testDashboardOverview,
  testMessageStats,
  testTopContacts,
  testBotPerformance
}; 