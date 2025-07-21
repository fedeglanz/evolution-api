-- Migration: Bot System Tables
-- Descripción: Sistema completo de bots inteligentes con OpenAI

-- Tabla principal de bots
CREATE TABLE whatsapp_bot.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Configuración de OpenAI
  openai_api_key VARCHAR(255), -- NULL = usar nuestra API
  openai_model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
  openai_temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  
  -- Configuración de comportamiento
  system_prompt TEXT NOT NULL DEFAULT 'Eres un asistente virtual útil y amigable.',
  welcome_message TEXT DEFAULT 'Hola! ¿En qué puedo ayudarte?',
  fallback_message TEXT DEFAULT 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
  
  -- Configuraciones avanzadas
  context_memory_turns INTEGER DEFAULT 5, -- Cuántos mensajes recordar
  response_delay_ms INTEGER DEFAULT 1000, -- Delay para parecer más humano
  typing_simulation BOOLEAN DEFAULT true,
  
  -- Límites y uso
  daily_message_limit INTEGER,
  monthly_token_limit INTEGER,
  current_month_tokens INTEGER DEFAULT 0,
  current_day_messages INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversaciones (contexto)
CREATE TABLE whatsapp_bot.bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES whatsapp_bot.bots(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255),
  
  -- Estado de la conversación
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP DEFAULT NOW(),
  context_turns INTEGER DEFAULT 0,
  
  -- Métricas
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mensajes individuales
CREATE TABLE whatsapp_bot.bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_bot.bot_conversations(id) ON DELETE CASCADE,
  
  -- Contenido del mensaje
  message_type VARCHAR(20) NOT NULL, -- 'user', 'bot'
  content TEXT NOT NULL,
  media_url VARCHAR(500),
  media_type VARCHAR(50), -- 'image', 'audio', 'document'
  
  -- Datos técnicos
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  openai_model VARCHAR(50),
  
  -- WhatsApp IDs
  whatsapp_message_id VARCHAR(255),
  evolution_message_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Flujos simples de conversación (árbol de decisiones básico)
CREATE TABLE whatsapp_bot.bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES whatsapp_bot.bots(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  
  -- Trigger
  trigger_keywords TEXT[], -- Array de palabras clave
  trigger_exact_match BOOLEAN DEFAULT false,
  
  -- Respuesta
  response_type VARCHAR(20) DEFAULT 'text', -- 'text', 'menu', 'openai'
  response_content TEXT,
  
  -- Flujo
  parent_flow_id UUID REFERENCES whatsapp_bot.bot_flows(id),
  order_index INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Métricas de uso (para facturación)
CREATE TABLE whatsapp_bot.bot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES whatsapp_bot.bots(id) ON DELETE CASCADE,
  
  -- Período
  date DATE NOT NULL,
  hour INTEGER, -- 0-23, NULL = todo el día
  
  -- Métricas
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  openai_cost_usd DECIMAL(10,6) DEFAULT 0,
  
  -- Tipos de contenido
  text_messages INTEGER DEFAULT 0,
  audio_messages INTEGER DEFAULT 0,
  image_messages INTEGER DEFAULT 0,
  document_messages INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(bot_id, date, hour)
);

-- Índices para rendimiento
CREATE INDEX idx_bots_instance_active ON whatsapp_bot.bots(instance_id, is_active);
CREATE INDEX idx_conversations_bot_active ON whatsapp_bot.bot_conversations(bot_id, is_active);
CREATE INDEX idx_conversations_phone ON whatsapp_bot.bot_conversations(phone_number);
CREATE INDEX idx_messages_conversation ON whatsapp_bot.bot_messages(conversation_id, created_at DESC);
CREATE INDEX idx_flows_bot_active ON whatsapp_bot.bot_flows(bot_id, is_active);
CREATE INDEX idx_usage_bot_date ON whatsapp_bot.bot_usage(bot_id, date, hour);

-- Comentarios
COMMENT ON TABLE whatsapp_bot.bots IS 'Configuración de bots inteligentes por instancia';
COMMENT ON TABLE whatsapp_bot.bot_conversations IS 'Contexto de conversaciones activas';
COMMENT ON TABLE whatsapp_bot.bot_messages IS 'Historial completo de mensajes';
COMMENT ON TABLE whatsapp_bot.bot_flows IS 'Flujos básicos de respuesta automatizada';
COMMENT ON TABLE whatsapp_bot.bot_usage IS 'Métricas de uso para facturación'; 