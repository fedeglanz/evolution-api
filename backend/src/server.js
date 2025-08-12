const app = require('./app');
const config = require('./config');
const database = require('./database');
const schedulerService = require('./services/schedulerService');
const groupSyncService = require('./services/groupSyncService');

// Port configuration
const PORT = config.PORT || 3000;

// Server instance
let server;

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔄 Verificando conexión a la base de datos...');
    await database.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida');
    
    // Check if whatsapp_bot schema exists
    const schemaExists = await database.checkSchema();
    if (!schemaExists) {
      console.log('⚠️  Esquema whatsapp_bot no encontrado. Ejecuta las migraciones primero.');
      process.exit(1);
    }
    
    // Start server
    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`📱 WhatsApp Bot API v1.0.0`);
      console.log(`🌍 Entorno: ${config.NODE_ENV}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📚 API Info: http://localhost:${PORT}/api/info`);
      console.log(`🔗 Base URL: http://localhost:${PORT}/api`);
      
      if (config.NODE_ENV === 'development') {
        console.log('\n📋 Endpoints disponibles:');
        console.log('   POST /api/auth/login - Autenticación');
        console.log('   POST /api/auth/register - Registro');
        console.log('   GET  /api/instances - Listar instancias');
        console.log('   POST /api/instances - Crear instancia');
        console.log('   GET  /api/dashboard - Dashboard');
        console.log('   GET  /api/conversations - Conversaciones');
        console.log('   GET  /api/contacts - Contactos');
        console.log('   GET  /api/bot-config - Configuración del bot');
      }

      // Iniciar servicios automáticos
      console.log('\n🕐 Iniciando servicios automáticos...');
      schedulerService.start();
      groupSyncService.start();
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
      
      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requiere privilegios elevados`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} ya está en uso`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Señal ${signal} recibida, cerrando servidor...`);
  
  if (server) {
    server.close(async () => {
      console.log('🔄 Cerrando conexiones HTTP...');
      
      try {
        // Stop services
        schedulerService.stop();
        groupSyncService.stop();
        
        // Close database connections
        await database.close();
        console.log('✅ Conexiones de base de datos cerradas');
      } catch (error) {
        console.error('❌ Error al cerrar conexiones de base de datos:', error);
      }
      
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forzando cierre del servidor...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

module.exports = server;
