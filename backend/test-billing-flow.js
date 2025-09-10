#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'https://whatsapp-bot-backend-fnte.onrender.com';
const TEST_AUTH_TOKEN = 'your_jwt_token_here'; // You'll need to provide this

async function testBillingFlow() {
  console.log('🧪 Starting MercadoPago Billing Flow Test\n');

  try {
    // Step 1: Create customer
    console.log('📋 Step 1: Creating/Getting Customer...');
    const customerResponse = await axios.post(`${BASE_URL}/api/mercadopago/customer`, {
      email: 'fglanz@tallerdeinversiones.com',
      first_name: 'Federico',
      last_name: 'Glanz',
      phone_number: '5491162839297',
      identification: {
        type: 'DNI',
        number: '34403553'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Customer:', customerResponse.data.data.customer_id);

    // Step 2: Create card token
    console.log('\n📋 Step 2: Creating Card Token...');
    const cardTokenResponse = await axios.post(`${BASE_URL}/api/mercadopago/card-token/new`, {
      card_number: '5505685289655628',  // Test card
      expiration_month: 7,
      expiration_year: 2032,
      security_code: '123',
      cardholder: {
        name: 'Federico Glanz',
        identification: {
          type: 'DNI',
          number: '34403553'
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Card Token:', cardTokenResponse.data.data.card_token_id);

    // Step 3: Create subscription
    console.log('\n📋 Step 3: Creating Subscription...');
    const subscriptionResponse = await axios.post(`${BASE_URL}/api/billing/create-subscription`, {
      planId: '5e36dc04-285b-4dbb-83bd-36f7034efcca', // Your test plan ID
      customerData: {
        email: 'fglanz@tallerdeinversiones.com',
        first_name: 'Federico',
        last_name: 'Glanz',
        phone_number: '5491162839297',
        identification: {
          type: 'DNI',
          number: '34403553'
        }
      },
      card_token_id: cardTokenResponse.data.data.card_token_id
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Subscription:', subscriptionResponse.data.data.subscription_id);
    console.log('🔗 Checkout URL:', subscriptionResponse.data.data.checkout_url);

    console.log('\n🎉 Test completed successfully!');
    
    return {
      customer_id: customerResponse.data.data.customer_id,
      card_token_id: cardTokenResponse.data.data.card_token_id,
      subscription_id: subscriptionResponse.data.data.subscription_id,
      checkout_url: subscriptionResponse.data.data.checkout_url
    };

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  if (process.argv[2]) {
    TEST_AUTH_TOKEN = process.argv[2];
    testBillingFlow();
  } else {
    console.log('Usage: node test-billing-flow.js <JWT_TOKEN>');
    console.log('Get JWT token from frontend localStorage or login response');
  }
}

module.exports = { testBillingFlow };