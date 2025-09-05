const express = require('express');
const router = express.Router();
const platformAuthController = require('../controllers/platformAuthController');
const platformUsersController = require('../controllers/platformUsersController');
const platformPlanController = require('../controllers/platformPlanController');
const platformBillingController = require('../controllers/platformBillingController');
const { 
  authenticatePlatformAdmin, 
  requireSuperAdmin, 
  requirePlatformStaff,
  requirePlatformViewer,
  logPlatformActivity 
} = require('../middleware/platformAuth');
const { validatePlatformLogin, validatePasswordChange, validateCreateUser } = require('../middleware/validation');

// ============================================
// RUTAS DE AUTENTICACIÓN PLATFORM ADMIN
// ============================================

// Login de platform admin
router.post('/auth/login', 
  validatePlatformLogin, 
  platformAuthController.login
);

// Cambiar contraseña (obligatorio en primer login)
router.post('/auth/change-password', 
  authenticatePlatformAdmin,
  validatePasswordChange,
  platformAuthController.changePassword
);

// Verificar token / obtener info del admin actual
router.get('/auth/verify', 
  authenticatePlatformAdmin,
  platformAuthController.verifyToken
);

// Cerrar sesión
router.post('/auth/logout', 
  authenticatePlatformAdmin,
  platformAuthController.logout
);

// Obtener perfil completo del admin
router.get('/auth/me', 
  authenticatePlatformAdmin,
  platformAuthController.getMe
);

// Debug endpoint para verificar token
router.get('/auth/debug-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      res.json({
        success: true,
        decoded: decoded,
        isPlatformAdmin: !!decoded.isPlatformAdmin,
        tokenType: decoded.isPlatformAdmin ? 'platform_admin' : 'regular_user'
      });
    } catch (jwtError) {
      res.json({
        error: 'Invalid JWT',
        jwtError: jwtError.message
      });
    }
    
  } catch (error) {
    res.json({
      error: 'Debug error',
      message: error.message
    });
  }
});

// ============================================
// RUTAS DE GESTIÓN DE EMPRESAS Y USUARIOS
// ============================================

// Estadísticas globales de la plataforma
router.get('/statistics', 
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_statistics'),
  platformUsersController.getStatistics
);

// Listar todas las empresas
router.get('/companies', 
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('list_companies'),
  platformUsersController.listCompanies
);

// Obtener detalles de una empresa
router.get('/companies/:companyId', 
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_company', 'company'),
  platformUsersController.getCompanyDetails
);

// Crear nueva empresa
router.post('/companies', 
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('create_company', 'company'),
  platformUsersController.createCompany
);

// Actualizar empresa
router.patch('/companies/:companyId', 
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('update_company', 'company'),
  platformUsersController.updateCompany
);

// Actualizar plan de una empresa
router.patch('/companies/:companyId/plan', 
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('update_company_plan', 'company'),
  platformUsersController.updateCompanyPlan
);

// Listar todos los usuarios
router.get('/users', 
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('list_users'),
  platformUsersController.listUsers
);

// Crear nuevo usuario
router.post('/users', 
  authenticatePlatformAdmin,
  requirePlatformStaff,
  validateCreateUser,
  logPlatformActivity('create_user', 'user'),
  platformUsersController.createUser
);

// Actualizar usuario
router.patch('/users/:userId', 
  authenticatePlatformAdmin,
  requirePlatformStaff,
  logPlatformActivity('update_user', 'user'),
  platformUsersController.updateUser
);

// Activar/desactivar usuario
router.patch('/users/:userId/status', 
  authenticatePlatformAdmin,
  requirePlatformStaff,
  logPlatformActivity('toggle_user_status', 'user'),
  platformUsersController.toggleUserStatus
);

// Resetear contraseña de usuario
router.post('/users/:userId/reset-password', 
  authenticatePlatformAdmin,
  requirePlatformStaff,
  logPlatformActivity('reset_user_password', 'user'),
  platformUsersController.resetUserPassword
);

// ============================================
// RUTAS DE GESTIÓN DE PLANES DINÁMICOS
// ============================================

// Obtener todos los planes
router.get('/plans',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_plans'),
  platformPlanController.getAllPlans
);

// Obtener estadísticas de planes
router.get('/plans/statistics',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_plan_statistics'),
  platformPlanController.getPlanStatistics
);

// Migrar empresas existentes al nuevo sistema
router.post('/plans/migrate-companies',
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('migrate_companies_to_subscriptions'),
  platformPlanController.migrateExistingCompanies
);

// Reordenar planes
router.post('/plans/reorder',
  authenticatePlatformAdmin,
  requirePlatformStaff,
  logPlatformActivity('reorder_plans'),
  platformPlanController.reorderPlans
);

// Obtener plan específico por ID
router.get('/plans/:id',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_plan'),
  platformPlanController.getPlanById
);

// Crear nuevo plan
router.post('/plans',
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('create_plan'),
  platformPlanController.createPlan
);

// Actualizar plan existente
router.put('/plans/:id',
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('update_plan'),
  platformPlanController.updatePlan
);

// Eliminar plan
router.delete('/plans/:id',
  authenticatePlatformAdmin,
  requireSuperAdmin,
  logPlatformActivity('delete_plan'),
  platformPlanController.deletePlan
);

// ============================================
// RUTAS DE FACTURACIÓN PLATFORM ADMIN
// ============================================

// Obtener métricas de facturación
router.get('/billing/metrics',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_billing_metrics'),
  platformBillingController.getBillingMetrics
);

// Obtener todas las suscripciones
router.get('/billing/subscriptions',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_all_subscriptions'),
  platformBillingController.getAllSubscriptions
);

// Obtener todas las transacciones
router.get('/billing/transactions',
  authenticatePlatformAdmin,
  requirePlatformViewer,
  logPlatformActivity('view_all_transactions'),
  platformBillingController.getAllTransactions
);

// Exportar datos de facturación
router.get('/billing/export',
  authenticatePlatformAdmin,
  requirePlatformStaff,
  logPlatformActivity('export_billing_data'),
  platformBillingController.exportData
);

// ============================================
// RUTAS DE GESTIÓN DE PLATFORM ADMINS
// ============================================

// TODO: Implementar CRUD de platform admins
// - GET /platform-admin/admins - Listar admins de plataforma
// - POST /platform-admin/admins - Crear nuevo admin
// - PATCH /platform-admin/admins/:adminId - Actualizar admin
// - DELETE /platform-admin/admins/:adminId - Eliminar admin

module.exports = router;