-- Migración 003: Agregar columnas para sistema de planes mejorado
-- Fecha: 2025-07-21
-- Descripción: Agregar soporte para planes temporales, trials y límites personalizados

-- Agregar nuevas columnas a la tabla companies
ALTER TABLE whatsapp_bot.companies 
ADD COLUMN IF NOT EXISTS max_contacts INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';

-- Actualizar empresas existentes con valores por defecto según su plan actual
UPDATE whatsapp_bot.companies 
SET max_contacts = 500 
WHERE max_contacts IS NULL AND plan = 'starter';

UPDATE whatsapp_bot.companies 
SET max_contacts = 2500 
WHERE max_contacts IS NULL AND plan = 'business';

UPDATE whatsapp_bot.companies 
SET max_contacts = -1 
WHERE max_contacts IS NULL AND plan = 'enterprise';

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_companies_plan_expires ON whatsapp_bot.companies(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON whatsapp_bot.companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON whatsapp_bot.companies(stripe_customer_id);

-- Crear tabla para historial de cambios de plan
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

-- Agregar comentarios para documentación
COMMENT ON COLUMN whatsapp_bot.companies.max_contacts IS 'Límite máximo de contactos para la empresa (-1 = ilimitado)';
COMMENT ON COLUMN whatsapp_bot.companies.plan_expires_at IS 'Fecha de expiración del plan (NULL = no expira)';
COMMENT ON COLUMN whatsapp_bot.companies.trial_started_at IS 'Fecha de inicio del trial';
COMMENT ON COLUMN whatsapp_bot.companies.trial_used IS 'Si la empresa ya utilizó su período de prueba';
COMMENT ON COLUMN whatsapp_bot.companies.stripe_customer_id IS 'ID del customer en Stripe para facturación';
COMMENT ON COLUMN whatsapp_bot.companies.subscription_status IS 'Estado de la suscripción (active, inactive, canceled, past_due)';

COMMENT ON TABLE whatsapp_bot.plan_history IS 'Historial de cambios de planes para auditoría';

-- Función para limpiar planes expirados automáticamente
CREATE OR REPLACE FUNCTION whatsapp_bot.cleanup_expired_plans()
RETURNS void AS $$
BEGIN
    -- Mover empresas con planes expirados a free_trial
    UPDATE whatsapp_bot.companies 
    SET 
        plan = 'free_trial',
        max_instances = 1,
        max_messages = 50,
        max_contacts = 25,
        plan_expires_at = NOW() + INTERVAL '48 hours'
    WHERE 
        plan_expires_at IS NOT NULL 
        AND plan_expires_at < NOW()
        AND plan NOT IN ('free_trial');
        
    -- Log de la operación
    INSERT INTO whatsapp_bot.plan_history (company_id, previous_plan, new_plan, change_reason)
    SELECT 
        id,
        plan,
        'free_trial',
        'Plan expirado - movido automáticamente a free_trial'
    FROM whatsapp_bot.companies 
    WHERE plan_expires_at IS NOT NULL AND plan_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Crear un job que se ejecute diariamente para limpiar planes expirados
-- Nota: Esto requiere la extensión pg_cron si está disponible
-- SELECT cron.schedule('cleanup-expired-plans', '0 2 * * *', 'SELECT whatsapp_bot.cleanup_expired_plans();');

COMMENT ON FUNCTION whatsapp_bot.cleanup_expired_plans() IS 'Función para mover empresas con planes expirados a free_trial automáticamente';

-- Script de verificación
DO $$
BEGIN
    RAISE NOTICE 'Migración 003 completada exitosamente';
    RAISE NOTICE 'Columnas agregadas: max_contacts, plan_expires_at, trial_started_at, trial_used, stripe_customer_id, subscription_status';
    RAISE NOTICE 'Tabla plan_history creada para auditoría';
    RAISE NOTICE 'Función cleanup_expired_plans creada';
END $$; 