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
