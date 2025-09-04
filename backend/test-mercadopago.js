// Test MercadoPago direct API con credenciales TEST originales
const axios = require('axios');

// Credenciales TEST originales (de tu cuenta real en modo sandbox)
const MERCADOPAGO_ACCESS_TOKEN = 'TEST-6905559224909465-090406-7377ba8aec1ccc0fee8fa4bcc5cf8038-62226130';

async function testMercadoPagoAPI() {
  console.log('🧪 Testing MercadoPago API directamente...\n');

  try {
    // 1. Test simple - Verificar que las credenciales funcionan
    console.log('1️⃣ Verificando credenciales...');
    const userResponse = await axios.get('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Credenciales válidas:', {
      id: userResponse.data.id,
      nickname: userResponse.data.nickname,
      site_id: userResponse.data.site_id
    });
    console.log('---\n');

    // 2. Crear un customer de prueba
    console.log('2️⃣ Creando customer de prueba...');
    const customerData = {
      email: 'fglanz@tallerdeinversiones.com', // Email real para testing
      first_name: 'Test',
      last_name: 'User',
      phone: {
        area_code: '11',
        number: '22223333'
      },
      identification: {
        type: 'DNI',
        number: '12345678'
      },
      description: 'Test Customer para Sandbox'
    };

    try {
      const customerResponse = await axios.post('https://api.mercadopago.com/v1/customers', customerData, {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Customer creado:', {
        id: customerResponse.data.id,
        email: customerResponse.data.email
      });
      console.log('---\n');

      // 3. Crear una preferencia simple (no suscripción)
      console.log('3️⃣ Creando preferencia de pago simple...');
      const preferenceData = {
        items: [{
          title: 'Plan de Prueba',
          quantity: 1,
          unit_price: 100
        }],
        payer: {
          email: customerData.email
        },
        back_urls: {
          success: 'https://example.com/success',
          failure: 'https://example.com/failure',
          pending: 'https://example.com/pending'
        }
      };

      const preferenceResponse = await axios.post('https://api.mercadopago.com/checkout/preferences', preferenceData, {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Preferencia creada:', {
        id: preferenceResponse.data.id,
        init_point: preferenceResponse.data.init_point,
        sandbox_init_point: preferenceResponse.data.sandbox_init_point
      });
      console.log('---\n');

    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error.response?.data || error.message);
  }
}

// Ejecutar test
testMercadoPagoAPI();