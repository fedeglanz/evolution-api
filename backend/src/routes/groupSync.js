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

module.exports = router; 