const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const n8nAuth = require('../middleware/n8nAuth');

// Middleware básico para parsing JSON
router.use(express.json());

/**
 * GET /api/bot/n8n-config
 * Obtener configuración para n8n (sin auth - solo info pública)
 */
router.get('/n8n-config', n8nAuth.getN8NConfig);

/**
 * GET /api/bot/health
 * Health check para n8n (sin auth)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Bot API',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/bot/process-message',
      'POST /api/bot/log-interaction',
      'GET /api/bot/n8n-config'
    ]
  });
});

// === ENDPOINTS AUTENTICADOS PARA N8N ===

/**
 * POST /api/bot/process-message
 * Procesar mensaje entrante desde n8n
 * Body: { instance, phone, message, senderName, messageType, messageId }
 */
router.post('/process-message', n8nAuth.authenticate, botController.processMessage);

/**
 * POST /api/bot/log-interaction  
 * Registrar interacción completada desde n8n
 * Body: { instance, phone, userMessage, botResponse, responseTime, tokensUsed }
 */
router.post('/log-interaction', n8nAuth.authenticate, botController.logInteraction);

module.exports = router; 