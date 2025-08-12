const express = require('express');
const router = express.Router();
const groupSyncController = require('../controllers/groupSyncController');
const { authenticate } = require('../middleware/auth');

// =====================================================
// RUTAS PARA SINCRONIZACIÓN DE GRUPOS
// =====================================================

/**
 * GET /api/group-sync/status
 * Obtener estado actual de la sincronización
 */
router.get('/status', authenticate, groupSyncController.getStatus);

/**
 * POST /api/group-sync/sync
 * Forzar sincronización manual inmediata
 */
router.post('/sync', authenticate, groupSyncController.forcSync);

/**
 * POST /api/group-sync/start
 * Iniciar sincronización automática
 */
router.post('/start', authenticate, groupSyncController.start);

/**
 * POST /api/group-sync/stop
 * Detener sincronización automática
 */
router.post('/stop', authenticate, groupSyncController.stop);

/**
 * POST /api/group-sync/configure-testing
 * Configurar límites para testing
 */
router.post('/configure-testing', authenticate, groupSyncController.configureTesting);

/**
 * POST /api/group-sync/force-auto-create
 * Forzar verificación de auto-creación de grupos
 */
router.post('/force-auto-create', authenticate, groupSyncController.forceAutoCreate);

/**
 * GET /api/group-sync/auto-stats
 * Obtener estadísticas de auto-creación
 */
router.get('/auto-stats', authenticate, groupSyncController.getAutoStats);

module.exports = router; 