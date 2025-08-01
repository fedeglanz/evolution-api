const express = require('express');
const router = express.Router();
const scheduledMessageController = require('../controllers/scheduledMessageController');
const { authenticate } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

/**
 * @route GET /api/scheduled-messages/stats
 * @desc Obtener estadísticas de mensajes programados
 * @access Private
 */
router.get('/stats', scheduledMessageController.getScheduledMessagesStats);

/**
 * @route POST /api/scheduled-messages/process
 * @desc Procesar mensajes pendientes (CRON job interno)
 * @access Private
 */
router.post('/process', scheduledMessageController.processScheduledMessages);

/**
 * @route GET /api/scheduled-messages
 * @desc Listar mensajes programados con filtros y paginación
 * @access Private
 * @query {number} page - Página (default: 1)
 * @query {number} limit - Límite por página (default: 20)
 * @query {string} search - Búsqueda por mensaje o teléfono
 * @query {string} status - Filtro por estado (pending, sent, failed, cancelled)
 * @query {string} instance_id - Filtro por instancia
 * @query {string} contact_id - Filtro por contacto
 * @query {string} date_from - Filtro por fecha desde
 * @query {string} date_to - Filtro por fecha hasta
 * @query {string} sort_by - Campo de ordenamiento
 * @query {string} sort_order - Orden (asc/desc)
 */
router.get('/', scheduledMessageController.getScheduledMessages);

/**
 * @route GET /api/scheduled-messages/:id
 * @desc Obtener mensaje programado específico
 * @access Private
 */
router.get('/:id', scheduledMessageController.getScheduledMessage);

/**
 * @route POST /api/scheduled-messages
 * @desc Crear nuevo mensaje programado
 * @access Private
 * @body {string} instance_id - ID de la instancia
 * @body {string} contact_id - ID del contacto (opcional si se proporciona phone)
 * @body {string} phone - Número de teléfono (opcional si se proporciona contact_id)
 * @body {string} message - Mensaje a enviar
 * @body {string} message_type - Tipo de mensaje (default: 'text')
 * @body {string} scheduled_for - Fecha y hora programada (ISO 8601)
 * @body {string} timezone - Zona horaria (default: 'UTC')
 */
router.post('/', scheduledMessageController.createScheduledMessage);

/**
 * @route PUT /api/scheduled-messages/:id
 * @desc Actualizar mensaje programado (solo si está pendiente)
 * @access Private
 * @body {string} message - Nuevo mensaje
 * @body {string} scheduled_for - Nueva fecha programada
 * @body {string} timezone - Nueva zona horaria
 */
router.put('/:id', scheduledMessageController.updateScheduledMessage);

/**
 * @route DELETE /api/scheduled-messages/:id
 * @desc Cancelar mensaje programado
 * @access Private
 */
router.delete('/:id', scheduledMessageController.cancelScheduledMessage);

module.exports = router; 