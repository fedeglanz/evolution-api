const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Middleware básico para parsing JSON
router.use(express.json());

/**
 * POST /api/bot/process-message
 * Procesar mensaje entrante desde n8n
 * Body: { instance, phone, message, senderName, messageType, messageId }
 */
router.post('/process-message', botController.processMessage);

/**
 * POST /api/bot/log-interaction  
 * Registrar interacción completada desde n8n
 * Body: { instance, phone, userMessage, botResponse, responseTime, tokensUsed }
 */
router.post('/log-interaction', botController.logInteraction);

/**
 * GET /api/bot/health
 * Health check para n8n
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Bot API',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/bot/process-message',
      'POST /api/bot/log-interaction'
    ]
  });
});

module.exports = router; 