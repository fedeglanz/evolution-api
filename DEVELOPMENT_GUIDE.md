# Guía de Desarrollo - WhatsApp Bot Platform

## 🚀 Configuración del Entorno Local

### Prerrequisitos

- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **PostgreSQL 14+** - [Descargar aquí](https://www.postgresql.org/)
- **Redis (opcional)** - [Descargar aquí](https://redis.io/)
- **Git** - [Descargar aquí](https://git-scm.com/)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/whatsapp-bot-platform.git
cd whatsapp-bot-platform
```

### 2. Configurar Backend

```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env

# Editar variables de entorno (ver sección siguiente)
nano .env
```

### 3. Configurar Base de Datos

#### Opción A: PostgreSQL Local
```bash
# Crear base de datos
createdb whatsapp_bot

# Ejecutar migraciones
npm run migrate

# Insertar datos de prueba (opcional)
npm run seed
```

#### Opción B: PostgreSQL en Render
```bash
# Usar URL de conexión de Render
# DATABASE_URL=postgresql://user:password@host:port/database
```

### 4. Iniciar el Servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start

# Con logs detallados
npm run dev:verbose
```

### 5. Probar la Instalación

```bash
# Verificar que el servidor está funcionando
curl http://localhost:3000/api/health

# Ejecutar tests de autenticación
chmod +x test-auth.sh
./test-auth.sh
```

## 🔧 Variables de Entorno

### Archivo `.env`

```bash
# === SERVIDOR ===
NODE_ENV=development
PORT=3000
HOST=localhost

# === BASE DE DATOS ===
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
DATABASE_SSL=false  # true para producción

# === AUTENTICACIÓN ===
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # por ventana
RATE_LIMIT_SKIP_SUCCESSFUL=true

# === LOGGING ===
LOG_LEVEL=info  # error, warn, info, debug
LOG_FORMAT=combined  # combined, common, dev, short, tiny

# === CORS ===
CORS_ORIGIN=http://localhost:3001  # Frontend URL
CORS_CREDENTIALS=true

# === SERVICIOS EXTERNOS ===
EVOLUTION_API_URL=https://evolution-api-jz3j.onrender.com
EVOLUTION_API_KEY=tu-api-key
OPENAI_API_KEY=sk-tu-openai-api-key
N8N_WEBHOOK_URL=https://tu-n8n-instance.com/webhook
REDIS_URL=redis://localhost:6379  # opcional

# === UPLOADS ===
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# === NOTIFICACIONES ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password
```

### Variables por Entorno

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
JWT_EXPIRES_IN=30d
DATABASE_SSL=false
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
JWT_EXPIRES_IN=7d
DATABASE_SSL=true
```

## 📝 Comandos Disponibles

### Backend (package.json)

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "dev:verbose": "DEBUG=* nodemon src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "migrate": "node migrations/run.js",
    "seed": "node seeds/run.js",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write src/**/*.js",
    "validate": "npm run lint && npm run test"
  }
}
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev                 # Iniciar servidor con nodemon
npm run dev:verbose         # Con logs detallados
npm run test:watch          # Tests en modo watch

# Testing
npm test                    # Ejecutar todos los tests
npm run test:coverage       # Tests con coverage
./test-auth.sh             # Test manual de autenticación

# Calidad de código
npm run lint                # Ejecutar linter
npm run lint:fix            # Corregir errores automáticamente
npm run format              # Formatear código con Prettier
npm run validate            # Lint + tests

# Base de datos
npm run migrate             # Ejecutar migraciones
npm run seed               # Insertar datos de prueba
npm run db:reset           # Reiniciar base de datos

# Producción
npm start                  # Iniciar servidor en producción
npm run build              # Build para producción (si aplica)
```

## 🗄️ Estructura de la Base de Datos

### Esquema Actual

```sql
-- Esquema: whatsapp_bot
-- Encoding: UTF8
-- Collate: en_US.UTF-8

-- Tablas principales (implementadas)
Companies (id, name, email, plan, max_instances, max_messages, created_at, updated_at)
Users (id, company_id, email, password_hash, first_name, last_name, role, last_login, created_at, updated_at)

-- Tablas por implementar
WhatsApp_Instances (id, company_id, name, phone_number, status, qr_code, webhook_url, created_at, updated_at)
Bot_Configs (id, instance_id, name, system_prompt, model, temperature, max_tokens, enabled, created_at, updated_at)
Contacts (id, company_id, phone_number, name, tags, metadata, created_at, updated_at)
Conversations (id, instance_id, contact_phone, status, last_message, unread_count, created_at, updated_at)
Messages (id, conversation_id, sender, content, message_type, metadata, created_at)
```

### Migraciones

```bash
# Crear nueva migración
node migrations/create.js nombre_migracion

# Ejecutar migraciones pendientes
npm run migrate

# Rollback última migración
node migrations/rollback.js
```

### Ejemplos de Consultas

```sql
-- Obtener usuario con su empresa
SELECT u.*, c.name as company_name, c.plan 
FROM users u 
JOIN companies c ON u.company_id = c.id 
WHERE u.email = 'usuario@empresa.com';

-- Contadores por empresa
SELECT 
    c.name,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admins
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name;

-- Instancias activas por empresa
SELECT c.name, COUNT(wi.id) as active_instances
FROM companies c
LEFT JOIN whatsapp_instances wi ON c.id = wi.company_id
WHERE wi.status = 'active'
GROUP BY c.id, c.name;
```

## 🧪 Testing

### Estructura de Tests

```
tests/
├── unit/                   # Tests unitarios
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   └── utils/
├── integration/           # Tests de integración
│   ├── auth.test.js
│   ├── instances.test.js
│   └── database.test.js
├── fixtures/              # Datos de prueba
│   ├── users.json
│   └── companies.json
└── helpers/               # Utilidades para tests
    ├── setup.js
    └── teardown.js
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- --grep "authentication"
npm test -- tests/unit/controllers/

# Coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Ejemplo de Test

```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Authentication', () => {
  let authToken;

  beforeEach(async () => {
    // Setup: crear datos de prueba
    await createTestUser();
  });

  afterEach(async () => {
    // Cleanup: limpiar datos de prueba
    await cleanupTestData();
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        company: {
          name: 'Empresa Test',
          email: 'test@empresa.com'
        },
        admin: {
          email: 'admin@empresa.com',
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'Test'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

## 🎨 Convenciones de Código

### Estructura de Archivos

```
src/
├── controllers/           # Lógica de endpoints
│   ├── authController.js
│   └── instancesController.js
├── middleware/           # Middlewares personalizados
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
├── routes/              # Definición de rutas
│   ├── index.js
│   └── auth.js
├── services/            # Lógica de negocio
│   ├── authService.js
│   └── instanceService.js
├── models/              # Modelos de datos
│   ├── User.js
│   └── Company.js
├── utils/               # Utilidades
│   ├── logger.js
│   └── helpers.js
└── config/              # Configuración
    ├── database.js
    └── jwt.js
```

### Estilo de Código

#### Naming Conventions
```javascript
// Variables y funciones: camelCase
const userName = 'john_doe';
const getUserData = () => {};

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DATABASE_URL = process.env.DATABASE_URL;

// Clases: PascalCase
class UserService {}
class AuthController {}

// Archivos: camelCase
// userController.js
// authMiddleware.js
```

#### Estructura de Controladores
```javascript
// controllers/authController.js
const authController = {
  async register(req, res, next) {
    try {
      // 1. Validar datos de entrada
      const { company, admin } = req.body;
      
      // 2. Lógica de negocio
      const result = await authService.register(company, admin);
      
      // 3. Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error) {
      // 4. Manejo de errores
      next(error);
    }
  }
};

module.exports = authController;
```

#### Estructura de Servicios
```javascript
// services/authService.js
const authService = {
  async register(companyData, adminData) {
    // Usar transacciones para operaciones complejas
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear empresa
      const company = await this.createCompany(companyData, client);
      
      // Crear usuario admin
      const admin = await this.createUser(adminData, company.id, client);
      
      await client.query('COMMIT');
      
      return { company, admin };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = authService;
```

#### Manejo de Errores
```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

// Uso en controladores
if (!email || !password) {
  throw new ValidationError('Email y contraseña son requeridos', 'email');
}
```

### Respuestas API Consistentes

#### Respuestas Exitosas
```javascript
// GET (lista)
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}

// GET (detalle)
{
  "success": true,
  "data": { ... }
}

// POST (creación)
{
  "success": true,
  "message": "Recurso creado exitosamente",
  "data": { ... }
}

// PUT/PATCH (actualización)
{
  "success": true,
  "message": "Recurso actualizado exitosamente",
  "data": { ... }
}

// DELETE
{
  "success": true,
  "message": "Recurso eliminado exitosamente"
}
```

#### Respuestas de Error
```javascript
// Error de validación
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Los datos proporcionados no son válidos",
    "details": [
      {
        "field": "email",
        "message": "El email debe tener un formato válido"
      }
    ]
  }
}

// Error de autenticación
{
  "success": false,
  "error": {
    "type": "AuthenticationError",
    "message": "Token de autenticación inválido"
  }
}

// Error interno del servidor
{
  "success": false,
  "error": {
    "type": "InternalServerError",
    "message": "Error interno del servidor"
  }
}
```

## 🔀 Flujo de Trabajo con Git

### Branching Strategy

```bash
main                 # Rama principal (producción)
├── develop          # Rama de desarrollo
│   ├── feature/auth-system
│   ├── feature/instances-management
│   └── feature/bot-configuration
├── hotfix/security-patch
└── release/v1.0.0
```

### Comandos Git

```bash
# Crear nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/nombre-feature

# Trabajar en la feature
git add .
git commit -m "feat: agregar autenticación JWT"

# Subir cambios
git push origin feature/nombre-feature

# Merge a develop
git checkout develop
git merge feature/nombre-feature
git push origin develop

# Deploy a producción
git checkout main
git merge develop
git push origin main
```

### Conventional Commits

```bash
# Tipos de commit
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formateo, espacios, etc.
refactor: refactorización de código
test: agregar o corregir tests
chore: tareas de mantenimiento

# Ejemplos
git commit -m "feat: agregar endpoint de registro de usuarios"
git commit -m "fix: corregir validación de email en login"
git commit -m "docs: actualizar README con nuevas instrucciones"
git commit -m "refactor: optimizar consultas de base de datos"
```

## 🐛 Debugging y Troubleshooting

### Logs

```javascript
// Usar el logger configurado
const logger = require('./utils/logger');

logger.error('Error crítico:', error);
logger.warn('Advertencia:', warning);
logger.info('Información:', info);
logger.debug('Debug:', debug);
```

### Common Issues

#### 1. Error de Conexión a Base de Datos
```bash
# Verificar conexión
psql -h localhost -U usuario -d whatsapp_bot

# Verificar variables de entorno
echo $DATABASE_URL

# Verificar SSL
# Si falla, agregar DATABASE_SSL=false al .env
```

#### 2. Error de JWT
```bash
# Verificar que JWT_SECRET esté configurado
echo $JWT_SECRET

# Regenerar token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password"}'
```

#### 3. Error de Rate Limiting
```bash
# Verificar configuración
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Limpiar cache (si usa Redis)
redis-cli FLUSHALL
```

### Monitoreo

```javascript
// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

## 📚 Recursos Adicionales

### Documentación
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)

### Herramientas Recomendadas
- **VSCode** - Editor de código
- **Postman** - Testing de APIs
- **pgAdmin** - Cliente PostgreSQL
- **Redis Desktop Manager** - Cliente Redis

### Extensiones VSCode
- ESLint
- Prettier
- REST Client
- PostgreSQL
- Thunder Client
- GitLens

---

**Última actualización**: Julio 2025  
**Mantenedor**: Fede Glanz  
**Versión**: 1.0.0 