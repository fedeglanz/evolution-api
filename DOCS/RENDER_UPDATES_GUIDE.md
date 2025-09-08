# 🚀 Render Deployment & Updates Management Guide

## 📋 Overview

Este proyecto usa **Render Blueprint** (`render.yaml`) que automáticamente despliega **4 servicios independientes** desde el mismo repositorio GitHub. Cada servicio tiene diferentes Dockerfiles y configuraciones.

## 🏗️ Arquitectura de Deployment

### 📊 **Servicios Desplegados**

| Servicio | Dockerfile | URL | Función |
|----------|------------|-----|---------|
| **evolution-api** | `./Dockerfile` | `https://evolution-api-jz3j.onrender.com` | WhatsApp Gateway (Evolution API v2.2.2) |
| **n8n-automation** | `./Dockerfile.n8n` | `https://n8n-automation-bhdl.onrender.com` | Workflow Automation Engine |
| **whatsapp-bot-backend** | `./backend/Dockerfile.backend` | `https://whatsapp-bot-backend-fnte.onrender.com` | Custom Backend (Node.js/RAG) |
| **evolution-postgres** | Database | (Internal) | Shared PostgreSQL Database |
| **evolution-redis** | Cache | (Internal) | Shared Redis Cache |

### 🔄 **Flujo de Datos**
```
WhatsApp Users → Evolution API → N8N Automation → Custom Backend → PostgreSQL
                      ↓              ↓                ↓
                   Redis Cache ←  Webhooks  ←   RAG System
```

---

## 📂 Dockerfiles Analysis

### 1. **Evolution API** (`./Dockerfile`)
```dockerfile
# Base: Evolution API v2.2.2 (Node.js/TypeScript)
FROM node:18-alpine
WORKDIR /evolution
# Instala dependencias y construye Evolution API oficial
```
- **Proyecto**: [EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api)
- **Versión**: v2.2.2 (definida en package.json)
- **Función**: Gateway WhatsApp, manejo de mensajes, QR codes
- **Puerto**: 8080

### 2. **N8N Automation** (`./Dockerfile.n8n`) 
```dockerfile
# Base: N8N Official
FROM n8nio/n8n:latest
# Configuración custom para workflows
```
- **Proyecto**: [n8n-io/n8n](https://github.com/n8n-io/n8n)
- **Versión**: Latest (always updates)
- **Función**: Workflow automation, webhook processing
- **Puerto**: 5678

### 3. **Custom Backend** (`./backend/Dockerfile.backend`)
```dockerfile
# Base: Node.js para nuestro backend custom
FROM node:18-alpine
WORKDIR /app
COPY backend/ .
# Build custom backend con RAG/OpenAI
```
- **Proyecto**: Nuestro código custom (este repo)
- **Función**: RAG system, billing, auth, management
- **Puerto**: 3000

---

## 🔄 Update Strategies

### 🎯 **1. Evolution API Updates**

#### **Método Actual** (Semi-automático)
```bash
# El Dockerfile usa directamente el repo oficial
FROM node:18-alpine
WORKDIR /evolution
RUN git clone https://github.com/EvolutionAPI/evolution-api.git . && \
    git checkout v2.2.2
```

#### **📋 Plan de Actualización**
1. **Monitor releases**: [Evolution API Releases](https://github.com/EvolutionAPI/evolution-api/releases)
2. **Test en development**: Crear branch con nueva versión
3. **Update Dockerfile**: Cambiar tag de versión
4. **Deploy a staging**: Probar con datos no críticos
5. **Production deploy**: Con backup completo

#### **🔧 Automated Update Process**
```bash
# Script para actualizar Evolution API
#!/bin/bash
CURRENT_VERSION="v2.2.2"
LATEST_VERSION=$(curl -s https://api.github.com/repos/EvolutionAPI/evolution-api/releases/latest | jq -r '.tag_name')

if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
    echo "New version available: $LATEST_VERSION"
    # Update Dockerfile
    sed -i "s/$CURRENT_VERSION/$LATEST_VERSION/g" Dockerfile
    # Commit and deploy
    git add Dockerfile
    git commit -m "Update Evolution API to $LATEST_VERSION"
    git push origin main
fi
```

### 🎯 **2. N8N Updates**

#### **Método Actual** (Automático)
```dockerfile
FROM n8nio/n8n:latest  # Always latest
```

#### **⚠️ Problema**: Actualizaciones automáticas pueden romper workflows
#### **✅ Solución**: Version pinning
```dockerfile
FROM n8nio/n8n:1.19.4  # Pin specific version
```

#### **📋 Plan de Actualización**
1. **Monitor N8N releases**: [N8N Releases](https://github.com/n8n-io/n8n/releases)
2. **Backup workflows**: Export workflows before update
3. **Test compatibility**: Verify custom nodes work
4. **Staged deployment**: Update with version pin

### 🎯 **3. Custom Backend Updates**

#### **Método Actual** (Manual)
- Desarrollamos código → Git push → Render redeploy

#### **✅ Ya está optimizado** para nuestro workflow
- Hot fixes via git push
- Migrations automáticas
- Environment variables separadas

---

## 🛠️ Recommended Update Strategy

### 📅 **Update Schedule**

| Component | Frequency | Method | Risk Level |
|-----------|-----------|---------|------------|
| **Evolution API** | Monthly | Planned | 🟡 Medium |
| **N8N** | Bi-weekly | Staged | 🟠 High |
| **Custom Backend** | As needed | Continuous | 🟢 Low |
| **Dependencies** | Weekly | Automated | 🟢 Low |

### 🔒 **Pre-Update Checklist**

#### **Evolution API Updates**
```bash
# 1. Check compatibility
curl -s https://evolution-api-jz3j.onrender.com/manager/findInstances
# 2. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
# 3. Export current configuration
curl -H "apikey: $EVOLUTION_API_KEY" https://evolution-api-jz3j.onrender.com/instance/export
```

#### **N8N Updates**
```bash
# 1. Export all workflows
n8n export:workflow --all --output=./backup/workflows/
# 2. Export credentials
n8n export:credentials --all --output=./backup/credentials/
# 3. Test webhook endpoints
curl -X POST https://n8n-automation-bhdl.onrender.com/webhook/test
```

### 📋 **Update Process**

#### **1. Create Update Branch**
```bash
git checkout -b update/evolution-api-v2.3.0
```

#### **2. Update Dockerfiles**
```bash
# Update Evolution API version
sed -i 's/v2.2.2/v2.3.0/g' Dockerfile

# Update N8N version (if needed)
sed -i 's/n8n:latest/n8n:1.20.0/g' Dockerfile.n8n
```

#### **3. Test Locally** (Optional - Docker required)
```bash
docker-compose -f docker-compose.dev.yaml up --build
```

#### **4. Deploy to Production**
```bash
git add .
git commit -m "Update: Evolution API v2.3.0, N8N v1.20.0"
git push origin update/evolution-api-v2.3.0

# Merge to main after testing
git checkout main
git merge update/evolution-api-v2.3.0
git push origin main
```

#### **5. Monitor Deployment**
```bash
# Check Evolution API health
curl https://evolution-api-jz3j.onrender.com/

# Check N8N health  
curl https://n8n-automation-bhdl.onrender.com/rest/login

# Check Custom Backend health
curl https://whatsapp-bot-backend-fnte.onrender.com/api/health
```

---

## 🚨 Emergency Procedures

### 💥 **Rollback Process**

#### **Git-based Rollback**
```bash
# Find last working commit
git log --oneline -10

# Create rollback branch
git checkout -b emergency/rollback-to-stable
git reset --hard <last_working_commit>
git push origin emergency/rollback-to-stable

# Force deploy from Render dashboard
```

#### **Database Rollback**
```bash
# If schema changed, rollback database
psql $DATABASE_URL < backup_$(date +%Y%m%d).sql
```

### 🔧 **Health Monitoring**

#### **Automated Health Checks** (N8N Workflow)
```json
{
  "name": "Health Monitor",
  "trigger": "cron: */5 * * * *",
  "nodes": [
    {
      "name": "Check Evolution API",
      "type": "httpRequest",
      "parameters": {
        "url": "https://evolution-api-jz3j.onrender.com/",
        "timeout": 10000
      }
    },
    {
      "name": "Check Backend API", 
      "type": "httpRequest",
      "parameters": {
        "url": "https://whatsapp-bot-backend-fnte.onrender.com/api/health",
        "timeout": 10000
      }
    },
    {
      "name": "Alert on Failure",
      "type": "emailSend",
      "parameters": {
        "fromEmail": "alerts@yourdomain.com",
        "toEmail": "admin@yourdomain.com",
        "subject": "🚨 Service Down Alert"
      }
    }
  ]
}
```

---

## 📊 Environment Management

### 🔧 **Render Environment Variables**

#### **Evolution API**
```bash
# Core Evolution API settings (ya configuradas)
SERVER_TYPE=http
SERVER_PORT=8080
DATABASE_PROVIDER=postgresql
AUTHENTICATION_API_KEY=F2BC57EB8FBCB89D7BD411D5FA9F5451
WEBHOOK_GLOBAL_URL=https://n8n-automation-bhdl.onrender.com/webhook-test/whatsapp
```

#### **N8N Automation** 
```bash
# Core N8N settings (ya configuradas)
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=Reloj.Picachu@1290
N8N_ENCRYPTION_KEY=bfc29aca1b6c2d8df13a1a9367f388f6
```

#### **Custom Backend**
```bash
# Billing variables (recién agregadas)
MERCADOPAGO_ACCESS_TOKEN=TEST-4614107882901246-013023-1c51dcbdfa2b29ef8c24b0f03a16a37f-1591892623
MERCADOPAGO_PUBLIC_KEY=TEST-dc52ae27-4b87-4b48-9d8e-8aed1a01c5b9
BACKEND_URL=https://whatsapp-bot-backend-fnte.onrender.com
STRIPE_SECRET_KEY=placeholder_stripe_key_not_configured
```

### 🔄 **Environment Sync Script**
```bash
#!/bin/bash
# sync-env-variables.sh

# Backup current environment
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars" > env_backup.json

# Add new variables to all services
SERVICES=("evolution-api" "n8n-automation" "whatsapp-bot-backend")

for service in "${SERVICES[@]}"; do
  echo "Updating $service..."
  # Add environment variables via Render API
done
```

---

## 🎯 Action Plan

### 📋 **Immediate Tasks** (Esta semana)

#### **✅ Phase 1: Monitoring Setup**
1. **Create health check workflow** en N8N
2. **Set up monitoring alerts** (email/Slack)
3. **Document current versions** de todos los servicios
4. **Create backup scripts** para database y workflows

#### **🔄 Phase 2: Version Control** (Próxima semana)
1. **Pin N8N version** en lugar de `latest`
2. **Create update branches** workflow
3. **Test rollback procedures**
4. **Set up automated dependency checks**

#### **📈 Phase 3: Automation** (Próximas 2 semanas)
1. **Automate version checking** scripts
2. **Create staged deployment** process  
3. **Set up integration tests**
4. **Document emergency procedures**

### 📝 **Documentation Structure**

Sugiero crear estos documentos adicionales:

1. **`RENDER_SERVICES.md`** - Detalle de cada servicio
2. **`UPDATE_PROCEDURES.md`** - Procesos paso a paso
3. **`EMERGENCY_RUNBOOK.md`** - Procedimientos de emergencia
4. **`VERSION_HISTORY.md`** - Log de actualizaciones

---

## 💡 Recommendations

### 🎯 **Priority 1 (Critical)**
- ✅ Pin N8N version (evitar updates automáticos)
- ✅ Set up health monitoring 
- ✅ Create database backup automation
- ✅ Document rollback procedures

### 🎯 **Priority 2 (Important)**  
- 📊 Automated version checking
- 🔄 Staged deployment process
- 📧 Alert system setup
- 🧪 Integration testing

### 🎯 **Priority 3 (Nice to have)**
- 🤖 Fully automated updates
- 📈 Performance monitoring
- 🔍 Log aggregation
- 📊 Update success metrics

---

**¿Te parece bien este plan de acción?** 

Podemos empezar inmediatamente con:
1. **Pin N8N version** to prevent automatic breaking updates
2. **Set up health monitoring** workflow
3. **Create backup automation** scripts

Una vez que confirmes el deploy actual del billing system, podemos comenzar con estas mejoras de infraestructura.

**¿Cuál sería tu prioridad? ¿Empezamos con el health monitoring o prefieres asegurar primero las versiones?**