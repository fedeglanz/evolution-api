const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword 
} = require('../middleware/validation');

// Public routes (no authentication required)
router.post('/register', validateRegister, authController.register);
router.post('/register-with-plan', authController.registerWithPlan);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Protected routes (authentication required)
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword);

// Route info (for development)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes - Sistema de autenticación JWT',
    availableRoutes: {
      public: [
        'POST /register - Registrar nueva empresa y usuario admin',
        'POST /login - Iniciar sesión con email/password',
        'POST /forgot-password - Solicitar recuperación de contraseña',
        'POST /reset-password - Restablecer contraseña con token'
      ],
      protected: [
        'GET /me - Obtener datos del usuario actual',
        'POST /logout - Cerrar sesión',
        'POST /refresh - Renovar token JWT',
        'POST /change-password - Cambiar contraseña'
      ]
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      expiration: '7 days'
    }
  });
});

module.exports = router;
