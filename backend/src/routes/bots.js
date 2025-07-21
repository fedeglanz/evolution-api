const express = require('express');
const router = express.Router();
const botsController = require('../controllers/botsController');
const { authenticate } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// ==================== INFORMACIÓN DE RUTAS ====================
/**
 * GET /api/bots/info
 * Información sobre las rutas disponibles
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'API de Gestión de Bots Múltiples',
    description: 'Sistema para crear y gestionar múltiples bots de AI por instancia con límites por plan',
    version: '1.0.0',
    availableRoutes: [
      'GET    /api/bots              - Listar todos los bots de la empresa',
      'POST   /api/bots              - Crear nuevo bot (respeta límites por plan)',
      'GET    /api/bots/templates    - Obtener templates predefinidos',
      'GET    /api/bots/:id          - Obtener bot específico',
      'PUT    /api/bots/:id          - Actualizar bot existente', 
      'DELETE /api/bots/:id          - Eliminar bot',
      'POST   /api/bots/:id/toggle   - Activar/desactivar bot',
      'GET    /api/instances/:instanceId/active-bot - Obtener bot activo de instancia'
    ],
    features: {
      planLimits: {
        free_trial: '1 bot',
        trial: '1 bot',
        starter: '3 bots',
        business: '10 bots',
        pro: '25 bots',
        enterprise: 'Ilimitados'
      },
      templates: ['Asistente General', 'Bot de Ventas', 'Soporte Técnico'],
      botFeatures: [
        'Solo 1 bot activo por instancia simultáneamente',
        'Configuración OpenAI personalizable por bot',
        'Mensajes de bienvenida y fallback por bot',
        'Límites diarios/mensuales configurables',
        'Simulación de typing y delays humanos',
        'Memoria contextual configurable'
      ]
    },
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    permissions: {
      scope: 'Solo bots de la empresa del usuario autenticado',
      validation: 'Verificación automática de ownership de instancias'
    }
  });
});

// ==================== TEMPLATES PREDEFINIDOS ====================
/**
 * GET /api/bots/templates
 * Obtener templates predefinidos de bots
 */
router.get('/templates', botsController.getBotTemplates);

// ==================== GESTIÓN DE BOTS ====================

/**
 * GET /api/bots
 * Listar todos los bots de la empresa
 * 
 * Query params opcionales:
 * - instance_id: Filtrar por instancia específica
 * - active_only: true/false - Solo bots activos
 */
router.get('/', botsController.getAllBots);

/**
 * POST /api/bots
 * Crear un nuevo bot
 * 
 * Body requerido:
 * - instance_id: UUID de la instancia
 * - name: Nombre del bot (2-50 caracteres)
 * - system_prompt: Prompt del sistema (10-4000 caracteres)
 * 
 * Body opcional:
 * - description: Descripción del bot
 * - openai_model: Modelo GPT (default: gpt-4)
 * - openai_temperature: 0-2 (default: 0.7)
 * - max_tokens: 1-4096 (default: 1000)
 * - welcome_message: Mensaje de bienvenida
 * - fallback_message: Mensaje de fallback
 * - context_memory_turns: Turnos de memoria (default: 5)
 * - response_delay_ms: Delay en respuesta (default: 1000)
 * - typing_simulation: Boolean (default: true)
 * - daily_message_limit: Límite diario (opcional)
 * - monthly_token_limit: Límite mensual tokens (opcional)
 */
router.post('/', validation.validateBotCreation, botsController.createBot);

/**
 * GET /api/bots/:id
 * Obtener un bot específico por ID
 */
router.get('/:id', validation.validateUUID('id'), botsController.getBot);

/**
 * PUT /api/bots/:id
 * Actualizar un bot existente
 * 
 * Body: Cualquier campo del bot que se quiera actualizar
 */
router.put('/:id', validation.validateUUID('id'), botsController.updateBot);

/**
 * DELETE /api/bots/:id
 * Eliminar un bot
 * 
 * Nota: Eliminará también todas las conversaciones y mensajes asociados (CASCADE)
 */
router.delete('/:id', validation.validateUUID('id'), botsController.deleteBot);

/**
 * POST /api/bots/:id/toggle
 * Activar o desactivar un bot
 * 
 * Body requerido:
 * - is_active: true/false
 * 
 * Nota: Si activas un bot, automáticamente desactiva otros bots de la misma instancia
 */
router.post('/:id/toggle', validation.validateUUID('id'), botsController.toggleBot);

// ==================== GESTIÓN POR INSTANCIA ====================

/**
 * GET /api/instances/:instanceId/active-bot
 * Obtener el bot activo de una instancia específica
 */
router.get('/instances/:instanceId/active-bot', 
  validation.validateUUID('instanceId'), 
  botsController.getActiveBotForInstance
);

// ==================== MANEJO DE ERRORES ====================
router.use((error, req, res, next) => {
  console.error('Error en rutas de bots:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details?.map(d => d.message) || [error.message]
    });
  }

  if (error.code === '23505') { // PostgreSQL unique constraint
    return res.status(409).json({
      success: false,
      message: 'Ya existe un recurso con esos datos'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida a recurso relacionado'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router; 