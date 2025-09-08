# 🧪 MercadoPago - Flujo Correcto de Testing

## ⚠️ IMPORTANTE: No existe sandbox.mercadopago.com

El testing en MercadoPago se hace con **usuarios de prueba en el ambiente real**.

## 📋 Flujo de Testing Paso a Paso

### 1. **Backend está configurado correctamente** ✅
- Credenciales del Vendedor de Prueba (APP_USR-...)
- Detección de Argentina activada (+54, .ar, .com.ar)

### 2. **Crear suscripción desde el frontend**
Usuario argentino ingresa sus datos:
```json
{
  "email": "usuario@gmail.com.ar",
  "phone_number": "+541162839297",
  "name": "Juan Pérez"
}
```

### 3. **Backend genera URL de pago**
URL correcta: `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=XXX`

### 4. **IMPORTANTE: Cómo hacer el testing** 🔑

#### Opción A: Browser Incógnito (Recomendado)
1. Abrir browser en modo incógnito
2. Ir a la URL de pago
3. NO loguearse con cuenta personal
4. Usar datos de tarjeta de prueba directamente

#### Opción B: Login con Usuario de Prueba
1. Cerrar sesión de MercadoPago si estás logueado
2. Login con: `TESTUSER1270116819274701081` / `gBSjW2Xpgu`
3. Completar el pago con tarjetas de prueba

### 5. **Tarjetas de Prueba para Argentina** 💳

#### Pagos Aprobados:
- **Mastercard**: 5031 7557 3453 0604
- **Visa**: 4509 9535 6623 3704
- **CVV**: 123
- **Vencimiento**: 11/25
- **DNI**: 12345678
- **Nombre**: APRO (importante para aprobar)

#### Pagos Rechazados (testing):
- Usar mismo número pero nombre: OTHE

### 6. **Después del pago**
- MercadoPago redirige a: `/billing?status=success`
- Webhook procesa el pago automáticamente
- Verificar en Platform Admin las transacciones

## ❌ Errores Comunes

1. **"Cannot operate between different countries"**
   - Solución: Usar usuarios de prueba del mismo país

2. **Pago no se procesa**
   - Verificar estar usando tarjetas de prueba
   - Verificar nombre APRO para aprobar

3. **Logged con cuenta personal**
   - MercadoPago detecta y puede bloquear
   - Usar incógnito o test user

## 🔍 Debug Tips

- Los logs del backend mostrarán "Modo TEST" cuando MERCADOPAGO_SANDBOX=true
- La URL es correcta con www.mercadopago.com.ar
- NO intentes acceder a sandbox.mercadopago.com (no existe)

## 📝 Para Production

Cuando pases a producción:
1. Cambiar credenciales a las reales (sin APP_USR)
2. Establecer MERCADOPAGO_SANDBOX=false
3. Usuarios reales con tarjetas reales