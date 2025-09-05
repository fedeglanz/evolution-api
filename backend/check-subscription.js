// Script rápido para verificar estado de suscripción
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSubscription() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    
    console.log('🔍 Checking subscription for company:', companyId);
    console.log('---');

    // Check subscription
    const subQuery = `
      SELECT 
        s.*,
        p.name as plan_name,
        p.price_usd,
        c.name as company_name
      FROM whatsapp_bot.subscriptions s
      LEFT JOIN whatsapp_bot.plans p ON s.plan_id = p.id  
      LEFT JOIN whatsapp_bot.companies c ON s.company_id = c.id
      WHERE s.company_id = $1
      ORDER BY s.updated_at DESC
      LIMIT 1
    `;
    
    const subResult = await pool.query(subQuery, [companyId]);
    
    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      console.log('✅ Subscription found:');
      console.log('  Status:', sub.status);
      console.log('  Plan:', sub.plan_name);
      console.log('  Stripe ID:', sub.stripe_subscription_id);
      console.log('  Next billing:', sub.next_billing_date);
      console.log('  Updated:', sub.updated_at);
    } else {
      console.log('❌ No subscription found');
    }
    
    console.log('---');

    // Check if transactions table exists and get structure
    try {
      const tableQuery = `
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'whatsapp_bot' AND table_name = 'billing_transactions'
      `;
      
      const tableResult = await pool.query(tableQuery);
      console.log('📋 billing_transactions columns:', tableResult.rows.map(r => r.column_name));
      
      if (tableResult.rows.length > 0) {
        const transQuery = `SELECT * FROM whatsapp_bot.billing_transactions WHERE company_id = $1 LIMIT 3`;
        const transResult = await pool.query(transQuery, [companyId]);
        
        if (transResult.rows.length > 0) {
          console.log('💳 Recent transactions:', transResult.rows);
        } else {
          console.log('❌ No transactions found');
        }
      } else {
        console.log('❌ billing_transactions table does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking transactions:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSubscription();