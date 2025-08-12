-- =====================================================
-- MIGRACIÓN 012: SISTEMA DE CAMPAÑAS Y GRUPOS DE WHATSAPP
-- =====================================================

-- Tabla principal de campañas
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed, archived
    
    -- Configuración del grupo base
    group_name_template VARCHAR(255) NOT NULL, -- ej: "Inversiones VIP #{group_number}"
    group_description TEXT,
    group_image_url TEXT,
    
    -- Configuración de distribución
    max_members_per_group INTEGER DEFAULT 950,
    auto_create_new_groups BOOLEAN DEFAULT true,
    
    -- Link distribuidor único
    distributor_slug VARCHAR(100) UNIQUE NOT NULL, -- ej: "inversion-vip-2024"
    distributor_title VARCHAR(255), -- Título para la página de distribución
    distributor_welcome_message TEXT, -- Mensaje de bienvenida
    
    -- Métricas
    total_members INTEGER DEFAULT 0,
    total_groups INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    
    -- Índices y constraints
    CONSTRAINT campaigns_company_name_unique UNIQUE(company_id, name)
);

-- Tabla de grupos de WhatsApp generados por campaña
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaign_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_bot.campaigns(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
    
    -- Información del grupo
    group_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    group_name VARCHAR(255) NOT NULL,
    group_description TEXT,
    
    -- IDs de Evolution API
    evolution_group_id VARCHAR(255), -- ID del grupo en Evolution API
    group_invite_link TEXT, -- Link de invitación generado por WhatsApp
    
    -- Estado del grupo
    status VARCHAR(50) DEFAULT 'creating', -- creating, active, full, closed, error
    current_members INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 950,
    
    -- Control de distribución
    is_active_for_distribution BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP NULL,
    
    -- Índices y constraints
    CONSTRAINT campaign_groups_campaign_number_unique UNIQUE(campaign_id, group_number)
);

-- Tabla de miembros en grupos de campaña
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaign_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_bot.campaigns(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES whatsapp_bot.campaign_groups(id) ON DELETE CASCADE,
    
    -- Información del miembro
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    
    -- Estado del miembro
    status VARCHAR(50) DEFAULT 'invited', -- invited, joined, left, removed, error
    
    -- Información de ingreso
    joined_via VARCHAR(50) DEFAULT 'distributor_link', -- distributor_link, manual, api
    ip_address INET, -- IP desde donde se unió (para analytics)
    user_agent TEXT, -- User agent del navegador (para analytics)
    
    -- Timestamps
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP NULL,
    left_at TIMESTAMP NULL,
    
    -- Índices y constraints
    CONSTRAINT campaign_members_phone_group_unique UNIQUE(group_id, phone)
);

-- Tabla de logs de actividad de campañas
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_bot.campaigns(id) ON DELETE CASCADE,
    group_id UUID REFERENCES whatsapp_bot.campaign_groups(id) ON DELETE CASCADE,
    
    -- Información del evento
    event_type VARCHAR(100) NOT NULL, -- group_created, member_joined, group_full, group_closed, etc.
    description TEXT NOT NULL,
    
    -- Datos adicionales (JSON)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON whatsapp_bot.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON whatsapp_bot.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_distributor_slug ON whatsapp_bot.campaigns(distributor_slug);

-- Índices para campaign_groups
CREATE INDEX IF NOT EXISTS idx_campaign_groups_campaign_id ON whatsapp_bot.campaign_groups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_instance_id ON whatsapp_bot.campaign_groups(instance_id);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_status ON whatsapp_bot.campaign_groups(status);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_active_distribution ON whatsapp_bot.campaign_groups(is_active_for_distribution);

-- Índices para campaign_members
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON whatsapp_bot.campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_group_id ON whatsapp_bot.campaign_members(group_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_phone ON whatsapp_bot.campaign_members(phone);
CREATE INDEX IF NOT EXISTS idx_campaign_members_status ON whatsapp_bot.campaign_members(status);

-- Índices para campaign_logs
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON whatsapp_bot.campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_group_id ON whatsapp_bot.campaign_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_event_type ON whatsapp_bot.campaign_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_created_at ON whatsapp_bot.campaign_logs(created_at);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para actualizar updated_at en campaigns
CREATE OR REPLACE FUNCTION whatsapp_bot.update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaigns_updated_at
    BEFORE UPDATE ON whatsapp_bot.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION whatsapp_bot.update_campaigns_updated_at();

-- Trigger para actualizar updated_at en campaign_groups
CREATE OR REPLACE FUNCTION whatsapp_bot.update_campaign_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaign_groups_updated_at
    BEFORE UPDATE ON whatsapp_bot.campaign_groups
    FOR EACH ROW
    EXECUTE FUNCTION whatsapp_bot.update_campaign_groups_updated_at();

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para generar slug único
CREATE OR REPLACE FUNCTION whatsapp_bot.generate_campaign_slug(campaign_name TEXT, company_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generar slug base desde el nombre
    base_slug := lower(regexp_replace(campaign_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Si está vacío, usar un slug por defecto
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'campaign';
    END IF;
    
    -- Verificar unicidad
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM whatsapp_bot.campaigns WHERE distributor_slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de campaña
CREATE OR REPLACE FUNCTION whatsapp_bot.get_campaign_stats(campaign_id_param UUID)
RETURNS TABLE(
    total_groups INTEGER,
    active_groups INTEGER,
    total_members INTEGER,
    members_joined INTEGER,
    avg_members_per_group NUMERIC,
    last_activity TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(cg.id)::INTEGER as total_groups,
        COUNT(cg.id) FILTER (WHERE cg.status = 'active')::INTEGER as active_groups,
        COALESCE(SUM(cg.current_members), 0)::INTEGER as total_members,
        COUNT(cm.id) FILTER (WHERE cm.status = 'joined')::INTEGER as members_joined,
        CASE 
            WHEN COUNT(cg.id) > 0 THEN ROUND(COALESCE(SUM(cg.current_members), 0)::NUMERIC / COUNT(cg.id), 2)
            ELSE 0
        END as avg_members_per_group,
        MAX(GREATEST(cg.updated_at, cm.joined_at)) as last_activity
    FROM whatsapp_bot.campaign_groups cg
    LEFT JOIN whatsapp_bot.campaign_members cm ON cg.id = cm.group_id
    WHERE cg.campaign_id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS DE EJEMPLO (COMENTADOS)
-- =====================================================

/*
-- Ejemplo de campaña
INSERT INTO whatsapp_bot.campaigns (
    company_id, 
    name, 
    description,
    group_name_template,
    group_description,
    distributor_slug,
    distributor_title,
    distributor_welcome_message,
    status
) VALUES (
    (SELECT id FROM whatsapp_bot.companies LIMIT 1),
    'Inversiones VIP 2024',
    'Campaña para inversores interesados en oportunidades VIP',
    'Inversiones VIP #{group_number}',
    'Grupo exclusivo para inversores VIP. Aquí compartimos las mejores oportunidades del mercado.',
    'inversiones-vip-2024',
    '🚀 Únete a Inversiones VIP 2024',
    'Bienvenido a la comunidad de inversores más exclusiva. Haz clic en el botón para unirte al grupo de WhatsApp.',
    'active'
);
*/ 