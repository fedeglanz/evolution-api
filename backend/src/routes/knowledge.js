const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const knowledgeService = require('../services/knowledgeService');
const { authenticate } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// ========================================
// KNOWLEDGE ITEMS MANAGEMENT
// ========================================

/**
 * @swagger
 * /api/knowledge:
 *   get:
 *     summary: Obtener todos los knowledge items de la empresa
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar solo items activos
 *       - in: query
 *         name: content_type
 *         schema:
 *           type: string
 *           enum: [manual, pdf, docx, txt, url, api]
 *         description: Filtrar por tipo de contenido
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en título, contenido o tags
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       200:
 *         description: Lista de knowledge items
 */
router.get('/', knowledgeController.getKnowledgeItems);

/**
 * @swagger
 * /api/knowledge/{id}:
 *   get:
 *     summary: Obtener knowledge item específico
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Knowledge item encontrado
 *       404:
 *         description: Knowledge item no encontrado
 */
router.get('/:id', 
  validation.validateUUID('id'),
  knowledgeController.getKnowledgeItem
);

/**
 * @swagger
 * /api/knowledge:
 *   post:
 *     summary: Crear nuevo knowledge item manualmente
 *     tags: [Knowledge Base]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 minLength: 10
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - title
 *               - content
 *     responses:
 *       201:
 *         description: Knowledge item creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
router.post('/', 
  validation.validateKnowledgeCreation,
  knowledgeController.createKnowledgeItem
);

/**
 * @swagger
 * /api/knowledge/{id}:
 *   put:
 *     summary: Actualizar knowledge item
 *     tags: [Knowledge Base]
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Knowledge item actualizado exitosamente
 *       404:
 *         description: Knowledge item no encontrado
 */
router.put('/:id', 
  validation.validateUUID('id'),
  knowledgeController.updateKnowledgeItem
);

/**
 * @swagger
 * /api/knowledge/{id}:
 *   delete:
 *     summary: Eliminar knowledge item
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Knowledge item eliminado exitosamente
 *       404:
 *         description: Knowledge item no encontrado
 */
router.delete('/:id', 
  validation.validateUUID('id'),
  knowledgeController.deleteKnowledgeItem
);

// ========================================
// FILE UPLOAD AND PROCESSING
// ========================================

/**
 * @swagger
 * /api/knowledge/upload:
 *   post:
 *     summary: Subir archivo y crear knowledge item
 *     tags: [Knowledge Base]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: Archivo a procesar (PDF, DOCX, TXT)
 *       - in: formData
 *         name: title
 *         type: string
 *         description: Título personalizado (opcional)
 *       - in: formData
 *         name: tags
 *         type: string
 *         description: Tags en formato JSON array (opcional)
 *     responses:
 *       201:
 *         description: Archivo procesado exitosamente
 *       400:
 *         description: Error en el archivo o procesamiento
 */
router.post('/upload', 
  knowledgeService.getUploadMiddleware().single('file'),
  knowledgeController.uploadFile
);

// ========================================
// BOT ASSIGNMENTS
// ========================================

/**
 * @swagger
 * /api/knowledge/bots/{botId}:
 *   get:
 *     summary: Obtener knowledge items asignados a un bot
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Knowledge items del bot
 *       404:
 *         description: Bot no encontrado
 */
router.get('/bots/:botId', 
  validation.validateUUID('botId'),
  knowledgeController.getBotKnowledge
);

/**
 * @swagger
 * /api/knowledge/bots/{botId}/available:
 *   get:
 *     summary: Obtener knowledge items disponibles y asignados para un bot
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Knowledge items disponibles y asignados
 */
router.get('/bots/:botId/available', 
  validation.validateUUID('botId'),
  knowledgeController.getAvailableKnowledgeForBot
);

/**
 * @swagger
 * /api/knowledge/bots/{botId}/assign:
 *   post:
 *     summary: Asignar knowledge item a bot
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: botId
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
 *               knowledge_item_id:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *             required:
 *               - knowledge_item_id
 *     responses:
 *       200:
 *         description: Knowledge asignado exitosamente
 */
router.post('/bots/:botId/assign', 
  validation.validateUUID('botId'),
  validation.validateKnowledgeAssignment,
  knowledgeController.assignKnowledgeToBot
);

/**
 * @swagger
 * /api/knowledge/bots/{botId}/assign/{knowledgeItemId}:
 *   delete:
 *     summary: Quitar knowledge item de bot
 *     tags: [Knowledge Base]
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: knowledgeItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Knowledge removido exitosamente
 */
router.delete('/bots/:botId/assign/:knowledgeItemId', 
  validation.validateUUID('botId'),
  validation.validateUUID('knowledgeItemId'),
  knowledgeController.unassignKnowledgeFromBot
);

// ========================================
// SEARCH AND ANALYTICS
// ========================================

/**
 * @swagger
 * /api/knowledge/search:
 *   post:
 *     summary: Buscar en knowledge base
 *     tags: [Knowledge Base]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 2
 *               content_types:
 *                 type: array
 *                 items:
 *                   type: string
 *               limit:
 *                 type: integer
 *                 default: 20
 *             required:
 *               - query
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 */
router.post('/search', 
  knowledgeController.searchKnowledge
);

/**
 * @swagger
 * /api/knowledge/stats:
 *   get:
 *     summary: Obtener estadísticas de knowledge base
 *     tags: [Knowledge Base]
 *     responses:
 *       200:
 *         description: Estadísticas de la knowledge base
 */
router.get('/stats', knowledgeController.getKnowledgeStats);

// ========================================
// INFO AND DEBUG
// ========================================

/**
 * Endpoint de información (para debugging)
 * GET /api/knowledge/info
 */
router.get('/info', knowledgeController.getApiInfo);

// ========================================
// ERROR HANDLING
// ========================================

// Manejo de errores específico para knowledge
router.use((err, req, res, next) => {
  console.error('[Knowledge API] Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: err.details
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Archivo demasiado grande. Máximo 10MB',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Ya existe un knowledge item con estos datos',
      error: 'DUPLICATE_KNOWLEDGE_ITEM'
    });
  }
  
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida a bot o knowledge item',
      error: 'INVALID_REFERENCE'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en knowledge base',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = router; 