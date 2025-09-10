require('dotenv').config();
const { pool } = require('./src/database');

async function cleanSubscriptions() {
  const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
  
  try {
    // Ver todas las suscripciones de esta company
    const checkQuery = `
      SELECT id, plan_id, status, 
             mercadopago_subscription_id, 
             stripe_subscription_id,
             created_at, updated_at
      FROM whatsapp_bot.subscriptions 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(checkQuery, [companyId]);
    
    console.log(`\n🔍 Found ${result.rows.length} subscriptions for company ${companyId}:\n`);
    result.rows.forEach((sub, idx) => {
      console.log(`${idx + 1}. ID: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   MercadoPago ID: ${sub.mercadopago_subscription_id || 'N/A'}`);
      console.log(`   Stripe ID: ${sub.stripe_subscription_id || 'N/A'}`);
      console.log(`   Created: ${sub.created_at}`);
      console.log(`   ---`);
    });
    
    if (result.rows.length > 1) {
      console.log('\n⚠️  Multiple subscriptions found! Due to unique constraint, only ONE should exist.');
      console.log('💡 Keeping the most recent one and removing others...\n');
      
      // Mantener solo la más reciente
      const toKeep = result.rows[0];
      const toDelete = result.rows.slice(1);
      
      for (const sub of toDelete) {
        const deleteQuery = 'DELETE FROM whatsapp_bot.subscriptions WHERE id = $1';
        await pool.query(deleteQuery, [sub.id]);
        console.log(`🗑️  Deleted subscription ${sub.id}`);
      }
      
      console.log(`\n✅ Kept subscription ${toKeep.id} (${toKeep.mercadopago_subscription_id || toKeep.stripe_subscription_id})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

cleanSubscriptions();