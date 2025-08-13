const express = require('express');
const router = express.Router();
const massMessagingController = require('../controllers/massMessagingController');
const { authenticate } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

/**
 * @route GET /api/mass-messaging/options
 * @desc Obtener opciones disponibles para mensajería masiva
 * @access Private
 * @returns {Object} templates, campaigns, instances, contactsStats
 */
router.get('/options', massMessagingController.getMessagingOptions);

/**
 * @route POST /api/mass-messaging/create
 * @desc Crear mensaje masivo (inmediato o programado)
 * @access Private
 * @body {string} messageType - 'template' o 'custom'
 * @body {string} templateId - ID del template (si messageType = 'template')
 * @body {Object} templateVariables - Variables para el template
 * @body {string} customMessage - Mensaje personalizado (si messageType = 'custom')
 * @body {string} targetType - 'contacts', 'campaigns', 'manual'
 * @body {Array} contactIds - IDs de contactos (si targetType = 'contacts')
 * @body {Array} campaignIds - IDs de campañas (si targetType = 'campaigns')
 * @body {Array} manualPhones - Números manuales (si targetType = 'manual')
 * @body {string} instanceId - ID de la instancia
 * @body {string} schedulingType - 'immediate' o 'scheduled'
 * @body {string} scheduledFor - Fecha programada (si schedulingType = 'scheduled')
 * @body {string} timezone - Zona horaria
 * @body {number} delayBetweenGroups - Delay entre grupos en segundos
 * @body {number} delayBetweenMessages - Delay entre mensajes en segundos
 * @body {string} title - Título del mensaje masivo
 * @body {string} description - Descripción
 */
router.post('/create', massMessagingController.createMassMessage);

/**
 * @route GET /api/mass-messaging/history
 * @desc Obtener historial de mensajes masivos
 * @access Private
 * @query {number} page - Página (default: 1)
 * @query {number} limit - Límite por página (default: 20)
 * @query {string} status - Filtro por estado
 * @query {string} target_type - Filtro por tipo de destinatario
 */
router.get('/history', massMessagingController.getMassMessageHistory);

/**
 * @route GET /api/mass-messaging/:id
 * @desc Obtener detalles de un mensaje masivo específico
 * @access Private
 * @param {string} id - ID del mensaje masivo
 */
router.get('/:id', massMessagingController.getMassMessageDetails);

/**
 * @route POST /api/mass-messaging/:id/cancel
 * @desc Cancelar mensaje masivo (solo si está programado o en proceso)
 * @access Private
 * @param {string} id - ID del mensaje masivo
 */
router.post('/:id/cancel', massMessagingController.cancelMassMessage);

/**
 * @route GET /api/mass-messaging/stats/overview
 * @desc Obtener estadísticas generales de mensajería masiva
 * @access Private
 */
router.get('/stats/overview', massMessagingController.getMassMessagingStats);

module.exports = router; 