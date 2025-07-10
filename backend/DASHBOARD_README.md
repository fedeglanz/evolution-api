# Dashboard API - Documentación Completa

## Descripción General

El Dashboard API proporciona métricas avanzadas y análisis para empresas de la plataforma SaaS de bots de WhatsApp. Incluye estadísticas de mensajes, contactos, rendimiento de bots y exportación de datos.

## Archivos Creados

### 1. `src/controllers/dashboardController.js`
Controlador principal con 5 métodos:
- `getOverview()` - Métricas generales
- `getMessageStats()` - Estadísticas de mensajes por período
- `getTopContacts()` - Contactos más activos
- `getBotPerformance()` - Rendimiento del bot
- `exportDashboard()` - Exportación de métricas

### 2. `src/routes/dashboard.js`
Rutas protegidas con autenticación:
- `GET /api/dashboard/overview`
- `GET /api/dashboard/messages`
- `GET /api/dashboard/contacts`
- `GET /api/dashboard/performance`
- `GET /api/dashboard/export`

### 3. `src/utils/dashboardCache.js`
Sistema de cache con Redis para optimizar rendimiento:
- Cache automático por tipo de métrica
- TTL configurable por endpoint
- Invalidación inteligente
- Precalculo de métricas comunes

### 4. `test-dashboard.js`
Script de pruebas completo para todos los endpoints

## Endpoints Detallados

### 1. GET /api/dashboard/overview
**Métricas generales del dashboard**

**Parámetros de consulta:**
- `date_from` (opcional): Fecha desde (YYYY-MM-DD)
- `date_to` (opcional): Fecha hasta (YYYY-MM-DD)
- `instance_id` (opcional): Filtrar por instancia específica

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "Empresa XYZ",
      "plan": "premium",
      "memberSince": "2024-01-15T10:00:00Z"
    },
    "messages": {
      "total": 15000,
      "received": 9000,
      "sent": 6000,
      "today": 150,
      "week": 1200,
      "month": 5000,
      "usage": {
        "used": 5000,
        "limit": 10000,
        "percentage": "50.0"
      }
    },
    "contacts": {
      "total": 500,
      "active": 480,
      "blocked": 20,
      "newToday": 5,
      "newWeek": 35,
      "activeWeek": 200
    },
    "instances": {
      "total": 3,
      "connected": 2,
      "disconnected": 1,
      "connecting": 0,
      "recentlyActive": 2,
      "usage": {
        "used": 3,
        "limit": 5,
        "percentage": "60.0"
      }
    },
    "bot": {
      "responseRate": "85.2",
      "avgResponseTime": "2.5",
      "contactsServed": 300
    }
  }
}
```

### 2. GET /api/dashboard/messages
**Estadísticas de mensajes por período**

**Parámetros de consulta:**
- `period` (opcional): hour, day, week, month (default: day)
- `limit` (opcional): Límite de registros (default: 30)
- `date_from`, `date_to`, `instance_id` (opcionales)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "period": "day",
    "stats": [
      {
        "period": "2024-01-15T00:00:00Z",
        "totalMessages": 150,
        "messagesReceived": 90,
        "messagesSent": 60,
        "messageTypes": {
          "text": 120,
          "image": 20,
          "audio": 5,
          "video": 3,
          "document": 2
        },
        "uniqueContacts": 45
      }
    ],
    "hourlyActivity": [
      {
        "hour": 9,
        "messagesCount": 25,
        "uniqueContacts": 12
      }
    ],
    "weeklyActivity": [
      {
        "dayOfWeek": 1,
        "dayName": "Monday",
        "messagesCount": 200,
        "uniqueContacts": 80
      }
    ]
  }
}
```

### 3. GET /api/dashboard/contacts
**Contactos más activos**

**Parámetros de consulta:**
- `limit` (opcional): Límite de contactos (default: 10)
- `sort_by` (opcional): messages, recent_activity, bot_interactions
- `include_blocked` (opcional): true/false (default: false)
- `date_from`, `date_to`, `instance_id` (opcionales)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "topContacts": [
      {
        "id": "contact-123",
        "name": "Juan Pérez",
        "phone": "+1234567890",
        "profilePicUrl": "https://...",
        "tags": ["cliente", "vip"],
        "isBlocked": false,
        "lastMessageAt": "2024-01-15T10:00:00Z",
        "stats": {
          "totalMessages": 45,
          "messagesFromContact": 25,
          "botMessages": 20,
          "instancesUsed": 2,
          "activeDays": 10,
          "firstInteraction": "2024-01-01T10:00:00Z",
          "lastInteraction": "2024-01-15T10:00:00Z"
        }
      }
    ],
    "newContacts": [...],
    "contactsByInstance": [...]
  }
}
```

### 4. GET /api/dashboard/performance
**Métricas de rendimiento del bot**

**Parámetros de consulta:**
- `date_from`, `date_to`, `instance_id` (opcionales)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "responseTimes": {
      "average": "2.5",
      "median": "2.0",
      "min": "0.5",
      "max": "15.0",
      "totalResponses": 1500
    },
    "effectiveness": {
      "responseRate": 85.2,
      "contactCoverage": 90.5,
      "botMessages": 3000,
      "userMessages": 3500,
      "uniqueContactsServed": 400,
      "contactsRespondedTo": 362,
      "activeDays": 30
    },
    "hourlyActivity": [...],
    "botConfigurations": [...]
  }
}
```

### 5. GET /api/dashboard/export
**Exportar métricas del dashboard**

**Parámetros de consulta:**
- `format` (opcional): json, csv (default: json)
- `include_details` (opcional): true/false (default: false)
- `date_from`, `date_to`, `instance_id` (opcionales)

**Respuesta CSV:**
```csv
Date,Total Messages,Messages Received,Messages Sent,Unique Contacts,Instances Used
2024-01-15,150,90,60,45,2
2024-01-14,145,85,60,42,2
```

**Respuesta JSON:**
```json
{
  "success": true,
  "data": {
    "metrics": [...],
    "exportedAt": "2024-01-15T10:00:00Z",
    "filters": {...},
    "topContacts": [...] // si include_details=true
  }
}
```

## Configuración de Cache

### TTL por Endpoint
- **overview**: 5 minutos
- **messages**: 10 minutos
- **contacts**: 15 minutos
- **performance**: 30 minutos
- **export**: 1 minuto

### Configuración Redis
```javascript
// config.js
REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
```

### Uso del Cache
```javascript
// En las rutas
const dashboardCache = require('../utils/dashboardCache');

router.get('/overview', 
  dashboardCache.cacheMiddleware('overview', 300),
  dashboardController.getOverview
);
```

## Optimizaciones Implementadas

### 1. Queries Optimizadas
- Agregaciones eficientes con `COUNT`, `SUM`, `AVG`
- Filtros por índices (company_id, created_at)
- Uso de `CASE WHEN` para múltiples métricas en una query
- Window functions para cálculos avanzados

### 2. Ejecución Paralela
- Múltiples queries ejecutándose simultáneamente
- `Promise.all()` para operaciones concurrentes
- Reducción del tiempo de respuesta

### 3. Paginación y Límites
- Límites configurables por endpoint
- Máximo 1000 registros para exportación
- Prevención de queries costosas

### 4. Cache Inteligente
- Invalidación automática por patrón
- Precalculo de métricas comunes
- TTL específico por tipo de dato

## Seguridad

### Autenticación
- JWT obligatorio en todas las rutas
- Middleware `authenticate` en router

### Aislamiento de Datos
- Filtro automático por `company_id`
- Prevención de acceso a datos de otras empresas
- Validación de propiedad de instancias

### Validación de Parámetros
- Sanitización de inputs
- Validación de formatos de fecha
- Límites en parámetros de consulta

## Pruebas

### Ejecutar Pruebas
```bash
node test-dashboard.js
```

### Configurar Pruebas
```javascript
// En test-dashboard.js
const TEST_CONFIG = {
  email: 'test@example.com',
  password: 'password123'
};
```

### Cobertura de Pruebas
- ✅ Autenticación
- ✅ Todos los endpoints
- ✅ Filtros de fecha
- ✅ Diferentes períodos
- ✅ Exportación JSON/CSV
- ✅ Manejo de errores

## Métricas Monitoreadas

### Mensajes
- Total enviados/recibidos
- Distribución por tipo (text, image, audio, video, document)
- Actividad por hora/día
- Contactos únicos

### Contactos
- Nuevos vs activos
- Bloqueados vs activos
- Actividad por instancia
- Interacciones por contacto

### Bot
- Tiempos de respuesta (promedio, mediana, min, max)
- Tasa de respuesta
- Cobertura de contactos
- Configuraciones por instancia

### Empresa
- Uso vs límites del plan
- Instancias conectadas
- Actividad reciente

## Recomendaciones para Producción

### 1. Base de Datos
```sql
-- Índices recomendados
CREATE INDEX idx_conversations_company_created ON conversations(company_id, created_at);
CREATE INDEX idx_conversations_contact_created ON conversations(contact_id, created_at);
CREATE INDEX idx_contacts_company_created ON contacts(company_id, created_at);
CREATE INDEX idx_contacts_last_message ON contacts(company_id, last_message_at);
```

### 2. Vistas Materializadas
```sql
-- Para métricas complejas
CREATE MATERIALIZED VIEW daily_message_stats AS
SELECT 
  company_id,
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(DISTINCT contact_id) as unique_contacts
FROM conversations
GROUP BY company_id, DATE(created_at);

-- Actualizar cada hora
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW daily_message_stats;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('refresh-daily-stats', '0 * * * *', 'SELECT refresh_daily_stats();');
```

### 3. Monitoring y Alertas
```javascript
// Métricas críticas para monitorear
const CRITICAL_METRICS = {
  responseTime: 5000, // ms
  errorRate: 0.05,    // 5%
  cacheHitRate: 0.8,  // 80%
  queryTime: 1000     // ms
};
```

### 4. Escalabilidad
- Considera sharding por empresa para grandes volúmenes
- Implementa read replicas para queries de solo lectura
- Usa connection pooling para la base de datos
- Configura auto-scaling para picos de tráfico

### 5. Backup y Recuperación
- Backup automático de métricas históricas
- Retención configurable por tipo de dato
- Exportación periódica a almacenamiento externo

## Límites y Consideraciones

### Límites de API
- Máximo 1000 registros por exportación
- Cache TTL mínimo: 1 minuto
- Queries timeout: 30 segundos

### Rendimiento
- Queries optimizadas para <1 segundo
- Cache hit rate objetivo: >80%
- Memoria Redis recomendada: 512MB+

### Almacenamiento
- Retención de métricas: 2 años
- Agregaciones diarias: permanente
- Datos crudos: 90 días

## Soporte y Mantenimiento

### Logs
- Errores de queries lentas
- Cache hits/misses
- Métricas de uso por empresa

### Debugging
```javascript
// Habilitar logs detallados
process.env.DEBUG_DASHBOARD = 'true';
```

### Actualizaciones
- Versionar cambios en esquema
- Migrar métricas existentes
- Backward compatibility 