const { pool } = require('../database');

class PlatformPlanService {

  /**
   * Obtener todos los planes
   */
  async getAllPlans() {
    const query = `
      SELECT 
        p.*,
        pa.username as created_by_username
      FROM whatsapp_bot.plans p
      LEFT JOIN public.platform_admins pa ON p.created_by = pa.id
      WHERE p.active = true
      ORDER BY p.sort_order ASC, p.created_at ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Obtener plan por ID
   */
  async getPlanById(planId) {
    const query = `
      SELECT 
        p.*,
        pa.username as created_by_username
      FROM whatsapp_bot.plans p
      LEFT JOIN public.platform_admins pa ON p.created_by = pa.id
      WHERE p.id = $1 AND p.active = true
    `;
    
    const result = await pool.query(query, [planId]);
    return result.rows[0];
  }

  /**
   * Obtener plan por key
   */
  async getPlanByKey(key) {
    const query = `
      SELECT * FROM whatsapp_bot.plans 
      WHERE key = $1 AND active = true
    `;
    
    const result = await pool.query(query, [key]);
    return result.rows[0];
  }

  /**
   * Crear nuevo plan
   */
  async createPlan(planData, createdBy) {
    const {
      name, key, description, price_usd, currency, billing_period,
      max_instances, max_messages, max_contacts, included_tokens,
      allow_overage, overage_rate_per_token, max_overage_usd,
      embeddings, campaigns, priority_support, analytics, custom_api_key,
      duration_days, duration_hours, sort_order
    } = planData;

    // Verificar que no exista el key
    const existingPlan = await this.getPlanByKey(key);
    if (existingPlan) {
      throw new Error(`Ya existe un plan con la clave "${key}"`);
    }

    const query = `
      INSERT INTO whatsapp_bot.plans (
        name, key, description, price_usd, currency, billing_period,
        max_instances, max_messages, max_contacts, included_tokens,
        allow_overage, overage_rate_per_token, max_overage_usd,
        embeddings, campaigns, priority_support, analytics, custom_api_key,
        duration_days, duration_hours, sort_order, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *
    `;

    const result = await pool.query(query, [
      name, key, description, price_usd || 0, currency || 'USD', billing_period || 'monthly',
      max_instances || 1, max_messages || 1000, max_contacts || 500, included_tokens || 50000,
      allow_overage || false, overage_rate_per_token || 0.0001, max_overage_usd || 0,
      embeddings !== false, campaigns !== false, priority_support || false, analytics !== false, custom_api_key || false,
      duration_days || -1, duration_hours, sort_order || 0, createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Actualizar plan existente
   */
  async updatePlan(planId, planData, updatedBy) {
    const {
      name, key, description, price_usd, currency, billing_period,
      max_instances, max_messages, max_contacts, included_tokens,
      allow_overage, overage_rate_per_token, max_overage_usd,
      embeddings, campaigns, priority_support, analytics, custom_api_key,
      duration_days, duration_hours, sort_order
    } = planData;

    // Verificar que el plan existe
    const existingPlan = await this.getPlanById(planId);
    if (!existingPlan) {
      throw new Error('Plan no encontrado');
    }

    // Si cambió el key, verificar que no exista otro plan con ese key
    if (key && key !== existingPlan.key) {
      const planWithSameKey = await this.getPlanByKey(key);
      if (planWithSameKey && planWithSameKey.id !== planId) {
        throw new Error(`Ya existe un plan con la clave "${key}"`);
      }
    }

    const query = `
      UPDATE whatsapp_bot.plans SET
        name = COALESCE($2, name),
        key = COALESCE($3, key),
        description = COALESCE($4, description),
        price_usd = COALESCE($5, price_usd),
        currency = COALESCE($6, currency),
        billing_period = COALESCE($7, billing_period),
        max_instances = COALESCE($8, max_instances),
        max_messages = COALESCE($9, max_messages),
        max_contacts = COALESCE($10, max_contacts),
        included_tokens = COALESCE($11, included_tokens),
        allow_overage = COALESCE($12, allow_overage),
        overage_rate_per_token = COALESCE($13, overage_rate_per_token),
        max_overage_usd = COALESCE($14, max_overage_usd),
        embeddings = COALESCE($15, embeddings),
        campaigns = COALESCE($16, campaigns),
        priority_support = COALESCE($17, priority_support),
        analytics = COALESCE($18, analytics),
        custom_api_key = COALESCE($19, custom_api_key),
        duration_days = COALESCE($20, duration_days),
        duration_hours = $21,
        sort_order = COALESCE($22, sort_order),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [
      planId, name, key, description, price_usd, currency, billing_period,
      max_instances, max_messages, max_contacts, included_tokens,
      allow_overage, overage_rate_per_token, max_overage_usd,
      embeddings, campaigns, priority_support, analytics, custom_api_key,
      duration_days, duration_hours, sort_order
    ]);

    return result.rows[0];
  }

  /**
   * Eliminar plan (soft delete)
   */
  async deletePlan(planId) {
    // Verificar si hay empresas usando este plan
    const companiesUsingPlan = await pool.query(
      'SELECT COUNT(*) as count FROM whatsapp_bot.subscriptions WHERE plan_id = $1 AND status = $2',
      [planId, 'active']
    );

    if (parseInt(companiesUsingPlan.rows[0].count) > 0) {
      throw new Error('No se puede eliminar un plan que tiene subscripciones activas');
    }

    const query = `
      UPDATE whatsapp_bot.plans 
      SET active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [planId]);
    return result.rows[0];
  }

  /**
   * Reordenar planes
   */
  async reorderPlans(planOrders) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const { id, sort_order } of planOrders) {
        await client.query(
          'UPDATE whatsapp_bot.plans SET sort_order = $2, updated_at = NOW() WHERE id = $1',
          [id, sort_order]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener estadísticas de uso de planes
   */
  async getPlanStatistics() {
    const query = `
      SELECT 
        p.key,
        p.name,
        p.price_usd,
        COUNT(s.id) as active_subscriptions,
        SUM(CASE WHEN s.status = 'active' THEN p.price_usd ELSE 0 END) as monthly_revenue,
        AVG(s.current_month_tokens) as avg_token_usage,
        SUM(s.current_month_overage_cost) as total_overage_revenue
      FROM whatsapp_bot.plans p
      LEFT JOIN whatsapp_bot.subscriptions s ON p.id = s.plan_id AND s.status = 'active'
      WHERE p.active = true
      GROUP BY p.id, p.key, p.name, p.price_usd, p.sort_order
      ORDER BY p.sort_order
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Migrar empresas existentes a nuevo sistema de subscripciones
   */
  async migrateExistingCompanies() {
    const companiesQuery = `
      SELECT id, plan, max_instances, max_messages, max_contacts, plan_expires_at
      FROM whatsapp_bot.companies 
      WHERE id NOT IN (SELECT company_id FROM whatsapp_bot.subscriptions WHERE status = 'active')
    `;

    const companies = await pool.query(companiesQuery);
    const migrated = [];

    for (const company of companies.rows) {
      try {
        // Buscar el plan correspondiente
        const plan = await this.getPlanByKey(company.plan);
        if (!plan) {
          console.log(`Plan ${company.plan} not found for company ${company.id}`);
          continue;
        }

        // Crear subscripción
        const subscriptionQuery = `
          INSERT INTO whatsapp_bot.subscriptions (
            company_id, plan_id, status,
            current_period_start, current_period_end,
            custom_max_instances, custom_max_messages, custom_max_contacts
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;

        const subscription = await pool.query(subscriptionQuery, [
          company.id,
          plan.id,
          company.plan_expires_at && new Date(company.plan_expires_at) < new Date() ? 'expired' : 'active',
          new Date(),
          company.plan_expires_at,
          company.max_instances !== plan.max_instances ? company.max_instances : null,
          company.max_messages !== plan.max_messages ? company.max_messages : null,
          company.max_contacts !== plan.max_contacts ? company.max_contacts : null
        ]);

        migrated.push(subscription.rows[0]);
      } catch (error) {
        console.error(`Error migrating company ${company.id}:`, error);
      }
    }

    return migrated;
  }
}

module.exports = new PlatformPlanService();