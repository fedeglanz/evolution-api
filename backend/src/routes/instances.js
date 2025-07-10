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
      planLimits: {
        starter: '1 instancia',
        business: '3 instancias',
        enterprise: 'Ilimitado'
      },
      instanceNaming: 'Nombres únicos por empresa, máximo 50 caracteres',
      qrCodeExpiration: 'Los códigos QR expiran automáticamente'
    }
  });
});

/**
 * GET /api/instances
 * Listar instancias de la empresa
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

/**
 * PUT /api/instances/:id
 * Actualizar instancia existente
 */
router.put('/:id', validateUpdateInstance, instanceController.updateInstance);

/**
 * GET /api/instances/:id/qr
 * Obtener código QR para conexión
 */
router.get('/:id/qr', instanceController.getQRCode);

/**
 * POST /api/instances/:id/connect
 * Conectar/reconectar instancia
 */
router.post('/:id/connect', instanceController.connectInstance);

/**
 * GET /api/instances/:id/status
 * Obtener estado de conexión de la instancia
 */
router.get('/:id/status', instanceController.getInstanceStatus);

/**
 * DELETE /api/instances/:id
 * Eliminar instancia
 */
router.delete('/:id', instanceController.deleteInstance);

// ===== BOT CONFIGURATION ROUTES =====

/**
 * GET /api/instances/:id/bot-config
 * Obtener configuración del bot para una instancia
 */
router.get('/:id/bot-config', botConfigController.getBotConfig);

/**
 * POST /api/instances/:id/bot-config
 * Crear configuración del bot para una instancia
 */
router.post('/:id/bot-config', validateCreateBotConfig, botConfigController.updateBotConfig);

/**
 * PUT /api/instances/:id/bot-config
 * Actualizar configuración del bot
 */
router.put('/:id/bot-config', validateCreateBotConfig, botConfigController.updateBotConfig);

/**
 * POST /api/instances/:id/bot-config/test
 * Probar respuesta del bot con configuración actual
 */
router.post('/:id/bot-config/test', botConfigController.testBotResponse);

/**
 * POST /api/instances/:id/bot-config/reset
 * Restaurar configuración a valores por defecto
 */
router.post('/:id/bot-config/reset', botConfigController.resetBotConfig);

// ===== MESSAGE ROUTES =====

/**
 * POST /api/instances/:id/messages/send
 * Enviar mensaje a través de WhatsApp
 */
router.post('/:id/messages/send', messageController.sendMessage);

/**
 * GET /api/instances/:id/messages
 * Obtener historial de mensajes
 */
router.get('/:id/messages', messageController.getMessages);

module.exports = router;
