const { pool } = require('../database');

class PlatformBillingController {
  constructor() {
    // Bind methods to preserve context
    this.getBillingMetrics = this.getBillingMetrics.bind(this);
    this.getAllSubscriptions = this.getAllSubscriptions.bind(this);
    this.getAllTransactions = this.getAllTransactions.bind(this);
    this.exportData = this.exportData.bind(this);
  }

  /**
   * GET /api/platform-admin/billing/metrics
   * Get billing metrics for admin dashboard
   */
  async getBillingMetrics(req, res) {
    try {
      const { dateRange = '30d', provider = 'all' } = req.query;
      
      // Calculate date filter
      let dateFilter = '';
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      dateFilter = `AND created_at >= '${startDate.toISOString()}'`;

      // Provider filter
      let providerFilter = '';
      if (provider !== 'all') {
        providerFilter = provider === 'stripe' 
          ? `AND stripe_subscription_id IS NOT NULL`
          : `AND mercadopago_subscription_id IS NOT NULL`;
      }

      // Get total revenue
      const totalRevenueQuery = `
        SELECT 
          COALESCE(SUM(amount_usd), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN payment_method = 'stripe' THEN amount_usd ELSE 0 END), 0) as stripe_revenue,
          COALESCE(SUM(CASE WHEN payment_method = 'mercadopago' THEN amount_usd ELSE 0 END), 0) as mercadopago_revenue
        FROM whatsapp_bot.billing_transactions 
        WHERE payment_status = 'paid' ${dateFilter.replace('created_at', 'paid_at')}
      `;

      // Get monthly recurring revenue (active subscriptions)
      const mrrQuery = `
        SELECT 
          COALESCE(SUM(p.price_usd), 0) as monthly_revenue,
          COUNT(*) as active_subscriptions
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        WHERE s.status = 'active' ${providerFilter}
      `;

      // Get churn rate (cancelled in last period vs total active at start of period)
      const churnQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'cancelled' AND updated_at >= '${startDate.toISOString()}' THEN 1 END) as cancelled_count,
          COUNT(*) as total_subscriptions
        FROM whatsapp_bot.subscriptions
        WHERE created_at < '${startDate.toISOString()}' ${providerFilter}
      `;

      const [totalRevenueResult, mrrResult, churnResult] = await Promise.all([
        pool.query(totalRevenueQuery),
        pool.query(mrrQuery),
        pool.query(churnQuery)
      ]);

      const totalRevenue = totalRevenueResult.rows[0] || {};
      const mrr = mrrResult.rows[0] || {};
      const churn = churnResult.rows[0] || {};

      // Calculate churn rate
      const churnRate = churn.total_subscriptions > 0 
        ? ((churn.cancelled_count / churn.total_subscriptions) * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        data: {
          total_revenue: parseFloat(totalRevenue.total_revenue) || 0,
          monthly_revenue: parseFloat(mrr.monthly_revenue) || 0,
          active_subscriptions: parseInt(mrr.active_subscriptions) || 0,
          churn_rate: parseFloat(churnRate),
          stripe_revenue: parseFloat(totalRevenue.stripe_revenue) || 0,
          mercadopago_revenue: parseFloat(totalRevenue.mercadopago_revenue) || 0,
          period: dateRange,
          provider: provider
        }
      });

    } catch (error) {
      console.error('❌ Error getting billing metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/platform-admin/billing/subscriptions
   * Get all subscriptions with filters
   */
  async getAllSubscriptions(req, res) {
    try {
      const { 
        status = 'all',
        provider = 'all',
        plan = 'all',
        search = '',
        sortBy = 'created_at',
        sortDirection = 'desc',
        limit = 50,
        offset = 0
      } = req.query;

      let whereConditions = [];
      let params = [];
      let paramCounter = 1;

      // Status filter
      if (status !== 'all') {
        whereConditions.push(`s.status = $${paramCounter}`);
        params.push(status);
        paramCounter++;
      }

      // Provider filter
      if (provider === 'stripe') {
        whereConditions.push(`s.stripe_subscription_id IS NOT NULL`);
      } else if (provider === 'mercadopago') {
        whereConditions.push(`s.mercadopago_subscription_id IS NOT NULL`);
      }

      // Plan filter
      if (plan !== 'all') {
        whereConditions.push(`p.key = $${paramCounter}`);
        params.push(plan);
        paramCounter++;
      }

      // Search filter
      if (search) {
        whereConditions.push(`(c.name ILIKE $${paramCounter} OR u.email ILIKE $${paramCounter})`);
        params.push(`%${search}%`);
        paramCounter++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sortBy to prevent SQL injection
      const allowedSortFields = ['created_at', 'updated_at', 'status', 'price_usd', 'plan_name', 'company_name'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortDirection = sortDirection.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const query = `
        SELECT 
          s.id,
          s.status,
          s.created_at,
          s.updated_at,
          s.current_period_end as next_billing_date,
          s.stripe_subscription_id,
          s.stripe_customer_id,
          s.mercadopago_subscription_id,
          s.mercadopago_customer_id,
          CASE 
            WHEN s.stripe_subscription_id IS NOT NULL THEN 'stripe'
            WHEN s.mercadopago_subscription_id IS NOT NULL THEN 'mercadopago'
            ELSE 'unknown'
          END as payment_provider,
          p.name as plan_name,
          p.key as plan_key,
          p.price_usd,
          c.name as company_name,
          u.email as user_email
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        JOIN whatsapp_bot.companies c ON s.company_id = c.id
        JOIN whatsapp_bot.users u ON c.id = u.company_id
        ${whereClause}
        ORDER BY ${safeSortBy === 'plan_name' ? 'p.name' : safeSortBy === 'company_name' ? 'c.name' : 's.' + safeSortBy} ${safeSortDirection}
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;

      params.push(parseInt(limit), parseInt(offset));

      // Also get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.subscriptions s
        JOIN whatsapp_bot.plans p ON s.plan_id = p.id
        JOIN whatsapp_bot.companies c ON s.company_id = c.id
        JOIN whatsapp_bot.users u ON c.id = u.company_id
        ${whereClause}
      `;

      const [subscriptions, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);

      res.json({
        success: true,
        data: subscriptions.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('❌ Error getting subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/platform-admin/billing/transactions
   * Get all transactions with filters
   */
  async getAllTransactions(req, res) {
    try {
      const { 
        status = 'all',
        provider = 'all',
        search = '',
        dateRange = '30d',
        sortBy = 'created_at',
        sortDirection = 'desc',
        limit = 100,
        offset = 0
      } = req.query;

      let whereConditions = [];
      let params = [];
      let paramCounter = 1;

      // Date range filter
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      whereConditions.push(`bt.created_at >= $${paramCounter}`);
      params.push(startDate.toISOString());
      paramCounter++;

      // Status filter
      if (status !== 'all') {
        whereConditions.push(`bt.payment_status = $${paramCounter}`);
        params.push(status);
        paramCounter++;
      }

      // Provider filter
      if (provider !== 'all') {
        whereConditions.push(`bt.payment_method = $${paramCounter}`);
        params.push(provider);
        paramCounter++;
      }

      // Search filter
      if (search) {
        whereConditions.push(`(c.name ILIKE $${paramCounter} OR bt.description ILIKE $${paramCounter})`);
        params.push(`%${search}%`);
        paramCounter++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sortBy
      const allowedSortFields = ['created_at', 'amount_usd', 'payment_status', 'payment_method'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortDirection = sortDirection.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const query = `
        SELECT 
          bt.id,
          bt.type,
          bt.description,
          bt.amount_usd,
          bt.currency,
          bt.payment_status,
          bt.payment_method,
          bt.stripe_payment_intent_id,
          bt.stripe_invoice_id,
          bt.mercadopago_payment_id,
          bt.paid_at,
          bt.created_at,
          c.name as company_name,
          u.email as user_email
        FROM whatsapp_bot.billing_transactions bt
        JOIN whatsapp_bot.subscriptions s ON bt.subscription_id = s.id
        JOIN whatsapp_bot.companies c ON s.company_id = c.id
        JOIN whatsapp_bot.users u ON c.id = u.company_id
        ${whereClause}
        ORDER BY bt.${safeSortBy} ${safeSortDirection}
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;

      params.push(parseInt(limit), parseInt(offset));

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.billing_transactions bt
        JOIN whatsapp_bot.subscriptions s ON bt.subscription_id = s.id
        JOIN whatsapp_bot.companies c ON s.company_id = c.id
        JOIN whatsapp_bot.users u ON c.id = u.company_id
        ${whereClause}
      `;

      const [transactions, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, -2))
      ]);

      res.json({
        success: true,
        data: transactions.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/platform-admin/billing/export
   * Export billing data (CSV format)
   */
  async exportData(req, res) {
    try {
      const { type = 'subscriptions', format = 'csv' } = req.query;

      // For now, just return success - implement actual export logic later
      res.json({
        success: true,
        message: `Export ${type} in ${format} format iniciado`,
        download_url: null // Will be implemented later
      });

    } catch (error) {
      console.error('❌ Error exporting data:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

// Export instance and individual methods
const platformBillingControllerInstance = new PlatformBillingController();

module.exports = {
  getBillingMetrics: platformBillingControllerInstance.getBillingMetrics,
  getAllSubscriptions: platformBillingControllerInstance.getAllSubscriptions,
  getAllTransactions: platformBillingControllerInstance.getAllTransactions,
  exportData: platformBillingControllerInstance.exportData,
  
  // Also export the full instance
  instance: platformBillingControllerInstance
};