// Simulate what the frontend should be doing
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function simulateFrontendCall() {
  try {
    const companyId = '2ea324e7-7ea7-437e-8e44-14c4002c72eb';
    
    console.log('🧪 Simulating frontend call to /plans/available...');
    console.log('🏢 Company ID:', companyId);
    
    // Simulate what the endpoint does with authentication
    
    // 1. Get all plans
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
    
    // 2. Get current plan (what optionalAuth + controller should do)
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
    
    // 3. Mark current plan
    const plansWithCurrentStatus = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      key: plan.key,
      price_usd: plan.price_usd,
      is_current: currentPlanId && plan.id === currentPlanId
    }));
    
    console.log('📊 Plans with current status:');
    plansWithCurrentStatus.forEach(plan => {
      const status = plan.is_current ? '✅ CURRENT' : '⬜ Available';
      console.log(`  ${plan.name} ($${plan.price_usd}) - ${status}`);
    });
    
    console.log('---');
    console.log('🎯 Frontend should receive:');
    const response = {
      success: true,
      data: plansWithCurrentStatus,
      current_plan_id: currentPlanId
    };
    
    console.log(JSON.stringify(response, null, 2));
    
    // 4. Check what current plan name is
    const currentPlan = plans.find(p => p.id === currentPlanId);
    console.log('---');
    console.log('🔍 Current plan details:', currentPlan?.name);
    
    if (currentPlan) {
      console.log('✅ Frontend should show "Plan Actual" or "Current Plan" for:', currentPlan.name);
      console.log('✅ Frontend should disable/hide "Seleccionar Plan" button for:', currentPlan.name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

simulateFrontendCall();