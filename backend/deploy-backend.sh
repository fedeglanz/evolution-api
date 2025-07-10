#!/bin/bash

echo "🚀 Deploying WhatsApp Bot Backend to Render..."

# Verificar que estemos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the backend directory."
    exit 1
fi

echo "✅ Package.json found - verifying dependencies..."

# Verificar que no hay dependencias problemáticas
if grep -q "baileys\|jimp" package.json; then
    echo "❌ Error: Found WhatsApp dependencies in package.json!"
    echo "This backend should not have baileys or jimp dependencies."
    exit 1
fi

echo "✅ Package.json is clean - no WhatsApp dependencies found"

# Verificar que el Dockerfile existe
if [ ! -f "Dockerfile.backend" ]; then
    echo "❌ Error: Dockerfile.backend not found!"
    exit 1
fi

echo "✅ Dockerfile.backend found"

# Mostrar las dependencias principales
echo "📦 Main dependencies in package.json:"
grep -A 20 '"dependencies"' package.json | head -15

echo ""
echo "🎯 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Commit these changes to your repository"
echo "2. Push to your GitHub repository"
echo "3. Render will automatically detect changes and redeploy"
echo ""
echo "Monitor deployment at: https://dashboard.render.com"

