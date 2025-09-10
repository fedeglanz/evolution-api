const express = require('express');
const router = express.Router();
const cardController = require('../controllers/mercadopagoCardController');

/**
 * Rutas públicas de MercadoPago para el proceso de onboarding/registro
 * Estas rutas NO requieren autenticación y están destinadas para usuarios
 * que aún no han completado el registro
 */

/**
 * @route POST /api/public/mercadopago/customer
 * @desc Crear o obtener customer MercadoPago (público para onboarding)
 * @access Public
 * @body { email, first_name, last_name, phone_number, identification }
 */
router.post('/customer', cardController.getOrCreateCustomer);

/**
 * @route POST /api/public/mercadopago/card-token/new
 * @desc Crear token de tarjeta nueva desde formulario (público para onboarding)
 * @access Public
 * @body { card_number, expiration_month, expiration_year, security_code, cardholder: { name, identification } }
 */
router.post('/card-token/new', cardController.createCardTokenFromForm);

module.exports = router;