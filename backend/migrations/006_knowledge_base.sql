-- Migración 006: Sistema de Knowledge Base para Bots
-- Fecha: 2025-01-21
-- Descripción: Sistema completo de base de conocimientos por empresa con RAG

-- ========================================
-- KNOWLEDGE BASE PRINCIPAL
-- ========================================

-- Tabla principal de items de conocimiento por empresa
CREATE TABLE whatsapp_bot.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  content_summary TEXT, -- Resumen generado automáticamente
  content_type VARCHAR(50) DEFAULT 'manual', -- manual|pdf|docx|txt|url|api
  file_url TEXT, -- URL del archivo si fue subido
  file_name VARCHAR(255), -- Nombre original del archivo
  file_size INTEGER, -- Tamaño en bytes
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending|processing|completed|error
  processing_error TEXT, -- Error si ocurrió durante el procesamiento
  embeddings_generated BOOLEAN DEFAULT false, -- Si ya se generaron embeddings
  metadata JSONB DEFAULT '{}', -- Información adicional flexible
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Validaciones
  CHECK (content_type IN ('manual', 'pdf', 'docx', 'txt', 'url', 'api')),
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  CHECK (LENGTH(title) >= 3),
  CHECK (LENGTH(content) >= 10),
  CHECK (file_size IS NULL OR file_size > 0)
);

-- ========================================
-- ASIGNACIONES BOT ↔ KNOWLEDGE
-- ========================================

-- Tabla de asignación many-to-many entre bots y knowledge items
CREATE TABLE whatsapp_bot.bot_knowledge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES whatsapp_bot.bots(id) ON DELETE CASCADE,
  knowledge_item_id UUID NOT NULL REFERENCES whatsapp_bot.knowledge_items(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- Prioridad del contexto (1=alta, 5=baja)
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES whatsapp_bot.companies(id), -- Quién asignó
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(bot_id, knowledge_item_id), -- Un item solo puede asignarse una vez por bot
  CHECK (priority >= 1 AND priority <= 5)
);

-- ========================================
-- EMBEDDINGS PARA RAG
-- ========================================

-- Tabla para almacenar embeddings de texto (preparada para pgvector)
CREATE TABLE whatsapp_bot.knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_item_id UUID NOT NULL REFERENCES whatsapp_bot.knowledge_items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0, -- Para textos largos divididos en chunks
  content_chunk TEXT NOT NULL, -- Fragmento del contenido original
  chunk_tokens INTEGER, -- Número de tokens del chunk
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002', -- Modelo usado para embeddings
  -- embedding VECTOR(1536), -- Vector de embedding (requiere extension pgvector)
  embedding_data JSONB, -- Temporalmente como JSON hasta instalar pgvector
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (LENGTH(content_chunk) >= 10),
  CHECK (chunk_tokens > 0),
  CHECK (chunk_index >= 0)
);

-- ========================================
-- USAGE ANALYTICS
-- ========================================

-- Tabla para tracking de uso y optimización
CREATE TABLE whatsapp_bot.knowledge_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_item_id UUID NOT NULL REFERENCES whatsapp_bot.knowledge_items(id),
  bot_id UUID NOT NULL REFERENCES whatsapp_bot.bots(id),
  user_query TEXT NOT NULL,
  relevance_score DECIMAL(3,2), -- Score de relevancia (0.00 - 1.00)
  was_helpful BOOLEAN, -- Si la respuesta fue útil (feedback usuario)
  response_time_ms INTEGER, -- Tiempo de respuesta
  tokens_used INTEGER, -- Tokens consumidos
  created_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (relevance_score >= 0.00 AND relevance_score <= 1.00),
  CHECK (response_time_ms > 0),
  CHECK (tokens_used > 0)
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Knowledge Items
CREATE INDEX idx_knowledge_items_company ON whatsapp_bot.knowledge_items(company_id);
CREATE INDEX idx_knowledge_items_active ON whatsapp_bot.knowledge_items(is_active) WHERE is_active = true;
CREATE INDEX idx_knowledge_items_type ON whatsapp_bot.knowledge_items(content_type);
CREATE INDEX idx_knowledge_items_status ON whatsapp_bot.knowledge_items(processing_status);
CREATE INDEX idx_knowledge_items_created ON whatsapp_bot.knowledge_items(created_at DESC);
CREATE INDEX idx_knowledge_items_title ON whatsapp_bot.knowledge_items USING gin(to_tsvector('english', title));
CREATE INDEX idx_knowledge_items_content ON whatsapp_bot.knowledge_items USING gin(to_tsvector('english', content));

-- Bot Knowledge Assignments
CREATE INDEX idx_bot_knowledge_bot ON whatsapp_bot.bot_knowledge_assignments(bot_id);
CREATE INDEX idx_bot_knowledge_item ON whatsapp_bot.bot_knowledge_assignments(knowledge_item_id);
CREATE INDEX idx_bot_knowledge_active ON whatsapp_bot.bot_knowledge_assignments(is_active) WHERE is_active = true;
CREATE INDEX idx_bot_knowledge_priority ON whatsapp_bot.bot_knowledge_assignments(priority);

-- Knowledge Embeddings
CREATE INDEX idx_knowledge_embeddings_item ON whatsapp_bot.knowledge_embeddings(knowledge_item_id);
CREATE INDEX idx_knowledge_embeddings_chunk ON whatsapp_bot.knowledge_embeddings(knowledge_item_id, chunk_index);

-- Knowledge Usage (para analytics)
CREATE INDEX idx_knowledge_usage_item ON whatsapp_bot.knowledge_usage(knowledge_item_id);
CREATE INDEX idx_knowledge_usage_bot ON whatsapp_bot.knowledge_usage(bot_id);
CREATE INDEX idx_knowledge_usage_date ON whatsapp_bot.knowledge_usage(created_at DESC);

-- ========================================
-- TRIGGERS Y FUNCIONES
-- ========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trigger_knowledge_items_updated_at
    BEFORE UPDATE ON whatsapp_bot.knowledge_items
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER trigger_bot_knowledge_assignments_updated_at
    BEFORE UPDATE ON whatsapp_bot.bot_knowledge_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_updated_at();

-- ========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================

COMMENT ON TABLE whatsapp_bot.knowledge_items IS 'Base de conocimientos por empresa para bots inteligentes';
COMMENT ON COLUMN whatsapp_bot.knowledge_items.content_summary IS 'Resumen automático del contenido para preview';
COMMENT ON COLUMN whatsapp_bot.knowledge_items.processing_status IS 'Estado del procesamiento de archivos y embeddings';
COMMENT ON COLUMN whatsapp_bot.knowledge_items.embeddings_generated IS 'Indica si ya se generaron los embeddings para RAG';

COMMENT ON TABLE whatsapp_bot.bot_knowledge_assignments IS 'Asignación many-to-many entre bots y knowledge items';
COMMENT ON COLUMN whatsapp_bot.bot_knowledge_assignments.priority IS 'Prioridad del contexto: 1=Alta, 2=Media-Alta, 3=Media, 4=Media-Baja, 5=Baja';

COMMENT ON TABLE whatsapp_bot.knowledge_embeddings IS 'Embeddings vectoriales para RAG (Retrieval Augmented Generation)';
COMMENT ON COLUMN whatsapp_bot.knowledge_embeddings.chunk_index IS 'Índice del fragmento para documentos largos divididos';
COMMENT ON COLUMN whatsapp_bot.knowledge_embeddings.embedding_data IS 'Datos del embedding (JSON temporal hasta pgvector)';

COMMENT ON TABLE whatsapp_bot.knowledge_usage IS 'Analytics y tracking de uso de knowledge base para optimización';

-- ========================================
-- DATOS INICIALES DE EJEMPLO (OPCIONAL)
-- ========================================

-- Ejemplo de knowledge item básico para testing
INSERT INTO whatsapp_bot.knowledge_items (
    company_id,
    title,
    content,
    content_summary,
    content_type,
    tags,
    processing_status,
    embeddings_generated
) 
SELECT 
    c.id as company_id,
    'Información General de la Empresa',
    'Somos una empresa dedicada a brindar soluciones innovadoras de WhatsApp Business. Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM. Para soporte técnico, contacta al departamento correspondiente.',
    'Información básica: horarios, contacto y servicios de la empresa',
    'manual',
    ARRAY['general', 'empresa', 'horarios', 'contacto'],
    'completed',
    false
FROM whatsapp_bot.companies c
LIMIT 3 -- Solo para las primeras 3 empresas como ejemplo
ON CONFLICT DO NOTHING; 