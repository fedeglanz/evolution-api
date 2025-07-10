# 📚 API REFERENCE - WhatsApp Bot Platform

## 🚀 Información General

**URL Base**: `http://localhost:3000/api`
**Versión**: 1.0.0
**Autenticación**: JWT Bearer Token

## 🔐 Autenticación

Todos los endpoints (excepto registro y login) requieren autenticación JWT.

### Headers Requeridos
```http
Authorization: Bearer {token}
Content-Type: application/json
```

## 📋 Endpoints Disponibles

### 1. 🔐 Autenticación

#### `POST /auth/register`
Registra una nueva empresa en la plataforma.

**Parámetros:**
```json
{
  "name": "Mi Empresa",
  "email": "admin@miempresa.com",
  "password": "MiPassword123!",
  "plan": "starter|business|enterprise"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Empresa registrada exitosamente",
  "user": {
    "id": "user-123",
    "email": "admin@miempresa.com",
    "role": "admin"
  },
  "company": {
    "id": "company-123",
    "name": "Mi Empresa",
    "plan": "business",
    "max_instances": 3,
    "max_messages": 5000
  }
}
```

#### `POST /auth/login`
Autenticación de usuario.

**Parámetros:**
```json
{
  "email": "admin@miempresa.com",
  "password": "MiPassword123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "admin@miempresa.com",
    "role": "admin",
    "company": {
      "id": "company-123",
      "name": "Mi Empresa",
      "plan": "business",
      "max_instances": 3,
      "max_messages": 5000
    }
  }
}
```

#### `GET /auth/me`
Obtiene información del usuario autenticado.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "admin@miempresa.com",
    "role": "admin",
    "company": {
      "id": "company-123",
      "name": "Mi Empresa",
      "plan": "business",
      "max_instances": 3,
      "max_messages": 5000,
      "member_since": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### `POST /auth/change-password`
Cambia la contraseña del usuario.

**Parámetros:**
```json
{
  "currentPassword": "MiPassword123!",
  "newPassword": "NuevaPassword123!"
}
```

#### `POST /auth/logout`
Cierra sesión del usuario.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

### 2. 📱 Instancias WhatsApp

#### `GET /instances`
Lista todas las instancias de la empresa.

**Query Parameters:**
- `page`: Página (default: 1)
- `limit`: Límite por página (default: 10)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "instances": [
      {
        "id": "inst-123",
        "name": "Ventas Principal",
        "description": "Instancia para equipo de ventas",
        "phone_number": "+1234567890",
        "status": "connected",
        "created_at": "2024-01-01T10:00:00Z",
        "last_seen": "2024-01-15T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### `POST /instances`
Crea una nueva instancia de WhatsApp.

**Parámetros:**
```json
{
  "name": "Mi Instancia",
  "description": "Descripción de la instancia"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Instancia creada exitosamente",
  "instance": {
    "id": "inst-456",
    "name": "Mi Instancia",
    "description": "Descripción de la instancia",
    "status": "disconnected",
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

#### `GET /instances/:id`
Obtiene detalles de una instancia específica.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "instance": {
    "id": "inst-456",
    "name": "Mi Instancia",
    "description": "Descripción de la instancia",
    "phone_number": "+1234567890",
    "status": "connected",
    "created_at": "2024-01-15T16:00:00Z",
    "last_seen": "2024-01-15T18:30:00Z",
    "stats": {
      "total_messages": 150,
      "total_contacts": 45,
      "messages_today": 12
    }
  }
}
```

#### `GET /instances/:id/qr`
Obtiene el código QR para conectar WhatsApp.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "message": "Escanea el código QR con WhatsApp"
}
```

#### `POST /instances/:id/connect`
Inicia el proceso de conexión de la instancia.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Proceso de conexión iniciado",
  "status": "connecting"
}
```

#### `GET /instances/:id/status`
Obtiene el estado actual de la instancia.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "status": "connected",
  "phone_number": "+1234567890",
  "last_seen": "2024-01-15T18:30:00Z",
  "battery_level": 85,
  "is_charging": false
}
```

#### `DELETE /instances/:id`
Elimina una instancia de WhatsApp.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Instancia eliminada exitosamente"
}
```

### 3. 🤖 Configuración de Bots

#### `GET /bot-config/:instanceId`
Obtiene la configuración del bot para una instancia.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "config": {
    "id": "config-123",
    "instance_id": "inst-456",
    "system_prompt": "Eres un asistente virtual amigable y profesional.",
    "max_tokens": 150,
    "temperature": 0.7,
    "auto_response": true,
    "business_hours": {
      "enabled": false,
      "start": "09:00",
      "end": "18:00",
      "timezone": "America/Mexico_City"
    },
    "created_at": "2024-01-15T16:00:00Z",
    "updated_at": "2024-01-15T16:00:00Z"
  }
}
```

#### `PUT /bot-config/:instanceId`
Actualiza la configuración del bot.

**Parámetros:**
```json
{
  "system_prompt": "Eres un asistente virtual especializado en ventas.",
  "max_tokens": 200,
  "temperature": 0.8,
  "auto_response": true,
  "business_hours": {
    "enabled": true,
    "start": "09:00",
    "end": "18:00",
    "timezone": "America/Mexico_City"
  }
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente",
  "config": {
    "id": "config-123",
    "instance_id": "inst-456",
    "system_prompt": "Eres un asistente virtual especializado en ventas.",
    "max_tokens": 200,
    "temperature": 0.8,
    "auto_response": true,
    "business_hours": {
      "enabled": true,
      "start": "09:00",
      "end": "18:00",
      "timezone": "America/Mexico_City"
    },
    "updated_at": "2024-01-15T16:30:00Z"
  }
}
```

#### `POST /bot-config/:instanceId/test`
Prueba la respuesta del bot con un mensaje.

**Parámetros:**
```json
{
  "message": "Hola, me interesa conocer más sobre sus productos"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Prueba ejecutada exitosamente",
  "test": {
    "input": "Hola, me interesa conocer más sobre sus productos",
    "response": "¡Hola! Me da mucho gusto saber de tu interés en nuestros productos. Estoy aquí para ayudarte con cualquier consulta que tengas. ¿Hay algún producto en particular que te interese?",
    "response_time": 1.2,
    "tokens_used": 45,
    "timestamp": "2024-01-15T16:45:00Z"
  }
}
```

#### `POST /bot-config/:instanceId/reset`
Resetea la configuración del bot a valores por defecto.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración reseteada exitosamente",
  "config": {
    "system_prompt": "Eres un asistente virtual amigable y profesional.",
    "max_tokens": 150,
    "temperature": 0.7,
    "auto_response": true,
    "business_hours": {
      "enabled": false
    }
  }
}
```

### 4. 👥 Contactos

#### `GET /contacts`
Lista todos los contactos de la empresa.

**Query Parameters:**
- `page`: Página (default: 1)
- `limit`: Límite por página (default: 20)
- `search`: Búsqueda por nombre o teléfono
- `tags`: Filtro por tags (separados por coma)
- `blocked`: Filtro por estado de bloqueo (true/false)
- `instance_id`: Filtro por instancia

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact-123",
        "name": "Juan Pérez",
        "phone": "+1234567890",
        "profile_pic_url": "https://example.com/profile.jpg",
        "tags": ["cliente", "vip"],
        "is_blocked": false,
        "notes": "Cliente frecuente, muy satisfecho con el servicio",
        "total_messages": 45,
        "last_message_at": "2024-01-15T15:30:00Z",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### `GET /contacts/:id`
Obtiene detalles de un contacto específico.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "contact": {
    "id": "contact-123",
    "name": "Juan Pérez",
    "phone": "+1234567890",
    "profile_pic_url": "https://example.com/profile.jpg",
    "tags": ["cliente", "vip"],
    "is_blocked": false,
    "notes": "Cliente frecuente, muy satisfecho con el servicio",
    "total_messages": 45,
    "last_message_at": "2024-01-15T15:30:00Z",
    "created_at": "2024-01-01T10:00:00Z",
    "instances": [
      {
        "id": "inst-456",
        "name": "Ventas Principal",
        "messages_count": 45
      }
    ]
  }
}
```

#### `PUT /contacts/:id`
Actualiza información de un contacto.

**Parámetros:**
```json
{
  "name": "Juan Pérez García",
  "tags": ["cliente", "vip", "preferente"],
  "notes": "Cliente VIP con historial de compras importantes."
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contacto actualizado exitosamente",
  "contact": {
    "id": "contact-123",
    "name": "Juan Pérez García",
    "tags": ["cliente", "vip", "preferente"],
    "notes": "Cliente VIP con historial de compras importantes.",
    "updated_at": "2024-01-15T16:45:00Z"
  }
}
```

#### `POST /contacts/:id/block`
Bloquea o desbloquea un contacto.

**Parámetros:**
```json
{
  "blocked": true,
  "reason": "Spam messages"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contacto bloqueado exitosamente",
  "contact": {
    "id": "contact-123",
    "is_blocked": true,
    "blocked_reason": "Spam messages",
    "blocked_at": "2024-01-15T16:50:00Z"
  }
}
```

#### `GET /contacts/:id/stats`
Obtiene estadísticas detalladas del contacto.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "stats": {
    "total_messages": 45,
    "messages_sent": 20,
    "messages_received": 25,
    "first_contact": "2024-01-01T10:00:00Z",
    "last_contact": "2024-01-15T15:30:00Z",
    "avg_response_time": 120,
    "conversation_count": 8,
    "instances_used": 1
  }
}
```

### 5. 💬 Conversaciones

#### `GET /conversations/:contactId`
Obtiene el historial de conversación con un contacto.

**Query Parameters:**
- `page`: Página (default: 1)
- `limit`: Límite por página (default: 50)
- `instance_id`: Filtro por instancia

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-123",
        "message": "Hola, ¿cómo puedo ayudarte?",
        "message_type": "text",
        "is_from_bot": true,
        "created_at": "2024-01-15T15:30:00Z",
        "read": true,
        "instance_id": "inst-456"
      },
      {
        "id": "msg-124",
        "message": "Me interesa el producto X",
        "message_type": "text",
        "is_from_bot": false,
        "created_at": "2024-01-15T15:32:00Z",
        "read": true,
        "instance_id": "inst-456"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "pages": 1
    }
  }
}
```

#### `POST /conversations/:contactId/send`
Envía un mensaje manual a un contacto.

**Parámetros:**
```json
{
  "message": "Gracias por tu interés. Te envío información sobre nuestros productos.",
  "instance_id": "inst-456"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "data": {
    "message_id": "msg-125",
    "sent_at": "2024-01-15T16:00:00Z",
    "status": "sent"
  }
}
```

#### `GET /conversations/:contactId/summary`
Obtiene un resumen de la conversación.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "summary": {
    "contact_name": "Juan Pérez",
    "total_messages": 45,
    "conversation_start": "2024-01-01T10:00:00Z",
    "last_activity": "2024-01-15T15:30:00Z",
    "key_topics": ["productos", "precios", "envío"],
    "sentiment": "positive",
    "status": "active"
  }
}
```

#### `GET /conversations/stats`
Obtiene estadísticas generales de conversaciones.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "total_conversations": 150,
    "active_conversations": 45,
    "total_messages": 2500,
    "avg_response_time": 120,
    "satisfaction_rate": 85.5,
    "top_topics": ["productos", "soporte", "precios"],
    "daily_stats": [
      {
        "date": "2024-01-15",
        "conversations": 12,
        "messages": 85
      }
    ]
  }
}
```

#### `GET /conversations/export`
Exporta conversaciones en formato CSV o JSON.

**Query Parameters:**
- `format`: Formato de exportación (csv/json)
- `date_from`: Fecha de inicio (YYYY-MM-DD)
- `date_to`: Fecha de fin (YYYY-MM-DD)
- `instance_id`: Filtro por instancia

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "export_url": "https://example.com/exports/conversations_20240115.csv",
    "total_records": 2500,
    "file_size": "2.5MB",
    "expires_at": "2024-01-16T16:00:00Z"
  }
}
```

### 6. 📊 Dashboard

#### `GET /dashboard/overview`
Obtiene métricas generales del dashboard.

**Query Parameters:**
- `date_from`: Fecha de inicio (YYYY-MM-DD)
- `date_to`: Fecha de fin (YYYY-MM-DD)
- `instance_id`: Filtro por instancia

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "Mi Empresa",
      "plan": "business",
      "memberSince": "2024-01-01T00:00:00Z"
    },
    "messages": {
      "total": 1500,
      "received": 900,
      "sent": 600,
      "today": 25,
      "week": 180,
      "month": 750,
      "usage": {
        "used": 750,
        "limit": 5000,
        "percentage": "15.0"
      }
    },
    "contacts": {
      "total": 120,
      "active": 115,
      "blocked": 5,
      "newToday": 2,
      "newWeek": 15,
      "activeWeek": 45
    },
    "instances": {
      "total": 2,
      "connected": 2,
      "disconnected": 0,
      "usage": {
        "used": 2,
        "limit": 3,
        "percentage": "66.7"
      }
    },
    "bot": {
      "responseRate": "85.2",
      "avgResponseTime": "2.5",
      "contactsServed": 98
    }
  }
}
```

#### `GET /dashboard/messages`
Obtiene estadísticas de mensajes por período.

**Query Parameters:**
- `period`: Período de agrupación (hour/day/week/month)
- `limit`: Límite de resultados
- `date_from`: Fecha de inicio
- `date_to`: Fecha de fin

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "period": "2024-01-15",
        "total_messages": 85,
        "received": 45,
        "sent": 40,
        "unique_contacts": 25,
        "bot_responses": 35
      }
    ],
    "messageTypes": {
      "text": 75,
      "image": 8,
      "audio": 2,
      "video": 0,
      "document": 0
    },
    "hourlyActivity": [
      {
        "hour": 9,
        "messages": 12,
        "contacts": 8
      }
    ]
  }
}
```

#### `GET /dashboard/contacts`
Obtiene los contactos más activos.

**Query Parameters:**
- `limit`: Límite de resultados (default: 10)
- `sort_by`: Ordenar por (messages/last_activity)
- `date_from`: Fecha de inicio
- `date_to`: Fecha de fin

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "topContacts": [
      {
        "id": "contact-123",
        "name": "Juan Pérez",
        "phone": "+1234567890",
        "total_messages": 45,
        "last_message_at": "2024-01-15T15:30:00Z",
        "tags": ["cliente", "vip"]
      }
    ],
    "newContacts": [
      {
        "id": "contact-456",
        "name": "María García",
        "phone": "+9876543210",
        "created_at": "2024-01-15T14:00:00Z"
      }
    ],
    "summary": {
      "totalContacts": 120,
      "newThisWeek": 15,
      "activeThisWeek": 45
    }
  }
}
```

#### `GET /dashboard/performance`
Obtiene métricas de rendimiento del bot.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "responseTimes": {
      "average": 2.5,
      "median": 2.1,
      "min": 0.8,
      "max": 8.2
    },
    "effectiveness": {
      "responseRate": 85.2,
      "resolutionRate": 78.5,
      "satisfactionRate": 4.2
    },
    "hourlyActivity": [
      {
        "hour": 9,
        "responses": 12,
        "avgTime": 2.1
      }
    ],
    "instancePerformance": [
      {
        "instance_id": "inst-456",
        "instance_name": "Ventas Principal",
        "responses": 150,
        "avgTime": 2.3
      }
    ]
  }
}
```

#### `GET /dashboard/export`
Exporta métricas del dashboard.

**Query Parameters:**
- `format`: Formato de exportación (json/csv)
- `include_details`: Incluir detalles (true/false)
- `date_from`: Fecha de inicio
- `date_to`: Fecha de fin

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "export_url": "https://example.com/exports/dashboard_20240115.json",
    "metrics": [
      {
        "type": "overview",
        "data": {...}
      },
      {
        "type": "messages",
        "data": {...}
      }
    ],
    "generated_at": "2024-01-15T16:00:00Z"
  }
}
```

## 🔧 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 201 | Creado exitosamente |
| 400 | Datos inválidos |
| 401 | No autorizado |
| 403 | Prohibido |
| 404 | No encontrado |
| 429 | Demasiadas peticiones |
| 500 | Error interno del servidor |

## 🚫 Manejo de Errores

Todas las respuestas de error siguen el siguiente formato:

```json
{
  "success": false,
  "message": "Descripción del error",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "Detalle específico del error"
  }
}
```

### Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| `INVALID_CREDENTIALS` | Credenciales inválidas |
| `TOKEN_EXPIRED` | Token JWT expirado |
| `INSUFFICIENT_PERMISSIONS` | Permisos insuficientes |
| `LIMIT_EXCEEDED` | Límite del plan excedido |
| `INSTANCE_NOT_FOUND` | Instancia no encontrada |
| `CONTACT_NOT_FOUND` | Contacto no encontrado |
| `VALIDATION_ERROR` | Error de validación de datos |
| `EXTERNAL_API_ERROR` | Error en API externa |

## 🔒 Límites y Restricciones

### Límites por Plan
| Plan | Instancias | Mensajes/mes | Contactos |
|------|------------|--------------|-----------|
| Starter | 1 | 1,000 | 500 |
| Business | 3 | 5,000 | 2,000 |
| Enterprise | Ilimitado | 25,000 | 10,000 |

### Rate Limiting
- **Límite general**: 100 requests por 15 minutos
- **Límite de login**: 5 intentos por 15 minutos
- **Límite de mensajes**: 50 mensajes por minuto por instancia

## 🌐 Webhooks (Opcional)

Para recibir notificaciones en tiempo real, puedes configurar webhooks:

### Eventos Disponibles
- `message.received` - Mensaje recibido
- `message.sent` - Mensaje enviado
- `instance.connected` - Instancia conectada
- `instance.disconnected` - Instancia desconectada
- `contact.created` - Contacto creado
- `contact.updated` - Contacto actualizado

### Formato de Webhook
```json
{
  "event": "message.received",
  "timestamp": "2024-01-15T16:00:00Z",
  "data": {
    "instance_id": "inst-456",
    "contact_id": "contact-123",
    "message": "Hola, necesito ayuda"
  }
}
```

## 📈 Paginación

Todos los endpoints que devuelven listas utilizan paginación:

### Parámetros de Paginación
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20, máximo: 100)

### Formato de Respuesta
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

## 🔍 Búsqueda y Filtros

### Búsqueda de Texto
Utiliza el parámetro `search` para buscar en campos de texto.

### Filtros Disponibles
- `date_from` / `date_to`: Filtros de fecha
- `instance_id`: Filtrar por instancia
- `tags`: Filtrar por tags (separados por coma)
- `status`: Filtrar por estado

### Ejemplo de Búsqueda
```
GET /api/contacts?search=Juan&tags=cliente,vip&date_from=2024-01-01
```

## 📊 Formato de Fechas

Todas las fechas utilizan formato ISO 8601:
- `2024-01-15T16:00:00Z` (UTC)
- `2024-01-15T16:00:00-05:00` (con zona horaria)

## 🔐 Autenticación JWT

### Estructura del Token
```javascript
{
  "sub": "user-123",
  "email": "admin@miempresa.com",
  "company_id": "company-123",
  "role": "admin",
  "iat": 1642262400,
  "exp": 1642348800
}
```

### Renovación de Token
El token expira cada 24 horas. Utiliza `/auth/refresh` para obtener un nuevo token.

---

**Versión de la documentación**: 1.0.0
**Última actualización**: 2024-01-15
**Soporte**: [Contactar soporte](mailto:support@whatsapp-bot.com) 