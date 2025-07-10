const express = require('express');
const router = express.Router();

// Import controllers and middleware
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Rutas del dashboard

// Información de rutas (para desarrollo) - debe ir ANTES de las rutas parametrizadas
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard routes - Métricas y estadísticas empresariales',
    availableRoutes: [
      'GET /api/dashboard/overview - Métricas generales del dashboard',
      'GET /api/dashboard/messages - Estadísticas de mensajes por período',
      'GET /api/dashboard/contacts - Contactos más activos',
      'GET /api/dashboard/performance - Métricas de rendimiento del bot',
      'GET /api/dashboard/export - Exportar métricas del dashboard'
    ],
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    permissions: {
      access: 'Solo métricas de la empresa del usuario',
      isolation: 'Aislamiento automático por empresa'
    },
    filters: {
      dateFrom: 'Filtrar desde fecha (YYYY-MM-DD)',
      dateTo: 'Filtrar hasta fecha (YYYY-MM-DD)',
      instanceId: 'Filtrar por instancia específica'
    },
    overview: {
      metrics: 'Mensajes, contactos, instancias, bot effectiveness',
      usage: 'Uso vs límites del plan',
      periods: 'Hoy, semana, mes'
    },
    messages: {
      periods: 'hour, day, week, month',
      types: 'text, image, audio, video, document',
      activity: 'Horarios y días más activos'
    },
    contacts: {
      sorting: 'messages, recent_activity, bot_interactions',
      includeBlocked: 'Incluir contactos bloqueados',
      newContacts: 'Contactos nuevos (últimos 7 días)'
    },
    performance: {
      responseTimes: 'Promedio, mediana, min, max',
      effectiveness: 'Tasa de respuesta, cobertura de contactos',
      botActivity: 'Actividad por hora',
      configurations: 'Configuraciones por instancia'
    },
    export: {
      formats: 'json, csv',
      includeDetails: 'Incluir detalles adicionales',
      limit: 'Máximo 1000 registros'
    },
    caching: {
      recommended: 'Considerar cache Redis para queries pesadas',
      ttl: 'TTL recomendado: 5-15 minutos'
    }
  });
});

/**
 * GET /api/dashboard/overview
 * Obtener métricas generales del dashboard
 */
router.get('/overview', dashboardController.getOverview);

/**
 * GET /api/dashboard/messages
 * Obtener estadísticas de mensajes por período
 */
router.get('/messages', dashboardController.getMessageStats);

/**
 * GET /api/dashboard/contacts
 * Obtener contactos más activos
 */
router.get('/contacts', dashboardController.getTopContacts);

/**
 * GET /api/dashboard/performance
 * Obtener métricas de rendimiento del bot
 */
router.get('/performance', dashboardController.getBotPerformance);

/**
 * GET /api/dashboard/export
 * Exportar métricas del dashboard
 */
router.get('/export', dashboardController.exportDashboard);

module.exports = router;
