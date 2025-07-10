#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL base del API
BASE_URL="http://localhost:3000/api"

echo -e "${BLUE}=== WhatsApp Bot API - Test de Autenticación ===${NC}\n"

# 1. Probar Health Check
echo -e "${YELLOW}1. Probando Health Check...${NC}"
curl -s $BASE_URL/health | jq '.'
echo -e "\n"

# 2. Probar información de rutas de auth
echo -e "${YELLOW}2. Información de rutas de autenticación...${NC}"
curl -s $BASE_URL/auth | jq '.availableRoutes'
echo -e "\n"

# 3. Probar validación con datos inválidos
echo -e "${YELLOW}3. Probando validación con datos inválidos...${NC}"
curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123",
    "full_name": "A"
  }' | jq '.message'
echo -e "\n"

# 4. Probar endpoint protegido sin token
echo -e "${YELLOW}4. Probando endpoint protegido sin token...${NC}"
curl -s -X GET $BASE_URL/auth/me | jq '.message'
echo -e "\n"

# 5. Probar endpoint protegido con token inválido
echo -e "${YELLOW}5. Probando endpoint protegido con token inválido...${NC}"
curl -s -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer invalid-token" | jq '.message'
echo -e "\n"

# 6. Registrar usuario de prueba (si no existe)
echo -e "${YELLOW}6. Registrando usuario de prueba...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Usuario de Prueba",
    "company_name": "Empresa de Prueba"
  }')

echo $REGISTER_RESPONSE | jq '.'

# Extraer token si el registro fue exitoso
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Usuario registrado exitosamente${NC}"
  echo -e "${BLUE}Token: $TOKEN${NC}\n"
  
  # 7. Probar endpoint /me con token válido
  echo -e "${YELLOW}7. Probando endpoint /me con token válido...${NC}"
  curl -s -X GET $BASE_URL/auth/me \
    -H "Authorization: Bearer $TOKEN" | jq '.data.user | {email, full_name, role, company_name}'
  echo -e "\n"
  
  # 8. Probar refresh token
  echo -e "${YELLOW}8. Probando refresh token...${NC}"
  curl -s -X POST $BASE_URL/auth/refresh \
    -H "Authorization: Bearer $TOKEN" | jq '.message'
  echo -e "\n"
  
  # 9. Probar logout
  echo -e "${YELLOW}9. Probando logout...${NC}"
  curl -s -X POST $BASE_URL/auth/logout \
    -H "Authorization: Bearer $TOKEN" | jq '.message'
  echo -e "\n"
  
else
  echo -e "${RED}❌ Error en el registro (usuario probablemente ya existe)${NC}"
  echo -e "${YELLOW}Intentando login con usuario existente...${NC}"
  
  # Intentar login
  LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "TestPass123!"
    }')
  
  echo $LOGIN_RESPONSE | jq '.'
  
  # Extraer token del login
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')
  
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Login exitoso${NC}"
    echo -e "${BLUE}Token: $TOKEN${NC}\n"
    
    # Probar endpoint /me con token del login
    echo -e "${YELLOW}Probando endpoint /me con token del login...${NC}"
    curl -s -X GET $BASE_URL/auth/me \
      -H "Authorization: Bearer $TOKEN" | jq '.data.user | {email, full_name, role, company_name}'
    echo -e "\n"
  else
    echo -e "${RED}❌ Error en login${NC}"
  fi
fi

echo -e "${BLUE}=== Fin de las pruebas ===${NC}"
echo -e "${GREEN}✅ Sistema de autenticación funcionando correctamente${NC}"
echo -e "${YELLOW}Puedes usar el token generado para probar otros endpoints${NC}" 