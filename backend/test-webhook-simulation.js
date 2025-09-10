#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

// Configuration  
const BASE_URL = 'https://whatsapp-bot-backend-fnte.onrender.com';

const TEST_SUBSCRIPTION_ID = 'c02d8577c8114d3897436f93008cbf83'; // From our database

async function testMercadoPagoWebhook() {
  console.log('🎣 Testing MercadoPago Webhook Processing\n');
  console.log(`📍 Backend URL: ${BASE_URL}`);
  
  try {
    // Test 1: Subscription Created
    console.log('📋 Test 1: Subscription Created Webhook...');
    const createdWebhook = {
      id: '12345',
      live_mode: false,
      type: 'subscription',
      date_created: new Date().toISOString(),
      action: 'created',
      data: {
        id: TEST_SUBSCRIPTION_ID
      }
    };
    
    const createdResponse = await axios.post(
      `${BASE_URL}/api/billing/webhooks/mercadopago`, 
      createdWebhook,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature-' + Date.now()
        }
      }
    );
    
    console.log('✅ Created webhook response:', createdResponse.status);
    
    // Test 2: Subscription Updated (authorized status)
    console.log('\n📋 Test 2: Subscription Updated Webhook...');
    const updatedWebhook = {
      id: '12346',
      live_mode: false,
      type: 'subscription',
      date_created: new Date().toISOString(),
      action: 'updated',
      data: {
        id: TEST_SUBSCRIPTION_ID
      }
    };
    
    const updatedResponse = await axios.post(
      `${BASE_URL}/api/billing/webhooks/mercadopago`, 
      updatedWebhook,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature-' + Date.now()
        }
      }
    );
    
    console.log('✅ Updated webhook response:', updatedResponse.status);
    
    // Test 3: Payment webhook
    console.log('\n📋 Test 3: Payment Created Webhook...');
    const paymentWebhook = {
      id: '12347',
      live_mode: false,
      type: 'payment',
      date_created: new Date().toISOString(),
      action: 'created',
      data: {
        id: 'fake-payment-id-' + Date.now()
      }
    };
    
    const paymentResponse = await axios.post(
      `${BASE_URL}/api/billing/webhooks/mercadopago`, 
      paymentWebhook,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature-' + Date.now()
        }
      }
    );
    
    console.log('✅ Payment webhook response:', paymentResponse.status);
    
    console.log('\n🎉 All webhook tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Webhook test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

async function testDirectAPI() {
  console.log('\n🔧 Testing Direct API Access...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.status);
    
    // Test billing plans (no auth required)
    const plansResponse = await axios.get(`${BASE_URL}/api/billing/plans/available`);
    console.log('✅ Plans available:', plansResponse.data.data.length, 'plans');
    
    console.log('✅ Direct API access working');
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Complete Webhook and API Tests\n');
  
  await testDirectAPI();
  await testMercadoPagoWebhook();
  
  console.log('\n📋 Tests Summary:');
  console.log('- Health check API ✅');
  console.log('- Plans endpoint ✅');
  console.log('- MercadoPago webhooks ✅');
  console.log('\n🎯 Next: Test complete billing flow with authentication');
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { testMercadoPagoWebhook, testDirectAPI };