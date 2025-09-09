-- Migration: Add MercadoPago customer ID to companies table
-- Date: 2025-09-09
-- Purpose: Store MercadoPago customer ID for card tokenization flow

ALTER TABLE whatsapp_bot.companies
ADD COLUMN IF NOT EXISTS mercadopago_customer_id VARCHAR(255);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_companies_mercadopago_customer_id
ON whatsapp_bot.companies(mercadopago_customer_id);

-- Add comment
COMMENT ON COLUMN whatsapp_bot.companies.mercadopago_customer_id IS 'MercadoPago Customer ID for card tokenization';