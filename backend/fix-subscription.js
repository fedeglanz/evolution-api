// Fix manual para activar la suscripción con los datos del webhook
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function fixSubscription() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    const subscriptionId = 'sub_1S40RxRyJBplT2MWUJV5cXn1';
    const sessionId = 'cs_test_a1zIxvcbDSwIOPCqocequOQOcmNp9qXYkP5yULaBIhuvA92TrEZCjQSexp';
    
    console.log('🔧 Fixing subscription for company:', companyId);
    
    // 1. Actualizar suscripción
    const updateQuery = `
      UPDATE whatsapp_bot.subscriptions 
      SET 
        stripe_subscription_id = $2,
        status = 'active',
        updated_at = NOW()
      WHERE company_id = $1 AND status = 'pending_payment'
    `;
    
    const result = await pool.query(updateQuery, [companyId, subscriptionId]);
    console.log('✅ Subscription updated:', result.rowCount, 'rows');
    
    // 2. Obtener subscription_id
    const subQuery = 'SELECT id FROM whatsapp_bot.subscriptions WHERE company_id = $1 LIMIT 1';
    const subResult = await pool.query(subQuery, [companyId]);
    const subscriptionIdDB = subResult.rows[0].id;
    
    // 3. Crear transacción
    const transactionQuery = `
      INSERT INTO whatsapp_bot.billing_transactions (
        subscription_id, company_id, type, description, amount_usd, 
        currency, payment_status, payment_method, stripe_payment_intent_id,
        paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;
    
    await pool.query(transactionQuery, [
      subscriptionIdDB,
      companyId,
      'subscription',
      'Starter Plan subscription payment',
      15.00,
      'USD',
      'paid',
      'stripe',
      sessionId
    ]);
    
    console.log('✅ Transaction created');
    
    // 3. Verificar
    const checkQuery = `
      SELECT s.*, p.name as plan_name
      FROM whatsapp_bot.subscriptions s
      JOIN whatsapp_bot.plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
    `;
    
    const check = await pool.query(checkQuery, [companyId]);
    console.log('\n📋 Current status:', check.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSubscription();