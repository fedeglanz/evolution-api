const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticate } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

/**
 * @swagger
 * /api/workflows/templates:
 *   get:
 *     summary: Obtener plantillas de workflow disponibles
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: Lista de plantillas
 */
router.get('/templates', workflowController.getWorkflowTemplates);

/**
 * @swagger
 * /api/workflows/generate-basic:
 *   post:
 *     summary: Generar workflow básico para una instancia
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instance_id:
 *                 type: string
 *                 format: uuid
 *             required:
 *               - instance_id
 *     responses:
 *       200:
 *         description: Workflow generado exitosamente
 */
router.post('/generate-basic', 
  validation.validateUUIDField('instance_id', 'body'),
  workflowController.generateBasicWorkflow
);

/**
 * @swagger
 * /api/workflows/instance/{instanceId}:
 *   get:
 *     summary: Obtener workflows de una instancia específica
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de workflows de la instancia
 */
router.get('/instance/:instanceId', 
  validation.validateUUID('instanceId'),
  workflowController.getWorkflowsByInstance
);

/**
 * @swagger
 * /api/workflows/{id}/toggle:
 *   put:
 *     summary: Activar/desactivar workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *             required:
 *               - is_active
 *     responses:
 *       200:
 *         description: Estado del workflow actualizado
 */
router.put('/:id/toggle', 
  validation.validateUUID('id'),
  workflowController.toggleWorkflow
);

// Endpoint de información (para debugging)
router.get('/info', (req, res) => {
  res.json({
    service: 'Workflow Management API',
    version: '1.0.0',
    endpoints: [
      'GET /api/workflows/templates - Obtener plantillas disponibles',
      'POST /api/workflows/generate-basic - Generar workflow básico',
      'GET /api/workflows/instance/:instanceId - Obtener workflows por instancia',
      'PUT /api/workflows/:id/toggle - Activar/desactivar workflow'
    ],
    features: [
      'Plantillas dinámicas',
      'Workflows por instancia',
      'Integración con N8N',
      'Webhooks automáticos'
    ]
  });
});

// Manejo de errores específico para workflows
router.use((err, req, res, next) => {
  console.error('[Workflows API] Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: err.details
    });
  }
  
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Ya existe un workflow para esta instancia',
      error: 'WORKFLOW_ALREADY_EXISTS'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en workflows',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = router; 