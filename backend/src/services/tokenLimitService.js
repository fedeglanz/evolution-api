const { pool } = require('../database');

class TokenLimitService {
  constructor() {
    // Cache para evitar consultas repetitivas (TTL: 5 minutos)
    this.limitCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    
    // Niveles de alerta
    this.alertLevels = {
      WARNING: 0.8,  // 80%
      CRITICAL: 0.95, // 95%
      BLOCKED: 1.0   // 100%
    };
  }

  /**
   * Verificar si una empresa puede usar tokens antes de procesamiento
   */
  async canUseTokens(companyId, estimatedTokens = 100) {
    try {
      const limits = await this.getCompanyLimits(companyId);
      
      if (!limits) {
        console.log(`⚠️ No se encontraron límites para empresa ${companyId}`);
        return { canUse: true, reason: 'no_limits_found' };
      }

      // Si no hay límites de tokens, permitir
      if (limits.monthly_token_limit === -1 || limits.monthly_token_limit === null) {
        return { canUse: true, reason: 'unlimited_plan' };
      }

      const currentUsage = limits.current_month_tokens || 0;
      const tokenLimit = limits.monthly_token_limit;
      const projectedUsage = currentUsage + estimatedTokens;
      const usagePercentage = projectedUsage / tokenLimit;

      // Verificar si excedería el límite base
      if (projectedUsage > tokenLimit) {
        // Verificar si permite overage
        if (!limits.allow_overage) {
          return {
            canUse: false,
            reason: 'token_limit_exceeded',
            details: {
              current: currentUsage,
              limit: tokenLimit,
              estimated: estimatedTokens,
              overage_allowed: false
            }
          };
        }

        // Calcular overage
        const overageTokens = projectedUsage - tokenLimit;
        const overageCost = overageTokens * limits.overage_rate_per_token;
        const currentOverageCost = limits.current_month_overage_cost || 0;
        const totalOverageCost = currentOverageCost + overageCost;

        // Verificar límite de overage
        if (totalOverageCost > limits.max_overage_usd) {
          return {
            canUse: false,
            reason: 'overage_limit_exceeded',
            details: {
              current: currentUsage,
              limit: tokenLimit,
              estimated: estimatedTokens,
              overage_cost: totalOverageCost,
              max_overage_usd: limits.max_overage_usd,
              overage_allowed: true
            }
          };
        }

        return {
          canUse: true,
          reason: 'overage_allowed',
          details: {
            current: currentUsage,
            limit: tokenLimit,
            estimated: estimatedTokens,
            overage_tokens: overageTokens,
            overage_cost: overageCost,
            total_overage_cost: totalOverageCost
          }
        };
      }

      return {
        canUse: true,
        reason: 'within_limits',
        details: {
          current: currentUsage,
          limit: tokenLimit,
          estimated: estimatedTokens,
          percentage: usagePercentage
        }
      };

    } catch (error) {
      console.error('❌ Error verificando límites de tokens:', error);
      // En caso de error, permitir (fail-open para disponibilidad)
      return { canUse: true, reason: 'error_checking_limits' };
    }
  }

  /**
   * Registrar uso de tokens después del procesamiento
   */
  async recordTokenUsage(companyId, botId, tokensUsed, cost = 0, model = 'gpt-3.5-turbo') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Actualizar bot_usage agregado por fecha
      const today = new Date().toISOString().split('T')[0];
      
      const botUsageQuery = `
        INSERT INTO whatsapp_bot.bot_usage (
          company_id, bot_id, date, tokens_consumed, openai_cost_usd, messages_sent
        ) VALUES ($1, $2, $3, $4, $5, 1)
        ON CONFLICT (company_id, bot_id, date) 
        DO UPDATE SET
          tokens_consumed = bot_usage.tokens_consumed + $4,
          openai_cost_usd = bot_usage.openai_cost_usd + $5,
          messages_sent = bot_usage.messages_sent + 1,
          updated_at = NOW()
      `;
      
      await client.query(botUsageQuery, [companyId, botId, today, tokensUsed, cost]);

      // 2. Actualizar subscription con uso mensual
      const subscriptionQuery = `
        UPDATE whatsapp_bot.subscriptions 
        SET 
          current_month_tokens = COALESCE(current_month_tokens, 0) + $2,
          current_month_overage_cost = COALESCE(current_month_overage_cost, 0) + $3,
          updated_at = NOW()
        WHERE company_id = $1 AND status = 'active'
      `;
      
      await client.query(subscriptionQuery, [companyId, tokensUsed, cost]);

      await client.query('COMMIT');
      
      // 3. Verificar si necesita alertas
      await this.checkAndSendAlerts(companyId, tokensUsed);
      
      console.log(`📊 Tokens registrados: ${tokensUsed} tokens, $${cost} para empresa ${companyId}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error registrando uso de tokens:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener límites actuales de una empresa (con cache)
   */
  async getCompanyLimits(companyId) {
    const cacheKey = `limits_${companyId}`;
    const cached = this.limitCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const query = `
      SELECT 
        s.company_id,
        s.current_month_tokens,
        s.current_month_overage_cost,
        
        -- Límites del plan o personalizados
        COALESCE(s.custom_included_tokens, p.included_tokens) as monthly_token_limit,
        COALESCE(s.custom_max_overage_usd, p.max_overage_usd) as max_overage_usd,
        
        -- Configuración de overage
        p.allow_overage,
        p.overage_rate_per_token,
        
        -- Info del plan
        p.name as plan_name,
        p.key as plan_key
      FROM whatsapp_bot.subscriptions s
      JOIN whatsapp_bot.plans p ON s.plan_id = p.id
      WHERE s.company_id = $1 AND s.status = 'active'
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [companyId]);
      const data = result.rows[0] || null;
      
      // Cache result
      this.limitCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo límites:', error);
      return null;
    }
  }

  /**
   * Verificar y enviar alertas automáticas
   */
  async checkAndSendAlerts(companyId, recentTokens = 0) {
    try {
      const limits = await this.getCompanyLimits(companyId);
      if (!limits || limits.monthly_token_limit === -1) return;

      const currentUsage = limits.current_month_tokens || 0;
      const tokenLimit = limits.monthly_token_limit;
      const usagePercentage = currentUsage / tokenLimit;

      let alertLevel = null;
      if (usagePercentage >= this.alertLevels.BLOCKED) {
        alertLevel = 'BLOCKED';
      } else if (usagePercentage >= this.alertLevels.CRITICAL) {
        alertLevel = 'CRITICAL';
      } else if (usagePercentage >= this.alertLevels.WARNING) {
        alertLevel = 'WARNING';
      }

      if (alertLevel) {
        await this.sendAlert(companyId, alertLevel, {
          current_tokens: currentUsage,
          token_limit: tokenLimit,
          percentage: Math.round(usagePercentage * 100),
          plan_name: limits.plan_name,
          recent_tokens: recentTokens
        });
      }

    } catch (error) {
      console.error('❌ Error enviando alertas:', error);
    }
  }

  /**
   * Enviar alerta (placeholder - implementar con sistema de notificaciones)
   */
  async sendAlert(companyId, level, details) {
    // TODO: Integrar con sistema de notificaciones (email, webhook, etc.)
    console.log(`🚨 ALERTA ${level} - Empresa ${companyId}:`, details);
    
    // Guardar en log de alerts para seguimiento
    try {
      const alertQuery = `
        INSERT INTO whatsapp_bot.usage_alerts (
          company_id, alert_level, alert_data, created_at
        ) VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
      `;
      
      // Crear tabla si no existe (se puede mover a migración)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_bot.usage_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id),
          alert_level VARCHAR(20) NOT NULL,
          alert_data JSONB NOT NULL,
          resolved BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(company_id, alert_level, DATE(created_at))
        )
      `);
      
      await pool.query(alertQuery, [companyId, level, JSON.stringify(details)]);
      
    } catch (error) {
      console.error('❌ Error guardando alerta:', error);
    }
  }

  /**
   * Obtener estadísticas de uso para dashboard
   */
  async getUsageStats(companyId) {
    try {
      const limits = await this.getCompanyLimits(companyId);
      if (!limits) return null;

      const currentUsage = limits.current_month_tokens || 0;
      const tokenLimit = limits.monthly_token_limit;
      const usagePercentage = tokenLimit === -1 ? 0 : (currentUsage / tokenLimit);

      // Obtener uso de los últimos 7 días
      const weeklyUsageQuery = `
        SELECT 
          date,
          SUM(tokens_consumed) as daily_tokens,
          SUM(openai_cost_usd) as daily_cost
        FROM whatsapp_bot.bot_usage 
        WHERE company_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY date 
        ORDER BY date DESC
      `;
      
      const weeklyResult = await pool.query(weeklyUsageQuery, [companyId]);

      return {
        current_month_tokens: currentUsage,
        token_limit: tokenLimit,
        usage_percentage: usagePercentage,
        overage_cost: limits.current_month_overage_cost || 0,
        max_overage_allowed: limits.max_overage_usd || 0,
        allow_overage: limits.allow_overage || false,
        plan_name: limits.plan_name,
        weekly_usage: weeklyResult.rows
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Limpiar cache (útil para testing)
   */
  clearCache() {
    this.limitCache.clear();
  }
}

module.exports = new TokenLimitService();