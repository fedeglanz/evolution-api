const { pool } = require('../database');
const config = require('../config');

class PlanService {
  
  /**
   * Verificar límites y estado del plan de una empresa
   */
  async checkPlanLimits(companyId) {
    const companyQuery = `
      SELECT 
        c.plan, 
        c.max_instances, 
        c.max_messages,
        c.max_contacts,
        c.created_at,
        c.plan_expires_at,
        c.trial_started_at,
        c.trial_used
      FROM whatsapp_bot.companies c 
      WHERE c.id = $1
    `;
    
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      throw new Error('Empresa no encontrada');
    }
    
    const company = companyResult.rows[0];
    const planConfig = config.PLANS[company.plan];
    
    if (!planConfig) {
      throw new Error(`Plan "${company.plan}" no válido`);
    }

    // Verificar expiración del plan
    const now = new Date();
    let planExpired = false;
    let daysUntilExpiration = null;
    
    if (company.plan_expires_at) {
      const expirationDate = new Date(company.plan_expires_at);
      planExpired = expirationDate < now;
      
      if (!planExpired) {
        const timeDiff = expirationDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
    }

    // Contar recursos actuales
    const [instancesResult, messagesResult, contactsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1', [companyId]),
      pool.query(`SELECT COUNT(*) as total FROM whatsapp_bot.messages 
                  WHERE company_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`, [companyId]),
      pool.query('SELECT COUNT(*) as total FROM whatsapp_bot.contacts WHERE company_id = $1', [companyId])
    ]);

    const currentInstances = parseInt(instancesResult.rows[0].total);
    const currentMessages = parseInt(messagesResult.rows[0].total);
    const currentContacts = parseInt(contactsResult.rows[0].total);
    
    // Usar límites de la base de datos (pueden ser personalizados por empresa)
    const maxInstances = company.max_instances === -1 ? Infinity : company.max_instances;
    const maxMessages = company.max_messages === -1 ? Infinity : company.max_messages;
    const maxContacts = company.max_contacts === -1 ? Infinity : company.max_contacts;
    
    // Si el plan expiró, usar límites restrictivos
    const effectiveLimits = planExpired ? {
      instances: config.PLANS.free_trial.max_instances,
      messages: config.PLANS.free_trial.max_messages,
      contacts: config.PLANS.free_trial.max_contacts
    } : {
      instances: maxInstances,
      messages: maxMessages,
      contacts: maxContacts
    };
    
    return {
      planName: planConfig.name || company.plan,
      planKey: company.plan,
      planPrice: planConfig.price || 0,
      
      // Estado del plan
      planExpired,
      daysUntilExpiration,
      trialUsed: company.trial_used,
      
      // Límites y uso actual
      limits: {
        instances: {
          max: company.max_instances,
          current: currentInstances,
          canCreate: currentInstances < effectiveLimits.instances,
          percentage: maxInstances === Infinity ? 0 : Math.round((currentInstances / maxInstances) * 100)
        },
        messages: {
          max: company.max_messages,
          current: currentMessages,
          canSend: currentMessages < effectiveLimits.messages,
          percentage: maxMessages === Infinity ? 0 : Math.round((currentMessages / maxMessages) * 100)
        },
        contacts: {
          max: company.max_contacts,
          current: currentContacts,
          canAdd: currentContacts < effectiveLimits.contacts,
          percentage: maxContacts === Infinity ? 0 : Math.round((currentContacts / maxContacts) * 100)
        }
      },
      
      // Funciones disponibles
      features: {
        embeddings: planConfig.embeddings,
        campaigns: planConfig.campaigns,
        prioritySupport: planConfig.priority_support,
        analytics: planConfig.analytics
      }
    };
  }

  /**
   * Actualizar plan de una empresa
   */
  async updateCompanyPlan(companyId, newPlan, customLimits = {}) {
    const planConfig = config.PLANS[newPlan];
    
    if (!planConfig) {
      throw new Error(`Plan "${newPlan}" no existe`);
    }

    const now = new Date();
    let expirationDate = null;
    
    // Calcular fecha de expiración para planes temporales
    if (planConfig.duration_hours) {
      expirationDate = new Date(now.getTime() + planConfig.duration_hours * 60 * 60 * 1000);
    } else if (planConfig.duration_days && planConfig.duration_days > 0) {
      expirationDate = new Date(now.getTime() + planConfig.duration_days * 24 * 60 * 60 * 1000);
    }

    // Usar límites personalizados o los del plan
    const maxInstances = customLimits.max_instances !== undefined ? customLimits.max_instances : planConfig.max_instances;
    const maxMessages = customLimits.max_messages !== undefined ? customLimits.max_messages : planConfig.max_messages;
    const maxContacts = customLimits.max_contacts !== undefined ? customLimits.max_contacts : planConfig.max_contacts;

    const updateQuery = `
      UPDATE whatsapp_bot.companies 
      SET 
        plan = $1,
        max_instances = $2,
        max_messages = $3,
        max_contacts = $4,
        plan_expires_at = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      newPlan,
      maxInstances,
      maxMessages,
      maxContacts,
      expirationDate,
      companyId
    ]);

    return result.rows[0];
  }

  /**
   * Activar trial para una empresa
   */
  async activateTrial(companyId, trialType = 'trial') {
    // Verificar si ya usó el trial
    const companyResult = await pool.query(
      'SELECT trial_used FROM whatsapp_bot.companies WHERE id = $1',
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      throw new Error('Empresa no encontrada');
    }

    if (companyResult.rows[0].trial_used) {
      throw new Error('El trial ya fue utilizado anteriormente');
    }

    // Activar trial
    await this.updateCompanyPlan(companyId, trialType);
    
    // Marcar trial como usado
    await pool.query(
      'UPDATE whatsapp_bot.companies SET trial_used = true, trial_started_at = NOW() WHERE id = $1',
      [companyId]
    );

    return true;
  }

  /**
   * Verificar si una empresa puede usar un recurso específico
   */
  async canUseResource(companyId, resourceType) {
    const planStatus = await this.checkPlanLimits(companyId);
    
    switch (resourceType) {
      case 'instances':
        return planStatus.limits.instances.canCreate;
      case 'messages':
        return planStatus.limits.messages.canSend;
      case 'contacts':
        return planStatus.limits.contacts.canAdd;
      case 'embeddings':
        return planStatus.features.embeddings;
      case 'campaigns':
        return planStatus.features.campaigns;
      case 'analytics':
        return planStatus.features.analytics;
      default:
        return false;
    }
  }

  /**
   * Obtener todos los planes disponibles
   */
  getAvailablePlans() {
    return Object.keys(config.PLANS).map(key => ({
      key,
      ...config.PLANS[key]
    }));
  }

  /**
   * Sugerir upgrade de plan basado en uso actual
   */
  async suggestPlanUpgrade(companyId) {
    const planStatus = await this.checkPlanLimits(companyId);
    const availablePlans = this.getAvailablePlans();
    
    // Si está cerca del límite (>80%), sugerir upgrade
    const needsUpgrade = 
      planStatus.limits.instances.percentage > 80 ||
      planStatus.limits.messages.percentage > 80 ||
      planStatus.limits.contacts.percentage > 80;

    if (!needsUpgrade) {
      return null;
    }

    // Encontrar el siguiente plan en la jerarquía
    const planHierarchy = ['free_trial', 'trial', 'starter', 'business', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(planStatus.planKey);
    
    if (currentIndex < planHierarchy.length - 1) {
      const suggestedPlanKey = planHierarchy[currentIndex + 1];
      return availablePlans.find(plan => plan.key === suggestedPlanKey);
    }

    return null;
  }
}

module.exports = new PlanService(); 