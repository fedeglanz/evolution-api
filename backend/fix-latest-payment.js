// Fix el último pago que hiciste
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function fixLatestPayment() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    const sessionId = 'cs_test_a1BDnAyVmpc2mwTLF7Y3lS2wmmvIgR59lbLe7lN31aMjpKzjlVaha85w5T';
    const customerId = 'cus_T00zDlGbBd77DQ';
    
    console.log('🔧 Fixing latest payment...');
    
    // 1. Actualizar suscripción con el último pago
    const updateQuery = `
      UPDATE whatsapp_bot.subscriptions 
      SET 
        stripe_subscription_id = $2,
        stripe_customer_id = $3,
        status = 'active',
        updated_at = NOW()
      WHERE company_id = $1
    `;
    
    const result = await pool.query(updateQuery, [companyId, sessionId, customerId]);
    console.log('✅ Subscription activated:', result.rowCount, 'rows');
    
    // 2. Verificar estado
    const checkQuery = `
      SELECT s.*, p.name as plan_name
      FROM whatsapp_bot.subscriptions s
      JOIN whatsapp_bot.plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
    `;
    
    const check = await pool.query(checkQuery, [companyId]);
    console.log('\n📋 Current status:');
    console.log('  Status:', check.rows[0].status);
    console.log('  Plan:', check.rows[0].plan_name);
    console.log('  Stripe Customer:', check.rows[0].stripe_customer_id);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixLatestPayment();