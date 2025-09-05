// Test directo del endpoint subscription-status
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function testSubscriptionEndpoint() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    
    console.log('🧪 Testing subscription endpoint query...');
    
    // Exactamente la misma query que usa el endpoint (corregida)
    const query = `
      SELECT 
        s.*,
        p.name as plan_name,
        p.key as plan_key,
        p.name as plan_display_name,
        p.price_usd,
        p.billing_period,
        p.max_instances,
        p.max_messages,
        p.max_contacts,
        p.included_tokens,
        p.allow_overage as overage_enabled,
        p.overage_rate_per_token,
        CASE 
          WHEN s.current_period_end IS NOT NULL 
          THEN s.current_period_end 
          ELSE NOW() + INTERVAL '30 days' 
        END as next_billing_date
      FROM whatsapp_bot.subscriptions s
      JOIN whatsapp_bot.plans p ON s.plan_id = p.id
      WHERE s.company_id = $1 AND s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [companyId]);
    const subscription = result.rows[0];

    if (!subscription) {
      console.log('❌ Query result: No subscription found');
      console.log('   This would return 404 with message: No se encontró subscripción activa');
    } else {
      console.log('✅ Query result: Subscription found');
      console.log('📋 Subscription details:');
      console.log('  Status:', subscription.status);
      console.log('  Plan:', subscription.plan_name);
      console.log('  Plan Key:', subscription.plan_key);
      console.log('  Price USD:', subscription.price_usd);
      console.log('  Max instances:', subscription.max_instances);
      console.log('  Stripe ID:', subscription.stripe_subscription_id);
      
      // Calcular días restantes como lo hace el endpoint
      let daysRemaining = null;
      if (subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      console.log('  Days remaining:', daysRemaining);
      console.log('  Payment provider:', subscription.stripe_subscription_id ? 'stripe' : 'mercadopago');
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testSubscriptionEndpoint();