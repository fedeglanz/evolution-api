const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Load controller methods directly to avoid undefined callback issues
const billingController = require('../controllers/billingController');
console.log('✅ BillingController loaded in routes');

// Middleware básico para parsing JSON
router.use(express.json());

/**
 * POST /api/billing/create-subscription
 * Crear nueva subscripción de pago
 * Body: { planId, customerData: { first_name, last_name, email, phone_number, etc } }
 */
router.post('/create-subscription', authenticate, billingController.createSubscription);

/**
 * GET /api/billing/subscription-status
 * Obtener estado actual de la subscripción
 */
router.get('/subscription-status', authenticate, billingController.getSubscriptionStatus);

/**
 * GET /api/billing/history
 * Obtener historial de facturación
 * Query: ?limit=10&offset=0
 */
router.get('/history', authenticate, billingController.getBillingHistory);

/**
 * POST /api/billing/cancel-subscription
 * Cancelar subscripción actual
 * Body: { reason: "Razón de cancelación" }
 */
router.post('/cancel-subscription', authenticate, billingController.cancelSubscription);

/**
 * GET /api/billing/plans/available
 * Obtener planes disponibles (sin autenticación para pricing page)
 */
router.get('/plans/available', billingController.getAvailablePlans);

/**
 * GET /api/billing/payment-return
 * Manejar retorno de pago de MercadoPago/Stripe
 */
router.get('/payment-return', billingController.handlePaymentReturn);

// ============================================
// WEBHOOKS (Sin autenticación para proveedores)
// ============================================

/**
 * POST /api/billing/webhooks/mercadopago
 * Webhook para eventos de MercadoPago
 */
router.post('/webhooks/mercadopago', billingController.handleMercadoPagoWebhook);

/**
 * POST /api/billing/webhooks/stripe
 * Webhook para eventos de Stripe
 */
router.post('/webhooks/stripe', billingController.handleStripeWebhook);

module.exports = router;