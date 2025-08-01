const express = require('express');
const router = express.Router();
const quickReplyController = require('../controllers/quickReplyController');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route GET /api/quick-replies/categories
 * @desc Obtener categorías de respuestas rápidas disponibles
 * @access Private
 */
router.get('/categories', quickReplyController.getCategories);

/**
 * @route GET /api/quick-replies/popular
 * @desc Obtener shortcuts más usados
 * @access Private
 * @query {number} limit - Límite de resultados (default: 10)
 */
router.get('/popular', quickReplyController.getPopularShortcuts);

/**
 * @route GET /api/quick-replies/search/:shortcut
 * @desc Buscar respuesta rápida por shortcut
 * @access Private
 */
router.get('/search/:shortcut', quickReplyController.searchByShortcut);

/**
 * @route GET /api/quick-replies
 * @desc Listar respuestas rápidas con filtros y paginación
 * @access Private
 * @query {number} page - Página (default: 1)
 * @query {number} limit - Límite por página (default: 20)
 * @query {string} search - Búsqueda por shortcut o mensaje
 * @query {string} category - Filtro por categoría
 * @query {string} is_active - Filtro por estado (true/false)
 * @query {string} sort_by - Campo de ordenamiento
 * @query {string} sort_order - Orden (asc/desc)
 */
router.get('/', quickReplyController.getQuickReplies);

/**
 * @route GET /api/quick-replies/:id
 * @desc Obtener respuesta rápida específica
 * @access Private
 */
router.get('/:id', quickReplyController.getQuickReply);

/**
 * @route POST /api/quick-replies
 * @desc Crear nueva respuesta rápida
 * @access Private
 * @body {string} shortcut - Shortcut que inicia con / (ej: /gracias)
 * @body {string} message - Mensaje de respuesta
 * @body {string} category - Categoría (default: 'general')
 */
router.post('/', quickReplyController.createQuickReply);

/**
 * @route PUT /api/quick-replies/:id
 * @desc Actualizar respuesta rápida existente
 * @access Private
 * @body {string} shortcut - Shortcut
 * @body {string} message - Mensaje
 * @body {string} category - Categoría
 * @body {boolean} is_active - Estado activo
 */
router.put('/:id', quickReplyController.updateQuickReply);

/**
 * @route DELETE /api/quick-replies/:id
 * @desc Eliminar respuesta rápida
 * @access Private
 */
router.delete('/:id', quickReplyController.deleteQuickReply);

module.exports = router; 