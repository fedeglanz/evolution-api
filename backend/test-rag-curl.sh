#!/bin/bash

# 🔧 TEST RAG CON CURL
# 
# Script simple para testear RAG sin instalar dependencias
#
# USO:
# 1. Configurar las variables abajo
# 2. ./test-rag-curl.sh

# ========================================
# 🔧 CONFIGURACIÓN (EDITA ESTOS VALORES)
# ========================================

# Tu JWT token (obtenerlo del localStorage del browser o login)
AUTH_TOKEN="TU_JWT_TOKEN_AQUI"

# ID del bot a testear (obtenerlo desde /bots en el frontend)  
BOT_ID="TU_BOT_ID_AQUI"

# Consulta a testear
QUERY="cuales son los horarios de atencion"

# URL base
BASE_URL="https://whatsapp-bot-backend.onrender.com/api"

# ========================================
# 🧪 TESTS
# ========================================

echo "🔍 TESTING RAG DEBUG..."
echo "Bot ID: $BOT_ID"
echo "Query: \"$QUERY\""
echo ""

if [ "$AUTH_TOKEN" = "TU_JWT_TOKEN_AQUI" ]; then
    echo "❌ ERROR: Configura AUTH_TOKEN en este script"
    echo "Línea 13: AUTH_TOKEN=\"tu-token-jwt\""
    exit 1
fi

if [ "$BOT_ID" = "TU_BOT_ID_AQUI" ]; then
    echo "❌ ERROR: Configura BOT_ID en este script"  
    echo "Línea 16: BOT_ID=\"tu-bot-uuid\""
    exit 1
fi

echo "📊 PASO 1: Verificando asignaciones del bot..."

# Test 1: Ver asignaciones detalladas
curl -s -X GET \
  "$BASE_URL/knowledge/debug/bot/$BOT_ID/assignments" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | \
  jq '.' || echo "⚠️  Instala 'jq' para formato JSON bonito"

echo ""
echo "🧠 PASO 2: Probando búsqueda RAG..."

# Test 2: Probar búsqueda RAG  
curl -s -X POST \
  "$BASE_URL/knowledge/debug/bot-search" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"botId\": \"$BOT_ID\",
    \"query\": \"$QUERY\",
    \"similarityThreshold\": 0.6,
    \"maxResults\": 3
  }" | \
  jq '.' || echo "⚠️  Instala 'jq' para formato JSON bonito"

echo ""
echo "✅ Test completado!"
echo "💡 Si 'rag_search.success: true' y hay resultados, el RAG funciona"
echo "🤖 Si no funciona el bot, verifica el flujo en botController.js" 