const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./auth');
const instanceRoutes = require('./instances');
const contactRoutes = require('./contacts');
const userRoutes = require('./users');
// const messageRoutes = require('./messages'); // TODO: Crear este archivo si es necesario
const botRoutes = require('./bots');
const botRouter = require('./bot'); // Rutas individuales de bot (process-message)
const knowledgeRoutes = require('./knowledge');
const workflowRoutes = require('./workflows');
const templateRoutes = require('./templates');
const quickReplyRoutes = require('./quickReplies');
const scheduledMessageRoutes = require('./scheduledMessages');
const attachmentRoutes = require('./attachments');
const campaignRoutes = require('./campaigns');
const groupSyncRoutes = require('./groupSync');
const massMessagingRoutes = require('./massMessaging');
const platformAdminRoutes = require('./platformAdmin');
const billingRoutes = require('./billing');

// Middleware de autenticación
const { authenticateToken } = require('../middleware/auth');

// Middleware de validación
const { validate } = require('../middleware/validation');

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Bot API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoints (TEMPORAL - remover en producción)
router.get('/debug/test-instance', async (req, res) => {
  try {
    const { instanceName } = req.query;
    
    if (!instanceName) {
      return res.status(400).json({
        error: 'Falta parámetro instanceName'
      });
    }

    const evolutionService = require('../services/evolutionService');
    const result = await evolutionService.createInstance(instanceName, null, '+5491123456789');
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nuevo endpoint para debuggear estados de instancias
router.get('/debug/evolution-state', async (req, res) => {
  try {
    const { instanceName } = req.query;
    
    if (!instanceName) {
      return res.status(400).json({
        error: 'Falta parámetro instanceName (ej: ?instanceName=company_instance)'
      });
    }

    const evolutionService = require('../services/evolutionService');
    
    console.log(`[DEBUG] Fetching Evolution API state for: ${instanceName}`);
    
    // Llamar directamente al método de Evolution API
    const result = await evolutionService.getInstanceState(instanceName);
    
    res.json({
      success: true,
      instanceName,
      evolutionResponse: result,
      debug: {
        expectedStatesForConnected: ['open', 'connected'],
        actualStatus: result.status,
        isConnectedLogic: `status === 'open' || status === 'connected'`,
        calculatedIsConnected: result.isConnected
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/debug/test-body', async (req, res) => {
  try {
    console.log('[DEBUG ENDPOINT] Full req.body received:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG ENDPOINT] Request headers content-type:', req.headers['content-type']);
    console.log('[DEBUG ENDPOINT] Raw body keys:', Object.keys(req.body || {}));
    
    const { name, description, webhook_url, webhook_events, phone_number } = req.body;
    
    console.log('[DEBUG ENDPOINT] Extracted fields:', {
      name: name || 'undefined',
      description: description || 'undefined', 
      webhook_url: webhook_url || 'undefined',
      webhook_events: webhook_events || 'undefined',
      phone_number: phone_number || 'undefined',
      phone_number_type: typeof phone_number,
      phone_number_value: phone_number
    });

    res.json({
      success: true,
      message: 'Debug endpoint - body parsing test',
      received: {
        fullBody: req.body,
        extractedFields: {
          name,
          description, 
          webhook_url,
          webhook_events,
          phone_number
        },
        phoneNumberDebug: {
          value: phone_number,
          type: typeof phone_number,
          isUndefined: phone_number === undefined,
          isNull: phone_number === null,
          isEmpty: phone_number === '',
          length: phone_number ? phone_number.length : 'N/A'
        }
      }
    });
    
  } catch (error) {
    console.error('[DEBUG ENDPOINT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint temporal para probar validación de instances (SIN autenticación)
router.post('/debug/test-instance-validation', async (req, res) => {
  try {
    const { validateCreateInstance } = require('./instances'); // Import validation
    
    console.log('[DEBUG INSTANCE VALIDATION] Before validation:', JSON.stringify(req.body, null, 2));
    
    // Simular middleware de validación
    const Joi = require('joi');
    const instanceCreateSchema = Joi.object({
      name: Joi.string().min(2).max(50).trim().required(),
      description: Joi.string().max(500).trim().optional(),
      webhook_url: Joi.string().uri().optional(),
      webhook_events: Joi.array().items(Joi.string().valid('message', 'status', 'connection')).optional(),
      phone_number: Joi.string().pattern(/^\+[1-9]\d{9,14}$/).optional()
    });

    const { error, value } = instanceCreateSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    console.log('[DEBUG INSTANCE VALIDATION] After validation:', JSON.stringify(value, null, 2));

    res.json({
      success: true,
      message: 'Instance validation test successful',
      beforeValidation: req.body,
      afterValidation: value,
      phoneNumberStatus: {
        beforeValidation: {
          value: req.body.phone_number,
          type: typeof req.body.phone_number,
          present: 'phone_number' in req.body
        },
        afterValidation: {
          value: value.phone_number,
          type: typeof value.phone_number,
          present: 'phone_number' in value
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG INSTANCE VALIDATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug validation error',
      error: error.message
    });
  }
});

// API info route
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'WhatsApp Bot API',
      version: '1.0.0',
      description: 'Backend API para plataforma de bots de WhatsApp con ChatGPT',
      author: 'Fede Glanz',
      endpoints: {
        auth: '/api/auth',
        instances: '/api/instances (incluye bot-config como sub-rutas)',
        bots: '/api/bots (sistema de múltiples bots - NUEVO)',
        contacts: '/api/contacts',
        conversations: '/api/conversations',
        dashboard: '/api/dashboard',
        plans: '/api/plans',
        migrations: '/api/migrations (solo admin)',
        workflows: '/api/workflows',
        knowledge: '/api/knowledge',
        templates: '/api/templates (plantillas de mensajes)',
        quickReplies: '/api/quick-replies (respuestas rápidas)',
        scheduledMessages: '/api/scheduled-messages (mensajes programados)',
        attachments: '/api/attachments (archivos multimedia)',
        campaigns: '/api/campaigns (campañas de grupos)',
        groupSync: '/api/group-sync (sincronización de grupos)',
        massMessaging: '/api/mass-messaging (mensajería masiva unificada)',
        platformAdmin: '/api/platform-admin (administración de plataforma - SUPER ADMIN)',
        billing: '/api/billing (sistema de facturación y pagos)'
      }
    }
  });
});

// Mount routes with prefixes
router.use('/auth', authRoutes);
router.use('/instances', instanceRoutes);
router.use('/bots', botRoutes); // Sistema de múltiples bots - NUEVO
router.use('/contacts', contactRoutes);
router.use('/users', userRoutes); // User management
// router.use('/conversations', conversationRoutes); // TODO: Crear estas rutas
// router.use('/dashboard', dashboardRoutes); // TODO: Crear estas rutas
// router.use('/plans', planRoutes); // TODO: Crear estas rutas
// router.use('/migrations', migrationRoutes); // TODO: Crear estas rutas
// router.use('/webhooks', webhookRoutes); // TODO: Crear estas rutas
router.use('/bot', botRouter); // Rutas individuales de bot (process-message, log-interaction)
router.use('/workflows', workflowRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/templates', templateRoutes); // Message templates
router.use('/quick-replies', quickReplyRoutes); // Quick replies
router.use('/scheduled-messages', scheduledMessageRoutes); // Scheduled messages
router.use('/attachments', attachmentRoutes); // Message attachments
router.use('/campaigns', campaignRoutes); // WhatsApp Group Campaigns
router.use('/group-sync', groupSyncRoutes); // Group synchronization
router.use('/mass-messaging', massMessagingRoutes); // Mass messaging system
router.use('/platform-admin', platformAdminRoutes); // Platform admin routes (Super Admin)
router.use('/billing', billingRoutes); // Billing and payment system

module.exports = router;
