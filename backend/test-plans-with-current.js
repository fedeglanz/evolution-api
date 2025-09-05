// Test plans endpoint with current plan detection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function testPlansWithCurrentPlan() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    
    console.log('🧪 Testing plans endpoint logic...');
    
    // Get all plans
    const plansQuery = `
      SELECT 
        id, name, key, description, price_usd, billing_period,
        max_instances, max_messages, max_contacts, included_tokens,
        allow_overage, overage_rate_per_token, max_overage_usd,
        embeddings, campaigns, priority_support, custom_api_key,
        active, sort_order
      FROM whatsapp_bot.plans 
      WHERE active = true
      ORDER BY sort_order ASC, price_usd ASC
    `;
    
    const plansResult = await pool.query(plansQuery);
    const plans = plansResult.rows;
    
    // Get current plan
    const currentPlanQuery = `
      SELECT s.plan_id 
      FROM whatsapp_bot.subscriptions s
      WHERE s.company_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    
    const currentPlanResult = await pool.query(currentPlanQuery, [companyId]);
    const currentPlanId = currentPlanResult.rows[0]?.plan_id;
    
    console.log('📋 Current plan ID:', currentPlanId);
    
    // Mark current plan
    const plansWithCurrentStatus = plans.map(plan => ({
      ...plan,
      is_current: currentPlanId && plan.id === currentPlanId
    }));
    
    console.log('📊 Plans with current status:');
    plansWithCurrentStatus.forEach(plan => {
      console.log(`  ${plan.name} (${plan.key}) - $${plan.price_usd} - ${plan.is_current ? '✅ CURRENT' : '⬜ Available'}`);
    });
    
    console.log('---');
    console.log('🎯 Expected response:');
    console.log({
      success: true,
      data: plansWithCurrentStatus,
      current_plan_id: currentPlanId
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPlansWithCurrentPlan();