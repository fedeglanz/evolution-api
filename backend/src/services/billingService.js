const { MercadoPagoConfig, Payment, Customer, PreApproval } = require('mercadopago');
const { pool } = require('../database');

class BillingService {
  constructor() {
    this.version = '2.1-Sept5-webhook-fix';
    
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
          customer: new Customer(client),
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
      // TEMP: Forzar Stripe para testing (cambiar back después)
      const isArgentina = false; // Forzar internacional para probar Stripe
      // const isArgentina = 
      //   phoneNumber.startsWith('+54') ||
      //   phoneNumber.startsWith('54') ||
      //   email.includes('.com.ar') ||
      //   email.includes('.ar');
        
      console.log(`🇦🇷 Argentina detected: ${isArgentina}`);

      return {
        company,
        region: isArgentina ? 'argentina' : 'international',
        currency: isArgentina ? 'ARS' : 'USD',
        paymentProvider: isArgentina ? 'mercadopago' : 'stripe'
      };

    } catch (error) {
      console.error('Error detecting payment region:', error);
      // Default: internacional
      return {
        region: 'international',
        currency: 'USD',
        paymentProvider: 'stripe'
      };
    }
  }

  /**
   * Crear subscripción con MercadoPago
   */
  async createMercadoPagoSubscription(companyId, planId, customerData) {
    try {
      console.log(`💳 Creating MercadoPago subscription for company ${companyId}`);
      
      // Obtener información del plan
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Convertir USD a ARS (rate aproximado, mejor usar API de conversión)
      const usdToArs = 1000; // Actualizar con rate real
      let priceInARS = Math.round(plan.price_usd * usdToArs);
      
      // Para sandbox, usar montos menores para evitar restricciones
      if (process.env.MERCADOPAGO_SANDBOX === 'true') {
        priceInARS = Math.min(priceInARS, 100000); // Máximo 100,000 ARS en sandbox
        if (priceInARS < 100) priceInARS = 100; // Mínimo 1 ARS
      }
      
      console.log(`💰 Plan price: ${plan.price_usd} USD = ${priceInARS} ARS`);

      // Verificar que MercadoPago esté configurado
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      // Configurar nombre del marketplace
      const marketplaceName = process.env.MARKETPLACE_NAME || 'WhatsApp Bot Platform';
      
      // Preparar datos del teléfono para MercadoPago
      let phoneNumber = customerData.phone_number || '';
      if (phoneNumber.startsWith('+54')) {
        phoneNumber = phoneNumber.substring(3); // Remove +54
      }
      
      // Para sandbox, usar datos de prueba válidos o reales según configuración
      const isRealSandboxTest = process.env.MERCADOPAGO_SANDBOX === 'true';
      
      // En sandbox, usar datos completamente de prueba para evitar PolicyAgent blocks
      const testCustomerData = isRealSandboxTest ? {
        email: 'test_user_' + Date.now() + '@testuser.com',  // Email único de prueba
        first_name: 'Test',
        last_name: 'User',
        phone: {
          area_code: '11',
          number: '22223333'  // Número de prueba válido
        },
        identification: {
          type: 'DNI',
          number: '12345678'
        },
        description: `${marketplaceName} - Test Customer`
      } : {
        // Producción: usar datos reales
        email: customerData.email,
        first_name: customerData.first_name || 'Test',
        last_name: customerData.last_name || 'User',
        phone: {
          area_code: '11',
          number: phoneNumber.replace(/\D/g, '').substring(-8) || '12345678'
        },
        identification: {
          type: 'DNI',
          number: customerData.id_number || '12345678'
        },
        description: `${marketplaceName} - Cliente: ${customerData.company_name || customerData.first_name}`
      };

      console.log('📞 Creating/Finding MP customer with data:', JSON.stringify(testCustomerData, null, 2));

      let customer;
      
      try {
        // Intentar buscar cliente existente por email
        const searchResult = await this.mercadopago.customer.search({
          email: testCustomerData.email
        });
        
        if (searchResult && searchResult.results && searchResult.results.length > 0) {
          customer = searchResult.results[0];
          console.log('✅ MercadoPago customer found:', customer.id);
        } else {
          // Si no existe, crear nuevo
          customer = await this.mercadopago.customer.create({
            body: testCustomerData
          });
          console.log('✅ MercadoPago customer created:', customer.id);
        }
      } catch (error) {
        // Si falla la búsqueda, intentar crear directamente
        console.log('⚠️ Customer search failed, trying to create:', error.message);
        try {
          customer = await this.mercadopago.customer.create({
            body: testCustomerData
          });
          console.log('✅ MercadoPago customer created:', customer.id);
        } catch (createError) {
          // Si el error es que ya existe, es un error de race condition
          if (createError.cause && createError.cause[0]?.code === '101') {
            console.log('⚠️ Customer already exists, searching again...');
            const searchRetry = await this.mercadopago.customer.search({
              email: testCustomerData.email
            });
            if (searchRetry && searchRetry.results && searchRetry.results.length > 0) {
              customer = searchRetry.results[0];
              console.log('✅ MercadoPago customer found on retry:', customer.id);
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }

      // Crear plan de subscripción recurrente
      const preapprovalData = {
        reason: `${marketplaceName} - Plan ${plan.name}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: priceInARS,
          currency_id: 'ARS'
        },
        payment_methods_allowed: {
          payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' }
          ],
          payment_methods: [
            { id: 'visa' },
            { id: 'master' },
            { id: 'amex' }
          ]
        },
        back_url: `${process.env.BACKEND_URL}/api/billing/payment-return`, // Backend captura datos y redirige
        payer_email: customerData.email,
        external_reference: `company_${companyId}_plan_${planId}`,
        notification_url: `${process.env.BACKEND_URL}/api/billing/webhooks/mercadopago`
      };

      const subscription = await this.mercadopago.preapproval.create({
        body: preapprovalData
      });
      
      console.log('✅ MercadoPago preapproval created:', subscription.id);

      // Guardar subscripción en BD
      const subscriptionQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          mercadopago_subscription_id = $2,
          mercadopago_customer_id = $3,
          status = 'pending_payment',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'active'
      `;

      await pool.query(subscriptionQuery, [
        companyId,
        subscription.id,
        customer.id
      ]);

      // Fix: Forzar URL sandbox si estamos en sandbox mode
      let checkoutUrl = subscription.init_point;
      if (process.env.MERCADOPAGO_SANDBOX === 'true' && checkoutUrl.includes('www.mercadopago.com')) {
        checkoutUrl = checkoutUrl.replace('www.mercadopago.com', 'sandbox.mercadopago.com');
        console.log('🧪 URL convertida a sandbox:', checkoutUrl);
      }

      return {
        success: true,
        subscription_id: subscription.id,
        checkout_url: checkoutUrl,
        sandbox_url: subscription.sandbox_init_point,
        customer_id: customer.id,
        amount: priceInARS,
        currency: 'ARS'
      };

    } catch (error) {
      console.error('❌ Error creating MercadoPago subscription:', error);
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
      const checkoutSession = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        success_url: `${process.env.FRONTEND_URL}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing?status=cancelled`,
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
    try {
      console.log('🔔 Processing Stripe webhook - Version 2.0');
      console.log('🔍 Event type:', event.type);
      
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

      // Actualizar suscripción en BD
      const updateQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          stripe_subscription_id = $2,
          stripe_customer_id = $3,
          status = 'active',
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'pending_payment'
      `;

      console.log('🔄 Executing update query...');
      const updateResult = await pool.query(updateQuery, [companyId, session.subscription, session.customer]);
      console.log('✅ Update result - rows affected:', updateResult.rowCount);
      
      // Si no se actualizó ninguna fila, intentar con cualquier estado
      if (updateResult.rowCount === 0) {
        console.log('⚠️ No rows updated, trying without status filter...');
        const retryQuery = `
          UPDATE whatsapp_bot.subscriptions 
          SET 
            stripe_subscription_id = $2,
            stripe_customer_id = $3,
            status = 'active',
            updated_at = NOW()
          WHERE company_id = $1
        `;
        const retryResult = await pool.query(retryQuery, [companyId, session.subscription, session.customer]);
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
      const transactionResult = await pool.query(transactionQuery, [
        subscriptionIdDB,
        companyId, 
        'subscription', 
        `Starter Plan subscription payment`,
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
   * Procesar webhook de MercadoPago
   */
  async handleMercadoPagoWebhook(webhookData) {
    try {
      console.log('📨 Processing MercadoPago webhook:', webhookData.type);

      if (webhookData.type === 'preapproval') {
        const preapprovalId = webhookData.data.id;
        
        // Obtener información de la preapproval
        const preapproval = await this.mercadopago.preapproval.get({
          id: preapprovalId
        });
        const status = preapproval.status;
        const externalRef = preapproval.external_reference;

        console.log(`📨 MercadoPago preapproval ${preapprovalId} status: ${status}`);

        // Actualizar estado en BD
        const updateQuery = `
          UPDATE whatsapp_bot.subscriptions 
          SET 
            status = $2,
            current_period_start = CASE WHEN $2 = 'active' THEN NOW() ELSE current_period_start END,
            current_period_end = CASE WHEN $2 = 'active' THEN NOW() + INTERVAL '1 month' ELSE current_period_end END,
            updated_at = NOW()
          WHERE mercadopago_subscription_id = $1
        `;

        let dbStatus;
        switch (status) {
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

        await pool.query(updateQuery, [preapprovalId, dbStatus]);

        // Registrar transacción si es pago exitoso
        if (status === 'authorized') {
          await this.recordPayment(preapprovalId, 'mercadopago', {
            amount: preapproval.auto_recurring.transaction_amount,
            currency: 'ARS',
            external_reference: externalRef
          });
        }

        console.log(`✅ Subscription status updated to: ${dbStatus}`);
      }

    } catch (error) {
      console.error('❌ Error processing MercadoPago webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de Stripe
   */
  async handleStripeWebhook(webhookData) {
    try {
      console.log('📨 Processing Stripe webhook:', webhookData.type);

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