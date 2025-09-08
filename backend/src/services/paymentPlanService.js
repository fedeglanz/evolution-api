const { MercadoPagoConfig, PreApprovalPlan } = require('mercadopago');
const { pool } = require('../database');

class PaymentPlanService {
  constructor() {
    // Configurar MercadoPago
    this.mercadopago = null;
    if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
      try {
        const client = new MercadoPagoConfig({ 
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
          options: { timeout: 5000 }
        });
        
        this.mercadopago = {
          client: client,
          preApprovalPlan: new PreApprovalPlan(client)
        };
        
        console.log('💳 PaymentPlanService: MercadoPago configurado');
      } catch (error) {
        console.log('⚠️ Error configurando MercadoPago en PaymentPlanService:', error.message);
      }
    }

    // Configurar Stripe
    this.stripe = null;
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      try {
        const stripe = require('stripe');
        this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
        console.log('💳 PaymentPlanService: Stripe configurado');
      } catch (error) {
        console.log('⚠️ Error configurando Stripe en PaymentPlanService:', error.message);
      }
    }
  }

  /**
   * Crear o sincronizar plan en MercadoPago
   */
  async createOrSyncMercadoPagoPlan(planId, config) {
    try {
      console.log(`🔄 Creating/Syncing MercadoPago plan for plan ID: ${planId}`);
      
      // Obtener información del plan
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Si ya tiene un mercadopago_plan_id, actualizar en lugar de crear
      if (plan.mercadopago_plan_id && !config.forceRecreate) {
        console.log(`📝 Plan ya existe en MercadoPago, actualizando: ${plan.mercadopago_plan_id}`);
        
        // Si se solicita solo retornar el existente sin actualizar
        if (config.skipUpdate) {
          return {
            success: true,
            mercadopago_plan_id: plan.mercadopago_plan_id,
            action: 'existing'
          };
        }
        
        // Actualizar el plan existente
        return await this.updateMercadoPagoPlan(planId, plan.mercadopago_plan_id, config);
      }

      // Convertir USD a ARS
      const usdToArs = config.usd_to_ars_rate || 1000;
      const priceInARS = Math.round(plan.price_usd * usdToArs);
      
      // Preparar datos del plan para MercadoPago
      const mpPlanData = {
        reason: `${plan.name} - WhatsApp Bot Platform`,
        auto_recurring: {
          frequency: 1,
          frequency_type: plan.billing_period === 'yearly' ? 'years' : 'months',
          transaction_amount: priceInARS,
          currency_id: 'ARS',
          billing_day: config.billing_day || 1,
          billing_day_proportional: config.billing_day_proportional || false
        },
        back_url: config.back_url || `${process.env.FRONTEND_URL}/billing?status=success&provider=mercadopago`
      };

      // Agregar free trial si está configurado
      if (config.free_trial && config.free_trial.frequency > 0) {
        mpPlanData.auto_recurring.free_trial = {
          frequency: config.free_trial.frequency,
          frequency_type: config.free_trial.frequency_type || 'days'
        };
      }

      // Agregar métodos de pago permitidos
      if (config.payment_methods_allowed) {
        mpPlanData.payment_methods_allowed = config.payment_methods_allowed;
      }

      console.log('📋 Creating MercadoPago plan with data:', JSON.stringify(mpPlanData, null, 2));

      // Crear plan en MercadoPago
      const mpPlan = await this.mercadopago.preApprovalPlan.create({
        body: mpPlanData
      });

      console.log('✅ MercadoPago plan created:', mpPlan.id);

      // Actualizar plan en BD con el ID de MercadoPago
      const updateQuery = `
        UPDATE whatsapp_bot.plans 
        SET 
          mercadopago_plan_id = $2,
          mercadopago_config = $3,
          mercadopago_enabled = true,
          updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [
        planId,
        mpPlan.id,
        JSON.stringify(config)
      ]);

      return {
        success: true,
        mercadopago_plan_id: mpPlan.id,
        action: 'created',
        plan_data: mpPlan
      };

    } catch (error) {
      console.error('❌ Error creating/syncing MercadoPago plan:', error);
      throw error;
    }
  }

  /**
   * Actualizar plan existente en MercadoPago
   */
  async updateMercadoPagoPlan(planId, mercadoPagoPlanId, config) {
    try {
      console.log(`🔄 Updating MercadoPago plan ${mercadoPagoPlanId} for plan ID: ${planId}`);
      
      // Obtener información del plan
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Convertir USD a ARS
      const usdToArs = config.usd_to_ars_rate || 1000;
      const priceInARS = Math.round(plan.price_usd * usdToArs);
      
      // Preparar datos del plan para actualización
      const mpPlanData = {
        reason: `${plan.name} - WhatsApp Bot Platform`,
        auto_recurring: {
          frequency: 1,
          frequency_type: plan.billing_period === 'yearly' ? 'years' : 'months',
          transaction_amount: priceInARS,
          currency_id: 'ARS',
          billing_day: config.billing_day || 1,
          billing_day_proportional: config.billing_day_proportional || false
        },
        back_url: config.back_url || `${process.env.FRONTEND_URL}/billing?status=success&provider=mercadopago`
      };

      // Agregar free trial si está configurado
      if (config.free_trial && config.free_trial.frequency > 0) {
        mpPlanData.auto_recurring.free_trial = {
          frequency: config.free_trial.frequency,
          frequency_type: config.free_trial.frequency_type || 'days'
        };
      }

      // Agregar métodos de pago permitidos
      if (config.payment_methods_allowed) {
        mpPlanData.payment_methods_allowed = config.payment_methods_allowed;
      }

      console.log('📋 Updating MercadoPago plan with data:', JSON.stringify(mpPlanData, null, 2));

      // Actualizar plan en MercadoPago usando PUT
      // Nota: Si el SDK no tiene método update, usar el cliente HTTP directamente
      let mpPlan;
      try {
        mpPlan = await this.mercadopago.preApprovalPlan.update({
          id: mercadoPagoPlanId,
          body: mpPlanData
        });
      } catch (sdkError) {
        console.log('⚠️ SDK update method not available, using direct HTTP request');
        
        // Fallback: usar axios directamente
        const axios = require('axios');
        const response = await axios.put(
          `https://api.mercadopago.com/preapproval_plan/${mercadoPagoPlanId}`,
          mpPlanData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        mpPlan = response.data;
      }

      console.log('✅ MercadoPago plan updated:', mpPlan.id);

      // Actualizar configuración en BD
      const updateQuery = `
        UPDATE whatsapp_bot.plans 
        SET 
          mercadopago_config = $2,
          updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [
        planId,
        JSON.stringify(config)
      ]);

      return {
        success: true,
        mercadopago_plan_id: mpPlan.id,
        action: 'updated',
        plan_data: mpPlan
      };

    } catch (error) {
      console.error('❌ Error updating MercadoPago plan:', error);
      throw error;
    }
  }

  /**
   * Asociar plan existente de MercadoPago
   */
  async associateExistingMercadoPagoPlan(planId, mercadoPagoPlanId, config = {}) {
    try {
      console.log(`🔗 Associating existing MercadoPago plan ${mercadoPagoPlanId} to plan ${planId}`);
      
      // Verificar que el plan existe
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Intentar obtener información del plan de MercadoPago para validar
      try {
        const mpPlan = await this.mercadopago.preApprovalPlan.get({
          id: mercadoPagoPlanId
        });
        
        console.log('✅ MercadoPago plan validated:', mpPlan.id);
        
        // Extraer configuración del plan de MP
        const extractedConfig = {
          ...config,
          billing_day: mpPlan.auto_recurring?.billing_day,
          billing_day_proportional: mpPlan.auto_recurring?.billing_day_proportional,
          free_trial: mpPlan.auto_recurring?.free_trial,
          back_url: mpPlan.back_url
        };
        
        config = extractedConfig;
      } catch (error) {
        console.log('⚠️ Could not validate MercadoPago plan, associating anyway:', error.message);
      }

      // Actualizar plan en BD
      const updateQuery = `
        UPDATE whatsapp_bot.plans 
        SET 
          mercadopago_plan_id = $2,
          mercadopago_config = $3,
          mercadopago_enabled = true,
          updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [
        planId,
        mercadoPagoPlanId,
        JSON.stringify(config)
      ]);

      return {
        success: true,
        mercadopago_plan_id: mercadoPagoPlanId,
        action: 'associated'
      };

    } catch (error) {
      console.error('❌ Error associating MercadoPago plan:', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar plan en Stripe
   */
  async createOrUpdateStripePlan(planId, config) {
    try {
      console.log(`🔄 Creating/Updating Stripe plan for plan ID: ${planId}`);
      
      // Obtener información del plan
      const planQuery = 'SELECT * FROM whatsapp_bot.plans WHERE id = $1';
      const planResult = await pool.query(planQuery, [planId]);
      const plan = planResult.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // Crear o actualizar producto en Stripe
      let stripeProduct;
      if (plan.stripe_product_id) {
        // Actualizar producto existente
        stripeProduct = await this.stripe.products.update(plan.stripe_product_id, {
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_id: planId,
            plan_key: plan.key
          }
        });
      } else {
        // Crear nuevo producto
        stripeProduct = await this.stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_id: planId,
            plan_key: plan.key
          }
        });
      }

      // Crear nuevo precio (los precios en Stripe son inmutables)
      const stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(plan.price_usd * 100), // Stripe usa centavos
        currency: 'usd',
        recurring: {
          interval: plan.billing_period === 'yearly' ? 'year' : 'month',
          interval_count: 1
        },
        metadata: {
          plan_id: planId
        }
      });

      // Si había un precio anterior, desactivarlo
      if (plan.stripe_price_id) {
        await this.stripe.prices.update(plan.stripe_price_id, {
          active: false
        });
      }

      // Actualizar plan en BD
      const updateQuery = `
        UPDATE whatsapp_bot.plans 
        SET 
          stripe_product_id = $2,
          stripe_price_id = $3,
          stripe_config = $4,
          stripe_enabled = true,
          updated_at = NOW()
        WHERE id = $1
      `;

      await pool.query(updateQuery, [
        planId,
        stripeProduct.id,
        stripePrice.id,
        JSON.stringify(config || {})
      ]);

      return {
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        action: plan.stripe_product_id ? 'updated' : 'created'
      };

    } catch (error) {
      console.error('❌ Error creating/updating Stripe plan:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración de pasarelas de pago de un plan
   */
  async getPlanPaymentGateways(planId) {
    try {
      const query = `
        SELECT 
          id,
          name,
          mercadopago_plan_id,
          mercadopago_config,
          mercadopago_enabled,
          stripe_product_id,
          stripe_price_id,
          stripe_config,
          stripe_enabled,
          payment_config
        FROM whatsapp_bot.plans
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [planId]);
      const plan = result.rows[0];
      
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      return {
        plan_id: plan.id,
        plan_name: plan.name,
        mercadopago: {
          enabled: plan.mercadopago_enabled,
          plan_id: plan.mercadopago_plan_id,
          config: plan.mercadopago_config
        },
        stripe: {
          enabled: plan.stripe_enabled,
          product_id: plan.stripe_product_id,
          price_id: plan.stripe_price_id,
          config: plan.stripe_config
        },
        payment_config: plan.payment_config
      };

    } catch (error) {
      console.error('Error getting plan payment gateways:', error);
      throw error;
    }
  }
}

module.exports = new PaymentPlanService();