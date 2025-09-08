require('dotenv').config();
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

async function testMercadoPagoDirectly() {
  console.log('\n🎯 Testing MercadoPago Directly\n');
  
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  console.log('📌 Access Token:', accessToken?.substring(0, 20) + '...');
  console.log('📌 Sandbox Mode:', process.env.MERCADOPAGO_SANDBOX);
  
  try {
    // 1. Configurar cliente
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { timeout: 5000 }
    });
    
    const preapproval = new PreApproval(client);
    
    // 2. Crear suscripción de prueba
    console.log('\n📋 Creating test subscription...\n');
    
    const subscriptionData = {
      reason: 'Test Subscription - Sandbox URL Check',
      external_reference: `test-${Date.now()}`,
      payer_email: 'test_user_1270116819274701081@testuser.com', // Comprador Argentina del MERCADOPAGO.md
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        start_date: new Date(Date.now() + 3600000).toISOString(), // +1 hora para evitar timezone issues
        transaction_amount: 100, // 100 ARS
        currency_id: 'ARS'
      },
      back_url: 'https://whatsapp-bot-frontend-i9g0.onrender.com/billing?status=success',
      status: 'pending'
    };
    
    console.log('📤 Request data:', JSON.stringify(subscriptionData, null, 2));
    
    const result = await preapproval.create({ body: subscriptionData });
    
    console.log('\n✅ Subscription created successfully!\n');
    console.log('📌 ID:', result.id);
    console.log('📌 Init Point:', result.init_point);
    console.log('📌 Sandbox Init Point:', result.sandbox_init_point);
    
    // Analizar la URL
    if (result.init_point) {
      const url = new URL(result.init_point);
      console.log('\n🔍 URL Analysis:');
      console.log('  - Host:', url.host);
      console.log('  - Is Sandbox?:', url.host.includes('sandbox'));
      console.log('  - Full URL:', result.init_point);
    }
    
    // Verificar si existe sandbox_init_point separado
    if (result.sandbox_init_point) {
      console.log('\n✅ Sandbox URL disponible:', result.sandbox_init_point);
    } else {
      console.log('\n⚠️  No se encontró sandbox_init_point separado');
      
      // Intentar fix manual
      if (result.init_point && result.init_point.includes('www.mercadopago.com')) {
        const sandboxUrl = result.init_point.replace('www.mercadopago.com', 'sandbox.mercadopago.com');
        console.log('\n🔧 Manual fix - Sandbox URL:', sandboxUrl);
      }
    }
    
    console.log('\n📄 Full response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('📌 Status:', error.response.status);
      console.error('📌 Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// También probar obtener info del usuario
async function getUserInfo() {
  console.log('\n👤 Getting user info...\n');
  
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });
    
    const data = await response.json();
    console.log('✅ User info:', JSON.stringify(data, null, 2));
    console.log('\n📌 Site ID:', data.site_id);
    console.log('📌 Is Test User?:', data.tags?.includes('test_user'));
    
  } catch (error) {
    console.error('❌ Error getting user info:', error.message);
  }
}

// Ejecutar tests
(async () => {
  await getUserInfo();
  await testMercadoPagoDirectly();
})();