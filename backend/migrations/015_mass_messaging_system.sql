-- =====================================================
-- MIGRACIÓN 015: SISTEMA DE MENSAJERÍA MASIVA
-- =====================================================

-- Tabla principal de mensajes masivos
CREATE TABLE IF NOT EXISTS whatsapp_bot.mass_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES whatsapp_bot.users(id) ON DELETE CASCADE,
    
    -- Metadata del mensaje
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    
    -- Configuración del mensaje
    message_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'template' o 'custom'
    template_id UUID REFERENCES whatsapp_bot.message_templates(id) ON DELETE SET NULL,
    custom_message TEXT,
    final_message TEXT NOT NULL, -- Mensaje final procesado (con variables reemplazadas)
    
    -- Configuración de destinatarios
    target_type VARCHAR(50) NOT NULL, -- 'contacts', 'campaigns', 'manual'
    instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
    
    -- Configuración de programación
    scheduling_type VARCHAR(50) NOT NULL DEFAULT 'immediate', -- 'immediate' o 'scheduled'
    scheduled_for TIMESTAMP NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Configuración de delays
    delay_between_groups INTEGER DEFAULT 10, -- segundos entre grupos
    delay_between_messages INTEGER DEFAULT 2, -- segundos entre mensajes individuales
    
    -- Estadísticas
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Estado del mensaje masivo
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, scheduled, completed, failed, cancelled
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL
);

-- Tabla de destinatarios individuales
CREATE TABLE IF NOT EXISTS whatsapp_bot.mass_message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mass_message_id UUID NOT NULL REFERENCES whatsapp_bot.mass_messages(id) ON DELETE CASCADE,
    
    -- Información del destinatario
    recipient_type VARCHAR(50) NOT NULL, -- 'contact', 'group', 'manual'
    recipient_id VARCHAR(255) NOT NULL, -- ID del contacto, grupo, o manual_X
    recipient_phone VARCHAR(50) NOT NULL, -- Teléfono o group_jid
    recipient_name VARCHAR(255) DEFAULT '',
    
    -- Contenido específico para este destinatario
    message_content TEXT NOT NULL,
    
    -- Programación individual (con delays aplicados)
    scheduled_for TIMESTAMP NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Estado del envío individual
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para mass_messages
CREATE INDEX IF NOT EXISTS idx_mass_messages_company_id ON whatsapp_bot.mass_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_mass_messages_created_by ON whatsapp_bot.mass_messages(created_by);
CREATE INDEX IF NOT EXISTS idx_mass_messages_status ON whatsapp_bot.mass_messages(status);
CREATE INDEX IF NOT EXISTS idx_mass_messages_scheduling_type ON whatsapp_bot.mass_messages(scheduling_type);
CREATE INDEX IF NOT EXISTS idx_mass_messages_scheduled_for ON whatsapp_bot.mass_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_mass_messages_template_id ON whatsapp_bot.mass_messages(template_id);
CREATE INDEX IF NOT EXISTS idx_mass_messages_instance_id ON whatsapp_bot.mass_messages(instance_id);

-- Índices para mass_message_recipients
CREATE INDEX IF NOT EXISTS idx_mass_message_recipients_mass_message_id ON whatsapp_bot.mass_message_recipients(mass_message_id);
CREATE INDEX IF NOT EXISTS idx_mass_message_recipients_status ON whatsapp_bot.mass_message_recipients(status);
CREATE INDEX IF NOT EXISTS idx_mass_message_recipients_scheduled_for ON whatsapp_bot.mass_message_recipients(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_mass_message_recipients_recipient_type ON whatsapp_bot.mass_message_recipients(recipient_type);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para actualizar contadores en mass_messages
CREATE OR REPLACE FUNCTION whatsapp_bot.update_mass_message_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar contadores cuando cambie el estado de un recipient
    IF OLD.status != NEW.status THEN
        UPDATE whatsapp_bot.mass_messages 
        SET 
            sent_count = (
                SELECT COUNT(*) 
                FROM whatsapp_bot.mass_message_recipients 
                WHERE mass_message_id = NEW.mass_message_id AND status = 'sent'
            ),
            failed_count = (
                SELECT COUNT(*) 
                FROM whatsapp_bot.mass_message_recipients 
                WHERE mass_message_id = NEW.mass_message_id AND status = 'failed'
            )
        WHERE id = NEW.mass_message_id;
        
        -- Si todos los mensajes han sido procesados, marcar como completado
        UPDATE whatsapp_bot.mass_messages 
        SET 
            status = 'completed',
            completed_at = NOW()
        WHERE id = NEW.mass_message_id 
        AND status = 'processing'
        AND (sent_count + failed_count) = total_recipients;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mass_message_counts
    AFTER UPDATE ON whatsapp_bot.mass_message_recipients
    FOR EACH ROW
    EXECUTE FUNCTION whatsapp_bot.update_mass_message_counts();

-- =====================================================
-- FUNCIÓN PARA PROCESAR MENSAJES PROGRAMADOS
-- =====================================================

CREATE OR REPLACE FUNCTION whatsapp_bot.get_pending_mass_messages()
RETURNS TABLE (
    mass_message_id UUID,
    title VARCHAR(255),
    total_recipients INTEGER,
    scheduled_for TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mm.id as mass_message_id,
        mm.title,
        mm.total_recipients,
        mm.scheduled_for
    FROM whatsapp_bot.mass_messages mm
    WHERE mm.status = 'scheduled' 
    AND mm.scheduled_for <= NOW()
    ORDER BY mm.scheduled_for ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA PARA ESTADÍSTICAS DE MENSAJERÍA MASIVA
-- =====================================================

CREATE OR REPLACE VIEW whatsapp_bot.mass_messaging_stats AS
SELECT 
    mm.company_id,
    COUNT(mm.id) as total_campaigns,
    COUNT(mm.id) FILTER (WHERE mm.status = 'completed') as completed_campaigns,
    COUNT(mm.id) FILTER (WHERE mm.status = 'processing') as processing_campaigns,
    COUNT(mm.id) FILTER (WHERE mm.status = 'scheduled') as scheduled_campaigns,
    COUNT(mm.id) FILTER (WHERE mm.status = 'failed') as failed_campaigns,
    COALESCE(SUM(mm.total_recipients), 0) as total_recipients_all_time,
    COALESCE(SUM(mm.sent_count), 0) as total_sent_all_time,
    COALESCE(SUM(mm.failed_count), 0) as total_failed_all_time,
    ROUND(
        CASE 
            WHEN SUM(mm.total_recipients) > 0 
            THEN (SUM(mm.sent_count)::NUMERIC / SUM(mm.total_recipients)::NUMERIC) * 100 
            ELSE 0 
        END, 2
    ) as success_rate_percentage
FROM whatsapp_bot.mass_messages mm
GROUP BY mm.company_id;

-- =====================================================
-- DATOS DE EJEMPLO (COMENTADOS)
-- =====================================================

/*
-- Ejemplo de mensaje masivo usando template
INSERT INTO whatsapp_bot.mass_messages (
    company_id, 
    created_by,
    title,
    description,
    message_type,
    template_id,
    final_message,
    target_type,
    instance_id,
    scheduling_type,
    total_recipients,
    status
) VALUES (
    (SELECT id FROM whatsapp_bot.companies LIMIT 1),
    (SELECT id FROM whatsapp_bot.users LIMIT 1),
    'Promoción Black Friday',
    'Envío masivo de promoción especial a todas las campañas activas',
    'template',
    (SELECT id FROM whatsapp_bot.message_templates WHERE name = 'Promoción' LIMIT 1),
    '¡Hola! 🎉 Tenemos una promoción especial del 50% de descuento solo por hoy. ¡No te lo pierdas!',
    'campaigns',
    (SELECT id FROM whatsapp_bot.whatsapp_instances LIMIT 1),
    'immediate',
    5,
    'processing'
);
*/ 