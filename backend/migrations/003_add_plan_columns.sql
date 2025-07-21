-- ====================================
-- MIGRACIÓN 003: Sistema de Planes y Pairing Code
-- ====================================

-- 1. Agregar columnas de planes a la tabla companies
ALTER TABLE whatsapp_bot.companies 
ADD COLUMN IF NOT EXISTS max_contacts INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';

-- 2. Actualizar valores por defecto según planes existentes
UPDATE whatsapp_bot.companies 
SET max_contacts = CASE 
  WHEN plan = 'starter' THEN 500
  WHEN plan = 'business' THEN 2500
  WHEN plan = 'enterprise' THEN -1
  ELSE 500
END
WHERE max_contacts IS NULL OR max_contacts = 500;

-- 3. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_companies_plan_expires ON whatsapp_bot.companies(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON whatsapp_bot.companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON whatsapp_bot.companies(stripe_customer_id);

-- 4. Crear tabla de historial de cambios de planes
CREATE TABLE IF NOT EXISTS whatsapp_bot.plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50) NOT NULL,
  previous_limits JSONB,
  new_limits JSONB,
  changed_by UUID REFERENCES whatsapp_bot.users(id),
  change_reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_history_company ON whatsapp_bot.plan_history(company_id);
CREATE INDEX IF NOT EXISTS idx_plan_history_created ON whatsapp_bot.plan_history(created_at);

-- 5. Agregar soporte para pairing code en instancias de WhatsApp
ALTER TABLE whatsapp_bot.whatsapp_instances 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;

COMMENT ON COLUMN whatsapp_bot.whatsapp_instances.phone_number IS 'Número de teléfono para generar pairing code (formato: +5491123456789)';

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone ON whatsapp_bot.whatsapp_instances(phone_number);

-- 6. Función para limpieza automática de planes expirados
CREATE OR REPLACE FUNCTION whatsapp_bot.cleanup_expired_plans()
RETURNS void AS $$
BEGIN
  -- Actualizar empresas con planes expirados a plan básico
  UPDATE whatsapp_bot.companies 
  SET plan = 'starter',
      max_instances = 1,
      max_messages = 1000,
      max_contacts = 500
  WHERE plan_expires_at IS NOT NULL 
    AND plan_expires_at < NOW() 
    AND plan != 'starter';
    
  -- Log de la operación
  INSERT INTO whatsapp_bot.plan_history (company_id, new_plan, change_reason, created_at)
  SELECT id, 'starter', 'Plan expired - auto downgrade', NOW()
  FROM whatsapp_bot.companies
  WHERE plan_expires_at IS NOT NULL 
    AND plan_expires_at < NOW() - INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM whatsapp_bot.plan_history ph 
      WHERE ph.company_id = companies.id 
        AND ph.change_reason = 'Plan expired - auto downgrade'
        AND ph.created_at > NOW() - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;

-- Comentarios finales
COMMENT ON TABLE whatsapp_bot.plan_history IS 'Historial de cambios en los planes de las empresas';
COMMENT ON FUNCTION whatsapp_bot.cleanup_expired_plans() IS 'Función para limpieza automática de planes expirados - ejecutar con pg_cron';

-- Ejemplo de configuración de pg_cron (comentado, ejecutar manualmente si es necesario):
-- SELECT cron.schedule('cleanup-expired-plans', '0 2 * * *', 'SELECT whatsapp_bot.cleanup_expired_plans();'); 