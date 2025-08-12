#!/bin/bash

# 📦 Instalación de Dependencias - Evolution API
# ==============================================

echo "📦 Instalando dependencias necesarias..."
echo "======================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "   Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

echo "✅ npm encontrado: $(npm --version)"

# Crear package.json si no existe
if [ ! -f "package.json" ]; then
    echo "📝 Creando package.json..."
    cat > package.json << EOF
{
  "name": "evolution-api-testing",
  "version": "1.0.0",
  "description": "Scripts de prueba para Evolution API",
  "scripts": {
    "test": "node test-api.js",
    "bulk": "node bulk-sender.js",
    "start-n8n": "n8n start"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "readline": "^1.3.0",
    "csv-parser": "^3.0.0",
    "fs-extra": "^11.1.0",
    "moment": "^2.29.4",
    "colors": "^1.4.0",
    "inquirer": "^9.2.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "n8n": "^1.0.0"
  }
}
EOF
    echo "✅ package.json creado"
fi

# Instalar dependencias principales
echo "📦 Instalando dependencias principales..."
npm install axios readline csv-parser fs-extra moment colors inquirer dotenv

# Verificar si el usuario quiere instalar n8n
echo ""
echo "¿Quieres instalar n8n para automatizaciones? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "📦 Instalando n8n..."
    npm install -g n8n
    echo "✅ n8n instalado globalmente"
    echo "   Inicia con: n8n start"
    echo "   Accede en: http://localhost:5678"
fi

echo ""
echo "🎉 ¡Dependencias instaladas correctamente!"
echo "========================================"
echo ""
echo "📋 Dependencias instaladas:"
echo "• axios - Cliente HTTP"
echo "• csv-parser - Procesamiento CSV"
echo "• fs-extra - Operaciones de archivos"
echo "• moment - Manejo de fechas"
echo "• colors - Colores en terminal"
echo "• inquirer - Interfaz interactiva"
echo "• dotenv - Variables de entorno"
echo ""
echo "🧪 Scripts disponibles:"
echo "• npm run test - Ejecutar pruebas"
echo "• npm run bulk - Envío masivo"
echo "• node test-api.js - Pruebas interactivas"
echo "• node bulk-sender.js - Envío masivo avanzado"
echo ""
echo "📚 Documentación:"
echo "• DOCUMENTACION.md - Guía completa"
echo "• n8n-integration-guide.md - Integración n8n"
echo "• bulk-messaging-guide.md - Envío masivo"
echo "" 