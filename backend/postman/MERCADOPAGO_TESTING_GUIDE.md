# 🎯 MercadoPago Testing Guide

## 🔍 Problema Identificado
El problema principal es que MercadoPago está generando URLs de **producción** (`www.mercadopago.com`) en lugar de **sandbox** (`sandbox.mercadopago.com`) incluso cuando usamos credenciales TEST.

## 📋 Pasos de Testing con Postman

### 1. **Verificar Credenciales** 
- Ejecutar: `1. Direct API - Get User Info`
- Esperado: Información del usuario de testing
- Si falla: Las credenciales no son válidas

### 2. **Crear Cliente de Prueba**
- Ejecutar: `2. Direct API - Create Test Customer`
- Guardar el ID del cliente creado
- Nota: Usar emails únicos para cada prueba

### 3. **Test Directo de Suscripción**
- Ejecutar: `3. Direct API - Create Subscription (Preapproval)`
- **IMPORTANTE**: Verificar el campo `init_point` en la respuesta
- ¿Es `www.mercadopago.com` o `sandbox.mercadopago.com`?

### 4. **Verificar Modo Sandbox**
- Ejecutar: `4. Direct API - Check Sandbox Mode`
- Esto confirma si estamos en ambiente sandbox

### 5. **Test con Nuestro Backend**
- Primero: Obtener un plan ID con `5. Backend - Get Available Plans`
- Luego: Crear suscripción con `6. Backend - Create MP Subscription`
- Verificar la URL devuelta en `checkout_url`

## 🐛 Debugging del Problema Sandbox

### Posibles Causas:
1. **SDK v2 behavior**: El nuevo SDK puede tener comportamiento diferente
2. **Token type**: Los tokens TEST pueden generar URLs prod por defecto
3. **Missing parameter**: Puede faltar algún parámetro para forzar sandbox

### Soluciones a Probar:

#### Opción 1: Forzar URL Sandbox Manualmente
```javascript
// En billingService.js
if (process.env.MERCADOPAGO_SANDBOX === 'true' && init_point.includes('www.mercadopago.com')) {
  init_point = init_point.replace('www.mercadopago.com', 'sandbox.mercadopago.com');
}
```

#### Opción 2: Usar Test Users
1. Crear test users con `10. Direct API - Create Test Users`
2. Uno será el "vendedor" y otro el "comprador"
3. Usar las credenciales del test user vendedor

#### Opción 3: Parámetros Adicionales
Probar agregando en el request:
```json
{
  "sandbox_mode": true,
  "test": true,
  "application_id": "4614107882901246"
}
```

## 🧪 Testing Flow Completo

1. **Setup**:
   - Importar la colección en Postman
   - Configurar variables de entorno
   - Obtener auth token del backend

2. **Test MercadoPago Directo**:
   - Verificar credenciales (request 1)
   - Crear cliente test (request 2)
   - Crear suscripción directa (request 3)
   - Analizar URLs devueltas

3. **Test Backend Integration**:
   - Activar detección Argentina en `billingService.js`
   - Crear suscripción via backend (request 6)
   - Verificar URL checkout devuelta
   - Simular webhook (request 7)
   - Verificar estado final (request 8)

4. **Verificación en Platform Admin**:
   - Login en `/platform-admin`
   - Ir a Facturación
   - Verificar transacciones MercadoPago

## 📝 Notas Importantes

- **Emails de test**: Usar formato `test_user_XXXXX@testuser.com`
- **DNI de test**: Usar DNI válidos argentinos
- **Montos**: En sandbox, mantener montos bajos (100-1000 ARS)
- **Tarjetas de test**: MP provee tarjetas específicas para sandbox

## 🔗 Enlaces Útiles

- [MercadoPago Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/test-cards)
- [MercadoPago Sandbox Users](https://www.mercadopago.com.ar/developers/panel/test-users)
- [MercadoPago API Reference](https://www.mercadopago.com.ar/developers/es/reference)

## 🚨 Errores Comunes

### PolicyAgent UNAUTHORIZED
- Causa: Restricciones de seguridad en sandbox
- Solución: Usar montos menores, verificar test users

### Invalid init_point
- Causa: URL de producción en sandbox
- Solución: Reemplazar manualmente o usar test users

### Payment not processed
- Causa: Webhook no configurado correctamente
- Solución: Verificar URL webhook en MP dashboard