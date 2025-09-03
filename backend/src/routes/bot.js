const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const n8nAuth = require('../middleware/n8nAuth');
const { tokenLimitMiddleware } = require('../middleware/tokenLimit');

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
router.post('/process-message', n8nAuth.authenticate, ...tokenLimitMiddleware, botController.processMessage);

/**
 * POST /api/bot/log-interaction  
 * Registrar interacción completada desde n8n
 * Body: { instance, phone, userMessage, botResponse, responseTime, tokensUsed }
 */
router.post('/log-interaction', n8nAuth.authenticate, botController.logInteraction);

/**
 * GET /api/bot/usage-stats
 * Obtener estadísticas de uso de tokens (requiere auth de usuario normal)
 */
const { authenticateToken } = require('../middleware/auth');
const tokenLimitService = require('../services/tokenLimitService');

router.get('/usage-stats', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID requerido'
      });
    }

    const stats = await tokenLimitService.getUsageStats(companyId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron estadísticas de uso'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router; 