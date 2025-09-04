# 🏦 MercadoPago - Credenciales y Configuración

## 🔑 Credenciales de Sandbox

### ⚠️ **IMPORTANTE: Crear Cuenta de Vendedor de Prueba**

Las credenciales actuales son de cuenta real (aunque sean TEST-xxx). 
Necesitamos crear una **Cuenta de Vendedor de Prueba** desde Developers Panel.

### API Keys (A actualizar con Vendedor de Prueba)
```
Public Key: TEST-45ba234b-45f2-45ce-b1dd-037623495123
Access Token: TEST-6905559224909465-090406-7377ba8aec1ccc0fee8fa4bcc5cf8038-62226130
```

### 🛠️ **Pasos para crear Vendedor de Prueba:**
1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Crear nueva cuenta de prueba
3. Tipo: **Vendedor**
4. País: **Argentina**
5. Obtener nuevas credenciales TEST-xxx

### 👥 Cuentas de Prueba

#### 🏪 Vendedor Argentina (Para Backend/API)
- **Name:** Vendedor Argentina
- **UserID:** 2671570710
- **Usuario:** TESTUSER4162553309539174936
- **Password:** q2sdHB4u5V

**App de Suscripciones:**
- **Número de aplicación:** 8936514952268223
- **Integración:** Suscripciones específica
- **Modelo:** Suscripciones con/sin plan asociado
- **Public Key:** APP_USR-308ad61d-03c0-4c12-a0af-bda2492a141b
- **Access Token:** APP_USR-8936514952268223-090410-71902efa0f7aa0eb3bf067ae61cfd6c8-2671570710
- **Client ID:** 8936514952268223
- **Client Secret:** FX1Ap6qnavcx2pRGmIlfoEeOPASIPuTK

#### 🛒 Comprador Argentina (Para Testing)
- **Name:** Comprador Argentina
- **UserID:** 2671265984
- **Usuario:** TESTUSER1270116819274701081
- **Password:** gBSjW2Xpgu

#### 🇧🇷 Comprador Brasil
- **Name:** Comprador Brasil
- **UserID:** 2671266306
- **Usuario:** TESTUSER922571630689643721
- **Password:** sdaOeW7xiL

## 📱 Tarjetas de Prueba para Sandbox

### ✅ Tarjetas Aprobadas
| Tarjeta | Número | CVV | Vencimiento | DNI |
|---------|---------|-----|-------------|-----|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | 12345678 |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | 12345678 |
| American Express | 3711 803032 57522 | 1234 | 11/25 | 12345678 |

### ❌ Tarjetas Rechazadas (para testing)
| Tarjeta | Número | CVV | Vencimiento | DNI |
|---------|---------|-----|-------------|-----|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | 12345678 |

## 🔧 Configuración en el Proyecto

### Variables de Entorno (Render)
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-6905559224909465-090406-7377ba8aec1ccc0fee8fa4bcc5cf8038-62226130
MERCADOPAGO_PUBLIC_KEY=TEST-45ba234b-45f2-45ce-b1dd-037623495123
MERCADOPAGO_SANDBOX=true
```

### Endpoints de Webhook
```
Sandbox: https://whatsapp-bot-backend-fnte.onrender.com/api/billing/webhooks/mercadopago
```

## 📋 Notas Importantes

1. **Sandbox vs Producción**: Siempre usar credenciales TEST- para desarrollo
2. **Compradores de Prueba**: Solo funcionan en sandbox, no mezclar con cuentas reales
3. **Montos**: En sandbox hay límites de montos (máx 100,000 ARS)
4. **DNI**: Usar DNI de prueba (12345678) o DNIs válidos argentinos

## 🧪 Testing Flow

### ⚠️ **IMPORTANTE: Usar browser limpio o cuenta de test**

**El problema común**: Si estás logueado en MercadoPago con tu cuenta personal, el sandbox no funcionará correctamente.

### ✅ **Solución - Opción 1: Browser Incógnito**
1. **Abrir browser incógnito/privado**
2. **No loguearse** en MercadoPago
3. **Proceder como guest** en el checkout
4. **Usar tarjeta de test** para pagar

### ✅ **Solución - Opción 2: Cuenta de Test**
1. **Logout** de cuenta personal en MercadoPago
2. **Login** con usuario de test: `TESTUSER1270116819274701081` / `gBSjW2Xpgu`
3. **Proceder** con el flujo normal

### 📋 **Pasos del Testing**
1. Crear subscripción con API desde frontend
2. Seguir redirect a MercadoPago (en browser limpio)
3. Completar pago con tarjeta de prueba aprobada
4. Verificar redirect de vuelta al frontend
5. Verificar webhook de confirmación en logs
6. Validar actualización de estado en BD

## 🔗 Links Útiles

- [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
- [Testing con Tarjetas](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [API Reference](https://www.mercadopago.com.ar/developers/es/reference)

---

**Última actualización**: 2025-09-04