const express = require('express');
const router = express.Router();

/**
 * Rutas públicas de Stripe para el proceso de onboarding/registro
 * Estas rutas NO requieren autenticación y están destinadas para usuarios
 * que aún no han completado el registro
 */

/**
 * @route POST /api/public/stripe/customer
 * @desc Crear customer en Stripe (público para onboarding)
 * @access Public
 * @body { email, name, phone }
 */
router.post('/customer', async (req, res) => {
  try {
    const { email, name, phone } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email y nombre son requeridos'
      });
    }

    // Verificar si Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Stripe no está configurado'
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Crear customer en Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        source: 'onboarding'
      }
    });

    res.json({
      success: true,
      data: {
        customer_id: customer.id,
        email: customer.email,
        name: customer.name
      },
      message: 'Customer creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creating Stripe customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando customer en Stripe',
      error: error.message
    });
  }
});

/**
 * @route POST /api/public/stripe/payment-method
 * @desc Crear payment method en Stripe (público para onboarding)
 * @access Public
 * @body { customer_id, payment_method_data }
 */
router.post('/payment-method', async (req, res) => {
  try {
    const { customer_id, payment_method_data } = req.body;

    if (!customer_id || !payment_method_data) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID y datos del método de pago son requeridos'
      });
    }

    // Verificar si Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Stripe no está configurado'
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Crear payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: payment_method_data,
      metadata: {
        source: 'onboarding'
      }
    });

    // Attachear al customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer_id
    });

    res.json({
      success: true,
      data: {
        payment_method_id: paymentMethod.id,
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year
      },
      message: 'Payment method creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creating Stripe payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando payment method en Stripe',
      error: error.message
    });
  }
});

module.exports = router;