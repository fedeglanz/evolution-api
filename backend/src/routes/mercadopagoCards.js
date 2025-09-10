const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const cardController = require('../controllers/mercadopagoCardController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route POST /api/mercadopago/customer
 * @desc Crear o obtener customer MercadoPago
 * @access Private (requiere autenticación)
 * @body { email, first_name, last_name, phone_number, identification }
 */
router.post('/customer', cardController.getOrCreateCustomer);

/**
 * @route GET /api/mercadopago/cards
 * @desc Obtener tarjetas guardadas del usuario
 * @access Private
 */
router.get('/cards', cardController.getCustomerCards);

/**
 * @route POST /api/mercadopago/card-token
 * @desc Crear token de tarjeta existente (para usar en pago)
 * @access Private
 * @body { card_id, security_code }
 */
router.post('/card-token', cardController.createCardToken);

/**
 * @route POST /api/mercadopago/card-token/new
 * @desc Crear token de tarjeta nueva desde formulario
 * @access Private
 * @body { card_number, expiration_month, expiration_year, security_code, cardholder: { name, identification } }
 */
router.post('/card-token/new', cardController.createCardTokenFromForm);

/**
 * @route DELETE /api/mercadopago/cards/:cardId
 * @desc Eliminar tarjeta guardada
 * @access Private
 */
router.delete('/cards/:cardId', cardController.deleteCard);

module.exports = router;