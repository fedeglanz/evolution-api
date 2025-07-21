const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const instanceRoutes = require('./instances');
const botConfigRoutes = require('./botConfig');
const contactRoutes = require('./contacts');
const conversationRoutes = require('./conversations');
const dashboardRoutes = require('./dashboard');
const planRoutes = require('./plans');
const migrationRoutes = require('./migrations');

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

// Endpoint temporal para debugging (SIN autenticación)
router.post('/debug/test-instance', async (req, res) => {
  try {
    const { name, phone_number } = req.body;
    
    console.log('[DEBUG] Test instance creation:', {
      name,
      phone_number,
      body: req.body
    });
    
    // Test básico con evolutionService
    const EvolutionService = require('../services/evolutionService');
    const service = new EvolutionService();
    
    const testInstanceName = `debug_test_${Date.now()}`;
    
    console.log('[DEBUG] Creating test instance:', testInstanceName);
    
    const result = await service.createInstance(
      testInstanceName,
      null, // sin webhook
      phone_number
    );
    
    console.log('[DEBUG] Result:', result);
    
    res.json({
      success: true,
      message: 'Test instance creation',
      data: {
        testInstanceName,
        result,
        phoneProvided: !!phone_number,
        hasQrCode: !!result.qrCode,
        hasPairingCode: !!result.pairingCode
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint temporal para debugging (SIN autenticación)
router.post('/debug/test-body', async (req, res) => {
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
        contacts: '/api/contacts',
        conversations: '/api/conversations',
        dashboard: '/api/dashboard',
        plans: '/api/plans',
        migrations: '/api/migrations (solo admin)'
      }
    }
  });
});

// Mount routes with prefixes
router.use('/auth', authRoutes);
router.use('/instances', instanceRoutes);
router.use('/contacts', contactRoutes);
router.use('/conversations', conversationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/plans', planRoutes);
router.use('/migrations', migrationRoutes);

module.exports = router;
