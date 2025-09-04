// Test MercadoPago direct API con credenciales TEST originales
const axios = require('axios');
const { MercadoPagoConfig, PreApproval, Customer } = require('mercadopago');

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
      // Buscar customer existente primero
      const searchResponse = await axios.get(`https://api.mercadopago.com/v1/customers/search?email=${customerData.email}`, {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      let customerId;
      if (searchResponse.data.results && searchResponse.data.results.length > 0) {
        customerId = searchResponse.data.results[0].id;
        console.log('✅ Customer encontrado:', {
          id: customerId,
          email: searchResponse.data.results[0].email
        });
      } else {
        const customerResponse = await axios.post('https://api.mercadopago.com/v1/customers', customerData, {
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        customerId = customerResponse.data.id;
        console.log('✅ Customer creado:', {
          id: customerId,
          email: customerResponse.data.email
        });
      }
      console.log('---\n');

      // 3. Crear suscripción usando SDK v2 (igual que la app)
      console.log('3️⃣ Creando suscripción con SDK v2...');
      
      // Configurar SDK con sandbox forzado
      const client = new MercadoPagoConfig({ 
        accessToken: MERCADOPAGO_ACCESS_TOKEN,
        options: { 
          timeout: 5000,
          sandbox: true  // Forzar sandbox mode
        }
      });
      
      const preapproval = new PreApproval(client);
      
      const preapprovalData = {
        reason: 'Plan Starter WhatsApp Bot Platform',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 15000,
          currency_id: 'ARS'
        },
        back_url: 'https://whatsapp-bot-frontend-i9g0.onrender.com/dashboard/billing',
        payer_email: customerData.email,
        external_reference: `test_company_123_plan_456`,
        notification_url: `https://whatsapp-bot-backend-fnte.onrender.com/api/billing/webhooks/mercadopago`
      };

      const subscription = await preapproval.create({
        body: preapprovalData
      });

      console.log('✅ Suscripción creada:', {
        id: subscription.id,
        init_point: subscription.init_point,
        status: subscription.status,
        sandbox_init_point: subscription.sandbox_init_point
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