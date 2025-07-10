# 🛠️ GUÍA DE DESARROLLO - WhatsApp Bot Platform

## 📋 Tabla de Contenidos

1. [🚀 Inicio Rápido](#inicio-rápido)
2. [🏗️ Arquitectura del Sistema](#arquitectura-del-sistema)
3. [🔧 Configuración del Entorno](#configuración-del-entorno)
4. [📁 Estructura del Proyecto](#estructura-del-proyecto)
5. [🔐 Autenticación y Seguridad](#autenticación-y-seguridad)
6. [📊 Base de Datos](#base-de-datos)
7. [🤖 Integración con APIs Externas](#integración-con-apis-externas)
8. [🧪 Testing](#testing)
9. [🚀 Despliegue](#despliegue)
10. [📝 Buenas Prácticas](#buenas-prácticas)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+ (opcional)
- Git

### Instalación
```bash
# Clonar el repositorio
git clone <repo-url>
cd evolution-api/backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Configurar base de datos
npm run db:setup

# Ejecutar migraciones
npm run db:migrate

# Iniciar servidor de desarrollo
npm run dev
```

## 🏗️ Arquitectura del Sistema

### Patrón de Arquitectura
La aplicación sigue el patrón **MVC (Model-View-Controller)** con capas adicionales:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│                   (React Frontend)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST API
┌─────────────────────────▼───────────────────────────────────┐
│                     API LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Routes    │  │ Controllers │  │ Middleware  │        │
│  │ (Express)   │  │ (Business   │  │ (Auth/      │        │
│  │             │  │  Logic)     │  │  Validation)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   SERVICE LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Auth Service│  │ Instance    │  │ Bot Service │        │
│  │             │  │ Service     │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    DATA LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │ Redis Cache │  │ External    │        │
│  │ Database    │  │             │  │ APIs        │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principales

#### 1. **API Layer**
- **Routes**: Definición de endpoints
- **Controllers**: Lógica de negocio
- **Middleware**: Autenticación, validación, logging

#### 2. **Service Layer**
- **AuthService**: Gestión de autenticación
- **InstanceService**: Gestión de instancias WhatsApp
- **BotService**: Integración con OpenAI
- **DashboardService**: Métricas y análisis

#### 3. **Data Layer**
- **PostgreSQL**: Base de datos principal
- **Redis**: Cache y sesiones
- **External APIs**: Evolution API, OpenAI

## 🔧 Configuración del Entorno

### Variables de Entorno
```bash
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Evolution API
EVOLUTION_API_URL=https://evolution-api-jz3j.onrender.com
EVOLUTION_API_KEY=F2BC57EB8FBCB89D7BD411D5FA9F5451

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Configuración del servidor
PORT=3000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Configuración de PostgreSQL
```sql
-- Crear base de datos
CREATE DATABASE whatsapp_bot;

-- Crear usuario
CREATE USER bot_user WITH PASSWORD 'your_password';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE whatsapp_bot TO bot_user;
```

### Configuración de Redis
```bash
# Instalar Redis
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu

# Iniciar Redis
redis-server
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── controllers/          # Controladores (lógica de negocio)
│   │   ├── authController.js
│   │   ├── instanceController.js
│   │   ├── botConfigController.js
│   │   ├── contactController.js
│   │   ├── conversationController.js
│   │   └── dashboardController.js
│   ├── middleware/           # Middleware personalizado
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── rateLimit.js
│   ├── models/              # Modelos de datos
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Instance.js
│   │   └── Contact.js
│   ├── routes/              # Definición de rutas
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── instances.js
│   │   ├── botConfig.js
│   │   ├── contacts.js
│   │   ├── conversations.js
│   │   └── dashboard.js
│   ├── services/            # Servicios de negocio
│   │   ├── authService.js
│   │   ├── instanceService.js
│   │   ├── botService.js
│   │   └── dashboardService.js
│   ├── utils/               # Utilidades
│   │   ├── database.js
│   │   ├── cache.js
│   │   ├── encryption.js
│   │   └── validation.js
│   ├── config/              # Configuración
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── openai.js
│   └── app.js              # Punto de entrada
├── tests/                   # Pruebas
│   ├── api-test.js
│   ├── unit/
│   └── integration/
├── migrations/              # Migraciones de BD
├── postman/                # Colección Postman
├── testing/                # Reportes de testing
├── docs/                   # Documentación
└── package.json
```

## 🔐 Autenticación y Seguridad

### JWT Implementation
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      company_id: user.company_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',
      issuer: 'whatsapp-bot-api'
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
```

### Middleware de Autenticación
```javascript
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};
```

### Tenant Isolation
```javascript
const ensureCompanyAccess = (req, res, next) => {
  // Todas las queries deben incluir company_id
  req.companyId = req.user.company_id;
  next();
};
```

## 📊 Base de Datos

### Esquema Principal
```sql
-- Empresas
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  max_instances INTEGER NOT NULL DEFAULT 1,
  max_messages INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instancias
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phone_number VARCHAR(20),
  status VARCHAR(50) DEFAULT 'disconnected',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contactos
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  profile_pic_url TEXT,
  tags TEXT[],
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mensajes
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  is_from_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Índices Recomendados
```sql
-- Índices para performance
CREATE INDEX idx_messages_company_created ON messages(company_id, created_at);
CREATE INDEX idx_contacts_company_phone ON contacts(company_id, phone);
CREATE INDEX idx_instances_company_status ON instances(company_id, status);
CREATE INDEX idx_users_company_email ON users(company_id, email);
```

### Conexión a Base de Datos
```javascript
// src/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo 20 conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

## 🤖 Integración con APIs Externas

### Evolution API
```javascript
// src/services/evolutionService.js
const axios = require('axios');

class EvolutionService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.EVOLUTION_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EVOLUTION_API_KEY}`
      }
    });
  }

  async createInstance(instanceData) {
    try {
      const response = await this.client.post('/instance/create', instanceData);
      return response.data;
    } catch (error) {
      throw new Error(`Evolution API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async getInstanceStatus(instanceId) {
    try {
      const response = await this.client.get(`/instance/status/${instanceId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Evolution API Error: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new EvolutionService();
```

### OpenAI API
```javascript
// src/services/openaiService.js
const { OpenAI } = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateResponse(prompt, config = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: config.system_prompt || 'Eres un asistente virtual.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: config.max_tokens || 150,
        temperature: config.temperature || 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }
}

module.exports = new OpenAIService();
```

## 🧪 Testing

### Configuración de Tests
```javascript
// tests/setup.js
const request = require('supertest');
const app = require('../src/app');

// Setup de base de datos de testing
beforeAll(async () => {
  // Configurar BD de testing
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/whatsapp_bot_test';
});

afterAll(async () => {
  // Limpiar después de tests
  await pool.end();
});

module.exports = { request, app };
```

### Test de Ejemplo
```javascript
// tests/auth.test.js
const { request, app } = require('./setup');

describe('Authentication', () => {
  describe('POST /auth/register', () => {
    it('should register a new company', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Company',
          email: 'test@example.com',
          password: 'TestPass123!',
          plan: 'business'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });
  });
});
```

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Tests específicos
npm run test:unit
npm run test:integration
npm run test:e2e

# Con coverage
npm run test:coverage
```

## 🚀 Despliegue

### Heroku
```bash
# Crear app
heroku create whatsapp-bot-api

# Configurar variables de entorno
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set DATABASE_URL=postgresql://...

# Desplegar
git push heroku main
```

### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/whatsapp_bot
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=whatsapp_bot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### AWS
```yaml
# aws/buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
  pre_build:
    commands:
      - npm ci
  build:
    commands:
      - npm run build
  post_build:
    commands:
      - npm run test:ci

artifacts:
  files:
    - '**/*'
  exclude-paths:
    - node_modules/**/*
    - tests/**/*
```

## 📝 Buenas Prácticas

### Código
```javascript
// ✅ Buena práctica: Async/await con manejo de errores
const createInstance = async (req, res) => {
  try {
    const instance = await InstanceService.create(req.body);
    res.status(201).json({
      success: true,
      instance
    });
  } catch (error) {
    logger.error('Error creating instance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ❌ Mala práctica: Callbacks sin manejo de errores
const createInstance = (req, res) => {
  InstanceService.create(req.body, (err, instance) => {
    if (err) throw err; // ❌ No hacer esto
    res.json(instance);
  });
};
```

### Validación
```javascript
// ✅ Validación con Joi
const Joi = require('joi');

const createInstanceSchema = Joi.object({
  name: Joi.string().required().min(3).max(255),
  description: Joi.string().max(1000),
  config: Joi.object({
    auto_response: Joi.boolean().default(true),
    business_hours: Joi.object({
      enabled: Joi.boolean().default(false),
      start: Joi.string().pattern(/^\d{2}:\d{2}$/),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/)
    })
  })
});
```

### Logging
```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Error Handling
```javascript
// src/middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  // Errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: err.details
    });
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
};

module.exports = errorHandler;
```

### Cache
```javascript
// src/utils/cache.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

const cache = {
  get: async (key) => {
    try {
      const result = await client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  set: async (key, data, ttl = 3600) => {
    try {
      await client.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  del: async (key) => {
    try {
      await client.del(key);
    } catch (error) {
      logger.error('Cache del error:', error);
    }
  }
};

module.exports = cache;
```

## 📊 Monitoring y Observabilidad

### Health Check
```javascript
// src/routes/health.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    services: {}
  };

  try {
    // Check database
    await pool.query('SELECT 1');
    health.services.database = 'OK';
  } catch (error) {
    health.services.database = 'ERROR';
    health.status = 'ERROR';
  }

  // Check Redis
  try {
    await redis.ping();
    health.services.redis = 'OK';
  } catch (error) {
    health.services.redis = 'ERROR';
  }

  const status = health.status === 'OK' ? 200 : 503;
  res.status(status).json(health);
});

module.exports = router;
```

### Métricas
```javascript
// src/middleware/metrics.js
const promClient = require('prom-client');

const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode)
      .observe(duration);
    
    httpRequests
      .labels(req.method, req.route?.path || req.url, res.statusCode)
      .inc();
  });

  next();
};

module.exports = metricsMiddleware;
```

## 🔍 Debugging

### Debug con VS Code
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

### Debug con Node.js
```bash
# Ejecutar con debugging
node --inspect src/app.js

# O con nodemon
nodemon --inspect src/app.js
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos
```bash
# Verificar conexión
psql -h localhost -U postgres -d whatsapp_bot

# Verificar variables de entorno
echo $DATABASE_URL
```

#### 2. Token JWT Inválido
```javascript
// Verificar token en middleware
console.log('Token:', req.header('Authorization'));
console.log('Decoded:', jwt.decode(token, { complete: true }));
```

#### 3. Error de CORS
```javascript
// Configurar CORS correctamente
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

#### 4. Rate Limiting
```javascript
// Verificar límites
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Demasiadas peticiones, intenta más tarde'
});
```

## 📚 Recursos Adicionales

### Documentación
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Documentation](https://jwt.io/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

### Herramientas
- [Postman](https://postman.com/) - Testing de API
- [DataGrip](https://www.jetbrains.com/datagrip/) - Cliente de BD
- [Redis Desktop Manager](https://resp.app/) - Cliente Redis
- [Sentry](https://sentry.io/) - Error tracking

### Extensiones VS Code
- REST Client
- PostgreSQL
- Thunder Client
- GitLens
- Prettier

---

**Última actualización**: 2024-01-15
**Versión**: 1.0.0
**Mantenido por**: Equipo de Desarrollo 