#!/bin/bash

# 🚀 Script de Configuración Rápida - Evolution API
# ================================================

echo "🚀 Configurando Evolution API..."
echo "================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yaml" ]; then
    echo "❌ Error: No se encontró docker-compose.yaml"
    echo "   Ejecuta este script desde el directorio raíz de evolution-api"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cp env-config.txt .env
    echo "✅ Archivo .env creado"
else
    echo "ℹ️  Archivo .env ya existe"
fi

# Generar clave API aleatoria
API_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "🔑 Generando clave API segura..."

# Actualizar clave en .env
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/AUTHENTICATION_API_KEY=evolution-api-key-123/AUTHENTICATION_API_KEY=$API_KEY/" .env
else
    # Linux
    sed -i "s/AUTHENTICATION_API_KEY=evolution-api-key-123/AUTHENTICATION_API_KEY=$API_KEY/" .env
fi

echo "✅ Clave API actualizada: $API_KEY"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    echo "   Instala Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose no está instalado"
    echo "   Instala Docker Compose desde: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker y Docker Compose encontrados"

# Verificar puertos disponibles
echo "🔍 Verificando puertos disponibles..."

check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Puerto $port ($service) está en uso"
        return 1
    else
        echo "✅ Puerto $port ($service) disponible"
        return 0
    fi
}

check_port 8080 "Evolution API"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

# Levantar servicios
echo ""
echo "🚀 Levantando servicios..."
echo "========================="

docker-compose down -v 2>/dev/null || true
docker-compose up -d

echo ""
echo "⏳ Esperando que los servicios estén listos..."
sleep 10

# Verificar estado
echo ""
echo "📊 Estado de los servicios:"
docker-compose ps

# Verificar conectividad
echo ""
echo "🔍 Verificando conectividad..."

# Esperar a que la API esté lista
for i in {1..30}; do
    if curl -s -f "http://localhost:8080" -H "apikey: $API_KEY" > /dev/null 2>&1; then
        echo "✅ Evolution API está funcionando!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Error: Evolution API no responde después de 30 intentos"
        echo "   Verifica los logs con: docker-compose logs evolution_api"
        exit 1
    fi
    
    echo "⏳ Esperando API... ($i/30)"
    sleep 2
done

# Mostrar información final
echo ""
echo "🎉 ¡Configuración completada exitosamente!"
echo "========================================="
echo ""
echo "📋 Información importante:"
echo "• API URL: http://localhost:8080"
echo "• API Key: $API_KEY"
echo "• Documentación: http://localhost:8080/docs"
echo "• Manager: http://localhost:8080/manager"
echo ""
echo "📝 Próximos pasos:"
echo "1. Ejecuta: node test-api.js"
echo "2. Crea una instancia de WhatsApp"
echo "3. Conecta tu teléfono escaneando el QR"
echo "4. ¡Envía tu primer mensaje!"
echo ""
echo "📚 Documentación completa en:"
echo "• DOCUMENTACION.md"
echo "• setup-guide.md"
echo "• n8n-integration-guide.md"
echo ""
echo "🔧 Comandos útiles:"
echo "• Ver logs: docker-compose logs -f evolution_api"
echo "• Reiniciar: docker-compose restart"
echo "• Detener: docker-compose down"
echo ""

# Guardar información importante
cat > .env.info << EOF
# 🔑 Información de configuración - Evolution API
# ============================================
# API URL: http://localhost:8080
# API Key: $API_KEY
# Fecha: $(date)
# 
# ⚠️  IMPORTANTE: Guarda esta información en lugar seguro
EOF

echo "💾 Información guardada en .env.info"
echo ""
echo "¿Quieres ejecutar el script de pruebas ahora? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🧪 Ejecutando pruebas..."
    node test-api.js
fi 