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

// /**
//  * GET /api/billing/payment-success/:sessionId
//  * Obtener detalles del pago exitoso para mostrar confirmación
//  */
// router.get('/payment-success/:sessionId', authenticate, billingController.getPaymentSuccess);

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

// /**
//  * GET /api/billing/debug/subscription-status/:companyId
//  * Debug: Ver estado de suscripción (temporal)
//  */
// router.get('/debug/subscription-status/:companyId', billingController.debugSubscriptionStatus);

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

/**
 * GET /api/billing/test-webhook
 * Test webhook manually
 */
router.get('/test-webhook', (req, res) => {
  const testEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_manual',
        metadata: {
          company_id: '2ea324e7-7ea7-437e-8e44-14c4002c72eb',
          plan_id: 'test-plan'
        },
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        amount_total: 1500,
        currency: 'usd'
      }
    }
  };
  
  req.body = testEvent;
  billingController.handleStripeWebhook(req, res);
});

module.exports = router;