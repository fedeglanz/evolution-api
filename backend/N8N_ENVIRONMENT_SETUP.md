# Variables de Entorno N8N - Configuración Requerida

## Variables N8N Críticas

Para que funcione la automatización completa de workflows N8N, necesitas configurar estas variables de entorno:

### Variables Básicas N8N
```bash
# URL base de tu instancia N8N (sin slash final)
N8N_BASE_URL=https://n8n.tu-dominio.com

# Credenciales de usuario N8N
N8N_USERNAME=admin
N8N_PASSWORD=tu_n8n_password

# ⚠️ CRÍTICO: API Key de N8N (requerida para la API)
N8N_API_KEY=tu_n8n_api_key
```

### Variables de Integración
```bash
# Key para autenticar requests del backend al N8N
N8N_BACKEND_API_KEY=n8n-backend-integration-key

# URL del backend para que N8N llame de vuelta
BACKEND_URL=https://tu-backend.onrender.com

# Key de Evolution API para enviar mensajes
EVOLUTION_API_KEY=tu_evolution_api_key
```

## Cómo Obtener N8N_API_KEY

1. **Accede a tu instancia N8N**
2. **Ve a Settings → API**
3. **Genera una nueva API Key**
4. **Copia la key y agrégala a tu .env**

## Error Sin API Key

Si no configuras `N8N_API_KEY`, verás este error:
```
[N8N API] Error creating workflow: {
  status: 401,
  statusText: 'Unauthorized',
  data: { message: "'X-N8N-API-KEY' header required" }
}
```

## Verificación de Configuración

El sistema mostrará estos logs al iniciar:
```
[N8N Service] Initialized with base URL: https://n8n.tu-dominio.com
[N8N Service] API Key configured: Yes
```

Si ve "API Key configured: No", falta la configuración.

## Configurar en Render.com

1. Ve a tu aplicación en Render
2. Ve a Environment
3. Agrega las variables una por una
4. Deploy nuevamente

## Configurar N8N Credentials

En N8N, configura estas credenciales predefinidas:

### Backend API Auth (HTTP Header Auth)
- **Name**: Backend API Auth
- **Header Name**: Authorization
- **Header Value**: Bearer n8n-backend-integration-key

### Evolution API Auth (HTTP Header Auth)  
- **Name**: Evolution API Auth
- **Header Name**: apikey
- **Header Value**: tu_evolution_api_key

## Test de Conectividad

El sistema incluye un endpoint de prueba:
```bash
curl -X GET https://tu-backend.com/api/n8n/test
```

Debería devolver:
```json
{
  "success": true,
  "message": "N8N connection successful",
  "workflows": 5
}
``` 