-- Migration: Platform Admin System
-- Descripción: Sistema de super administradores para gestión global de la plataforma

-- Tabla de administradores de plataforma (fuera del schema multi-tenant)
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'platform_viewer',
  is_active BOOLEAN DEFAULT true,
  
  -- Sistema de password temporal
  temp_password VARCHAR(255),
  must_change_password BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMP,
  
  -- Auditoría
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  
  -- Metadata
  phone VARCHAR(20),
  notes TEXT,
  created_by UUID REFERENCES public.platform_admins(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles disponibles para platform admins (verificar si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role') THEN
    CREATE TYPE platform_role AS ENUM ('super_admin', 'platform_staff', 'platform_viewer');
  END IF;
END $$;

-- Actualizar columna role con el tipo ENUM
ALTER TABLE public.platform_admins 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE platform_role USING role::platform_role,
  ALTER COLUMN role SET DEFAULT 'platform_viewer'::platform_role;

-- Tabla de sesiones de platform admins
CREATE TABLE public.platform_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logs de actividad de platform admins
CREATE TABLE public.platform_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Estadísticas globales de la plataforma (vista materializada)
CREATE MATERIALIZED VIEW public.platform_stats AS
SELECT 
  -- Totales generales
  (SELECT COUNT(*) FROM whatsapp_bot.companies) as total_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE subscription_status = 'active') as active_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.users) as total_users,
  (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances) as active_instances, -- TODO: Add is_active column
  
  -- Por plan
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'free_trial') as free_trial_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'trial') as trial_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'starter') as starter_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'business') as business_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'pro') as pro_companies,
  (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE plan = 'enterprise') as enterprise_companies,
  
  -- Métricas de uso
  (SELECT COUNT(*) FROM whatsapp_bot.messages WHERE created_at > NOW() - INTERVAL '24 hours') as messages_last_24h,
  (SELECT COUNT(*) FROM whatsapp_bot.messages WHERE created_at > NOW() - INTERVAL '7 days') as messages_last_7d,
  (SELECT COUNT(*) FROM whatsapp_bot.messages WHERE created_at > NOW() - INTERVAL '30 days') as messages_last_30d,
  
  -- Timestamp
  NOW() as last_updated;

-- Índices para performance
CREATE INDEX idx_platform_admins_email ON public.platform_admins(email);
CREATE INDEX idx_platform_admins_role ON public.platform_admins(role);
CREATE INDEX idx_platform_admin_sessions_token ON public.platform_admin_sessions(token_hash);
CREATE INDEX idx_platform_admin_sessions_expires ON public.platform_admin_sessions(expires_at);
CREATE INDEX idx_platform_admin_logs_admin ON public.platform_admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_platform_admin_logs_action ON public.platform_admin_logs(action, created_at DESC);

-- Función para refrescar estadísticas
CREATE OR REPLACE FUNCTION refresh_platform_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.platform_stats;
END;
$$ LANGUAGE plpgsql;

-- El primer super admin se creará con el script createSuperAdmin.js

-- Comentarios
COMMENT ON TABLE public.platform_admins IS 'Administradores de la plataforma (fuera del sistema multi-tenant)';
COMMENT ON TABLE public.platform_admin_sessions IS 'Sesiones activas de administradores de plataforma';
COMMENT ON TABLE public.platform_admin_logs IS 'Registro de actividad de administradores';
COMMENT ON MATERIALIZED VIEW public.platform_stats IS 'Estadísticas globales de la plataforma';

-- Agregar campo para passwords temporales en usuarios multi-tenant también
ALTER TABLE whatsapp_bot.users 
  ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;