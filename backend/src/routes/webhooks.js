const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/webhooks/status/:instanceId
 * Obtener estado del webhook de una instancia
 */
router.get('/status/:instanceId', webhookController.getWebhookStatus);

/**
 * GET /api/webhooks/setup-instructions/:instanceId
 * Obtener instrucciones de configuración para n8n
 */
router.get('/setup-instructions/:instanceId', webhookController.getSetupInstructions);

/**
 * POST /api/webhooks/configure/:instanceId
 * Configurar webhook de n8n para una instancia
 * Body: { n8nWebhookPath: "webhook/whatsapp-instance1" }
 */
router.post('/configure/:instanceId', webhookController.configureInstanceWebhook);

/**
 * POST /api/webhooks/sync-all
 * Sincronizar webhooks de todas las instancias activas
 */
router.post('/sync-all', webhookController.syncAllWebhooks);

module.exports = router; 