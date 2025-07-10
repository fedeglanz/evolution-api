const express = require('express');
const router = express.Router();

// Import controllers and middleware
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Rutas para gestión de conversaciones

// Información de rutas (para desarrollo) - debe ir ANTES de las rutas parametrizadas
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Conversations routes - Gestión de conversaciones de WhatsApp',
    availableRoutes: [
      'GET /api/conversations/:contactId - Historial de conversaciones',
      'POST /api/conversations/:contactId/send - Enviar mensaje manual',
      'GET /api/conversations/:contactId/summary - Resumen de conversación',
      'GET /api/conversations/stats - Métricas generales',
      'GET /api/conversations/export - Exportar historial (CSV/JSON)'
    ],
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    permissions: {
      access: 'Solo conversaciones de la empresa del usuario',
      isolation: 'Aislamiento automático por empresa'
    },
    conversationFilters: {
      instance_id: 'Filtrar por instancia específica',
      date_from: 'Filtrar desde fecha',
      date_to: 'Filtrar hasta fecha',
      message_type: 'Filtrar por tipo de mensaje (text, image, audio, video, document)',
      is_from_bot: 'Filtrar por origen (true/false)'
    },
    sendMessage: {
      required: 'message_text, instance_id',
      optional: 'message_type (default: text)',
      restrictions: 'Instancia debe estar conectada'
    },
    statistics: {
      overview: 'Resumen general de actividad',
      messageTypes: 'Distribución por tipo de mensaje',
      instanceStats: 'Actividad por instancia',
      dailyActivity: 'Actividad diaria (últimos 30 días)'
    },
    export: {
      formats: 'csv, json',
      filters: 'contact_id, instance_id, date_from, date_to',
      limit: 'Máximo 10,000 registros'
    },
    pagination: {
      page: 'Número de página (default: 1)',
      limit: 'Elementos por página (default: 20, max: 100)'
    }
  });
});

/**
 * GET /api/conversations/stats
 * Obtener métricas generales de conversaciones
 */
router.get('/stats', conversationController.getConversationStats);

/**
 * GET /api/conversations/export
 * Exportar historial de conversaciones (CSV/JSON)
 */
router.get('/export', conversationController.exportConversations);

/**
 * GET /api/conversations/:contactId
 * Obtener historial de conversaciones de un contacto
 */
router.get('/:contactId', conversationController.getConversations);

/**
 * POST /api/conversations/:contactId/send
 * Enviar mensaje manual
 */
router.post('/:contactId/send', conversationController.sendMessage);

/**
 * GET /api/conversations/:contactId/summary
 * Obtener resumen de conversación de un contacto
 */
router.get('/:contactId/summary', conversationController.getConversationSummary);

module.exports = router;
