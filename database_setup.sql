-- Script para crear las tablas del backend personalizado en un esquema separado
-- Esto mantendrá separadas las tablas de Evolution API (esquema public) y nuestro backend (esquema whatsapp_bot)

-- Crear esquema separado para nuestro backend
CREATE SCHEMA IF NOT EXISTS whatsapp_bot;

-- Establecer el esquema para este script
SET search_path TO whatsapp_bot;

-- Crear tabla companies en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'starter',
  max_instances INTEGER DEFAULT 1,
  max_messages INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla users en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  full_name VARCHAR(100),
  phone VARCHAR(20),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla whatsapp_instances en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected',
  qr_code TEXT,
  webhook_url VARCHAR(500),
  webhook_events TEXT[] DEFAULT ARRAY['message', 'status', 'connection'],
  connected_at TIMESTAMP,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Crear tabla bot_configs en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.bot_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
  system_prompt TEXT DEFAULT 'Eres un asistente virtual amigable y profesional.',
  business_hours JSON DEFAULT '{"enabled": false, "timezone": "America/Argentina/Buenos_Aires", "hours": {"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "14:00"}, "sunday": {"open": null, "close": null}}}',
  auto_response BOOLEAN DEFAULT true,
  escalation_number VARCHAR(20),
  escalation_keywords TEXT[] DEFAULT ARRAY['humano', 'persona', 'operador', 'ayuda'],
  welcome_message TEXT DEFAULT 'Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
  away_message TEXT DEFAULT 'Gracias por contactarnos. En este momento estamos fuera del horario de atención, pero responderemos tu mensaje lo antes posible.',
  embeddings_enabled BOOLEAN DEFAULT false,
  max_tokens INTEGER DEFAULT 150,
  temperature DECIMAL(2,1) DEFAULT 0.7,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, instance_id)
);

-- Crear tabla contacts en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  profile_pic_url TEXT,
  last_message_at TIMESTAMP,
  total_messages INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

-- Crear tabla conversations en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_bot.contacts(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
  message_id VARCHAR(100),
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  is_from_bot BOOLEAN DEFAULT false,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla knowledge_base en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text',
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla campaigns en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_bot.whatsapp_instances(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  message_template TEXT NOT NULL,
  scheduled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla campaign_contacts en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES whatsapp_bot.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_bot.contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla api_usage en el esquema whatsapp_bot
CREATE TABLE IF NOT EXISTS whatsapp_bot.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para rendimiento en el esquema whatsapp_bot
CREATE INDEX IF NOT EXISTS idx_companies_email ON whatsapp_bot.companies(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON whatsapp_bot.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON whatsapp_bot.users(email);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company_id ON whatsapp_bot.whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_bot.whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON whatsapp_bot.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON whatsapp_bot.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON whatsapp_bot.conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON whatsapp_bot.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON whatsapp_bot.conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_company_id ON whatsapp_bot.knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON whatsapp_bot.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_company_id ON whatsapp_bot.api_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON whatsapp_bot.api_usage(created_at);

-- Verificar creación de tablas en el esquema whatsapp_bot
SELECT 'Setup completado. Esquema whatsapp_bot creado.' as status;
SELECT schemaname, tablename FROM pg_tables 
WHERE schemaname = 'whatsapp_bot' 
ORDER BY tablename;

-- Mostrar separación clara entre esquemas
SELECT 'Esquemas en la base de datos:' as info;
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'whatsapp_bot') 
ORDER BY schema_name; 