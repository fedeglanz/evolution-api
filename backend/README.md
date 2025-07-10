# WhatsApp Bot Backend API

Backend Express.js para plataforma SaaS de bots de WhatsApp con integración ChatGPT.

## 🚀 Inicio Rápido

### Requisitos previos
- Node.js 18+
- PostgreSQL 14+
- Variables de entorno configuradas

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar migraciones
npm run migrate

# Desarrollo
npm run dev

# Producción
npm start
```

## 📁 Estructura del proyecto

```
backend/
├── src/
│   ├── app.js              # Aplicación Express principal
│   ├── server.js           # Servidor y startup
│   ├── config.js           # Configuración
│   ├── database.js         # Conexión PostgreSQL
│   ├── middleware/
│   │   ├── errorHandler.js # Manejo de errores
│   │   ├── auth.js         # Autenticación
│   │   └── validation.js   # Validación
│   ├── routes/
│   │   ├── index.js        # Router principal
│   │   ├── auth.js         # Autenticación
│   │   ├── instances.js    # Instancias WhatsApp
│   │   ├── botConfig.js    # Configuración bots
│   │   ├── contacts.js     # Contactos
│   │   ├── conversations.js # Conversaciones
│   │   └── dashboard.js    # Dashboard
│   ├── controllers/        # Controladores
│   ├── models/            # Modelos de datos
│   ├── services/          # Servicios
│   └── utils/             # Utilidades
├── uploads/               # Archivos subidos
├── migrations/            # Migraciones DB
├── tests/                 # Tests
├── package.json
└── README.md
```

## 🔧 Funcionalidades

### ✅ Implementado
- ✅ Configuración Express con middlewares
- ✅ Conexión PostgreSQL con pool
- ✅ Manejo de errores centralizado
- ✅ Rate limiting configurado
- ✅ CORS y seguridad con Helmet
- ✅ Logging con Morgan
- ✅ Compresión de respuestas
- ✅ Validación de esquema de BD
- ✅ Shutdown graceful
- ✅ Estructura de rutas modular
- ✅ **Autenticación JWT completa**
- ✅ **Validación de datos con Joi**
- ✅ **Controladores de autenticación**
- ✅ **Middleware de autorización**
- ✅ **Sistema de roles y permisos**
- ✅ **Limitación de recursos por plan**

### 🔄 Por implementar
- 🔄 Controladores de instancias y bot
- 🔄 Integración Evolution API
- 🔄 Integración OpenAI
- 🔄 Sistema de recuperación de contraseña
- 🔄 Tests unitarios
- 🔄 Documentación OpenAPI

## 🛠️ API Endpoints

### Autenticación (`/api/auth`)
- `POST /register` - Registrar nueva empresa y usuario admin
- `POST /login` - Iniciar sesión con email/password
- `GET /me` - Obtener datos del usuario actual
- `POST /logout` - Cerrar sesión
- `POST /refresh` - Renovar token JWT
- `POST /change-password` - Cambiar contraseña
- `POST /forgot-password` - Solicitar recuperación de contraseña
- `POST /reset-password` - Restablecer contraseña con token

### Instancias (`/api/instances`)
- `GET /` - Listar instancias
- `POST /` - Crear instancia
- `GET /:id` - Obtener instancia
- `PUT /:id` - Actualizar instancia
- `DELETE /:id` - Eliminar instancia
- `POST /:id/start` - Iniciar instancia
- `POST /:id/stop` - Detener instancia

### Configuración Bot (`/api/bot-config`)
- `GET /` - Listar configuraciones
- `POST /` - Crear configuración
- `PUT /:id` - Actualizar configuración
- `DELETE /:id` - Eliminar configuración

### Contactos (`/api/contacts`)
- `GET /` - Listar contactos
- `POST /` - Crear contacto
- `GET /:id` - Obtener contacto
- `PUT /:id` - Actualizar contacto

### Conversaciones (`/api/conversations`)
- `GET /` - Listar conversaciones
- `GET /:id` - Obtener conversación
- `GET /:id/messages` - Mensajes
- `POST /:id/messages` - Enviar mensaje

### Dashboard (`/api/dashboard`)
- `GET /` - Estadísticas generales
- `GET /stats` - Estadísticas detalladas
- `GET /analytics` - Análisis de uso

## 🔐 Sistema de Autenticación

### Flujo de Registro
```bash
# Registrar nueva empresa y usuario admin
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "MiPassword123!",
    "full_name": "Administrador",
    "company_name": "Mi Empresa SAS",
    "phone": "+573001234567"
  }'
```

### Flujo de Login
```bash
# Iniciar sesión
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "MiPassword123!"
  }'
```

### Uso de Token JWT
```bash
# Usar token en requests protegidos
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Validaciones
- **Email**: Formato válido, único en sistema
- **Password**: Mínimo 8 caracteres, debe contener mayúscula, minúscula, número y símbolo
- **Company Name**: Único en sistema, 2-100 caracteres
- **Full Name**: 2-100 caracteres
- **Phone**: Formato internacional opcional

### Roles y Permisos
- **admin**: Acceso completo a la empresa
- **manager**: Gestión de instancias y configuraciones
- **user**: Uso básico de funcionalidades

### Planes y Limitaciones
- **starter**: 1 instancia, 1000 mensajes/mes
- **business**: 3 instancias, 5000 mensajes/mes, embeddings
- **enterprise**: Ilimitado, todas las funciones

### Middleware de Autorización
```javascript
// Requiere autenticación
const { authenticate } = require('../middleware/auth');

// Requiere rol específico
const { requireAdmin } = require('../middleware/auth');

// Requiere plan mínimo
const { requirePlan } = require('../middleware/auth');
app.use('/premium', requirePlan('business'));

// Verificar límites de recursos
const { checkResourceLimit } = require('../middleware/auth');
app.use('/instances', checkResourceLimit('instances'));
```

## 🔐 Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
DATABASE_SSL=auto  # 'true', 'false', or 'auto' (detecta automáticamente)

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Evolution API
EVOLUTION_API_URL=https://evolution-api.com
EVOLUTION_API_KEY=your-api-key

# OpenAI
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4

# Frontend URLs (producción)
FRONTEND_URL=https://your-frontend.com
ADMIN_URL=https://admin.your-frontend.com
```

### 🔒 Configuración SSL de Base de Datos

El sistema detecta automáticamente si la base de datos requiere SSL basándose en:
- URL de proveedores conocidos (Heroku, AWS RDS, Supabase, Neon, etc.)
- Parámetro `sslmode=require` en la URL
- Entorno de producción

Para forzar SSL manualmente:
```env
DATABASE_SSL=true   # Forzar SSL habilitado
DATABASE_SSL=false  # Forzar SSL deshabilitado
# (sin especificar = detección automática)
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 📊 Monitoreo

### Health Check
```bash
curl http://localhost:3000/api/health
```

### API Info
```bash
curl http://localhost:3000/api/info
```

## 🔧 Desarrollo

### Estructura de respuestas
```json
{
  "success": true,
  "message": "Mensaje descriptivo",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Manejo de errores
```json
{
  "success": false,
  "message": "Error descriptivo",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "GET"
}
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

**Autor:** Fede Glanz  
**Versión:** 1.0.0  
**Fecha:** 2024 