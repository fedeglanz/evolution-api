const platformPlanService = require('../services/platformPlanService');

class PlatformPlanController {
  constructor() {
    // Bind methods to preserve context
    this.getAllPlans = this.getAllPlans.bind(this);
    this.getPlanById = this.getPlanById.bind(this);
    this.createPlan = this.createPlan.bind(this);
    this.updatePlan = this.updatePlan.bind(this);
    this.deletePlan = this.deletePlan.bind(this);
    this.reorderPlans = this.reorderPlans.bind(this);
    this.getPlanStatistics = this.getPlanStatistics.bind(this);
    this.migrateExistingCompanies = this.migrateExistingCompanies.bind(this);
  }

  /**
   * GET /api/platform-admin/plans
   * Obtener todos los planes
   */
  async getAllPlans(req, res) {
    try {
      console.log('🔍 Platform Admin: Getting all plans');
      
      const plans = await platformPlanService.getAllPlans();
      
      res.status(200).json({
        success: true,
        data: plans,
        total: plans.length
      });

    } catch (error) {
      console.error('❌ Error getting plans:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/platform-admin/plans/:id
   * Obtener plan por ID
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 Platform Admin: Getting plan ${id}`);
      
      const plan = await platformPlanService.getPlanById(id);
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }
      
      res.status(200).json({
        success: true,
        data: plan
      });

    } catch (error) {
      console.error('❌ Error getting plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /api/platform-admin/plans
   * Crear nuevo plan
   */
  async createPlan(req, res) {
    try {
      const planData = req.body;
      const createdBy = req.platformAdmin.id;

      console.log('➕ Platform Admin: Creating new plan:', planData.name);

      // Validaciones básicas
      if (!planData.name || !planData.key) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y clave del plan son obligatorios'
        });
      }

      const newPlan = await platformPlanService.createPlan(planData, createdBy);
      
      // Log de auditoría
      console.log(`✅ Plan created: ${newPlan.name} (${newPlan.key}) by admin ${req.platformAdmin.email}`);
      
      res.status(201).json({
        success: true,
        data: newPlan,
        message: 'Plan creado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creating plan:', error);
      
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/platform-admin/plans/:id
   * Actualizar plan existente
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const planData = req.body;
      const updatedBy = req.platformAdmin.id;

      console.log(`🔄 Platform Admin: Updating plan ${id}`);

      const updatedPlan = await platformPlanService.updatePlan(id, planData, updatedBy);
      
      if (!updatedPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }
      
      // Log de auditoría
      console.log(`✅ Plan updated: ${updatedPlan.name} (${updatedPlan.key}) by admin ${req.platformAdmin.email}`);
      
      res.status(200).json({
        success: true,
        data: updatedPlan,
        message: 'Plan actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error updating plan:', error);
      
      if (error.message.includes('Ya existe') || error.message.includes('no encontrado')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/platform-admin/plans/:id
   * Eliminar plan (soft delete)
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Platform Admin: Deleting plan ${id}`);

      const deletedPlan = await platformPlanService.deletePlan(id);
      
      if (!deletedPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }
      
      // Log de auditoría
      console.log(`✅ Plan deleted: ${deletedPlan.name} (${deletedPlan.key}) by admin ${req.platformAdmin.email}`);
      
      res.status(200).json({
        success: true,
        message: 'Plan eliminado exitosamente',
        data: deletedPlan
      });

    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      
      if (error.message.includes('subscripciones activas')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /api/platform-admin/plans/reorder
   * Reordenar planes
   */
  async reorderPlans(req, res) {
    try {
      const { planOrders } = req.body;
      console.log('🔄 Platform Admin: Reordering plans');

      if (!Array.isArray(planOrders)) {
        return res.status(400).json({
          success: false,
          message: 'planOrders debe ser un array'
        });
      }

      await platformPlanService.reorderPlans(planOrders);
      
      console.log(`✅ Plans reordered by admin ${req.platformAdmin.email}`);
      
      res.status(200).json({
        success: true,
        message: 'Planes reordenados exitosamente'
      });

    } catch (error) {
      console.error('❌ Error reordering plans:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /api/platform-admin/plans/statistics
   * Obtener estadísticas de uso de planes
   */
  async getPlanStatistics(req, res) {
    try {
      console.log('📊 Platform Admin: Getting plan statistics');
      
      const statistics = await platformPlanService.getPlanStatistics();
      
      res.status(200).json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('❌ Error getting plan statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * POST /api/platform-admin/plans/migrate-companies
   * Migrar empresas existentes al nuevo sistema de subscripciones
   */
  async migrateExistingCompanies(req, res) {
    try {
      console.log('🔄 Platform Admin: Migrating existing companies to subscriptions');
      
      const migrated = await platformPlanService.migrateExistingCompanies();
      
      console.log(`✅ Migrated ${migrated.length} companies by admin ${req.platformAdmin.email}`);
      
      res.status(200).json({
        success: true,
        data: migrated,
        message: `${migrated.length} empresas migradas exitosamente`,
        total: migrated.length
      });

    } catch (error) {
      console.error('❌ Error migrating companies:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new PlatformPlanController();