const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateUserCreate, 
  validateUserUpdate, 
  validateUserResetPassword, 
  validateUserToggleStatus 
} = require('../middleware/validation');

// Middleware to ensure user is authenticated for all user routes
router.use(authenticateToken);

// GET /api/users - List users in the company
router.get('/', usersController.listUsers);

// POST /api/users - Create new user
router.post('/', validateUserCreate, usersController.createUser);

// GET /api/users/:userId - Get user details
router.get('/:userId', usersController.getUserDetails);

// PATCH /api/users/:userId - Update user
router.patch('/:userId', validateUserUpdate, usersController.updateUser);

// POST /api/users/:userId/reset-password - Reset user password
router.post('/:userId/reset-password', validateUserResetPassword, usersController.resetPassword);

// PATCH /api/users/:userId/status - Toggle user active status
router.patch('/:userId/status', validateUserToggleStatus, usersController.toggleStatus);

// DELETE /api/users/:userId - Soft delete user
router.delete('/:userId', usersController.deleteUser);

module.exports = router;