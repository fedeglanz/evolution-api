const jwt = require('jsonwebtoken');
const config = require('../config');
const database = require('../database');
const { AppError, asyncHandler } = require('./errorHandler');

// Extract token from request headers
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Check if it's a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expirado', 401, 'TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AppError('Token inválido', 401, 'TOKEN_INVALID');
    } else {
      throw new AppError('Error de autenticación', 401, 'AUTH_ERROR');
    }
  }
};

// Main authentication middleware
const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from headers
  const token = extractToken(req);
  
  if (!token) {
    throw new AppError('Token de acceso requerido', 401, 'TOKEN_REQUIRED');
  }

  // Verify token
  const decoded = verifyToken(token);
  
  // Get user data from database
  const result = await database.query(
    `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, 
            c.name as company_name, c.plan, c.max_instances, c.max_messages
     FROM whatsapp_bot.users u
     JOIN whatsapp_bot.companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [decoded.userId]
  );

  const user = result.rows[0];
  
  if (!user) {
    throw new AppError('Usuario no encontrado', 401, 'USER_NOT_FOUND');
  }

  // Create company settings based on plan
  const companySettings = {
    max_instances: user.max_instances,
    max_messages: user.max_messages,
    embeddings: user.plan !== 'starter',
    campaigns: user.plan !== 'starter'
  };

  // Add user and company data to request object
  req.user = {
    userId: user.id,
    companyId: user.company_id,
    email: user.email,
    fullName: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role
  };

  req.company = {
    id: user.company_id,
    name: user.company_name,
    plan: user.plan,
    settings: companySettings
  };

  next();
});

// Optional authentication middleware (doesn't throw error if no token)
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    
    const result = await database.query(
      `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, 
              c.name as company_name, c.plan, c.max_instances, c.max_messages
       FROM whatsapp_bot.users u
       JOIN whatsapp_bot.companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    const user = result.rows[0];
    
    if (user) {
      const companySettings = {
        max_instances: user.max_instances,
        max_messages: user.max_messages,
        embeddings: user.plan !== 'starter',
        campaigns: user.plan !== 'starter'
      };
      
      req.user = {
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        fullName: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role
      };

      req.company = {
        id: user.company_id,
        name: user.company_name,
        plan: user.plan,
        settings: companySettings
      };
    }
  } catch (error) {
    // Ignore auth errors in optional auth
  }
  
  next();
});

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Autenticación requerida', 401, 'AUTH_REQUIRED');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Permisos insuficientes', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = authorize('admin');

// Check if user is admin or manager
const requireManager = authorize('admin', 'manager');

// Plan-based authorization middleware
const requirePlan = (minPlan) => {
  const planHierarchy = {
    starter: 1,
    business: 2,
    enterprise: 3
  };

  return (req, res, next) => {
    if (!req.company) {
      throw new AppError('Información de empresa requerida', 401, 'COMPANY_REQUIRED');
    }

    const userPlanLevel = planHierarchy[req.company.plan] || 0;
    const requiredPlanLevel = planHierarchy[minPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      throw new AppError(`Plan ${minPlan} o superior requerido`, 403, 'PLAN_UPGRADE_REQUIRED');
    }

    next();
  };
};

// Check resource limits based on plan
const checkResourceLimit = (resourceType) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.company) {
      throw new AppError('Información de empresa requerida', 401, 'COMPANY_REQUIRED');
    }

    const { settings } = req.company;
    
    switch (resourceType) {
      case 'instances':
        if (settings.max_instances !== -1) {
          const instanceCount = await database.query(
            'SELECT COUNT(*) as count FROM whatsapp_bot.instances WHERE company_id = $1',
            [req.company.id]
          );
          
          if (instanceCount.rows[0].count >= settings.max_instances) {
            throw new AppError('Límite de instancias alcanzado', 403, 'INSTANCE_LIMIT_REACHED');
          }
        }
        break;
        
      case 'messages':
        if (settings.max_messages !== -1) {
          // Check monthly message count
          const messageCount = await database.query(
            `SELECT COUNT(*) as count FROM whatsapp_bot.messages 
             WHERE company_id = $1 AND created_at >= date_trunc('month', NOW())`,
            [req.company.id]
          );
          
          if (messageCount.rows[0].count >= settings.max_messages) {
            throw new AppError('Límite de mensajes mensuales alcanzado', 403, 'MESSAGE_LIMIT_REACHED');
          }
        }
        break;
        
      case 'embeddings':
        if (!settings.embeddings) {
          throw new AppError('Función de embeddings no disponible en tu plan', 403, 'EMBEDDINGS_NOT_AVAILABLE');
        }
        break;
        
      case 'campaigns':
        if (!settings.campaigns) {
          throw new AppError('Función de campañas no disponible en tu plan', 403, 'CAMPAIGNS_NOT_AVAILABLE');
        }
        break;
        
      default:
        throw new AppError('Tipo de recurso no válido', 400, 'INVALID_RESOURCE_TYPE');
    }

    next();
  });
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireManager,
  requirePlan,
  checkResourceLimit
};
