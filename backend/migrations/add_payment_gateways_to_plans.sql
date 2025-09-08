-- Agregar configuración de pasarelas de pago a la tabla plans
-- Este script agrega soporte para MercadoPago y Stripe con sus respectivas configuraciones

-- Agregar columnas para MercadoPago
ALTER TABLE whatsapp_bot.plans
ADD COLUMN IF NOT EXISTS mercadopago_plan_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercadopago_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mercadopago_enabled BOOLEAN DEFAULT false;

-- Agregar columnas para Stripe  
ALTER TABLE whatsapp_bot.plans
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT false;

-- Agregar columna general para configuraciones de pago
ALTER TABLE whatsapp_bot.plans
ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{}';

-- Comentarios descriptivos
COMMENT ON COLUMN whatsapp_bot.plans.mercadopago_plan_id IS 'ID del plan en MercadoPago';
COMMENT ON COLUMN whatsapp_bot.plans.mercadopago_config IS 'Configuración específica de MercadoPago (billing_day, proportional, free_trial, etc)';
COMMENT ON COLUMN whatsapp_bot.plans.mercadopago_enabled IS 'Si este plan está disponible para pago con MercadoPago';

COMMENT ON COLUMN whatsapp_bot.plans.stripe_product_id IS 'ID del producto en Stripe';
COMMENT ON COLUMN whatsapp_bot.plans.stripe_price_id IS 'ID del precio en Stripe';
COMMENT ON COLUMN whatsapp_bot.plans.stripe_config IS 'Configuración específica de Stripe';
COMMENT ON COLUMN whatsapp_bot.plans.stripe_enabled IS 'Si este plan está disponible para pago con Stripe';

COMMENT ON COLUMN whatsapp_bot.plans.payment_config IS 'Configuración general de pagos (conversión USD/ARS, etc)';

-- Ejemplo de estructura esperada en mercadopago_config:
/*
{
  "billing_day": 10,
  "billing_day_proportional": false,
  "free_trial": {
    "frequency": 1,
    "frequency_type": "days"
  },
  "payment_methods_allowed": {
    "payment_types": [{"id": "credit_card"}, {"id": "debit_card"}],
    "payment_methods": [{"id": "visa"}, {"id": "master"}, {"id": "amex"}]
  },
  "back_url": "https://whatsapp-bot-frontend-i9g0.onrender.com/billing?status=success&provider=mercadopago"
}
*/

-- Ejemplo de estructura esperada en payment_config:
/*
{
  "usd_to_ars_rate": 1000,
  "currency_conversion": "manual",
  "default_payment_gateway": "stripe"
}
*/