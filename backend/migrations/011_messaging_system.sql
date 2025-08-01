-- Migración 011: Sistema de Mensajería Avanzado
-- Fecha: 2025-01-21
-- Descripción: Crear sistema completo de templates, respuestas rápidas, mensajes programados y archivos multimedia

-- ========================================
-- 1. TEMPLATES DE MENSAJES
-- ========================================

CREATE TABLE IF NOT EXISTS whatsapp_bot.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Variables disponibles como {nombre}, {empresa}, etc.
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES whatsapp_bot.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices y constraints
    CONSTRAINT templates_name_company_unique UNIQUE(company_id, name)
);

-- Índices para templates
CREATE INDEX idx_templates_company_id ON whatsapp_bot.message_templates(company_id);
CREATE INDEX idx_templates_category ON whatsapp_bot.message_templates(category);
CREATE INDEX idx_templates_active ON whatsapp_bot.message_templates(is_active);

-- Comentarios
COMMENT ON TABLE whatsapp_bot.message_templates IS 'Plantillas de mensajes reutilizables con variables dinámicas';
COMMENT ON COLUMN whatsapp_bot.message_templates.variables IS 'Array JSON de variables disponibles: [{name: "nombre", default: "Cliente"}]';

-- ========================================
-- 2. RESPUESTAS RÁPIDAS
-- ========================================

CREATE TABLE IF NOT EXISTS whatsapp_bot.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    shortcut VARCHAR(50) NOT NULL, -- ej: "/gracias", "/info"
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES whatsapp_bot.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices y constraints
    CONSTRAINT quick_replies_shortcut_company_unique UNIQUE(company_id, shortcut)
);

-- Índices para respuestas rápidas
CREATE INDEX idx_quick_replies_company_id ON whatsapp_bot.quick_replies(company_id);
CREATE INDEX idx_quick_replies_shortcut ON whatsapp_bot.quick_replies(shortcut);
CREATE INDEX idx_quick_replies_active ON whatsapp_bot.quick_replies(is_active);

-- Comentarios
COMMENT ON TABLE whatsapp_bot.quick_replies IS 'Respuestas rápidas con shortcuts para uso común';
COMMENT ON COLUMN whatsapp_bot.quick_replies.shortcut IS 'Comando rápido para activar la respuesta (ej: /gracias)';

-- ========================================
-- 3. MENSAJES PROGRAMADOS
-- ========================================

CREATE TABLE IF NOT EXISTS whatsapp_bot.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES whatsapp_bot.contacts(id) ON DELETE CASCADE,
    phone VARCHAR(20), -- Teléfono directo si no hay contact_id
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    scheduled_for TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMP,
    error_message TEXT,
    created_by UUID REFERENCES whatsapp_bot.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mensajes programados
CREATE INDEX idx_scheduled_messages_company_id ON whatsapp_bot.scheduled_messages(company_id);
CREATE INDEX idx_scheduled_messages_instance_id ON whatsapp_bot.scheduled_messages(instance_id);
CREATE INDEX idx_scheduled_messages_scheduled_for ON whatsapp_bot.scheduled_messages(scheduled_for);
CREATE INDEX idx_scheduled_messages_status ON whatsapp_bot.scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_pending ON whatsapp_bot.scheduled_messages(status, scheduled_for) WHERE status = 'pending';

-- Comentarios
COMMENT ON TABLE whatsapp_bot.scheduled_messages IS 'Mensajes programados para envío futuro';
COMMENT ON COLUMN whatsapp_bot.scheduled_messages.timezone IS 'Zona horaria del usuario para programación correcta';

-- ========================================
-- 4. ARCHIVOS MULTIMEDIA
-- ========================================

CREATE TABLE IF NOT EXISTS whatsapp_bot.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image, audio, document, video
    is_public BOOLEAN DEFAULT false,
    upload_by UUID REFERENCES whatsapp_bot.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints para seguridad
    CONSTRAINT attachments_file_size_limit CHECK (file_size <= 16777216), -- 16MB máximo
    CONSTRAINT attachments_valid_file_type CHECK (file_type IN ('image', 'audio', 'document', 'video'))
);

-- Índices para archivos
CREATE INDEX idx_attachments_company_id ON whatsapp_bot.message_attachments(company_id);
CREATE INDEX idx_attachments_file_type ON whatsapp_bot.message_attachments(file_type);
CREATE INDEX idx_attachments_created_at ON whatsapp_bot.message_attachments(created_at);

-- Comentarios
COMMENT ON TABLE whatsapp_bot.message_attachments IS 'Archivos multimedia para envío en mensajes';
COMMENT ON COLUMN whatsapp_bot.message_attachments.stored_filename IS 'Nombre del archivo almacenado (único, seguro)';

-- ========================================
-- 5. MEJORAR TABLA DE CONVERSACIONES
-- ========================================

-- Agregar campos para archivos adjuntos y referencias
DO $$ 
BEGIN
    -- Agregar attachment_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'conversations' 
        AND column_name = 'attachment_id'
    ) THEN
        ALTER TABLE whatsapp_bot.conversations 
        ADD COLUMN attachment_id UUID REFERENCES whatsapp_bot.message_attachments(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_conversations_attachment_id ON whatsapp_bot.conversations(attachment_id);
    END IF;
    
    -- Agregar template_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'conversations' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE whatsapp_bot.conversations 
        ADD COLUMN template_id UUID REFERENCES whatsapp_bot.message_templates(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_conversations_template_id ON whatsapp_bot.conversations(template_id);
    END IF;
    
    -- Agregar quick_reply_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'conversations' 
        AND column_name = 'quick_reply_id'
    ) THEN
        ALTER TABLE whatsapp_bot.conversations 
        ADD COLUMN quick_reply_id UUID REFERENCES whatsapp_bot.quick_replies(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_conversations_quick_reply_id ON whatsapp_bot.conversations(quick_reply_id);
    END IF;
    
    -- Agregar scheduled_message_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'conversations' 
        AND column_name = 'scheduled_message_id'
    ) THEN
        ALTER TABLE whatsapp_bot.conversations 
        ADD COLUMN scheduled_message_id UUID REFERENCES whatsapp_bot.scheduled_messages(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_conversations_scheduled_message_id ON whatsapp_bot.conversations(scheduled_message_id);
    END IF;
    
END $$;

-- ========================================
-- 6. FUNCIONES HELPER
-- ========================================

-- Función para limpiar mensajes programados antiguos
CREATE OR REPLACE FUNCTION whatsapp_bot.cleanup_old_scheduled_messages()
RETURNS void AS $$
BEGIN
    -- Eliminar mensajes programados enviados o fallidos de más de 30 días
    DELETE FROM whatsapp_bot.scheduled_messages 
    WHERE status IN ('sent', 'failed') 
    AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Log de limpieza
    RAISE NOTICE 'Cleaned up old scheduled messages older than 30 days';
END;
$$ LANGUAGE plpgsql;

-- Función para obtener variables de un template
CREATE OR REPLACE FUNCTION whatsapp_bot.extract_template_variables(template_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    variables TEXT[];
BEGIN
    -- Extraer variables del formato {variable}
    SELECT array_agg(DISTINCT match[1])
    INTO variables
    FROM regexp_matches(template_content, '\{([^}]+)\}', 'g') AS match;
    
    RETURN COALESCE(variables, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. DATOS INICIALES DE EJEMPLO
-- ========================================

-- Templates de ejemplo para empresas existentes
INSERT INTO whatsapp_bot.message_templates (company_id, name, category, content, variables)
SELECT 
    c.id,
    'Bienvenida',
    'saludo',
    'Hola {nombre}! 👋 Bienvenido/a a {empresa}. ¿En qué podemos ayudarte hoy?',
    '[{"name": "nombre", "default": "Cliente"}, {"name": "empresa", "default": "Nuestra empresa"}]'::jsonb
FROM whatsapp_bot.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_bot.message_templates t 
    WHERE t.company_id = c.id AND t.name = 'Bienvenida'
);

INSERT INTO whatsapp_bot.message_templates (company_id, name, category, content, variables)
SELECT 
    c.id,
    'Horario de Atención',
    'informacion',
    'Nuestro horario de atención es de Lunes a Viernes de 9:00 a 18:00 hs. Te responderemos a la brevedad! 🕘',
    '[]'::jsonb
FROM whatsapp_bot.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_bot.message_templates t 
    WHERE t.company_id = c.id AND t.name = 'Horario de Atención'
);

-- Respuestas rápidas de ejemplo
INSERT INTO whatsapp_bot.quick_replies (company_id, shortcut, message, category)
SELECT 
    c.id,
    '/gracias',
    '¡Muchas gracias por tu consulta! 😊 Te responderemos pronto.',
    'cortesia'
FROM whatsapp_bot.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_bot.quick_replies q 
    WHERE q.company_id = c.id AND q.shortcut = '/gracias'
);

INSERT INTO whatsapp_bot.quick_replies (company_id, shortcut, message, category)
SELECT 
    c.id,
    '/info',
    'Para más información, visita nuestro sitio web o comunícate con nosotros.',
    'informacion'
FROM whatsapp_bot.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_bot.quick_replies q 
    WHERE q.company_id = c.id AND q.shortcut = '/info'
);

-- ========================================
-- 8. PERMISOS Y COMENTARIOS FINALES
-- ========================================

-- Asegurar permisos para todas las tablas nuevas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA whatsapp_bot TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA whatsapp_bot TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA whatsapp_bot TO PUBLIC;

-- Log final
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migración 011 completada exitosamente';
    RAISE NOTICE '📝 Tablas creadas: message_templates, quick_replies, scheduled_messages, message_attachments';
    RAISE NOTICE '🔧 Funciones creadas: cleanup_old_scheduled_messages, extract_template_variables';
    RAISE NOTICE '📊 Datos de ejemplo insertados para empresas existentes';
END $$; 