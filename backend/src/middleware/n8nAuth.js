const crypto = require('crypto');

class N8NAuthMiddleware {
  constructor() {
    // API Key estático y fijo para n8n
    this.N8N_API_KEY = process.env.N8N_API_KEY || 'n8n-whatsapp-bot-2024-secure-key-4e334562d4843d15908669c2b6e6a879';
    
    console.log('🔑 N8N API Key configurado:', this.N8N_API_KEY.substring(0, 20) + '...');
  }

  /**
   * Middleware para autenticar requests de n8n
   */
  authenticate = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Authorization header required for n8n endpoints'
        });
      }

      // Esperamos: "Bearer YOUR_N8N_API_KEY"
      const token = authHeader.split(' ')[1];
      
      if (!token || token !== this.N8N_API_KEY) {
        return res.status(401).json({
          success: false,
          message: 'Invalid n8n API key'
        });
      }

      // Token válido - continuar
      req.n8nAuth = {
        authenticated: true,
        service: 'n8n'
      };
      
      next();

    } catch (error) {
      console.error('[N8N Auth] Error authenticating:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  };

  /**
   * Obtener la API key para configurar en n8n
   */
  getApiKey() {
    return this.N8N_API_KEY;
  }

  /**
   * Endpoint para obtener info de configuración para n8n
   * GET /api/bot/n8n-config
   */
  getN8NConfig = (req, res) => {
    res.json({
      success: true,
      config: {
        apiKey: this.N8N_API_KEY,
        backendUrl: process.env.BACKEND_URL || 'https://whatsapp-bot-backend-fnte.onrender.com',
        endpoints: {
          processMessage: '/api/bot/process-message',
          logInteraction: '/api/bot/log-interaction',
          health: '/api/bot/health'
        },
        instructions: {
          step1: 'Copia la apiKey',
          step2: 'En n8n, crea una credencial "HTTP Header Auth"',
          step3: 'Name: "Backend API Auth"',
          step4: 'Header Name: "Authorization"',
          step5: 'Header Value: "Bearer ' + this.N8N_API_KEY + '"'
        }
      }
    });
  };
}

module.exports = new N8NAuthMiddleware(); 