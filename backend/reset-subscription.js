// Reset subscription para probar webhook
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function resetSubscription() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    
    console.log('🔧 Resetting subscription for testing...');
    
    // Reset subscription
    const resetQuery = `
      UPDATE whatsapp_bot.subscriptions 
      SET 
        stripe_subscription_id = NULL,
        stripe_customer_id = NULL,
        status = 'pending_payment',
        updated_at = NOW()
      WHERE company_id = $1
    `;
    
    const result = await pool.query(resetQuery, [companyId]);
    console.log('✅ Reset complete:', result.rowCount, 'rows updated');
    
    // Delete test transactions
    const deleteQuery = `
      DELETE FROM whatsapp_bot.billing_transactions 
      WHERE company_id = $1 AND payment_method = 'stripe'
    `;
    
    const deleteResult = await pool.query(deleteQuery, [companyId]);
    console.log('✅ Deleted', deleteResult.rowCount, 'test transactions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetSubscription();