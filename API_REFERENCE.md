# API Reference - WhatsApp Bot Platform

## 📋 Información General

### Base URL
```
Production: https://whatsapp-bot-api.render.com
Development: http://localhost:3000
```

### Versión
```
v1.0.0
```

### Formato de Respuesta
Todas las respuestas utilizan el formato JSON con la siguiente estructura:

```json
{
  "success": boolean,
  "message": string (opcional),
  "data": object | array (opcional),
  "error": object (opcional),
  "pagination": object (opcional)
}
```

## 🔐 Autenticación

### Registro de Empresa y Usuario Admin

**Endpoint:** `POST /api/auth/register`

**Descripción:** Registra una nueva empresa y crea el usuario administrador.

**Request Body:**
```json
{
  "company": {
    "name": "Nombre de la Empresa",
    "email": "empresa@ejemplo.com",
    "plan": "starter" // optional, default: "starter"
  },
  "admin": {
    "email": "admin@ejemplo.com",
    "password": "Password123!",
    "firstName": "Nombre",
    "lastName": "Apellido"
  }
}
```

**Validaciones:**
- `company.name`: 2-100 caracteres
- `company.email`: formato email válido
- `company.plan`: "starter" | "business" | "enterprise"
- `admin.email`: formato email válido, único
- `admin.password`: mínimo 8 caracteres, mayúsculas, minúsculas, números, símbolos
- `admin.firstName`: 2-50 caracteres
- `admin.lastName`: 2-50 caracteres

**Response (201):**
```json
{
  "success": true,
  "message": "Empresa y usuario registrados exitosamente",
  "data": {
    "company": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Nombre de la Empresa",
      "email": "empresa@ejemplo.com",
      "plan": "starter",
      "maxInstances": 1,
      "maxMessages": 1000,
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@ejemplo.com",
      "firstName": "Nombre",
      "lastName": "Apellido",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "name": "Mi Empresa",
      "email": "empresa@ejemplo.com"
    },
    "admin": {
      "email": "admin@ejemplo.com",
      "password": "Password123!",
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }'
```

### Login de Usuario

**Endpoint:** `POST /api/auth/login`

**Descripción:** Autentica un usuario y retorna un JWT token.

**Request Body:**
```json
{
  "email": "admin@ejemplo.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@ejemplo.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "admin",
      "company": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Mi Empresa",
        "plan": "starter"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "Password123!"
  }'
```

### Obtener Datos del Usuario Actual

**Endpoint:** `GET /api/auth/me`

**Descripción:** Obtiene los datos del usuario autenticado actual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@ejemplo.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "admin",
      "lastLogin": "2025-01-15T10:30:00.000Z",
      "company": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Mi Empresa",
        "plan": "starter",
        "maxInstances": 1,
        "maxMessages": 1000
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Descripción:** Genera un nuevo token usando el token actual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token renovado exitosamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Cambiar Contraseña

**Endpoint:** `POST /api/auth/change-password`

**Descripción:** Cambia la contraseña del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }'
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Descripción:** Cierra la sesión del usuario (invalida el token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 📱 Instancias de WhatsApp

### Listar Instancias

**Endpoint:** `GET /api/instances`

**Descripción:** Obtiene todas las instancias de WhatsApp de la empresa.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: número de página (default: 1)
- `limit`: elementos por página (default: 10)
- `status`: filtrar por estado (active, inactive, connecting)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "name": "Instancia Principal",
      "phoneNumber": "+1234567890",
      "status": "active",
      "qrCode": "data:image/png;base64,...",
      "webhookUrl": "https://tu-webhook.com/whatsapp",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/instances?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Crear Instancia

**Endpoint:** `POST /api/instances`

**Descripción:** Crea una nueva instancia de WhatsApp.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Instancia Principal",
  "webhookUrl": "https://tu-webhook.com/whatsapp"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Instancia creada exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Instancia Principal",
    "phoneNumber": null,
    "status": "connecting",
    "qrCode": "data:image/png;base64,...",
    "webhookUrl": "https://tu-webhook.com/whatsapp",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/instances \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instancia Principal",
    "webhookUrl": "https://tu-webhook.com/whatsapp"
  }'
```

### Obtener Instancia por ID

**Endpoint:** `GET /api/instances/:id`

**Descripción:** Obtiene una instancia específica por su ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Instancia Principal",
    "phoneNumber": "+1234567890",
    "status": "active",
    "qrCode": null,
    "webhookUrl": "https://tu-webhook.com/whatsapp",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/instances/123e4567-e89b-12d3-a456-426614174002 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Actualizar Instancia

**Endpoint:** `PUT /api/instances/:id`

**Descripción:** Actualiza una instancia existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Nuevo Nombre",
  "webhookUrl": "https://nuevo-webhook.com/whatsapp"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Instancia actualizada exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Nuevo Nombre",
    "phoneNumber": "+1234567890",
    "status": "active",
    "webhookUrl": "https://nuevo-webhook.com/whatsapp",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/instances/123e4567-e89b-12d3-a456-426614174002 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Nombre",
    "webhookUrl": "https://nuevo-webhook.com/whatsapp"
  }'
```

### Eliminar Instancia

**Endpoint:** `DELETE /api/instances/:id`

**Descripción:** Elimina una instancia de WhatsApp.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Instancia eliminada exitosamente"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/instances/123e4567-e89b-12d3-a456-426614174002 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🤖 Configuración de Bots

### Listar Configuraciones de Bot

**Endpoint:** `GET /api/bot-config`

**Descripción:** Obtiene todas las configuraciones de bots de la empresa.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "instanceId": "123e4567-e89b-12d3-a456-426614174002",
      "name": "Bot de Soporte",
      "systemPrompt": "Eres un asistente de soporte técnico...",
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 1000,
      "enabled": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "instance": {
        "name": "Instancia Principal",
        "phoneNumber": "+1234567890"
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/bot-config \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Crear Configuración de Bot

**Endpoint:** `POST /api/bot-config`

**Descripción:** Crea una nueva configuración de bot para una instancia.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "instanceId": "123e4567-e89b-12d3-a456-426614174002",
  "name": "Bot de Soporte",
  "systemPrompt": "Eres un asistente de soporte técnico especializado en WhatsApp...",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 1000,
  "enabled": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Configuración de bot creada exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174003",
    "instanceId": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Bot de Soporte",
    "systemPrompt": "Eres un asistente de soporte técnico...",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 1000,
    "enabled": true,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/bot-config \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Bot de Soporte",
    "systemPrompt": "Eres un asistente de soporte técnico especializado en WhatsApp...",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 1000,
    "enabled": true
  }'
```

## 📞 Contactos

### Listar Contactos

**Endpoint:** `GET /api/contacts`

**Descripción:** Obtiene todos los contactos de la empresa.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: número de página (default: 1)
- `limit`: elementos por página (default: 10)
- `search`: búsqueda por nombre o teléfono

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174004",
      "phoneNumber": "+1234567890",
      "name": "Juan Pérez",
      "tags": ["cliente", "activo"],
      "metadata": {
        "source": "whatsapp",
        "lastInteraction": "2025-01-15T10:30:00.000Z"
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/contacts?page=1&limit=10&search=Juan" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 💬 Conversaciones

### Listar Conversaciones

**Endpoint:** `GET /api/conversations`

**Descripción:** Obtiene todas las conversaciones de la empresa.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: número de página (default: 1)
- `limit`: elementos por página (default: 10)
- `status`: filtrar por estado (active, archived, closed)
- `instanceId`: filtrar por instancia

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174005",
      "instanceId": "123e4567-e89b-12d3-a456-426614174002",
      "contactPhone": "+1234567890",
      "status": "active",
      "lastMessage": "Hola, necesito ayuda con mi pedido",
      "unreadCount": 2,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "instance": {
        "name": "Instancia Principal",
        "phoneNumber": "+0987654321"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/conversations?status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Obtener Mensajes de Conversación

**Endpoint:** `GET /api/conversations/:id/messages`

**Descripción:** Obtiene los mensajes de una conversación específica.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: número de página (default: 1)
- `limit`: elementos por página (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174006",
      "conversationId": "123e4567-e89b-12d3-a456-426614174005",
      "sender": "user",
      "content": "Hola, necesito ayuda con mi pedido",
      "messageType": "text",
      "metadata": {
        "timestamp": "2025-01-15T10:30:00.000Z"
      },
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174007",
      "conversationId": "123e4567-e89b-12d3-a456-426614174005",
      "sender": "bot",
      "content": "Hola! Estaré encantado de ayudarte con tu pedido. ¿Podrías proporcionarme tu número de pedido?",
      "messageType": "text",
      "metadata": {
        "timestamp": "2025-01-15T10:31:00.000Z"
      },
      "createdAt": "2025-01-15T10:31:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "pages": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/conversations/123e4567-e89b-12d3-a456-426614174005/messages \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Enviar Mensaje

**Endpoint:** `POST /api/conversations/:id/messages`

**Descripción:** Envía un mensaje manual en una conversación.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Mensaje de respuesta manual",
  "messageType": "text"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174008",
    "conversationId": "123e4567-e89b-12d3-a456-426614174005",
    "sender": "user",
    "content": "Mensaje de respuesta manual",
    "messageType": "text",
    "createdAt": "2025-01-15T10:32:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/conversations/123e4567-e89b-12d3-a456-426614174005/messages \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Mensaje de respuesta manual",
    "messageType": "text"
  }'
```

## 📊 Dashboard y Analytics

### Obtener Estadísticas del Dashboard

**Endpoint:** `GET /api/dashboard/stats`

**Descripción:** Obtiene las estadísticas principales del dashboard.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: período de análisis (7d, 30d, 90d) (default: 30d)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalInstances": 1,
      "activeInstances": 1,
      "totalContacts": 150,
      "totalConversations": 75,
      "totalMessages": 2500,
      "messagesThisMonth": 850,
      "messagesLimit": 1000,
      "responseTime": "2.5s"
    },
    "messagesChart": [
      {
        "date": "2025-01-01",
        "incoming": 45,
        "outgoing": 38
      },
      {
        "date": "2025-01-02",
        "incoming": 52,
        "outgoing": 41
      }
    ],
    "conversationsChart": [
      {
        "date": "2025-01-01",
        "active": 12,
        "closed": 8
      },
      {
        "date": "2025-01-02",
        "active": 15,
        "closed": 6
      }
    ],
    "topContacts": [
      {
        "phoneNumber": "+1234567890",
        "name": "Juan Pérez",
        "messageCount": 45
      },
      {
        "phoneNumber": "+0987654321",
        "name": "María García",
        "messageCount": 38
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/dashboard/stats?period=30d" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🔧 Sistema y Utilidades

### Health Check

**Endpoint:** `GET /api/health`

**Descripción:** Verifica el estado del sistema.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "database": "connected",
    "services": {
      "evolutionApi": "connected",
      "openai": "connected",
      "redis": "connected"
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/health
```

### Información del Sistema

**Endpoint:** `GET /api/system/info`

**Descripción:** Obtiene información detallada del sistema.

**Headers:**
```
Authorization: Bearer <token>
```

**Roles permitidos:** admin

**Response (200):**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "environment": "production",
    "node": "18.17.0",
    "platform": "linux",
    "memory": {
      "used": "150MB",
      "total": "512MB",
      "percentage": 29
    },
    "database": {
      "status": "connected",
      "tables": 7,
      "connections": 5
    },
    "services": {
      "evolutionApi": {
        "status": "connected",
        "url": "https://evolution-api-jz3j.onrender.com"
      },
      "openai": {
        "status": "connected",
        "model": "gpt-4"
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/system/info \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## ❌ Códigos de Error

### Códigos de Estado HTTP

- **200** - OK (Éxito)
- **201** - Created (Recurso creado)
- **400** - Bad Request (Solicitud inválida)
- **401** - Unauthorized (No autenticado)
- **403** - Forbidden (Sin permisos)
- **404** - Not Found (Recurso no encontrado)
- **409** - Conflict (Conflicto, ej. email duplicado)
- **422** - Unprocessable Entity (Error de validación)
- **429** - Too Many Requests (Rate limit excedido)
- **500** - Internal Server Error (Error del servidor)

### Estructura de Errores

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Los datos proporcionados no son válidos",
    "details": [
      {
        "field": "email",
        "message": "El email debe tener un formato válido"
      },
      {
        "field": "password",
        "message": "La contraseña debe tener al menos 8 caracteres"
      }
    ]
  }
}
```

### Tipos de Error Comunes

#### ValidationError (400)
```json
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
```

#### AuthenticationError (401)
```json
{
  "success": false,
  "error": {
    "type": "AuthenticationError",
    "message": "Token de autenticación inválido o expirado"
  }
}
```

#### AuthorizationError (403)
```json
{
  "success": false,
  "error": {
    "type": "AuthorizationError",
    "message": "No tienes permisos para acceder a este recurso"
  }
}
```

#### NotFoundError (404)
```json
{
  "success": false,
  "error": {
    "type": "NotFoundError",
    "message": "El recurso solicitado no fue encontrado"
  }
}
```

#### ConflictError (409)
```json
{
  "success": false,
  "error": {
    "type": "ConflictError",
    "message": "Ya existe una cuenta con este email"
  }
}
```

#### RateLimitError (429)
```json
{
  "success": false,
  "error": {
    "type": "RateLimitError",
    "message": "Demasiadas solicitudes. Intenta de nuevo en 15 minutos"
  }
}
```

#### PlanLimitError (403)
```json
{
  "success": false,
  "error": {
    "type": "PlanLimitError",
    "message": "Has alcanzado el límite de instancias para tu plan actual"
  }
}
```

## 🔐 Autenticación y Autorización

### JWT Token

Todos los endpoints protegidos requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

### Expiración del Token

- **Development**: 30 días
- **Production**: 7 días

### Refresh Token

Para renovar un token antes de que expire:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer <current_token>"
```

### Roles de Usuario

- **admin**: Acceso completo a todas las funcionalidades
- **manager**: Acceso a gestión de instancias y configuración
- **user**: Acceso básico a visualización de datos

### Límites por Plan

#### Starter Plan
- 1 instancia de WhatsApp
- 1,000 mensajes/mes
- Soporte básico

#### Business Plan
- 3 instancias de WhatsApp
- 5,000 mensajes/mes
- Soporte prioritario
- Analytics avanzados

#### Enterprise Plan
- Instancias ilimitadas
- Mensajes ilimitados
- Soporte 24/7
- API personalizada

## 📚 Ejemplos de Uso

### Flujo Completo: Registro y Configuración

```bash
# 1. Registrar empresa y usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "name": "Mi Empresa",
      "email": "empresa@ejemplo.com"
    },
    "admin": {
      "email": "admin@ejemplo.com",
      "password": "Password123!",
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }'

# 2. Usar el token retornado para crear una instancia
curl -X POST http://localhost:3000/api/instances \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instancia Principal",
    "webhookUrl": "https://tu-webhook.com/whatsapp"
  }'

# 3. Configurar el bot para la instancia
curl -X POST http://localhost:3000/api/bot-config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "<instance_id>",
    "name": "Bot de Soporte",
    "systemPrompt": "Eres un asistente de soporte técnico...",
    "model": "gpt-4",
    "enabled": true
  }'
```

### Monitoreo y Analytics

```bash
# Verificar estado del sistema
curl -X GET http://localhost:3000/api/health

# Obtener estadísticas del dashboard
curl -X GET http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer <token>"

# Listar conversaciones activas
curl -X GET "http://localhost:3000/api/conversations?status=active" \
  -H "Authorization: Bearer <token>"
```

---

**Última actualización**: Julio 2025  
**Versión API**: 1.0.0  
**Documentación**: Fede Glanz 