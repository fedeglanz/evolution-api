const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');

class PlatformAuthController {
  constructor() {
    this.login = this.login.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.verifyToken = this.verifyToken.bind(this);
    this.logout = this.logout.bind(this);
    this.getMe = this.getMe.bind(this);
  }

  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Buscar admin de plataforma
      const adminResult = await pool.query(
        `SELECT id, email, password_hash, first_name, last_name, role, 
                is_active, must_change_password, locked_until, login_attempts
         FROM public.platform_admins 
         WHERE email = $1`,
        [email]
      );

      if (adminResult.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const admin = adminResult.rows[0];

      // Verificar si está bloqueado
      if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        return res.status(423).json({ 
          error: 'Cuenta bloqueada temporalmente por intentos fallidos' 
        });
      }

      // Verificar si está activo
      if (!admin.is_active) {
        return res.status(403).json({ error: 'Cuenta desactivada' });
      }

      // Verificar password
      let isValidPassword = false;
      
      // Si tiene password temporal, verificar contra ella
      if (admin.must_change_password) {
        const tempPassResult = await pool.query(
          'SELECT temp_password FROM public.platform_admins WHERE id = $1',
          [admin.id]
        );
        
        if (tempPassResult.rows[0].temp_password === password) {
          isValidPassword = true;
        }
      }
      
      // Si no, verificar contra hash normal
      if (!isValidPassword) {
        isValidPassword = await bcrypt.compare(password, admin.password_hash);
      }

      if (!isValidPassword) {
        // Incrementar intentos fallidos
        await pool.query(
          `UPDATE public.platform_admins 
           SET login_attempts = login_attempts + 1,
               locked_until = CASE 
                 WHEN login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                 ELSE NULL
               END
           WHERE id = $1`,
          [admin.id]
        );

        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Login exitoso - resetear intentos y actualizar último login
      await pool.query(
        `UPDATE public.platform_admins 
         SET last_login = NOW(), 
             login_attempts = 0, 
             locked_until = NULL 
         WHERE id = $1`,
        [admin.id]
      );

      // Generar token JWT
      const token = jwt.sign(
        {
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          isPlatformAdmin: true
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Guardar sesión
      const tokenHash = await bcrypt.hash(token, 10);
      await pool.query(
        `INSERT INTO public.platform_admin_sessions 
         (admin_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
        [admin.id, tokenHash, req.ip, req.get('user-agent')]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, details, ip_address)
         VALUES ($1, 'login', $2, $3)`,
        [admin.id, JSON.stringify({ email }), req.ip]
      );

      res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.first_name,
          lastName: admin.last_name,
          role: admin.role,
          mustChangePassword: admin.must_change_password
        }
      });
    } catch (error) {
      console.error('Error en login de platform admin:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.platformAdmin.adminId;

    try {
      // Obtener admin actual
      const adminResult = await pool.query(
        'SELECT password_hash, must_change_password, temp_password FROM public.platform_admins WHERE id = $1',
        [adminId]
      );

      const admin = adminResult.rows[0];

      // Verificar password actual
      let isValidPassword = false;
      
      if (admin.must_change_password && admin.temp_password === currentPassword) {
        isValidPassword = true;
      } else {
        isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
      }

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      // Hashear nueva contraseña
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Actualizar contraseña
      await pool.query(
        `UPDATE public.platform_admins 
         SET password_hash = $1, 
             must_change_password = false,
             temp_password = NULL,
             password_changed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, adminId]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, ip_address)
         VALUES ($1, 'change_password', $2)`,
        [adminId, req.ip]
      );

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async verifyToken(req, res) {
    const adminId = req.platformAdmin.adminId;

    try {
      const adminResult = await pool.query(
        `SELECT id, email, first_name, last_name, role, must_change_password
         FROM public.platform_admins 
         WHERE id = $1 AND is_active = true`,
        [adminId]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({ error: 'Admin no encontrado' });
      }

      const admin = adminResult.rows[0];

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.first_name,
          lastName: admin.last_name,
          role: admin.role,
          mustChangePassword: admin.must_change_password
        }
      });
    } catch (error) {
      console.error('Error al verificar token:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async logout(req, res) {
    const adminId = req.platformAdmin.adminId;
    const token = req.headers.authorization?.split(' ')[1];

    try {
      if (token) {
        const tokenHash = await bcrypt.hash(token, 10);
        
        // Invalidar sesión
        await pool.query(
          'DELETE FROM public.platform_admin_sessions WHERE admin_id = $1 AND token_hash = $2',
          [adminId, tokenHash]
        );
      }

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, ip_address)
         VALUES ($1, 'logout', $2)`,
        [adminId, req.ip]
      );

      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getMe(req, res) {
    const adminId = req.platformAdmin.adminId;

    try {
      const adminResult = await pool.query(
        `SELECT id, email, first_name, last_name, role, phone, 
                is_active, must_change_password, last_login, created_at
         FROM public.platform_admins 
         WHERE id = $1`,
        [adminId]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({ error: 'Admin no encontrado' });
      }

      const admin = adminResult.rows[0];

      res.json({
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.is_active,
        mustChangePassword: admin.must_change_password,
        lastLogin: admin.last_login,
        createdAt: admin.created_at
      });
    } catch (error) {
      console.error('Error al obtener datos del admin:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new PlatformAuthController();