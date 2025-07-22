const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const knowledgeService = require('../services/knowledgeService');
const { authenticate } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// ========================================
// SPECIFIC ROUTES (MUST GO FIRST!)
// ========================================

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
router.post('/search', knowledgeController.searchKnowledge);

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

/**
 * Endpoint de información (para debugging)
 * GET /api/knowledge/info
 */
router.get('/info', knowledgeController.getApiInfo);

// ========================================
// 🔧 DEBUG RAG ENDPOINTS
// ========================================

/**
 * @swagger
 * /api/knowledge/debug/bot-search:
 *   post:
 *     summary: Debug RAG search for a specific bot
 *     tags: [Knowledge Base - Debug]
 */
router.post('/debug/bot-search', 
  knowledgeController.debugBotRAGSearch
);

/**
 * @swagger
 * /api/knowledge/debug/bot/{botId}/assignments:
 *   get:
 *     summary: Get detailed bot knowledge assignments for debugging
 *     tags: [Knowledge Base - Debug]
 */
router.get('/debug/bot/:botId/assignments', 
  validation.validateUUID('botId'),
  knowledgeController.debugBotAssignments
);

// **RAG ENDPOINTS FOR TESTING**
router.get('/rag/status', knowledgeController.getRAGStatus);
router.post('/rag/migrate', knowledgeController.migrateToRAG);
router.post('/rag/test-search', knowledgeController.testRAGSearch);
router.post('/rag/test-embeddings', knowledgeController.testEmbeddingGeneration);
router.get('/rag/analytics/:botId?', knowledgeController.getRAGAnalytics);

// ========================================
// KNOWLEDGE ITEMS MANAGEMENT
// ========================================

/**
 * @swagger
 * /api/knowledge:
 *   get:
 *     summary: Obtener todos los knowledge items de la empresa
 *     tags: [Knowledge Base]
 */
router.get('/', knowledgeController.getKnowledgeItems);

/**
 * @swagger
 * /api/knowledge:
 *   post:
 *     summary: Crear nuevo knowledge item manualmente
 *     tags: [Knowledge Base]
 */
router.post('/', 
  validation.validateKnowledgeCreation,
  knowledgeController.createKnowledgeItem
);

/**
 * @swagger
 * /api/knowledge/{id}:
 *   get:
 *     summary: Obtener knowledge item específico
 *     tags: [Knowledge Base]
 */
router.get('/:id', 
  validation.validateUUID('id'),
  knowledgeController.getKnowledgeItem
);

/**
 * @swagger
 * /api/knowledge/{id}:
 *   put:
 *     summary: Actualizar knowledge item
 *     tags: [Knowledge Base]
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
 */
router.delete('/:id', 
  validation.validateUUID('id'),
  knowledgeController.deleteKnowledgeItem
);

// ========================================
// BOT ASSIGNMENTS (SPECIFIC PATHS)
// ========================================

/**
 * @swagger
 * /api/knowledge/bots/{botId}:
 *   get:
 *     summary: Obtener knowledge items asignados a un bot
 *     tags: [Knowledge Base]
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
 */
router.delete('/bots/:botId/assign/:knowledgeItemId', 
  validation.validateUUID('botId'),
  validation.validateUUID('knowledgeItemId'),
  knowledgeController.unassignKnowledgeFromBot
);

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