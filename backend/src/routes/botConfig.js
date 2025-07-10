const express = require('express');
const router = express.Router();

// Import controllers and middleware
const botConfigController = require('../controllers/botConfigController');
const { authenticate } = require('../middleware/auth');
const { validateCreateBotConfig } = require('../middleware/validation');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Rutas para configuración de bots

// Información de rutas (para desarrollo) - debe ir ANTES de las rutas parametrizadas
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Bot Configuration routes - Configuración de bots de ChatGPT',
    availableRoutes: [
      'GET /api/bot-config/:instanceId - Obtener configuración del bot',
      'PUT /api/bot-config/:instanceId - Actualizar configuración',
      'POST /api/bot-config/:instanceId/test - Probar respuesta del bot',
      'POST /api/bot-config/:instanceId/reset - Restaurar valores por defecto'
    ],
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    permissions: {
      access: 'Solo el propietario de la instancia puede acceder',
      validation: 'Verificación automática de propiedad de instancia'
    },
    openaiIntegration: {
      required: 'API Key de OpenAI necesaria para funcionalidad completa',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      testingAvailable: 'Endpoint de testing incluido'
    },
    configurationFields: {
      systemPrompt: 'Hasta 2000 caracteres',
      temperature: '0.0 - 2.0',
      maxTokens: '50 - 500',
      businessHours: 'JSON con horarios de atención',
      autoResponse: 'Boolean para activar respuestas automáticas',
      escalationNumber: 'Número para escalar conversaciones',
      escalationKeywords: 'Array de palabras clave',
      welcomeMessage: 'Mensaje de bienvenida personalizado',
      awayMessage: 'Mensaje fuera de horario',
      embeddingsEnabled: 'Activar búsqueda por embeddings'
    }
  });
});

/**
 * GET /api/bot-config/:instanceId
 * Obtener configuración actual del bot para una instancia
 */
router.get('/:instanceId', botConfigController.getBotConfig);

/**
 * PUT /api/bot-config/:instanceId
 * Actualizar configuración del bot
 */
router.put('/:instanceId', validateCreateBotConfig, botConfigController.updateBotConfig);

/**
 * POST /api/bot-config/:instanceId/test
 * Probar respuesta del bot con configuración actual
 */
router.post('/:instanceId/test', botConfigController.testBotResponse);

/**
 * POST /api/bot-config/:instanceId/reset
 * Restaurar configuración a valores por defecto
 */
router.post('/:instanceId/reset', botConfigController.resetBotConfig);

module.exports = router;
