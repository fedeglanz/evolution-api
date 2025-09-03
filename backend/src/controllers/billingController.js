const { pool } = require('../database');

class BillingController {
  constructor() {
    // Bind methods to preserve context
    this.createSubscription = this.createSubscription.bind(this);
    this.getSubscriptionStatus = this.getSubscriptionStatus.bind(this);
    this.handleMercadoPagoWebhook = this.handleMercadoPagoWebhook.bind(this);
    this.handleStripeWebhook = this.handleStripeWebhook.bind(this);
    this.getBillingHistory = this.getBillingHistory.bind(this);
    this.cancelSubscription = this.cancelSubscription.bind(this);
    this.getAvailablePlans = this.getAvailablePlans.bind(this);
    
    // Load billing service dynamically to avoid circular imports
    this.billingService = null;
    try {
      this.billingService = require('../services/billingService');
      console.log('✅ BillingService loaded successfully in controller');
    } catch (error) {
      console.error('❌ Failed to load BillingService:', error.message);
      this.billingService = null;
    }
  }

  /**
   * POST /api/billing/create-subscription
   * Crear nueva subscripción
   */
  async createSubscription(req, res) {
    try {
      const { companyId } = req.user;
      const { planId, customerData } = req.body;

      console.log(`💳 Creating subscription for company ${companyId} with plan ${planId}`);

      // Validaciones
      if (!planId || !customerData) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID y datos del cliente son obligatorios'
        });
      }

      // Verificar que billing service esté disponible
      if (!this.billingService) {
        return res.status(500).json({
          success: false,
          message: 'Servicio de facturación no disponible'
        });
      }

      // Detectar región y proveedor de pago usando datos del cliente
      const paymentRegion = await this.billingService.detectPaymentRegion(companyId, customerData);
      console.log(`🌍 Payment region detected:`, paymentRegion);

      let subscriptionResult;

      if (paymentRegion.paymentProvider === 'mercadopago') {
        // Crear subscripción con MercadoPago
        subscriptionResult = await this.billingService.createMercadoPagoSubscription(
          companyId,
          planId,
          {
            ...customerData,
            company_name: paymentRegion.company?.name
          }
        );
      } else {
        // Crear subscripción con Stripe
        subscriptionResult = await this.billingService.createStripeSubscription(
          companyId,
          planId,
          {
            ...customerData,
            company_name: paymentRegion.company?.name
          }
        );
      }

      res.status(201).json({
        success: true,
        data: {
          ...subscriptionResult,
          region: paymentRegion.region,
          provider: paymentRegion.paymentProvider,
          currency: paymentRegion.currency
        },
        message: 'Subscripción creada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/billing/subscription-status
   * Obtener estado actual de la subscripción
   */
  async getSubscriptionStatus(req, res) {
    try {
      const { companyId } = req.user;

      const query = `
        SELECT 
          s.*,
          p.name as plan_name,
          p.key as plan_key,
          p.price_usd,
          p.currency,
          p.included_tokens,
          p.max_overage_usd,
          p.allow_overage
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE s.company_id = $1 AND s.status != 'cancelled'
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [companyId]);
      const subscription = result.rows[0];

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró subscripción activa'
        });
      }

      // Calcular días restantes
      let daysRemaining = null;
      if (subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        data: {
          ...subscription,
          days_remaining: daysRemaining,
          payment_provider: subscription.stripe_subscription_id ? 'stripe' : 'mercadopago',
          usage_percentage: subscription.included_tokens > 0 ? 
            (subscription.current_month_tokens / subscription.included_tokens) * 100 : 0
        }
      });

    } catch (error) {
      console.error('❌ Error getting subscription status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/billing/history
   * Obtener historial de facturación
   */
  async getBillingHistory(req, res) {
    try {
      const { companyId } = req.user;
      const { limit = 10, offset = 0 } = req.query;

      const query = `
        SELECT 
          bt.*,
          s.plan_id,
          p.name as plan_name
        FROM whatsapp_bot.billing_transactions bt
        JOIN whatsapp_bot.subscriptions s ON bt.subscription_id = s.id
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE bt.company_id = $1
        ORDER BY bt.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.billing_transactions
        WHERE company_id = $1
      `;

      const [transactions, countResult] = await Promise.all([
        pool.query(query, [companyId, limit, offset]),
        pool.query(countQuery, [companyId])
      ]);

      res.json({
        success: true,
        data: transactions.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('❌ Error getting billing history:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /api/billing/webhooks/mercadopago
   * Webhook de MercadoPago
   */
  async handleMercadoPagoWebhook(req, res) {
    try {
      console.log('📨 MercadoPago webhook received:', req.body);

      if (this.billingService) {
        await this.billingService.handleMercadoPagoWebhook(req.body);
      } else {
        throw new Error('Billing service not available');
      }

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('❌ Error processing MercadoPago webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando webhook'
      });
    }
  }

  /**
   * POST /api/billing/webhooks/stripe
   * Webhook de Stripe
   */
  async handleStripeWebhook(req, res) {
    try {
      console.log('📨 Stripe webhook received:', req.body.type);

      if (this.billingService) {
        await this.billingService.handleStripeWebhook(req.body);
      } else {
        throw new Error('Billing service not available');
      }

      res.status(200).json({ received: true });

    } catch (error) {
      console.error('❌ Error processing Stripe webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando webhook'
      });
    }
  }

  /**
   * POST /api/billing/cancel-subscription
   * Cancelar subscripción
   */
  async cancelSubscription(req, res) {
    try {
      const { companyId } = req.user;
      const { reason } = req.body;

      console.log(`❌ Cancelling subscription for company ${companyId}`);

      // Obtener subscripción activa
      const subscriptionQuery = `
        SELECT * FROM whatsapp_bot.subscriptions 
        WHERE company_id = $1 AND status = 'active'
        LIMIT 1
      `;

      const result = await pool.query(subscriptionQuery, [companyId]);
      const subscription = result.rows[0];

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró subscripción activa para cancelar'
        });
      }

      // Cancelar en el proveedor correspondiente
      try {
        if (subscription.stripe_subscription_id) {
          if (process.env.STRIPE_SECRET_KEY) {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              cancel_at_period_end: true
            });
          } else {
            console.log('⚠️ No se puede cancelar en Stripe - falta STRIPE_SECRET_KEY');
          }
        } else if (subscription.mercadopago_subscription_id) {
          if (this.billingService && this.billingService.mercadopago) {
            await this.billingService.mercadopago.preapproval.update({
              id: subscription.mercadopago_subscription_id,
              body: {
                status: 'cancelled'
              }
            });
          } else {
            console.log('⚠️ No se puede cancelar en MercadoPago - no configurado');
          }
        }
      } catch (providerError) {
        console.error('⚠️ Error cancelling with provider:', providerError);
        // Continuar con cancelación local aunque falle el proveedor
      }

      // Actualizar estado en BD
      const updateQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [subscription.id]);

      // Registrar razón de cancelación
      if (reason) {
        const logQuery = `
          INSERT INTO whatsapp_bot.billing_transactions (
            subscription_id, company_id, type, description,
            amount_usd, currency, payment_status, payment_method
          ) VALUES ($1, $2, 'cancellation', $3, 0, 'USD', 'completed', 'manual')
        `;

        await pool.query(logQuery, [
          subscription.id,
          companyId,
          `Subscripción cancelada: ${reason}`
        ]);
      }

      console.log(`✅ Subscription cancelled for company ${companyId}`);

      res.json({
        success: true,
        message: 'Subscripción cancelada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/billing/plans/available
   * Obtener planes disponibles (sin autenticación)
   */
  async getAvailablePlans(req, res) {
    try {
      const query = `
        SELECT 
          id, name, key, description, price_usd, billing_period,
          max_instances, max_messages, max_contacts, included_tokens,
          allow_overage, overage_rate_per_token, max_overage_usd,
          embeddings, campaigns, priority_support, custom_api_key,
          active, sort_order
        FROM whatsapp_bot.plans 
        WHERE active = true
        ORDER BY sort_order ASC, price_usd ASC
      `;

      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('❌ Error getting available plans:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

// Export instance and individual methods for flexibility
const billingControllerInstance = new BillingController();

// Export individual methods
module.exports = {
  createSubscription: billingControllerInstance.createSubscription,
  getSubscriptionStatus: billingControllerInstance.getSubscriptionStatus,
  getBillingHistory: billingControllerInstance.getBillingHistory,
  cancelSubscription: billingControllerInstance.cancelSubscription,
  getAvailablePlans: billingControllerInstance.getAvailablePlans,
  handleMercadoPagoWebhook: billingControllerInstance.handleMercadoPagoWebhook,
  handleStripeWebhook: billingControllerInstance.handleStripeWebhook,
  
  // Also export the full instance
  instance: billingControllerInstance
};