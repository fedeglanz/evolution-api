const axios = require('axios');

// Configuración
const config = {
  EVOLUTION_API_URL: 'https://evolution-api-jz3j.onrender.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976'
};

console.log('🔍 Evolution API Debug Test');
console.log('Evolution API URL:', config.EVOLUTION_API_URL);
console.log('Evolution API Key:', config.EVOLUTION_API_KEY ? `${config.EVOLUTION_API_KEY.substring(0, 8)}...` : 'NO KEY');

async function testEvolutionAPI() {
  try {
    // Crear cliente axios
    const client = axios.create({
      baseURL: config.EVOLUTION_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.EVOLUTION_API_KEY
      }
    });

    console.log('\n📋 Test 1: Health check...');
    try {
      const healthResponse = await client.get('/');
      console.log('✅ Health check OK:', {
        status: healthResponse.status,
        data: healthResponse.data
      });
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }

    console.log('\n📋 Test 2: Create instance WITHOUT phone number...');
    const testInstanceName1 = `debug_test_no_phone_${Date.now()}`;
    
    const payload1 = {
      instanceName: testInstanceName1,
      token: config.EVOLUTION_API_KEY,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true
    };

    console.log('Payload 1:', JSON.stringify(payload1, null, 2));

    try {
      const response1 = await client.post('/instance/create', payload1);
      console.log('✅ Instance created without phone:', {
        status: response1.status,
        instanceName: response1.data.instance?.instanceName,
        hasQR: !!response1.data.qrcode?.base64,
        hasPairingCode: !!response1.data.qrcode?.pairingCode,
        pairingCode: response1.data.qrcode?.pairingCode,
        keys: Object.keys(response1.data)
      });
      console.log('Full response:', JSON.stringify(response1.data, null, 2));
    } catch (error) {
      console.log('❌ Instance creation failed:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }

    console.log('\n📋 Test 3: Create instance WITH phone number...');
    const testInstanceName2 = `debug_test_with_phone_${Date.now()}`;
    
    const payload2 = {
      instanceName: testInstanceName2,
      token: config.EVOLUTION_API_KEY,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      number: '5491123456789' // Sin el +
    };

    console.log('Payload 2:', JSON.stringify(payload2, null, 2));

    try {
      const response2 = await client.post('/instance/create', payload2);
      console.log('✅ Instance created WITH phone:', {
        status: response2.status,
        instanceName: response2.data.instance?.instanceName,
        hasQR: !!response2.data.qrcode?.base64,
        hasPairingCode: !!response2.data.qrcode?.pairingCode,
        pairingCode: response2.data.qrcode?.pairingCode,
        keys: Object.keys(response2.data)
      });
      console.log('Full response:', JSON.stringify(response2.data, null, 2));
    } catch (error) {
      console.log('❌ Instance creation with phone failed:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Ejecutar test
testEvolutionAPI(); 