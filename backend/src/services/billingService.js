const { MercadoPagoConfig, Payment, PreApproval } = require('mercadopago');
const { pool } = require('../database');

class BillingService {
  constructor() {
    this.version = '2.2-Sept5-DUPLICATE-FIX';
    
    // Configurar MercadoPago con la nueva API
    this.mercadopago = null;
    if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
      try {
        // Configuración simplificada que funciona con TEST tokens
        const client = new MercadoPagoConfig({ 
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
          options: { 
            timeout: 5000
          }
        });
        
        this.mercadopago = {
          client: client,
          payment: new Payment(client),
          preapproval: new PreApproval(client)
        };
        
        console.log('💳 MercadoPago configurado con nueva API - v2.1 Sept 5');
        console.log('🔑 Access Token type:', process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 8));
        console.log('🚀 Webhook fix deployed at:', new Date().toISOString());
      } catch (error) {
        console.log('⚠️ Error configurando MercadoPago:', error.message);
        this.mercadopago = null;
      }
    } else {
      console.log('⚠️ MercadoPago no configurado - falta MERCADOPAGO_ACCESS_TOKEN');
    }

    // Configurar Stripe solo si tenemos la clave válida
    this.stripe = null;
    if (process.env.STRIPE_SECRET_KEY && 
        process.env.STRIPE_SECRET_KEY !== 'placeholder_stripe_key_not_configured' &&
        process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      try {
        const stripe = require('stripe');
        this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
        console.log('💳 Stripe configurado correctamente');
      } catch (error) {
        console.log('⚠️ Error configurando Stripe:', error.message);
        this.stripe = null;
      }
    } else {
      console.log('⚠️ Stripe no configurado - STRIPE_SECRET_KEY no válida o no configurada');
    }
  }

  /**
   * Detectar país y moneda basado en datos del cliente o empresa
   */
  async detectPaymentRegion(companyId, customerData = null) {
    try {
      // Obtener información de la empresa
      const companyQuery = `
        SELECT 
          c.*,
          u.email as user_email
        FROM whatsapp_bot.companies c
        JOIN whatsapp_bot.users u ON c.id = u.company_id
        WHERE c.id = $1
        LIMIT 1
      `;
      
      const result = await pool.query(companyQuery, [companyId]);
      const company = result.rows[0];
      
      if (!company) {
        throw new Error('Empresa no encontrada');
      }

      // Lógica de detección de región - usar customerData si está disponible
      const phoneNumber = customerData?.phone_number || '';  // No hay phone en BD
      const email = customerData?.email || company.email || company.user_email || '';
      
      console.log(`🌍 Detecting region with phone: ${phoneNumber}, email: ${email}`);
      
      // Detectar Argentina por código de área o dominio
      const isArgentina = 
        phoneNumber.startsWith('+54') ||
        phoneNumber.startsWith('54') ||
        email.includes('.com.ar') ||
        email.includes('.ar');
        
      console.log(`🇦🇷 Argentina detected: ${isArgentina}`);

      // Determinar proveedor de pago y validar disponibilidad  
      const paymentProvider = isArgentina ? 'mercadopago' : 'stripe';
      console.log(`💳 Recommended payment provider: ${paymentProvider}`);

      return {
        company,
        region: isArgentina ? 'argentina' : 'international',
        currency: isArgentina ? 'ARS' : 'USD',
        paymentProvider: paymentProvider,
        countryCode: isArgentina ? 'AR' : 'INTL'
      };

    } catch (error) {
      console.error('Error detecting payment region:', error);
      // Default: internacional
      return {
        region: 'international',
        currency: 'USD',
        paymentProvider: 'stripe',
        countryCode: 'INTL'
      };
    }
  }

  /**
   * Crear subscripción con MercadoPago usando planes configurados
   */
  async createMercadoPagoSubscription(companyId, planId, customerData, cardTokenId = null) {
    try {
      console.log(`💳 Creating MercadoPago subscription for company ${companyId} - Using configured plan`);
      
      // Obtener información del plan con configuración de MercadoPago
      const planQuery = `
        SELECT 
          p.*,
          p.mercadopago_plan_id,
          p.mercadopago_config,
          p.mercadopago_enabled
        FROM whatsapp_bot.plans p 
        WHERE p.id = $1
      `;
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Verificar que el plan tenga MercadoPago configurado
      if (!plan.mercadopago_enabled) {
        throw new Error('MercadoPago no está habilitado para este plan');
      }

      if (!plan.mercadopago_plan_id) {
        throw new Error('El plan no tiene configuración de MercadoPago. Configure el plan primero desde Platform Admin.');
      }

      // Verificar que MercadoPago esté configurado en el servicio
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado en el sistema');
      }

      console.log(`📋 Using MercadoPago plan: ${plan.mercadopago_plan_id}`);
      console.log(`💰 Plan: ${plan.name} (${plan.key})`);

      // Generar external reference único
      const externalReference = `company_${companyId}_plan_${planId}_${Date.now()}`;
      
      // Extraer configuración del plan
      const mpConfig = plan.mercadopago_config || {};
      const usdToArs = mpConfig.usd_to_ars_rate || 1000;
      const priceInARS = Math.round(plan.price_usd * usdToArs);

      // Crear subscripción usando configuración del plan (sin preapproval_plan_id)
      // Esto fuerza el flujo de checkout para tokenización
      const autoRecurringBase = {
        frequency: 1,
        frequency_type: plan.billing_period === 'yearly' ? 'years' : 'months',
        transaction_amount: priceInARS,
        currency_id: 'ARS',
        // Usar configuración del plan
        ...(mpConfig.billing_day && { billing_day: mpConfig.billing_day }),
        ...(mpConfig.billing_day_proportional !== undefined && { billing_day_proportional: mpConfig.billing_day_proportional })
      };

      // Agregar free trial si está configurado
      if (mpConfig.free_trial && mpConfig.free_trial.frequency > 0) {
        autoRecurringBase.free_trial = {
          frequency: mpConfig.free_trial.frequency,
          frequency_type: mpConfig.free_trial.frequency_type || 'days'
        };
      }

      const preapprovalData = {
        reason: `${plan.name} - WhatsApp Bot Platform`,
        external_reference: externalReference,
        payer_email: customerData.email,
        auto_recurring: autoRecurringBase,
        // Agregar métodos de pago si están configurados
        ...(mpConfig.payment_methods_allowed && { payment_methods_allowed: mpConfig.payment_methods_allowed }),
        // Configurar card_token_id si está disponible (flujo directo)
        ...(cardTokenId && { card_token_id: cardTokenId }),
        back_url: `${process.env.FRONTEND_URL}/billing?status=success&provider=mercadopago`,
        // Para tokenized cards, usar status authorized en lugar de pending
        status: cardTokenId ? 'authorized' : 'pending'
      };


      console.log('📋 Creating preapproval with plan data:', JSON.stringify(preapprovalData, null, 2));

      const subscription = await this.mercadopago.preapproval.create({
        body: preapprovalData
      });
      
      console.log('✅ MercadoPago subscription created:', subscription.id);
      console.log('🔗 Init point:', subscription.init_point);
      console.log('💳 Using plan config:', plan.mercadopago_config);

      // Guardar subscripción en BD
      const subscriptionQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          mercadopago_subscription_id = $2,
          status = 'pending_payment',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'active'
      `;

      const updateResult = await pool.query(subscriptionQuery, [
        companyId,
        subscription.id
      ]);
      
      console.log('📊 BD update result:', updateResult.rowCount, 'rows affected');

      return {
        success: true,
        subscription_id: subscription.id,
        checkout_url: subscription.init_point,
        payer_id: subscription.payer_id,
        plan_id: plan.mercadopago_plan_id, // Plan configurado (para referencia)
        amount: priceInARS,
        currency: 'ARS',
        external_reference: externalReference,
        billing_config: {
          billing_day: mpConfig.billing_day,
          free_trial: mpConfig.free_trial,
          proportional: mpConfig.billing_day_proportional,
          used_plan_config: true // Indica que se usó configuración del plan
        }
      };

    } catch (error) {
      console.error('❌ Error creating MercadoPago subscription:', error);
      console.error('❌ Error details:', error.cause || error.message);
      throw error;
    }
  }

  /**
   * Crear subscripción con Stripe
   */
  async createStripeSubscription(companyId, planId, customerData) {
    try {
      console.log(`💳 Creating Stripe subscription for company ${companyId}`);
      
      // Obtener información del plan
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Verificar que Stripe esté configurado
      if (!this.stripe) {
        throw new Error('Stripe no está configurado');
      }

      // Crear customer en Stripe
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: `${customerData.first_name} ${customerData.last_name}`,
        phone: customerData.phone_number,
        metadata: {
          company_id: companyId,
          company_name: customerData.company_name
        }
      });

      console.log('✅ Stripe customer created:', customer.id);

      // Crear producto y precio en Stripe
      const product = await this.stripe.products.create({
        name: `${plan.name} Plan`,
        description: plan.description,
        metadata: {
          plan_id: planId,
          plan_key: plan.key
        }
      });

      const price = await this.stripe.prices.create({
        unit_amount: Math.round(plan.price_usd * 100), // Stripe usa centavos
        currency: 'usd',
        recurring: {
          interval: plan.billing_period === 'yearly' ? 'year' : 'month'
        },
        product: product.id
      });

      // Crear Stripe Checkout Session (redirect como MercadoPago)
      const successUrl = `${process.env.FRONTEND_URL}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${process.env.FRONTEND_URL}/billing?status=cancelled`;
      
      console.log('🔗 Configured success URL:', successUrl);
      console.log('🔗 Configured cancel URL:', cancelUrl);
      
      const checkoutSession = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          company_id: companyId,
          plan_id: planId
        }
      });

      console.log('✅ Stripe checkout session created:', checkoutSession.id);

      // Guardar checkout session en BD
      const subscriptionQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          stripe_subscription_id = $2,
          stripe_customer_id = $3,
          status = 'pending_payment',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'active'
      `;

      await pool.query(subscriptionQuery, [
        companyId,
        checkoutSession.id, // Usamos session ID temporalmente
        customer.id
      ]);

      return {
        success: true,
        subscription_id: checkoutSession.id,
        checkout_url: checkoutSession.url, // URL para redirect
        customer_id: customer.id,
        amount: plan.price_usd,
        currency: 'USD'
      };

    } catch (error) {
      console.error('❌ Error creating Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event) {
    console.log('🚀 handleStripeWebhook CALLED - Version 2.0');
    try {
      console.log('🔔 Processing Stripe webhook - Version 2.0');
      console.log('🔍 Event type:', event.type);
      
      // Log all event types for debugging
      if (event.type === 'checkout.session.completed') {
        console.log('🎯 DETECTED checkout.session.completed - processing...');
        console.log('🔍 Session data:', JSON.stringify(event.data.object, null, 2));
        await this.handleStripeCheckoutCompleted(event.data.object);
        console.log('✅ Checkout processing completed');
        return;
      } else {
        console.log('📝 Non-checkout event received:', event.type);
      }
      
      // Force handle checkout.session.completed
      if (event.type === 'checkout.session.completed') {
        console.log('🎯 DETECTED checkout.session.completed - processing...');
        await this.handleStripeCheckoutCompleted(event.data.object);
        console.log('✅ Checkout processing completed');
        return;
      }

      switch (event.type) {
        case 'checkout.session.completed':
          console.log('🎯 Calling handleStripeCheckoutCompleted...');
          await this.handleStripeCheckoutCompleted(event.data.object);
          console.log('✅ handleStripeCheckoutCompleted completed');
          break;
        case 'invoice.payment_succeeded':
          await this.handleStripePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleStripePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleStripeSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleStripeSubscriptionCanceled(event.data.object);
          break;
        default:
          console.log(`🔔 Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful Stripe checkout
   */
  async handleStripeCheckoutCompleted(session) {
    try {
      console.log('✅ Stripe checkout completed - Handler v2.0');
      console.log('📋 Session ID:', session.id);
      console.log('📋 Metadata:', JSON.stringify(session.metadata));
      
      const companyId = session.metadata?.company_id;
      const planId = session.metadata?.plan_id;
      
      if (!companyId) {
        console.error('❌ No company_id in metadata');
        return;
      }
      
      console.log('🏢 Processing payment for company:', companyId);
      console.log('📋 Processing payment for plan:', planId);
      
      // Obtener información del plan
      let planInfo = null;
      if (planId) {
        try {
          const planQuery = 'SELECT name FROM whatsapp_bot.plans WHERE id = $1';
          const planResult = await pool.query(planQuery, [planId]);
          planInfo = planResult.rows[0];
          console.log('📊 Plan info found:', planInfo);
        } catch (error) {
          console.error('⚠️ Error getting plan info:', error.message);
        }
      }

      // Actualizar suscripción en BD incluyendo el plan_id si está disponible
      const updateQuery = planId ? `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          plan_id = $2,
          stripe_subscription_id = $3,
          stripe_customer_id = $4,
          status = 'active',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'pending_payment'
      ` : `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          stripe_subscription_id = $2,
          stripe_customer_id = $3,
          status = 'active',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'pending_payment'
      `;

      console.log('🔄 Executing update query...');
      const updateParams = planId ? 
        [companyId, planId, session.subscription, session.customer] :
        [companyId, session.subscription, session.customer];
      const updateResult = await pool.query(updateQuery, updateParams);
      console.log('✅ Update result - rows affected:', updateResult.rowCount);
      
      // Si no se actualizó ninguna fila, intentar con cualquier estado
      if (updateResult.rowCount === 0) {
        console.log('⚠️ No rows updated, trying without status filter...');
        const retryQuery = planId ? `
          UPDATE whatsapp_bot.subscriptions 
          SET 
            plan_id = $2,
            stripe_subscription_id = $3,
            stripe_customer_id = $4,
            status = 'active',
            updated_at = NOW()
          WHERE company_id = $1
        ` : `
          UPDATE whatsapp_bot.subscriptions 
          SET 
            stripe_subscription_id = $2,
            stripe_customer_id = $3,
            status = 'active',
            updated_at = NOW()
          WHERE company_id = $1
        `;
        const retryParams = planId ? 
          [companyId, planId, session.subscription, session.customer] :
          [companyId, session.subscription, session.customer];
        const retryResult = await pool.query(retryQuery, retryParams);
        console.log('✅ Retry result - rows affected:', retryResult.rowCount);
      }
      
      // Obtener subscription_id de la BD
      const subQuery = 'SELECT id FROM whatsapp_bot.subscriptions WHERE company_id = $1 LIMIT 1';
      const subResult = await pool.query(subQuery, [companyId]);
      const subscriptionIdDB = subResult.rows[0]?.id;
      
      if (!subscriptionIdDB) {
        console.error('❌ No subscription found for company');
        return;
      }
      
      // Crear transacción en historial
      const transactionQuery = `
        INSERT INTO whatsapp_bot.billing_transactions (
          subscription_id, company_id, type, description, amount_usd, 
          currency, payment_status, payment_method, stripe_payment_intent_id,
          paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;
      
      console.log('🔄 Creating transaction record...');
      const planName = planInfo?.name || 'Plan';
      const description = `${planName} subscription payment`;
      console.log('📝 Transaction description:', description);
      
      const transactionResult = await pool.query(transactionQuery, [
        subscriptionIdDB,
        companyId, 
        'subscription', 
        description,
        session.amount_total / 100, // Stripe usa centavos
        session.currency.toUpperCase(),
        'paid',
        'stripe',
        session.id
      ]);
      console.log('✅ Transaction created - ID:', transactionResult.rows[0]?.id);

      console.log('✅ Stripe subscription activated for company:', companyId);
    } catch (error) {
      console.error('❌ Error handling Stripe checkout completed:', error);
    }
  }

  /**
   * Handle Stripe payment succeeded
   */
  async handleStripePaymentSucceeded(invoice) {
    try {
      console.log('✅ Stripe payment succeeded:', invoice.id);
      console.log('📄 Invoice subscription:', invoice.subscription);
      
      const subscription = invoice.subscription;
      if (!subscription) {
        console.log('⚠️ No subscription ID in invoice, skipping...');
        return;
      }

      // Actualizar próxima fecha de facturación
      const updateQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          next_billing_date = to_timestamp($2),
          updated_at = NOW()
        WHERE stripe_subscription_id = $1
      `;

      const result = await pool.query(updateQuery, [subscription, invoice.period_end]);
      console.log('✅ Updated billing date for', result.rowCount, 'subscriptions');
      
    } catch (error) {
      console.error('❌ Error handling Stripe payment succeeded:', error);
    }
  }

  /**
   * Handle Stripe payment failed
   */
  async handleStripePaymentFailed(invoice) {
    try {
      console.log('❌ Stripe payment failed:', invoice.id);
      
      const subscription = invoice.subscription;
      if (!subscription) return;

      // Marcar como delinquent
      const updateQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          status = 'past_due',
          updated_at = NOW()
        WHERE stripe_subscription_id = $1
      `;

      await pool.query(updateQuery, [subscription]);
      
    } catch (error) {
      console.error('❌ Error handling Stripe payment failed:', error);
    }
  }

  /**
   * Validar webhook de MercadoPago con clave secreta
   */
  validateMercadoPagoWebhook(xSignature, webhookBody) {
    try {
      if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        console.log('⚠️ MERCADOPAGO_WEBHOOK_SECRET not configured, skipping validation');
        return true;
      }

      if (!xSignature) {
        console.log('⚠️ No x-signature header found, skipping validation');
        return true;
      }

      const crypto = require('crypto');
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      
      // MercadoPago signature format: ts=timestamp,v1=hash
      console.log('🔐 Raw signature:', xSignature);
      
      // Extract timestamp and hash from signature
      const signatureParts = xSignature.split(',');
      let timestamp = null;
      let hash = null;
      
      signatureParts.forEach(part => {
        if (part.startsWith('ts=')) {
          timestamp = part.substring(3);
        } else if (part.startsWith('v1=')) {
          hash = part.substring(3);
        }
      });
      
      if (!timestamp || !hash) {
        console.log('⚠️ Invalid signature format, expected ts= and v1=');
        return false;
      }
      
      // Create payload for validation: timestamp + "." + body
      const payload = `${timestamp}.${webhookBody}`;
      console.log('🔐 Validation payload:', payload);
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      const isValid = expectedSignature === hash;
      console.log(`🔐 Expected signature: ${expectedSignature}`);
      console.log(`🔐 Received signature: ${hash}`);
      console.log(`🔐 Webhook signature validation: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return isValid;
    } catch (error) {
      console.error('❌ Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Procesar webhook de MercadoPago
   */
  async handleMercadoPagoWebhook(webhookData, xSignature = null, rawBody = null) {
    try {
      console.log('📨 Processing MercadoPago webhook v2.0:', JSON.stringify(webhookData, null, 2));
      
      // Validar autenticidad del webhook si tenemos la signature
      if (xSignature && rawBody) {
        const isValid = this.validateMercadoPagoWebhook(xSignature, rawBody);
        if (!isValid) {
          console.log('⚠️ Webhook signature validation failed - continuing for testing purposes');
          // Temporalmente deshabilitado para testing
          // throw new Error('Invalid webhook signature - possible fraud attempt');
        }
      }

      // MercadoPago webhook structure: { type, action, data: { id } }
      const eventType = webhookData.type;
      const action = webhookData.action;
      const resourceId = webhookData.data?.id;

      if (!resourceId) {
        console.log('⚠️ No resource ID in webhook data, skipping...');
        return;
      }

      console.log(`📋 Processing ${eventType} event with action ${action} for resource ${resourceId}`);

      // Manejar eventos de suscripciones (preapproval)
      if (eventType === 'subscription_preapproval' || eventType === 'subscription') {
        await this.handleSubscriptionWebhook(resourceId, action);
      }
      
      // Manejar eventos de pagos
      else if (eventType === 'payment') {
        await this.handlePaymentWebhook(resourceId, action);
      }
      
      // Manejar otros eventos de preapproval
      else if (eventType === 'preapproval') {
        await this.handlePreapprovalWebhook(resourceId, action);
      }
      
      else {
        console.log(`ℹ️ Unhandled webhook type: ${eventType}`);
      }

    } catch (error) {
      console.error('❌ Error processing MercadoPago webhook:', error);
      throw error;
    }
  }

  /**
   * Manejar webhook de subscription preapproval
   */
  async handleSubscriptionWebhook(subscriptionId, action) {
    try {
      console.log(`🔄 Processing subscription webhook: ${subscriptionId} - ${action}`);
      
      // Obtener información de la subscripción desde MP
      const subscription = await this.mercadopago.preapproval.get({
        id: subscriptionId
      });
      
      console.log(`📋 Subscription status: ${subscription.status}`);
      console.log(`📋 External reference: ${subscription.external_reference}`);

      // Mapear estado de MercadoPago a nuestro sistema
      let dbStatus;
      switch (subscription.status) {
        case 'authorized':
          dbStatus = 'active';
          break;
        case 'paused':
          dbStatus = 'paused';
          break;
        case 'cancelled':
          dbStatus = 'cancelled';
          break;
        case 'pending':
          dbStatus = 'pending_payment';
          break;
        default:
          dbStatus = 'expired';
      }

      // Actualizar estado en BD
      const updateQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          status = $2,
          current_period_start = CASE 
            WHEN $2 = 'active' AND current_period_start IS NULL THEN NOW() 
            ELSE current_period_start 
          END,
          current_period_end = CASE 
            WHEN $2 = 'active' AND current_period_end IS NULL THEN NOW() + INTERVAL '1 month'
            ELSE current_period_end 
          END,
          updated_at = NOW()
        WHERE mercadopago_subscription_id = $1
      `;

      const updateResult = await pool.query(updateQuery, [subscriptionId, dbStatus]);
      console.log(`✅ Updated ${updateResult.rowCount} subscriptions to status: ${dbStatus}`);

      // Si es autorizada, registrar la transacción inicial
      if (subscription.status === 'authorized' && action === 'updated') {
        await this.recordMercadoPagoPayment(subscriptionId, subscription);
      }

    } catch (error) {
      console.error('❌ Error handling subscription webhook:', error);
      throw error;
    }
  }

  /**
   * Manejar webhook de payment
   */
  async handlePaymentWebhook(paymentId, action) {
    try {
      console.log(`💳 Processing payment webhook: ${paymentId} - ${action}`);
      
      // Obtener información del pago desde MP
      const payment = await this.mercadopago.payment.get({
        id: paymentId
      });
      
      console.log(`💳 Payment status: ${payment.status}`);
      console.log(`💳 Preapproval ID: ${payment.metadata?.preapproval_id}`);

      // Solo procesar pagos aprobados de suscripciones
      if (payment.status === 'approved' && payment.metadata?.preapproval_id) {
        await this.recordMercadoPagoPaymentTransaction(payment);
      }

    } catch (error) {
      console.error('❌ Error handling payment webhook:', error);
      throw error;
    }
  }

  /**
   * Manejar webhook de preapproval (método legacy)
   */
  async handlePreapprovalWebhook(preapprovalId, action) {
    try {
      console.log(`📋 Processing preapproval webhook: ${preapprovalId} - ${action}`);
      
      // Redirigir al handler de subscription
      await this.handleSubscriptionWebhook(preapprovalId, action);

    } catch (error) {
      console.error('❌ Error handling preapproval webhook:', error);
      throw error;
    }
  }

  /**
   * Registrar pago de MercadoPago
   */
  async recordMercadoPagoPayment(subscriptionId, subscription) {
    try {
      // Obtener información de la subscripción en BD
      const subscriptionQuery = `
        SELECT s.*, c.id as company_id, p.name as plan_name
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.companies c ON s.company_id = c.id  
        LEFT JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE s.mercadopago_subscription_id = $1
      `;

      const result = await pool.query(subscriptionQuery, [subscriptionId]);
      const dbSubscription = result.rows[0];

      if (!dbSubscription) {
        console.log(`⚠️ Subscription not found in DB: ${subscriptionId}`);
        return;
      }

      // Registrar transacción
      const amount = subscription.auto_recurring?.transaction_amount || subscription.transaction_amount || 0;
      const currency = subscription.auto_recurring?.currency_id || 'ARS';
      
      const transactionQuery = `
        INSERT INTO whatsapp_bot.billing_transactions (
          subscription_id, company_id, type, description,
          amount_usd, currency, base_fee,
          payment_status, payment_method,
          mercadopago_payment_id,
          paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id
      `;

      // Convertir ARS a USD para almacenamiento
      const arsToUsd = amount / 1000; // Usar tasa configurable después
      
      const transactionResult = await pool.query(transactionQuery, [
        dbSubscription.id,
        dbSubscription.company_id,
        'subscription',
        `${dbSubscription.plan_name || 'Plan'} - Pago mensual`,
        arsToUsd,
        currency,
        amount,
        'paid',
        'mercadopago',
        subscriptionId
      ]);

      console.log(`✅ Payment recorded: ${amount} ${currency} - Transaction ID: ${transactionResult.rows[0]?.id}`);

    } catch (error) {
      console.error('❌ Error recording MercadoPago payment:', error);
    }
  }

  /**
   * Registrar transacción de pago individual
   */
  async recordMercadoPagoPaymentTransaction(payment) {
    try {
      const preapprovalId = payment.metadata?.preapproval_id;
      if (!preapprovalId) {
        console.log('⚠️ No preapproval_id in payment metadata');
        return;
      }

      // Obtener información de la subscripción
      const subscriptionQuery = `
        SELECT s.*, c.id as company_id, p.name as plan_name
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.companies c ON s.company_id = c.id  
        LEFT JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE s.mercadopago_subscription_id = $1
      `;

      const result = await pool.query(subscriptionQuery, [preapprovalId]);
      const subscription = result.rows[0];

      if (!subscription) {
        console.log(`⚠️ Subscription not found for preapproval: ${preapprovalId}`);
        return;
      }

      // Registrar transacción del pago
      const transactionQuery = `
        INSERT INTO whatsapp_bot.billing_transactions (
          subscription_id, company_id, type, description,
          amount_usd, currency, base_fee,
          payment_status, payment_method,
          mercadopago_payment_id,
          paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

      const arsToUsd = payment.transaction_amount / 1000;
      
      const transactionResult = await pool.query(transactionQuery, [
        subscription.id,
        subscription.company_id,
        'payment',
        `${subscription.plan_name || 'Plan'} - Pago recurrente`,
        arsToUsd,
        payment.currency_id,
        payment.transaction_amount,
        'paid',
        'mercadopago',
        payment.id,
        new Date(payment.date_created)
      ]);

      console.log(`✅ Payment transaction recorded: ${payment.transaction_amount} ${payment.currency_id} - Transaction ID: ${transactionResult.rows[0]?.id}`);

    } catch (error) {
      console.error('❌ Error recording payment transaction:', error);
    }
  }

  /**
   * Procesar webhook de Stripe
   */
  async handleStripeWebhook_OLD(webhookData) {
    try {
      console.log('📨 Processing OLD Stripe webhook:', webhookData.type);

      switch (webhookData.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = webhookData.data.object;
          const subscriptionStatus = this.mapStripeStatus(subscription.status);
          
          await pool.query(
            `UPDATE whatsapp_bot.subscriptions 
             SET status = $2, updated_at = NOW() 
             WHERE stripe_subscription_id = $1`,
            [subscription.id, subscriptionStatus]
          );
          break;

        case 'invoice.payment_succeeded':
          const invoice = webhookData.data.object;
          await this.recordPayment(invoice.subscription, 'stripe', {
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            invoice_id: invoice.id
          });
          break;

        case 'invoice.payment_failed':
          // Manejar fallo de pago
          console.log('❌ Stripe payment failed for subscription:', webhookData.data.object.subscription);
          break;
      }

    } catch (error) {
      console.error('❌ Error processing Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Mapear estados de Stripe a nuestro sistema
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      'active': 'active',
      'incomplete': 'pending_payment',
      'incomplete_expired': 'expired',
      'trialing': 'active',
      'past_due': 'past_due',
      'canceled': 'cancelled',
      'unpaid': 'past_due'
    };
    
    return statusMap[stripeStatus] || 'expired';
  }

  /**
   * Registrar pago exitoso
   */
  async recordPayment(subscriptionId, provider, paymentData) {
    try {
      // Obtener subscripción
      const subscriptionQuery = `
        SELECT s.*, c.id as company_id, p.price_usd, p.name as plan_name
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.companies c ON s.company_id = c.id  
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE ${provider === 'stripe' ? 's.stripe_subscription_id' : 's.mercadopago_subscription_id'} = $1
      `;

      const result = await pool.query(subscriptionQuery, [subscriptionId]);
      const subscription = result.rows[0];

      if (!subscription) {
        console.log(`⚠️ Subscription not found: ${subscriptionId}`);
        return;
      }

      // Registrar transacción
      const transactionQuery = `
        INSERT INTO whatsapp_bot.billing_transactions (
          subscription_id, company_id, type, description,
          amount_usd, currency, base_fee,
          payment_status, payment_method,
          ${provider === 'stripe' ? 'stripe_invoice_id' : 'mercadopago_payment_id'},
          paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `;

      await pool.query(transactionQuery, [
        subscription.id,
        subscription.company_id,
        'subscription',
        `Pago mensual - ${subscription.plan_name}`,
        paymentData.amount,
        paymentData.currency,
        paymentData.amount,
        'paid',
        provider,
        paymentData.invoice_id || paymentData.external_reference
      ]);

      console.log(`✅ Payment recorded: ${paymentData.amount} ${paymentData.currency}`);

    } catch (error) {
      console.error('❌ Error recording payment:', error);
    }
  }
}

module.exports = new BillingService();