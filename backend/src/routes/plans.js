const express = require('express');
const router = express.Router();
const planService = require('../services/planService');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

/**
 * GET /api/plans/current
 * Obtener plan actual y límites de la empresa
 */
router.get('/current', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const planStatus = await planService.checkPlanLimits(companyId);
    
    res.json({
      success: true,
      message: 'Información del plan obtenida exitosamente',
      data: planStatus
    });
  } catch (error) {
    console.error('Error al obtener plan actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del plan',
      error: error.message
    });
  }
});

/**
 * GET /api/plans/available
 * Listar todos los planes disponibles
 */
router.get('/available', async (req, res) => {
  try {
    const plans = planService.getAvailablePlans();
    
    res.json({
      success: true,
      message: 'Planes disponibles obtenidos exitosamente',
      data: plans
    });
  } catch (error) {
    console.error('Error al obtener planes disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes disponibles',
      error: error.message
    });
  }
});

/**
 * GET /api/plans/suggest-upgrade
 * Sugerir upgrade de plan basado en uso actual
 */
router.get('/suggest-upgrade', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const suggestion = await planService.suggestPlanUpgrade(companyId);
    
    res.json({
      success: true,
      message: 'Sugerencia de upgrade generada',
      data: {
        needsUpgrade: !!suggestion,
        suggestedPlan: suggestion
      }
    });
  } catch (error) {
    console.error('Error al sugerir upgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar sugerencia',
      error: error.message
    });
  }
});

/**
 * POST /api/plans/activate-trial
 * Activar trial (solo si no se ha usado antes)
 */
router.post('/activate-trial', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { trialType = 'trial' } = req.body;
    
    await planService.activateTrial(companyId, trialType);
    
    res.json({
      success: true,
      message: `Trial ${trialType} activado exitosamente`,
      data: {
        trialType,
        message: 'Tu período de prueba ha comenzado. ¡Aprovéchalo!'
      }
    });
  } catch (error) {
    console.error('Error al activar trial:', error);
    
    if (error.message.includes('ya fue utilizado')) {
      return res.status(409).json({
        success: false,
        message: 'El período de prueba ya fue utilizado anteriormente',
        error_code: 'TRIAL_ALREADY_USED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al activar trial',
      error: error.message
    });
  }
});

/**
 * PUT /api/plans/update (Solo admin)
 * Actualizar plan de una empresa (para administradores)
 */
router.put('/update', requireAdmin, async (req, res) => {
  try {
    const { companyId, newPlan, customLimits } = req.body;
    
    if (!companyId || !newPlan) {
      return res.status(400).json({
        success: false,
        message: 'companyId y newPlan son requeridos'
      });
    }
    
    const updatedCompany = await planService.updateCompanyPlan(companyId, newPlan, customLimits);
    
    res.json({
      success: true,
      message: `Plan actualizado a ${newPlan} exitosamente`,
      data: {
        company: updatedCompany,
        plan: newPlan,
        customLimits
      }
    });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar plan',
      error: error.message
    });
  }
});

/**
 * GET /api/plans/check/:resource
 * Verificar si puede usar un recurso específico
 */
router.get('/check/:resource', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { resource } = req.params;
    
    const canUse = await planService.canUseResource(companyId, resource);
    
    res.json({
      success: true,
      message: `Verificación de recurso ${resource} completada`,
      data: {
        resource,
        canUse,
        allowed: canUse
      }
    });
  } catch (error) {
    console.error('Error al verificar recurso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar recurso',
      error: error.message
    });
  }
});

module.exports = router; 