const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

/**
 * @route GET /api/templates/categories
 * @desc Obtener categorías de templates disponibles
 * @access Private
 */
router.get('/categories', templateController.getCategories);

/**
 * @route GET /api/templates
 * @desc Listar templates con filtros y paginación
 * @access Private
 * @query {number} page - Página (default: 1)
 * @query {number} limit - Límite por página (default: 20)
 * @query {string} search - Búsqueda por nombre o contenido
 * @query {string} category - Filtro por categoría
 * @query {string} is_active - Filtro por estado (true/false)
 * @query {string} sort_by - Campo de ordenamiento
 * @query {string} sort_order - Orden (asc/desc)
 */
router.get('/', templateController.getTemplates);

/**
 * @route GET /api/templates/:id
 * @desc Obtener template específico
 * @access Private
 */
router.get('/:id', templateController.getTemplate);

/**
 * @route POST /api/templates
 * @desc Crear nuevo template
 * @access Private
 * @body {string} name - Nombre del template
 * @body {string} content - Contenido del template con variables {variable}
 * @body {string} category - Categoría (default: 'general')
 * @body {array} variables - Variables definidas manualmente
 */
router.post('/', templateController.createTemplate);

/**
 * @route PUT /api/templates/:id
 * @desc Actualizar template existente
 * @access Private
 * @body {string} name - Nombre del template
 * @body {string} content - Contenido del template
 * @body {string} category - Categoría
 * @body {array} variables - Variables
 * @body {boolean} is_active - Estado activo
 */
router.put('/:id', templateController.updateTemplate);

/**
 * @route DELETE /api/templates/:id
 * @desc Eliminar template
 * @access Private
 */
router.delete('/:id', templateController.deleteTemplate);

/**
 * @route POST /api/templates/:id/preview
 * @desc Previsualizar template con variables reemplazadas
 * @access Private
 * @body {object} variables - Variables para reemplazar {nombre: "Juan", empresa: "Mi Empresa"}
 */
router.post('/:id/preview', templateController.previewTemplate);

module.exports = router; 