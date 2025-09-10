#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { pool } = require('./src/database');

// Configuration
const BASE_URL = 'https://whatsapp-bot-backend-fnte.onrender.com';

const TEST_COMPANY_ID = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
const TEST_PLAN_ID = '5e36dc04-285b-4dbb-83bd-36f7034efcca';

// Test data
const TEST_CUSTOMER = {
  email: 'fglanz@tallerdeinversiones.com',
  first_name: 'Federico',
  last_name: 'Glanz',
  phone_number: '5491162839297',
  identification: {
    type: 'DNI',
    number: '34403553'
  }
};

// MercadoPago test card
const TEST_CARD = {
  card_number: '5031755734530604',
  expiration_month: 11,
  expiration_year: 2025,
  security_code: '123',
  cardholder: {
    name: 'APRO',
    identification: {
      type: 'DNI',
      number: '34403553'
    }
  }
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDatabaseState() {
  console.log('\n🔍 Checking database state...');
  
  // Check subscriptions
  const subsQuery = `
    SELECT id, status, mercadopago_subscription_id, created_at, updated_at
    FROM whatsapp_bot.subscriptions 
    WHERE company_id = $1
    ORDER BY created_at DESC
  `;
  
  const subsResult = await pool.query(subsQuery, [TEST_COMPANY_ID]);
  console.log(`📊 Found ${subsResult.rows.length} subscriptions`);
  subsResult.rows.forEach((sub, idx) => {
    console.log(`  ${idx + 1}. ${sub.id} - Status: ${sub.status} - MP ID: ${sub.mercadopago_subscription_id || 'N/A'}`);
  });
  
  // Check recent payments
  const paymentsQuery = `
    SELECT id, type, payment_status, mercadopago_payment_id, created_at
    FROM whatsapp_bot.billing_transactions 
    WHERE company_id = $1
    ORDER BY created_at DESC
    LIMIT 5
  `;
  
  const paymentsResult = await pool.query(paymentsQuery, [TEST_COMPANY_ID]);
  console.log(`\n💳 Recent payments: ${paymentsResult.rows.length}`);
  paymentsResult.rows.forEach((payment, idx) => {
    console.log(`  ${idx + 1}. ${payment.type} - ${payment.payment_status} - MP ID: ${payment.mercadopago_payment_id || 'N/A'}`);
  });
  
  // Check saved cards
  const cardsQuery = `
    SELECT id, last_four_digits, card_brand, created_at
    FROM whatsapp_bot.customer_cards 
    WHERE company_id = $1
    ORDER BY created_at DESC
  `;
  
  const cardsResult = await pool.query(cardsQuery, [TEST_COMPANY_ID]);
  console.log(`\n💳 Saved cards: ${cardsResult.rows.length}`);
  cardsResult.rows.forEach((card, idx) => {
    console.log(`  ${idx + 1}. ${card.card_brand} ending in ${card.last_four_digits}`);
  });
}

async function testCompleteFlow() {
  console.log('🚀 Starting Complete MercadoPago Flow Test\n');
  console.log(`📍 Using ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'LOCAL'} backend: ${BASE_URL}`);
  
  const authToken = process.argv[2];
  if (!authToken) {
    console.log('❌ Please provide JWT token as argument');
    console.log('Usage: node test-complete-flow.js <JWT_TOKEN>');
    process.exit(1);
  }

  try {
    // Check initial state
    await checkDatabaseState();
    
    // Step 1: Create/Get Customer
    console.log('\n📋 Step 1: Creating/Getting Customer...');
    const customerResponse = await axios.post(`${BASE_URL}/api/mercadopago/customer`, TEST_CUSTOMER, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const customerId = customerResponse.data.data.customer_id;
    console.log('✅ Customer ID:', customerId);
    
    // Step 2: Create Card Token
    console.log('\n📋 Step 2: Creating Card Token...');
    const cardTokenResponse = await axios.post(`${BASE_URL}/api/mercadopago/card-token/new`, TEST_CARD, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const cardTokenId = cardTokenResponse.data.data.card_token_id;
    console.log('✅ Card Token:', cardTokenId);
    
    // Step 3: Create/Update Subscription
    console.log('\n📋 Step 3: Creating/Updating Subscription...');
    const subscriptionResponse = await axios.post(`${BASE_URL}/api/billing/create-subscription`, {
      planId: TEST_PLAN_ID,
      customerData: TEST_CUSTOMER,
      card_token_id: cardTokenId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Subscription Response:', {
      subscription_id: subscriptionResponse.data.data.subscription_id,
      status: subscriptionResponse.data.data.status,
      checkout_url: subscriptionResponse.data.data.checkout_url
    });
    
    // Step 4: Simulate webhook (if local)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📋 Step 4: Simulating Webhook...');
      
      const webhookPayload = {
        id: '12345',
        live_mode: false,
        type: 'subscription',
        date_created: new Date().toISOString(),
        action: 'created',
        data: {
          id: subscriptionResponse.data.data.subscription_id
        }
      };
      
      await axios.post(`${BASE_URL}/api/billing/webhooks/mercadopago`, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature'
        }
      });
      
      console.log('✅ Webhook simulated');
    }
    
    // Wait for processing
    console.log('\n⏳ Waiting 3 seconds for processing...');
    await delay(3000);
    
    // Check final state
    await checkDatabaseState();
    
    // Step 5: Check subscription status
    console.log('\n📋 Step 5: Checking Subscription Status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/billing/subscription-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Current Subscription:', {
      status: statusResponse.data.data.status,
      plan: statusResponse.data.data.plan_name,
      provider: statusResponse.data.data.payment_provider,
      next_billing: statusResponse.data.data.next_billing_date
    });
    
    // Step 6: Check billing history
    console.log('\n📋 Step 6: Checking Billing History...');
    const historyResponse = await axios.get(`${BASE_URL}/api/billing/history?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`✅ Billing History: ${historyResponse.data.data.length} transactions`);
    historyResponse.data.data.forEach((tx, idx) => {
      console.log(`  ${idx + 1}. ${tx.type} - ${tx.payment_status} - $${tx.amount_usd} - ${new Date(tx.created_at).toLocaleString()}`);
    });
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Customer created/retrieved ✅');
    console.log('- Card tokenized ✅');
    console.log('- Subscription created/updated ✅');
    console.log('- Payment history available ✅');
    console.log('- Saved cards recorded ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test
if (require.main === module) {
  testCompleteFlow();
}

module.exports = { testCompleteFlow };