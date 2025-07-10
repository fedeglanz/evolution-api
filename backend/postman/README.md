# 📄 Colecciones de Postman - WhatsApp Bot Platform API

## 🔄 **Actualización Importante**

Se han creado nuevas colecciones de Postman que **coinciden exactamente** con los esquemas de validación del backend. La colección original tenía campos incorrectos que causaban errores de validación.

## 📁 **Archivos Disponibles**

### 1. **Colección Principal Actualizada**
- **`WhatsApp-Bot-API-Updated.postman_collection.json`** - Sección de autenticación corregida
- **`WhatsApp-Bot-API-Complete.postman_collection.json`** - Colección completa con todos los endpoints

### 2. **Colecciones por Módulo**
- **`WhatsApp-Bot-API-Instances.json`** - Gestión de instancias WhatsApp
- **`WhatsApp-Bot-API-BotConfig.json`** - Configuración de bots ChatGPT
- **`WhatsApp-Bot-API-Messages.json`** - Envío y gestión de mensajes

### 3. **Colección Original (Deprecada)**
- **`WhatsApp-Bot-API.postman_collection.json`** - ⚠️ **No usar** - Contiene campos incorrectos

## ✅ **Campos Corregidos**

### **Autenticación - Registro**
```json
// ❌ INCORRECTO (colección original)
{
  "name": "Mi Empresa",
  "email": "admin@miempresa.com", 
  "password": "MiPassword123!",
  "plan": "business"
}

// ✅ CORRECTO (nueva colección)
{
  "email": "admin@miempresa.com",
  "password": "MiPassword123!",
  "full_name": "Juan Pérez",
  "company_name": "Mi Empresa SRL",
  "phone": "+5491234567890"
}
```

### **Autenticación - Cambiar Contraseña**
```json
// ❌ INCORRECTO (colección original)
{
  "currentPassword": "MiPassword123!",
  "newPassword": "NuevaPassword123!"
}

// ✅ CORRECTO (nueva colección)
{
  "current_password": "MiPassword123!",
  "new_password": "NuevaPassword123!"
}
```

### **Instancias - Crear**
```json
// ✅ CORRECTO (validado)
{
  "name": "InstanciaDemo",
  "description": "Instancia de prueba para demostraciones",
  "webhook_url": "https://mi-webhook.com/whatsapp",
  "webhook_events": ["message", "status", "connection"]
}
```

### **Bot Config - Crear**
```json
// ✅ CORRECTO (validado)
{
  "name": "Bot Atención al Cliente",
  "description": "Bot especializado en atención al cliente",
  "system_prompt": "Eres un asistente virtual...",
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000,
  "enabled": true
}
```

### **Mensajes - Enviar**
```json
// ✅ CORRECTO (validado)
{
  "to": "5491234567890",
  "message": "Hola, este es un mensaje de prueba...",
  "type": "text"
}
```

## 🚀 **Cómo Usar las Colecciones**

### **1. Importar en Postman**
1. Abre Postman
2. Click en **Import**
3. Selecciona **`WhatsApp-Bot-API-Complete.postman_collection.json`**
4. La colección se importará con todos los endpoints

### **2. Configurar Variables de Entorno**
```bash
# Variables necesarias:
base_url: http://localhost:3000/api
auth_token: (se auto-completa al hacer login)
instance_id: (se auto-completa al crear instancia)
contact_id: (se auto-completa según necesidad)
```

### **3. Flujo de Testing Recomendado**

#### **Paso 1: Autenticación**
1. **Registro** → Crear nueva empresa y usuario
2. **Login** → Obtener token JWT (se guarda automáticamente)
3. **Usuario Actual** → Verificar datos del usuario

#### **Paso 2: Instancias**
1. **Crear Instancia** → Nueva instancia WhatsApp
2. **Obtener QR** → Código QR para conexión
3. **Conectar** → Establecer conexión con WhatsApp
4. **Estado** → Verificar estado de conexión

#### **Paso 3: Configuración de Bot**
1. **Crear Config** → Configurar bot ChatGPT
2. **Probar Bot** → Test de funcionamiento
3. **Actualizar** → Modificar configuración según necesidad

#### **Paso 4: Operaciones**
1. **Enviar Mensaje** → Prueba de envío manual
2. **Listar Contactos** → Ver contactos existentes
3. **Ver Conversaciones** → Historial de chats
4. **Dashboard** → Métricas y estadísticas

## 🧪 **Tests Automáticos Incluidos**

Cada endpoint incluye tests automáticos que verifican:
- ✅ Status code correcto
- ✅ Estructura de respuesta
- ✅ Campos requeridos presentes
- ✅ Tipos de datos correctos
- ✅ Auto-guardado de variables (tokens, IDs)

## 📊 **Endpoints Incluidos**

### **🔐 Autenticación (6 endpoints)**
- POST `/auth/register` - Registro de empresa
- POST `/auth/login` - Inicio de sesión
- GET `/auth/me` - Usuario actual
- POST `/auth/change-password` - Cambiar contraseña
- POST `/auth/refresh` - Renovar token
- POST `/auth/logout` - Cerrar sesión

### **📱 Instancias WhatsApp (9 endpoints)**
- POST `/instances` - Crear instancia
- GET `/instances` - Listar instancias
- GET `/instances/:id` - Obtener instancia
- PUT `/instances/:id` - Actualizar instancia
- GET `/instances/:id/qr` - Obtener código QR
- POST `/instances/:id/connect` - Conectar
- POST `/instances/:id/disconnect` - Desconectar
- GET `/instances/:id/status` - Estado
- DELETE `/instances/:id` - Eliminar

### **🤖 Configuración de Bots (5 endpoints)**
- POST `/instances/:id/bot-config` - Crear config
- GET `/instances/:id/bot-config` - Obtener config
- PUT `/instances/:id/bot-config` - Actualizar config
- POST `/instances/:id/bot-config/test` - Probar bot
- POST `/instances/:id/bot-config/reset` - Resetear

### **💬 Mensajes (2 endpoints)**
- POST `/instances/:id/messages/send` - Enviar mensaje
- GET `/instances/:id/messages` - Historial

### **👥 Contactos (6 endpoints)**
- GET `/contacts` - Listar contactos
- GET `/contacts/:id` - Obtener contacto
- PUT `/contacts/:id` - Actualizar contacto
- POST `/contacts/:id/block` - Bloquear
- POST `/contacts/:id/unblock` - Desbloquear
- GET `/contacts/stats` - Estadísticas

### **🗨️ Conversaciones (3 endpoints)**
- GET `/conversations` - Listar conversaciones
- GET `/conversations/:id` - Obtener conversación
- POST `/conversations/:id/export` - Exportar

### **📊 Dashboard (5 endpoints)**
- GET `/dashboard/overview` - Overview general
- GET `/dashboard/messages/stats` - Estadísticas mensajes
- GET `/dashboard/contacts/active` - Contactos activos
- GET `/dashboard/instances/performance` - Rendimiento
- POST `/dashboard/export` - Exportar métricas

## ⚠️ **Importante**

1. **Usar solo las colecciones nuevas** - Las antiguas tienen campos incorrectos
2. **Validar tokens** - Algunos endpoints requieren autenticación
3. **Orden de ejecución** - Seguir el flujo recomendado para mejores resultados
4. **Verificar respuestas** - Los tests automáticos mostrarán si algo falla

## 🛠️ **Solución de Problemas**

### **Error: "El nombre es requerido"**
- **Causa**: Usando colección antigua con campos incorrectos
- **Solución**: Usar `WhatsApp-Bot-API-Complete.postman_collection.json`

### **Error: "Token inválido"**
- **Causa**: Token JWT expirado
- **Solución**: Ejecutar endpoint `/auth/login` nuevamente

### **Error: "Instance not found"**
- **Causa**: ID de instancia incorrecto
- **Solución**: Verificar que `{{instance_id}}` esté configurado correctamente

¡Listo para hacer testing completo del backend! 🚀 