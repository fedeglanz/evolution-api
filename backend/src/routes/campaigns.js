const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/campaigns/info
 * Información sobre los endpoints disponibles
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'API de Campañas de Grupos de WhatsApp',
    version: '1.0.0',
    endpoints: [
      'GET /api/campaigns - Listar campañas',
      'POST /api/campaigns - Crear campaña',
      'GET /api/campaigns/:id - Obtener campaña específica',
      'PATCH /api/campaigns/:id/status - Actualizar estado de campaña',
      'POST /api/campaigns/:id/groups - Crear grupo para campaña',
      'GET /api/campaigns/:id/stats - Estadísticas de campaña',
      'GET /api/campaigns/:id/logs - Logs de actividad',
      'GET /api/campaigns/public/:slug - Página pública de campaña',
      'POST /api/campaigns/public/:slug/register - Registro público de miembro'
    ],
    authentication: {
      required: true,
      exceptions: ['/api/campaigns/public/*']
    },
    features: [
      'Creación automática de grupos de WhatsApp',
      'Links distribuidores únicos',
      'Auto-gestión de límites de miembros (950)',
      'Creación automática de grupos adicionales',
      'Tracking de registros y analytics',
      'Logs de actividad detallados'
    ]
  });
});

// =====================================================
// RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// =====================================================

/**
 * GET /api/campaigns/public/:slug
 * Obtener información pública de una campaña
 */
router.get('/public/:slug', campaignController.getPublicCampaign);

/**
 * POST /api/campaigns/public/:slug/register
 * Registrar un miembro en una campaña (público)
 */
router.post('/public/:slug/register', campaignController.registerMember);

/**
 * GET /api/campaigns/direct/:slug
 * Redirigir directamente al grupo de WhatsApp activo
 */
router.get('/direct/:slug', campaignController.getDirectGroupLink);

// =====================================================
// RUTAS PRIVADAS (CON AUTENTICACIÓN)
// =====================================================

// Aplicar middleware de autenticación a todas las rutas siguientes
router.use(authenticate);

/**
 * GET /api/campaigns
 * Listar campañas con filtros y paginación
 */
router.get('/', campaignController.getCampaigns);

/**
 * POST /api/campaigns
 * Crear una nueva campaña
 */
router.post('/', campaignController.createCampaign);

/**
 * GET /api/campaigns/:id
 * Obtener una campaña específica con detalles completos
 */
router.get('/:id', campaignController.getCampaign);

/**
 * PATCH /api/campaigns/:id/status
 * Actualizar el estado de una campaña
 */
router.patch('/:id/status', campaignController.updateCampaignStatus);

/**
 * POST /api/campaigns/:id/groups
 * Crear un nuevo grupo para una campaña
 */
router.post('/:id/groups', campaignController.createCampaignGroup);

/**
 * GET /api/campaigns/:id/stats
 * Obtener estadísticas detalladas de una campaña
 */
router.get('/:id/stats', campaignController.getCampaignStats);

/**
 * GET /api/campaigns/:id/logs
 * Obtener logs de actividad de una campaña
 */
router.get('/:id/logs', campaignController.getCampaignLogs);

module.exports = router; 