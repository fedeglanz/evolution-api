const express = require('express');
const router = express.Router();
const platformAuthController = require('../controllers/platformAuthController');
const platformUsersController = require('../controllers/platformUsersController');
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
// RUTAS DE GESTIÓN DE PLATFORM ADMINS
// ============================================

// TODO: Implementar CRUD de platform admins
// - GET /platform-admin/admins - Listar admins de plataforma
// - POST /platform-admin/admins - Crear nuevo admin
// - PATCH /platform-admin/admins/:adminId - Actualizar admin
// - DELETE /platform-admin/admins/:adminId - Eliminar admin

module.exports = router;