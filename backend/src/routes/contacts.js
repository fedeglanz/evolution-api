const express = require('express');
const router = express.Router();

// Import controllers and middleware
const contactController = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Rutas para gestión de contactos

// Información de rutas (para desarrollo) - debe ir ANTES de las rutas parametrizadas
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Contacts routes - Gestión de contactos de WhatsApp',
    availableRoutes: [
      'GET /api/contacts - Listar contactos con filtros y paginación',
      'GET /api/contacts/:id - Obtener detalle de contacto',
      'PUT /api/contacts/:id - Actualizar contacto',
      'POST /api/contacts/:id/block - Bloquear/desbloquear contacto',
      'GET /api/contacts/:id/stats - Estadísticas del contacto'
    ],
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    permissions: {
      access: 'Solo contactos de la empresa del usuario',
      isolation: 'Aislamiento automático por empresa'
    },
    filtering: {
      search: 'Búsqueda por nombre o teléfono',
      tags: 'Filtrar por tags (separados por coma)',
      blocked: 'Filtrar por estado de bloqueo (true/false)',
      instance_id: 'Filtrar por instancia específica',
      date_from: 'Filtrar desde fecha',
      date_to: 'Filtrar hasta fecha'
    },
    sorting: {
      sort_by: 'last_message_at, created_at, name, phone, total_messages',
      sort_order: 'asc, desc'
    },
    pagination: {
      page: 'Número de página (default: 1)',
      limit: 'Elementos por página (default: 20, max: 100)'
    },
    updateFields: {
      name: 'Nombre del contacto (max: 100 caracteres)',
      tags: 'Array de tags (max: 10 tags, 50 caracteres c/u)',
      notes: 'Notas del contacto (max: 1000 caracteres)'
    },
    statistics: {
      overview: 'Resumen general de actividad',
      messageTypes: 'Distribución por tipo de mensaje',
      monthlyActivity: 'Actividad mensual (últimos 12 meses)',
      instanceActivity: 'Actividad por instancia'
    }
  });
});

/**
 * GET /api/contacts
 * Listar contactos con paginación y filtros
 */
router.get('/', contactController.getContacts);

/**
 * GET /api/contacts/:id
 * Obtener detalle de un contacto específico
 */
router.get('/:id', contactController.getContact);

/**
 * PUT /api/contacts/:id
 * Actualizar contacto (nombre, tags, notas)
 */
router.put('/:id', contactController.updateContact);

/**
 * POST /api/contacts/:id/block
 * Bloquear/desbloquear contacto
 */
router.post('/:id/block', contactController.blockContact);

/**
 * GET /api/contacts/:id/stats
 * Obtener estadísticas de un contacto
 */
router.get('/:id/stats', contactController.getContactStats);

module.exports = router;
