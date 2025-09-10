# MercadoPago Integration - Credentials & Configuration

## 🔐 Production Credentials (Real - Fede's Account)

**⚠️ IMPORTANT: These are REAL production credentials. Handle with care!**

### Production Keys
```env
# MercadoPago Production (Real Account)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6905559224909465-090406-2f088b3762d8fb2ab0553568c4670fe8-62226130
MERCADOPAGO_PUBLIC_KEY=APP_USR-e7f907fb-c64a-4292-a619-b08ca641ef38
MERCADOPAGO_CLIENT_ID=6905559224909465
MERCADOPAGO_CLIENT_SECRET=brizIOPC1Gs8M3g7Wd7egHlNh77MXQd9
MERCADOPAGO_SANDBOX=false
```

### Test/Sandbox Keys (For Development)
```env
# MercadoPago Test (Sandbox)
MERCADOPAGO_ACCESS_TOKEN=TEST-4614107882901246-013023-1c51dcbdfa2b29ef8c24b0f03a16a37f-1591892623
MERCADOPAGO_PUBLIC_KEY=TEST-dc52ae27-4b87-4b48-9d8e-8aed1a01c5b9
MERCADOPAGO_SANDBOX=true
```

## 🔗 Webhook Configuration

### Webhook URL
```
https://whatsapp-bot-backend-fnte.onrender.com/api/billing/webhooks/mercadopago
```

### Webhook Secret Key
```env
MERCADOPAGO_WEBHOOK_SECRET=31f209310ddc7bd86e9922c4fc0898db48e1eddc23bfa9c4ce0c4bf1cc58fad8
```

### Events to Subscribe
- `preapproval` → created, updated, cancelled
- `payment` → created, updated

## 🧪 Testing Strategy

### Phase 1: Production Testing (Current)
- ✅ Use real production credentials
- ✅ Create low-price plan ($1 USD)  
- ✅ Test with real credit card
- ✅ Validate complete flow end-to-end

### Phase 2: Sandbox Implementation (Future)
- 🔄 Get proper sandbox credentials from MP dashboard
- 🔄 Create test users (buyer/seller)
- 🔄 Implement environment switching

## 🔧 Configuration Notes

### Current Issues Resolved
- ✅ Customer search API format fixed (qs parameter)
- ✅ Customer cards API method fixed (list instead of search)
- ✅ Preapproval status fixed (authorized for tokens)
- ✅ Webhook signature validation implemented

### Production vs Test Environment
- **Production**: Real cards, real payments, full validation
- **Sandbox**: Test cards, simulated payments, but API inconsistencies

### Card Token Flow
1. Frontend creates token with card data
2. Backend uses token in preapproval creation
3. Status must be 'authorized' for direct token usage
4. MercadoPago processes payment immediately

## 📱 Dashboard Configuration

### MercadoPago Panel URLs
- **Main Panel**: https://www.mercadopago.com.ar/developers/panel/app
- **Webhooks**: Configure in application settings
- **Test Users**: https://www.mercadopago.com.ar/developers/panel/test-users

### Application Configuration
- Application ID: 6905559224909465
- Webhook URL configured ✅
- Secret key generated ✅
- Events subscribed ✅

## 🚀 Deployment Checklist

### Environment Variables (Render)
```env
# For Production Testing
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6905559224909465-090406-2f088b3762d8fb2ab0553568c4670fe8-62226130
MERCADOPAGO_PUBLIC_KEY=APP_USR-e7f907fb-c64a-4292-a619-b08ca641ef38
MERCADOPAGO_SANDBOX=false
MERCADOPAGO_WEBHOOK_SECRET=31f209310ddc7bd86e9922c4fc0898db48e1eddc23bfa9c4ce0c4bf1cc58fad8

# Optional
MERCADOPAGO_CLIENT_ID=6905559224909465
MERCADOPAGO_CLIENT_SECRET=brizIOPC1Gs8M3g7Wd7egHlNh77MXQd9
```

### Switch to Sandbox (Future)
```env
# For Sandbox Testing
MERCADOPAGO_ACCESS_TOKEN=TEST-[NEW-VALID-TOKEN]
MERCADOPAGO_PUBLIC_KEY=TEST-[NEW-VALID-KEY]  
MERCADOPAGO_SANDBOX=true
```

## 🎯 Next Steps

1. **✅ Configure production credentials in Render**
2. **🔄 Test complete flow with real card + low price**
3. **🔄 Validate webhook processing**
4. **📋 Create proper sandbox setup later**

---

**Last Updated**: 2025-09-10
**Status**: Production credentials ready for testing