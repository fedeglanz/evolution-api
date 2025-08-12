# WhatsApp Bot Platform - Contexto del Proyecto

## 📋 Descripción General

**WhatsApp Bot Platform** es una plataforma SaaS que permite a empresas crear y gestionar bots de WhatsApp inteligentes integrados con ChatGPT. La plataforma automatiza conversaciones, gestiona contactos y proporciona análisis de engagement.

### 🎯 Objetivos Principales

- **Democratizar bots de WhatsApp**: Hacer que cualquier empresa pueda tener un bot inteligente sin conocimientos técnicos
- **Integración ChatGPT**: Conversaciones naturales y contextuales con IA
- **Escalabilidad**: Desde pequeñas empresas hasta grandes corporaciones
- **Automatización**: Workflows automatizados con N8N para procesos complejos
- **Analytics**: Métricas detalladas de engagement y conversaciones

### 🏗️ Arquitectura General

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │    Backend      │    │   Servicios     │
│   (Next.js)     │◄──►│  (Express.js)   │◄──►│   Externos      │
│                 │    │                 │    │                 │
│ - Dashboard     │    │ - API REST      │    │ - Evolution API │
│ - Bot Config    │    │ - Auth JWT      │    │ - OpenAI GPT    │
│ - Analytics     │    │ - Webhooks      │    │ - N8N Workflows │
│ - Settings      │    │ - Rate Limiting │    │ - Redis Cache   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │                 │
                    │ - whatsapp_bot  │
                    │   schema        │
                    │ - Companies     │
                    │ - Users         │
                    │ - Instances     │
                    │ - Messages      │
                    │ - Contacts      │
                    └─────────────────┘
```

### 🔧 Stack Tecnológico

#### Backend (Implementado ✅)
- **Node.js 18+** - Runtime
- **Express.js 4.18** - Framework web
- **PostgreSQL 14+** - Base de datos principal
- **JWT** - Autenticación stateless
- **Joi** - Validación de datos
- **bcryptjs** - Hash de passwords
- **Helmet** - Seguridad HTTP
- **CORS** - Cross-origin requests
- **Morgan** - Logging HTTP
- **Rate Limiting** - Protección DDoS

#### Servicios Externos
- **Evolution API** - Gestión de instancias WhatsApp
- **OpenAI GPT-4** - Inteligencia artificial conversacional
- **N8N** - Automatización y workflows
- **Redis** - Cache y sesiones
- **Render** - Hosting y servicios

#### Frontend (Pendiente)
- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Styling
- **React Query** - State management
- **Recharts** - Gráficos y analytics

### 📁 Estructura del Proyecto

```
WhatsApp-Bot-Platform/
├── backend/                    # ✅ Backend Express.js
│   ├── src/
│   │   ├── app.js             # ✅ Aplicación Express principal
│   │   ├── server.js          # ✅ Servidor y startup
│   │   ├── config.js          # ✅ Configuración
│   │   ├── database.js        # ✅ Conexión PostgreSQL
│   │   ├── controllers/       # ✅ Controladores
│   │   │   └── authController.js  # ✅ Autenticación completa
│   │   ├── middleware/        # ✅ Middlewares
│   │   │   ├── auth.js        # ✅ Autenticación JWT
│   │   │   ├── validation.js  # ✅ Validación Joi
│   │   │   └── errorHandler.js # ✅ Manejo de errores
│   │   ├── routes/            # ✅ Rutas API
│   │   │   ├── index.js       # ✅ Router principal
│   │   │   ├── auth.js        # ✅ Rutas autenticación
│   │   │   ├── instances.js   # 🔄 Instancias WhatsApp
│   │   │   ├── botConfig.js   # 🔄 Configuración bots
│   │   │   ├── contacts.js    # 🔄 Gestión contactos
│   │   │   ├── conversations.js # 🔄 Conversaciones
│   │   │   └── dashboard.js   # 🔄 Analytics
│   │   ├── services/          # 🔄 Servicios de negocio
│   │   ├── models/            # 🔄 Modelos de datos
│   │   └── utils/             # 🔄 Utilidades
│   ├── uploads/               # ✅ Archivos subidos
│   ├── migrations/            # ✅ Migraciones DB
│   ├── tests/                 # 🔄 Tests unitarios
│   ├── package.json           # ✅ Dependencias
│   ├── test-auth.sh          # ✅ Script pruebas auth
│   └── README.md             # ✅ Documentación
├── frontend/                  # 🔄 Frontend Next.js
├── n8n/                      # ✅ Workflows N8N
│   └── n8n_bot_workflow.json # ✅ Workflow base
├── php-firebase-api/         # ✅ API Firebase auxiliar
└── docs/                     # ✅ Documentación
    ├── PROJECT_CONTEXT.md    # Este archivo
    ├── DEVELOPMENT_GUIDE.md
    ├── API_REFERENCE.md
    └── BUSINESS_LOGIC.md
```

**Leyenda:**
- ✅ Implementado y funcional
- 🔄 En desarrollo / Por implementar
- ❌ No implementado

### 🗄️ Base de Datos - Esquema `whatsapp_bot`

#### Tablas Principales

**Companies**
```sql
- id: UUID (PK)
- name: VARCHAR (nombre empresa)
- email: VARCHAR (email principal)
- plan: VARCHAR (starter|business|enterprise)
- max_instances: INTEGER
- max_messages: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Users**
```sql
- id: UUID (PK)
- company_id: UUID (FK → companies.id)
- email: VARCHAR (único)
- password_hash: VARCHAR
- first_name: VARCHAR
- last_name: VARCHAR
- role: VARCHAR (admin|manager|user)
- last_login: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**WhatsApp_Instances**
```sql
- id: UUID (PK)
- company_id: UUID (FK → companies.id)
- name: VARCHAR
- phone_number: VARCHAR
- status: VARCHAR (active|inactive|connecting)
- qr_code: TEXT
- webhook_url: VARCHAR
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Bot_Configs**
```sql
- id: UUID (PK)
- instance_id: UUID (FK → whatsapp_instances.id)
- name: VARCHAR
- system_prompt: TEXT
- model: VARCHAR (gpt-4|gpt-3.5-turbo)
- temperature: DECIMAL
- max_tokens: INTEGER
- enabled: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Contacts**
```sql
- id: UUID (PK)
- company_id: UUID (FK → companies.id)
- phone_number: VARCHAR
- name: VARCHAR
- tags: JSON
- metadata: JSON
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Conversations**
```sql
- id: UUID (PK)
- instance_id: UUID (FK → whatsapp_instances.id)
- contact_phone: VARCHAR
- status: VARCHAR (active|archived|closed)
- last_message: TEXT
- unread_count: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Messages** (tabla de alto volumen)
```sql
- id: UUID (PK)
- conversation_id: UUID (FK → conversations.id)
- sender: VARCHAR (user|bot|system)
- content: TEXT
- message_type: VARCHAR (text|image|audio|document)
- metadata: JSON
- created_at: TIMESTAMP
```

### 🔗 APIs Externas y Servicios

#### 1. Evolution API
- **Propósito**: Gestión de instancias WhatsApp Business
- **Endpoint**: `https://evolution-api-jz3j.onrender.com`
- **Funciones**:
  - Crear/eliminar instancias
  - Generar códigos QR
  - Enviar/recibir mensajes
  - Gestionar webhooks
  - Estado de conexión

#### 2. OpenAI API
- **Propósito**: Inteligencia artificial conversacional
- **Modelos**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Funciones**:
  - Generación de respuestas contextuales
  - Análisis de sentimientos
  - Clasificación de intenciones
  - Resúmenes de conversaciones

#### 3. N8N Automation
- **Propósito**: Workflows y automatización
- **Endpoint**: Instancia dedicada en Render
- **Funciones**:
  - Procesamiento de webhooks
  - Integraciones con CRM
  - Notificaciones automáticas
  - Análisis de datos

#### 4. Redis Cache
- **Propósito**: Cache y sesiones
- **Funciones**:
  - Cache de respuestas de IA
  - Limitación de rate limiting
  - Sesiones de conversación
  - Cache de configuraciones

### 📊 Estado Actual del Desarrollo

#### ✅ Completado

**Backend Core**
- [x] Configuración Express.js con middlewares de seguridad
- [x] Conexión PostgreSQL con detección automática SSL
- [x] Sistema de autenticación JWT completo
- [x] Validación robusta con Joi
- [x] Manejo centralizado de errores
- [x] Rate limiting configurado
- [x] Estructura de rutas modular
- [x] Middleware de autorización con roles y planes

**Autenticación**
- [x] Registro de empresa + usuario admin
- [x] Login con email/password
- [x] Refresh token
- [x] Logout
- [x] Cambio de contraseña
- [x] Endpoint /me para datos del usuario

**Infraestructura**
- [x] Base de datos PostgreSQL configurada
- [x] Esquema whatsapp_bot implementado
- [x] Migraciones de base de datos
- [x] Documentación técnica
- [x] Scripts de testing

#### 🔄 En Desarrollo

**Controladores de Negocio**
- [ ] Gestión de instancias WhatsApp
- [ ] Configuración de bots con IA
- [ ] Gestión de contactos
- [ ] Conversaciones y mensajes
- [ ] Dashboard y analytics

**Integraciones**
- [ ] Cliente Evolution API
- [ ] Cliente OpenAI
- [ ] Webhooks N8N
- [ ] Procesamiento de mensajes

**Frontend**
- [ ] Dashboard principal
- [ ] Configuración de bots
- [ ] Gestión de instancias
- [ ] Analytics y reportes
- [ ] Sistema de configuración

#### ❌ Pendiente

**Funcionalidades Avanzadas**
- [ ] Sistema de recuperación de contraseña
- [ ] Notificaciones en tiempo real
- [ ] Exportación de datos
- [ ] API webhooks para clientes
- [ ] Sistema de facturación

**DevOps**
- [ ] Tests unitarios y de integración
- [ ] CI/CD pipeline
- [ ] Monitoreo y alertas
- [ ] Backup automático
- [ ] Documentación OpenAPI/Swagger

### 🔄 Flujo de Datos

#### 1. Registro y Onboarding
```
Usuario → Frontend → Backend → PostgreSQL
                  ↓
              Evolution API (crear instancia)
                  ↓
              QR Code → WhatsApp Business
```

#### 2. Procesamiento de Mensajes
```
WhatsApp → Evolution API → Webhook → N8N → Backend
                                            ↓
                                    OpenAI GPT-4
                                            ↓
                                    PostgreSQL + Redis
                                            ↓
                                    Response → Evolution API → WhatsApp
```

#### 3. Configuración de Bot
```
Frontend → Backend → PostgreSQL (bot_configs)
                  ↓
              Update OpenAI prompts
                  ↓
              N8N workflow update
```

### 🌍 Configuración de Entornos

#### Development
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:3001`
- **Database**: Local PostgreSQL o Render
- **Redis**: Local o Render
- **Evolution API**: Instancia compartida de desarrollo

#### Production
- **Backend**: Render.com
- **Frontend**: Vercel o Render
- **Database**: Render PostgreSQL
- **Redis**: Render Redis
- **Evolution API**: Instancia dedicada Render
- **N8N**: Instancia dedicada Render

### 🚀 Roadmap

#### Fase 1 - MVP (4-6 semanas)
- [x] Backend con autenticación ✅
- [ ] Gestión básica de instancias
- [ ] Configuración simple de bots
- [ ] Frontend básico
- [ ] Integración OpenAI básica

#### Fase 2 - Beta (6-8 semanas)
- [ ] Dashboard completo
- [ ] Analytics básicos
- [ ] Gestión de contactos
- [ ] Workflows N8N
- [ ] Sistema de planes

#### Fase 3 - Producción (8-12 semanas)
- [ ] Funcionalidades avanzadas
- [ ] Integración completa N8N
- [ ] Sistema de facturación
- [ ] Apps móviles
- [ ] API pública

### 🔒 Seguridad

#### Implementado
- JWT con expiración configurable
- Hash bcrypt con salt 12
- Rate limiting por IP y usuario
- CORS configurado
- Helmet para headers de seguridad
- Validación estricta de entrada
- SQL injection protection (parámetros)

#### Pendiente
- Blacklist de tokens
- 2FA opcional
- Audit logs
- Encryption at rest
- Penetration testing

### 📈 Métricas y KPIs

#### Negocio
- Usuarios registrados
- Empresas activas
- Mensajes procesados
- Revenue por plan
- Churn rate

#### Técnico
- Response time promedio
- Uptime del sistema
- Errores 4xx/5xx
- CPU/Memory usage
- Database performance

---

**Última actualización**: Julio 2025  
**Versión**: 1.0.0  
**Estado**: En desarrollo activo  
**Equipo**: Fede Glanz 