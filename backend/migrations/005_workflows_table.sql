-- Migración 005: Tabla de workflows para N8N dinámicos
-- Fecha: 2025-01-21
-- Descripción: Gestión de workflows automáticos por instancia

-- Crear tabla de workflows
CREATE TABLE whatsapp_bot.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
  workflow_type VARCHAR(50) NOT NULL, -- 'basic_bot', 'business_hours', 'lead_capture', etc.
  workflow_name VARCHAR(255),
  workflow_description TEXT,
  workflow_config JSONB NOT NULL, -- Configuración completa del workflow N8N
  n8n_workflow_id VARCHAR(100), -- ID del workflow en N8N (cuando se integre)
  webhook_url VARCHAR(500), -- URL del webhook generada
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0, -- Contador de ejecuciones
  last_executed_at TIMESTAMP,
  error_count INTEGER DEFAULT 0, -- Contador de errores
  last_error_at TIMESTAMP,
  last_error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(instance_id), -- Una instancia solo puede tener un workflow activo
  CHECK (workflow_type IN ('basic_bot', 'business_hours', 'lead_capture', 'custom_advanced')),
  CHECK (execution_count >= 0),
  CHECK (error_count >= 0)
);

-- Índices para optimizar consultas
CREATE INDEX idx_workflows_instance_id ON whatsapp_bot.workflows(instance_id);
CREATE INDEX idx_workflows_type ON whatsapp_bot.workflows(workflow_type);
CREATE INDEX idx_workflows_active ON whatsapp_bot.workflows(is_active);
CREATE INDEX idx_workflows_webhook_url ON whatsapp_bot.workflows(webhook_url);
CREATE INDEX idx_workflows_created_at ON whatsapp_bot.workflows(created_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE whatsapp_bot.workflows IS 'Configuraciones de workflows N8N por instancia de WhatsApp';
COMMENT ON COLUMN whatsapp_bot.workflows.workflow_config IS 'Configuración JSON completa del workflow para N8N';
COMMENT ON COLUMN whatsapp_bot.workflows.n8n_workflow_id IS 'ID del workflow en N8N una vez creado (para futuras integraciones)';
COMMENT ON COLUMN whatsapp_bot.workflows.webhook_url IS 'URL única del webhook para esta instancia';
COMMENT ON COLUMN whatsapp_bot.workflows.execution_count IS 'Número total de ejecuciones del workflow';
COMMENT ON COLUMN whatsapp_bot.workflows.error_count IS 'Número de errores en las ejecuciones';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_workflows_updated_at
    BEFORE UPDATE ON whatsapp_bot.workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

-- Datos iniciales: plantillas de ejemplo (opcional)
INSERT INTO whatsapp_bot.workflow_templates (
    workflow_type,
    name,
    description,
    template_config,
    suitable_plans,
    created_at
) VALUES 
(
    'basic_bot',
    'Bot Básico',
    'Workflow simple para respuestas automáticas con IA',
    '{"template": "basic", "features": ["auto_response", "openai_integration"]}',
    ARRAY['free_trial', 'trial', 'starter', 'business', 'pro', 'enterprise'],
    NOW()
),
(
    'business_hours',
    'Bot con Horarios Comerciales',
    'Bot que respeta horarios y escala fuera de horario',
    '{"template": "business_hours", "features": ["schedule", "escalation", "auto_response"]}',
    ARRAY['business', 'pro', 'enterprise'],
    NOW()
),
(
    'lead_capture',
    'Captura de Leads',
    'Bot especializado en capturar información de contactos',
    '{"template": "lead_capture", "features": ["forms", "crm_integration", "lead_scoring"]}',
    ARRAY['pro', 'enterprise'],
    NOW()
),
(
    'custom_advanced',
    'Workflow Personalizado',
    'Workflow completamente personalizable con nodos avanzados',
    '{"template": "custom", "features": ["custom_nodes", "multiple_integrations", "complex_logic"]}',
    ARRAY['enterprise'],
    NOW()
)
ON CONFLICT DO NOTHING; 