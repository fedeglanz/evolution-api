const express = require('express');
const router = express.Router();

// Import controllers and middleware
const instanceController = require('../controllers/instanceController');
const botConfigController = require('../controllers/botConfigController');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { 
  validateCreateInstance, 
  validateUpdateInstance,
  validatePagination,
  validateCreateBotConfig
} = require('../middleware/validation');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Rutas para instancias

// Información de rutas (para desarrollo)
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Instance routes - Gestión de instancias de WhatsApp',
    availableRoutes: [
      'GET /api/instances - Listar instancias de la empresa',
      'POST /api/instances - Crear nueva instancia',
      'GET /api/instances/:id - Obtener instancia específica',
      'PUT /api/instances/:id - Actualizar instancia existente',
      'PUT /api/instances/:id/webhook - Actualizar URL del webhook',
      'POST /api/instances/:id/regenerate-workflow - Regenerar workflow N8N',
      'GET /api/instances/:id/qr - Obtener código QR',
      'POST /api/instances/:id/connect - Conectar instancia',
      'GET /api/instances/:id/status - Estado de conexión',
      'DELETE /api/instances/:id - Eliminar instancia',
      '--- BOT CONFIGURATION ---',
      'GET /api/instances/:id/bot-config - Obtener configuración del bot',
      'POST /api/instances/:id/bot-config - Crear configuración del bot',
      'PUT /api/instances/:id/bot-config - Actualizar configuración del bot',
      'POST /api/instances/:id/bot-config/test - Probar respuesta del bot',
      'POST /api/instances/:id/bot-config/reset - Resetear configuración',
      '--- MESSAGES ---',
      'POST /api/instances/:id/messages/send - Enviar mensaje',
      'GET /api/instances/:id/messages - Obtener historial de mensajes'
    ],
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    businessRules: {
      instanceLimits: 'Limitado por plan de suscripción',
      multiTenant: 'Aislamiento total entre empresas',
      automation: 'Workflows N8N automáticos por instancia'
    }
  });
});

// ===== RUTAS PRINCIPALES =====

/**
 * GET /api/instances
 * Listar todas las instancias de la empresa actual
 */
router.get('/', validatePagination, instanceController.getInstances);

/**
 * POST /api/instances
 * Crear nueva instancia de WhatsApp
 */
router.post('/', validateCreateInstance, instanceController.createInstance);

/**
 * GET /api/instances/:id
 * Obtener instancia específica por ID
 */
router.get('/:id', instanceController.getInstance);

// ===== RUTAS ESPECÍFICAS DE SINCRONIZACIÓN (ANTES QUE RUTAS CON PARÁMETROS) =====

/**
 * PUT /api/instances/sync-all
 * Sincronizar estado de todas las instancias de la empresa
 */
router.put('/sync-all', instanceController.syncAllInstancesState);

/**
 * PUT /api/instances/:id/sync-state
 * Sincronizar estado de una instancia específica
 */
router.put('/:id/sync-state', instanceController.syncInstanceState);

// ===== RUTAS CON PARÁMETROS =====

/**
 * PUT /api/instances/:id
 * Actualizar instancia existente
 */
router.put('/:id', validateUpdateInstance, instanceController.updateInstance);

/**
 * PUT /api/instances/:id/webhook
 * Actualizar URL del webhook de una instancia
 */
router.put('/:id/webhook', instanceController.updateWebhookUrl);

/**
 * POST /api/instances/:id/regenerate-workflow
 * Regenerar workflow N8N para una instancia
 */
router.post('/:id/regenerate-workflow', instanceController.regenerateWorkflow);

/**
 * GET /api/instances/:id/qr
 * Obtener código QR de vinculación
 */
router.get('/:id/qr', instanceController.getQRCode);

/**
 * POST /api/instances/:id/connect
 * Conectar instancia manualmente
 */
router.post('/:id/connect', instanceController.connectInstance);

/**
 * GET /api/instances/:id/status
 * Obtener estado de conexión de la instancia
 */
router.get('/:id/status', instanceController.getInstanceStatus);

/**
 * DELETE /api/instances/:id
 * Eliminar instancia de WhatsApp
 */
router.delete('/:id', instanceController.deleteInstance);

// ===== RUTAS DE CONFIGURACIÓN DE BOTS =====

/**
 * GET /api/instances/:id/bot-config
 * Obtener configuración del bot de la instancia
 */
router.get('/:id/bot-config', botConfigController.getBotConfig);

/**
 * POST /api/instances/:id/bot-config
 * Crear configuración del bot para la instancia
 * TODO: Implementar createBotConfig method en botConfigController
 */
// router.post('/:id/bot-config', validateCreateBotConfig, botConfigController.createBotConfig);

/**
 * PUT /api/instances/:id/bot-config
 * Actualizar configuración del bot existente
 */
router.put('/:id/bot-config', validateCreateBotConfig, botConfigController.updateBotConfig);

/**
 * POST /api/instances/:id/bot-config/test
 * Probar respuesta del bot con mensaje de prueba
 */
router.post('/:id/bot-config/test', botConfigController.testBotResponse);

/**
 * POST /api/instances/:id/bot-config/reset
 * Resetear configuración del bot a valores por defecto
 */
router.post('/:id/bot-config/reset', botConfigController.resetBotConfig);

// ===== RUTAS DE MENSAJES =====

/**
 * POST /api/instances/:id/messages/send
 * Enviar mensaje desde la instancia
 */
router.post('/:id/messages/send', messageController.sendMessage);

/**
 * GET /api/instances/:id/messages
 * Obtener historial de mensajes de la instancia
 */
router.get('/:id/messages', validatePagination, messageController.getMessages);

module.exports = router;
