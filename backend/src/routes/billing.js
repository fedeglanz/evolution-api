const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');

// Middleware básico para parsing JSON
router.use(express.json());

/**
 * POST /api/billing/create-subscription
 * Crear nueva subscripción de pago
 * Body: { planId, customerData: { first_name, last_name, email, phone_number, etc } }
 */
router.post('/create-subscription', authenticateToken, billingController.createSubscription);

/**
 * GET /api/billing/subscription-status
 * Obtener estado actual de la subscripción
 */
router.get('/subscription-status', authenticateToken, billingController.getSubscriptionStatus);

/**
 * GET /api/billing/history
 * Obtener historial de facturación
 * Query: ?limit=10&offset=0
 */
router.get('/history', authenticateToken, billingController.getBillingHistory);

/**
 * POST /api/billing/cancel-subscription
 * Cancelar subscripción actual
 * Body: { reason: "Razón de cancelación" }
 */
router.post('/cancel-subscription', authenticateToken, billingController.cancelSubscription);

/**
 * GET /api/billing/plans/available
 * Obtener planes disponibles (sin autenticación para pricing page)
 */
router.get('/plans/available', billingController.getAvailablePlans);

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