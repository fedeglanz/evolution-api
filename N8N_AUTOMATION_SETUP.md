# 🔄 N8N Automation Setup Guide

## 📋 Configuración Automática de Workflows

Esta guía explica cómo configurar la **automatización completa** donde cada instancia de WhatsApp crea automáticamente su workflow en N8N.

---

## 🔧 Variables de Entorno Requeridas

Agregar al archivo `.env` del backend:

```bash
# N8N Integration Configuration
N8N_BASE_URL=https://n8n.tu-dominio.com
N8N_USERNAME=admin
N8N_PASSWORD=your-n8n-password
N8N_BACKEND_API_KEY=n8n-backend-integration-key

# Evolution API Configuration  
EVOLUTION_API_URL=https://evolution-api.tu-dominio.com
EVOLUTION_API_KEY=evolution-api-key-super-secret

# Backend URL (para que N8N llame de vuelta)
BACKEND_URL=https://whatsapp-bot-backend.onrender.com
```

---

## 🚀 Setup N8N

### 1. **Habilitar API en N8N**

En tu instancia de N8N, agregar al `docker-compose.yml`:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    environment:
      # ... otras variables
      - N8N_API_ENABLED=true
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-n8n-password
```

### 2. **Configurar Credenciales N8N**

En N8N, crear estas credenciales:

#### **Backend API Auth** (HTTP Header Auth)
- **Name:** `Backend API Auth`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer n8n-backend-integration-key`

#### **Evolution API Auth** (HTTP Header Auth)  
- **Name:** `Evolution API Auth`
- **Header Name:** `apikey`
- **Header Value:** `evolution-api-key-super-secret`

---

## 🎯 Flujo Automático

### **Lo que pasa ahora:**

1. **Usuario crea instancia** en el frontend (solo nombre/descripción)
2. **Backend automáticamente:**
   - ✅ Crea workflow en N8N via API
   - ✅ Obtiene URL del webhook única
   - ✅ Configura Evolution API con esa URL
   - ✅ Guarda todo en base de datos
3. **Frontend muestra:**
   - ✅ URL del webhook generada
   - ✅ Info del workflow N8N
   - ✅ Estado de configuración

### **Diferencias vs. anterior:**

❌ **ANTES:**
- Usuario ingresaba URL webhook manualmente
- No se creaba workflow automáticamente
- No se podía editar después

✅ **AHORA:**
- URL webhook generada automáticamente
- Workflow N8N creado via API
- Se puede editar/regenerar después

---

## 🛠️ Endpoints Nuevos

### **Actualizar Webhook URL**
```http
PUT /api/instances/:id/webhook
Authorization: Bearer {token}

{
  "webhook_url": "https://n8n.tu-dominio.com/webhook/custom-path"
}
```

### **Regenerar Workflow N8N**
```http
POST /api/instances/:id/regenerate-workflow
Authorization: Bearer {token}
```

---

## 📊 Base de Datos

### **Migración Requerida**

Ejecutar migración para agregar campo `n8n_workflow_id`:

```sql
-- migrations/010_add_n8n_workflow_id.sql
ALTER TABLE whatsapp_bot.whatsapp_instances 
ADD COLUMN n8n_workflow_id VARCHAR(100);

CREATE INDEX idx_instances_n8n_workflow_id 
ON whatsapp_bot.whatsapp_instances(n8n_workflow_id);
```

---

## 🔍 Debugging

### **Test N8N Connection**
```javascript
// En el backend, test de conectividad
const n8nService = require('./services/n8nService');

async function testN8NConnection() {
  const isConnected = await n8nService.testConnection();
  console.log('N8N Connected:', isConnected);
}
```

### **Ver Workflows Creados**
```http
GET https://n8n.tu-dominio.com/api/v1/workflows
Authorization: Basic base64(admin:password)
```

### **Logs a Revisar**
```bash
# Backend logs
[N8N Service] Initialized with base URL: https://n8n.tu-dominio.com
[N8N] Creating workflow for instance: Mi Bot
[N8N API] Workflow created with ID: abc123
[Controller] N8N workflow created successfully

# Si hay errores
[N8N API] Error creating workflow: 401 Unauthorized
[Controller] N8N workflow creation failed, using fallback URL
```

---

## ⚠️ Fallback Behavior

Si N8N API falla, el sistema:

1. **Genera URL manual** del webhook
2. **Continúa con Evolution API** setup
3. **Logs error** pero no falla toda la creación
4. **Permite regenerar** workflow después

---

## 🎯 Testing

### **1. Crear Instancia**
- Ir al frontend
- Crear nueva instancia (solo nombre)
- Verificar que se muestra URL webhook automática

### **2. Verificar N8N**
- Ir a N8N dashboard
- Ver que se creó workflow automáticamente
- Verificar que está activo

### **3. Test Webhook**
- Enviar mensaje de prueba al WhatsApp
- Verificar logs en N8N
- Confirmar respuesta del bot

---

## 🔧 Troubleshooting

### **❌ N8N API no responde**
```bash
# Verificar URL y credenciales
curl -u admin:password https://n8n.tu-dominio.com/api/v1/workflows
```

### **❌ Workflow no se crea**
- Verificar que N8N API está habilitada
- Revisar credenciales de autenticación
- Confirmar que backend puede acceder a N8N

### **❌ Webhook no funciona**
- Verificar que workflow está activo
- Confirmar URL del webhook es correcta
- Revisar que Evolution API puede acceder a N8N

---

## 🚀 Próximos Pasos

1. **Configurar variables de entorno**
2. **Ejecutar migración de BD**
3. **Configurar credenciales N8N**
4. **Testear creación de instancia**
5. **Verificar flujo completo**

---

**📝 Documento actualizado:** Enero 2025  
**🔧 Status:** Implementación completa lista para testing 