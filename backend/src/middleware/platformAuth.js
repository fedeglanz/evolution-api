const jwt = require('jsonwebtoken');
const pool = require('../database');

// Middleware para autenticar platform admins
const authenticatePlatformAdmin = async (req, res, next) => {
  try {
    console.log('[PLATFORM AUTH] Iniciando autenticación...');
    console.log('[PLATFORM AUTH] Headers:', req.headers.authorization ? 'Token presente' : 'Sin token');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[PLATFORM AUTH] Error: Token no proporcionado');
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[PLATFORM AUTH] Token extraído, longitud:', token.length);
    
    try {
      // Verificar token JWT
      console.log('[PLATFORM AUTH] Verificando JWT...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('[PLATFORM AUTH] Token decodificado:', { 
        adminId: decoded.adminId, 
        email: decoded.email,
        isPlatformAdmin: decoded.isPlatformAdmin 
      });
      
      // Verificar que es un platform admin
      if (!decoded.isPlatformAdmin) {
        console.log('[PLATFORM AUTH] Error: No es platform admin');
        return res.status(403).json({ error: 'Acceso denegado - No es administrador de plataforma' });
      }

      // Verificar que el admin existe y está activo
      console.log('[PLATFORM AUTH] Verificando admin en BD...');
      const adminResult = await pool.query(
        'SELECT id, email, role, is_active FROM public.platform_admins WHERE id = $1',
        [decoded.adminId]
      );

      if (adminResult.rows.length === 0) {
        console.log('[PLATFORM AUTH] Error: Admin no encontrado en BD');
        return res.status(404).json({ error: 'Administrador no encontrado' });
      }

      const admin = adminResult.rows[0];
      console.log('[PLATFORM AUTH] Admin encontrado:', { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role,
        isActive: admin.is_active 
      });

      if (!admin.is_active) {
        console.log('[PLATFORM AUTH] Error: Admin desactivado');
        return res.status(403).json({ error: 'Cuenta de administrador desactivada' });
      }

      // Agregar info del admin al request
      req.platformAdmin = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      };

      console.log('[PLATFORM AUTH] Autenticación exitosa, continuando...');
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Error en autenticación de platform admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar roles específicos de platform admin
const requirePlatformRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.platformAdmin) {
      return res.status(401).json({ error: 'No autenticado como administrador de plataforma' });
    }

    if (!allowedRoles.includes(req.platformAdmin.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}` 
      });
    }

    next();
  };
};

// Shortcuts para roles específicos
const requireSuperAdmin = requirePlatformRole('super_admin');
const requirePlatformStaff = requirePlatformRole('super_admin', 'platform_staff');
const requirePlatformViewer = requirePlatformRole('super_admin', 'platform_staff', 'platform_viewer');

// Middleware para detectar tipo de autenticación (platform admin vs tenant user)
const detectAuthType = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Determinar tipo de usuario basado en el payload
      if (decoded.isPlatformAdmin) {
        // Es un platform admin
        req.authType = 'platform';
        req.platformAdmin = {
          adminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role
        };
      } else {
        // Es un usuario tenant normal
        req.authType = 'tenant';
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          companyId: decoded.companyId,
          role: decoded.role
        };
      }

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Error detectando tipo de autenticación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para logs de actividad
const logPlatformActivity = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Interceptar la respuesta
    const originalSend = res.send;
    
    res.send = async function(data) {
      // Solo loguear si la respuesta fue exitosa
      if (res.statusCode >= 200 && res.statusCode < 300 && req.platformAdmin) {
        try {
          const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body ? Object.keys(req.body) : undefined,
            statusCode: res.statusCode
          };

          // Si hay un ID en params, agregarlo
          if (req.params.id) {
            details.resourceId = req.params.id;
          }

          await pool.query(
            `INSERT INTO public.platform_admin_logs 
             (admin_id, action, resource_type, resource_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.platformAdmin.adminId,
              action,
              resourceType,
              req.params.id || null,
              JSON.stringify(details),
              req.ip
            ]
          );
        } catch (error) {
          console.error('Error logging platform activity:', error);
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticatePlatformAdmin,
  requirePlatformRole,
  requireSuperAdmin,
  requirePlatformStaff,
  requirePlatformViewer,
  detectAuthType,
  logPlatformActivity
};