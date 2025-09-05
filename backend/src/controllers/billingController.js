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
    this.handlePaymentReturn = this.handlePaymentReturn.bind(this);
    this.debugSubscriptionStatus = this.debugSubscriptionStatus.bind(this);
    this.getPaymentSuccess = this.getPaymentSuccess.bind(this);
    
    // Load billing service dynamically to avoid circular imports
    this.billingService = null;
    try {
      this.billingService = require('../services/billingService');
      console.log('✅ BillingService loaded successfully in controller');
      console.log('🔍 Service version:', this.billingService.version);
      console.log('🔍 Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.billingService)));
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
          p.name as plan_display_name,
          p.price_usd,
          p.billing_period,
          p.max_instances,
          p.max_messages,
          p.max_contacts,
          p.included_tokens,
          p.allow_overage as overage_enabled,
          p.overage_rate_per_token,
          CASE 
            WHEN s.current_period_end IS NOT NULL 
            THEN s.current_period_end 
            ELSE NOW() + INTERVAL '30 days' 
          END as next_billing_date
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
      console.log('🔍 BillingService available:', !!this.billingService);
      console.log('🔍 Webhook body keys:', Object.keys(req.body));

      if (this.billingService) {
        console.log('🔄 Calling billingService.handleStripeWebhook...');
        console.log('🔍 Service version check:', this.billingService.version || 'unknown');
        
        // Call the handler
        try {
          console.log('🔍 About to call handleStripeWebhook method');
          console.log('🔍 Method exists?', typeof this.billingService.handleStripeWebhook);
          console.log('🔍 Method toString:', this.billingService.handleStripeWebhook.toString().substring(0, 100));
          
          const result = await this.billingService.handleStripeWebhook(req.body);
          console.log('✅ billingService.handleStripeWebhook completed');
        } catch (serviceError) {
          console.error('❌ Service error:', serviceError.message);
          console.error('❌ Stack:', serviceError.stack);
          throw serviceError;
        }
      } else {
        console.error('❌ Billing service not available');
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
   * GET /api/billing/payment-success/:sessionId
   * Obtener detalles del pago exitoso
   */
  async getPaymentSuccess(req, res) {
    try {
      const { sessionId } = req.params;
      const { companyId } = req.user;

      console.log(`🎉 Getting payment success details for session ${sessionId}`);

      // Obtener detalles del último pago
      const query = `
        SELECT 
          bt.id,
          bt.amount_usd,
          bt.currency,
          bt.payment_status,
          bt.paid_at,
          s.status as subscription_status,
          s.current_period_start,
          s.current_period_end,
          p.name as plan_name,
          p.display_name as plan_display_name,
          p.max_instances,
          p.max_messages,
          p.max_contacts,
          p.included_tokens
        FROM whatsapp_bot.billing_transactions bt
        JOIN whatsapp_bot.subscriptions s ON bt.subscription_id = s.id
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE bt.company_id = $1 
          AND (bt.stripe_payment_intent_id = $2 OR bt.mercadopago_payment_id = $2)
          AND bt.payment_status = 'paid'
        ORDER BY bt.created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [companyId, sessionId]);

      if (result.rows.length === 0) {
        // Si no encuentra por sessionId, buscar el último pago exitoso
        const lastPaymentQuery = `
          SELECT 
            bt.id,
            bt.amount_usd,
            bt.currency,
            bt.payment_status,
            bt.paid_at,
            s.status as subscription_status,
            s.current_period_start,
            s.current_period_end,
            p.name as plan_name,
            p.display_name as plan_display_name,
            p.max_instances,
            p.max_messages,
            p.max_contacts,
            p.included_tokens
          FROM whatsapp_bot.billing_transactions bt
          JOIN whatsapp_bot.subscriptions s ON bt.subscription_id = s.id
          JOIN whatsapp_bot.plans p ON s.plan_id = p.id
          WHERE bt.company_id = $1 
            AND bt.payment_status = 'paid'
          ORDER BY bt.created_at DESC
          LIMIT 1
        `;
        
        const lastPaymentResult = await pool.query(lastPaymentQuery, [companyId]);
        
        if (lastPaymentResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No se encontró información del pago'
          });
        }

        return res.json({
          success: true,
          data: {
            payment: lastPaymentResult.rows[0],
            isLatest: true,
            message: '¡Pago procesado exitosamente!'
          }
        });
      }

      res.json({
        success: true,
        data: {
          payment: result.rows[0],
          isLatest: false,
          message: '¡Tu suscripción está activa!'
        }
      });

    } catch (error) {
      console.error('❌ Error getting payment success:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo detalles del pago',
        error: error.message
      });
    }
  }

  /**
   * GET /api/billing/debug/subscription-status/:companyId
   * Debug: Ver estado completo de suscripción
   */
  async debugSubscriptionStatus(req, res) {
    try {
      const { companyId } = req.params;
      
      // Query completa de debug
      const debugQuery = `
        SELECT 
          s.*,
          p.name as plan_name,
          p.price_usd,
          c.name as company_name
        FROM whatsapp_bot.subscriptions s
        LEFT JOIN whatsapp_bot.plans p ON s.plan_id = p.id  
        LEFT JOIN whatsapp_bot.companies c ON s.company_id = c.id
        WHERE s.company_id = $1
        ORDER BY s.updated_at DESC
      `;
      
      const result = await pool.query(debugQuery, [companyId]);
      
      // También obtener transacciones
      const transactionsQuery = `
        SELECT * FROM whatsapp_bot.billing_transactions 
        WHERE company_id = $1 
        ORDER BY transaction_date DESC 
        LIMIT 5
      `;
      
      const transactions = await pool.query(transactionsQuery, [companyId]);

      res.json({
        success: true,
        subscription: result.rows[0] || null,
        all_subscriptions: result.rows,
        recent_transactions: transactions.rows,
        debug_info: {
          company_id: companyId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error in debug subscription status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting debug info',
        error: error.message
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
   * GET /api/billing/payment-return
   * Manejar retorno de MercadoPago/Stripe después del pago
   */
  async handlePaymentReturn(req, res) {
    try {
      const { 
        collection_id, 
        collection_status, 
        payment_id,
        status,
        external_reference,
        payment_type,
        merchant_order_id,
        preference_id,
        site_id,
        processing_mode,
        merchant_account_id
      } = req.query;

      console.log('💰 Payment return received:', req.query);

      // Guardar información importante del pago
      if (external_reference) {
        // external_reference formato: company_UUID_plan_UUID
        const [, companyId, , planId] = external_reference.split('_');
        
        // TODO: Actualizar estado de subscripción basado en collection_status
        console.log(`📝 Payment return for company ${companyId}, plan ${planId}, status: ${collection_status}`);
      }

      // Determinar URL de redirección
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = collection_status === 'approved' 
        ? `${frontendUrl}/billing/success?payment_id=${payment_id}`
        : `${frontendUrl}/billing/error?status=${collection_status}`;

      // Redirigir al frontend
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('❌ Error handling payment return:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/billing/error`);
    }
  }

  /**
   * GET /api/billing/plans/available
   * Obtener planes disponibles (con/sin autenticación)
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
      const plans = result.rows;

      // Si el usuario está autenticado, obtener su plan actual
      let currentPlanId = null;
      if (req.user && req.user.companyId) {
        try {
          const currentPlanQuery = `
            SELECT s.plan_id 
            FROM whatsapp_bot.subscriptions s
            WHERE s.company_id = $1 AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
          `;
          const currentPlanResult = await pool.query(currentPlanQuery, [req.user.companyId]);
          if (currentPlanResult.rows.length > 0) {
            currentPlanId = currentPlanResult.rows[0].plan_id;
          }
        } catch (error) {
          console.log('⚠️ Error getting current plan (non-critical):', error.message);
        }
      }

      // Marcar el plan actual en la respuesta
      const plansWithCurrentStatus = plans.map(plan => ({
        ...plan,
        is_current: currentPlanId && plan.id === currentPlanId
      }));

      res.json({
        success: true,
        data: plansWithCurrentStatus,
        current_plan_id: currentPlanId
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
  handlePaymentReturn: billingControllerInstance.handlePaymentReturn,
  getPaymentSuccess: billingControllerInstance.getPaymentSuccess,
  handleMercadoPagoWebhook: billingControllerInstance.handleMercadoPagoWebhook,
  handleStripeWebhook: billingControllerInstance.handleStripeWebhook,
  
  // Also export the full instance
  instance: billingControllerInstance
};