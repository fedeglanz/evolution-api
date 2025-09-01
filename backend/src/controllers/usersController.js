const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');

class UsersController {
  constructor() {
    this.listUsers = this.listUsers.bind(this);
    this.createUser = this.createUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.getUserDetails = this.getUserDetails.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.toggleStatus = this.toggleStatus.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
  }

  // List users in the company
  async listUsers(req, res) {
    try {
      console.log('[USERS LIST] Iniciando listado de usuarios para empresa:', req.user.companyId);
      
      const { search = '', role = '', status = 'all' } = req.query;
      const companyId = req.user.companyId;

      // Build query
      let query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.last_login,
          u.created_at,
          u.updated_at,
          u.must_change_password,
          true as is_active
        FROM whatsapp_bot.users u
        WHERE u.company_id = $1
      `;

      const params = [companyId];
      let paramCount = 1;

      // Add search filter
      if (search) {
        paramCount++;
        query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      // Add role filter
      if (role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        params.push(role);
      }

      // Add status filter - for now all users are considered active
      // TODO: Add is_active column to users table in future migration
      if (status === 'inactive') {
        // For now, show no results for inactive filter since we don't have the column
        query += ` AND false`;
      }

      query += ` ORDER BY u.created_at DESC`;

      console.log('[USERS LIST] Ejecutando query:', query);
      console.log('[USERS LIST] Params:', params);

      const result = await pool.query(query, params);

      // Get company info including user limits
      const companyResult = await pool.query(
        `SELECT 
          id, name, plan, max_instances, max_messages, max_contacts,
          CASE 
            WHEN plan = 'free_trial' THEN 2
            WHEN plan = 'trial' THEN 3
            WHEN plan = 'starter' THEN 5
            WHEN plan = 'business' THEN 15
            WHEN plan = 'pro' THEN 50
            WHEN plan = 'enterprise' THEN 999
            ELSE 5
          END as max_users
         FROM whatsapp_bot.companies 
         WHERE id = $1`,
        [companyId]
      );

      console.log('[USERS LIST] Usuarios encontrados:', result.rows.length);

      res.json({
        users: result.rows,
        company: companyResult.rows[0] || null
      });
    } catch (error) {
      console.error('[USERS LIST] Error listando usuarios:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Create new user in the company
  async createUser(req, res) {
    try {
      console.log('[USERS CREATE] Creando usuario en empresa:', req.user.companyId);
      
      const { email, firstName, lastName, role = 'operator', generatePassword = true, tempPassword } = req.body;
      const companyId = req.user.companyId;

      // Verify permissions - only admins and managers can create users
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'No tienes permisos para crear usuarios' 
        });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM whatsapp_bot.users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Ya existe un usuario con este email' 
        });
      }

      // Get company info and check user limit
      const companyResult = await pool.query(
        `SELECT 
          name, plan,
          CASE 
            WHEN plan = 'free_trial' THEN 2
            WHEN plan = 'trial' THEN 3
            WHEN plan = 'starter' THEN 5
            WHEN plan = 'business' THEN 15
            WHEN plan = 'pro' THEN 50
            WHEN plan = 'enterprise' THEN 999
            ELSE 5
          END as max_users
         FROM whatsapp_bot.companies 
         WHERE id = $1`,
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      // Count current users
      const userCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM whatsapp_bot.users WHERE company_id = $1',
        [companyId]
      );

      const currentUserCount = parseInt(userCountResult.rows[0].count);
      const maxUsers = companyResult.rows[0].max_users;

      if (currentUserCount >= maxUsers) {
        return res.status(400).json({ 
          error: `Has alcanzado el límite de ${maxUsers} usuarios para tu plan ${companyResult.rows[0].plan}` 
        });
      }

      // Generate temporary password if needed
      let temporaryPassword = tempPassword;
      if (generatePassword || !tempPassword) {
        temporaryPassword = this.generateSecurePassword();
      }

      // Hash password
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // Create user
      const userId = uuidv4();
      await pool.query(
        `INSERT INTO whatsapp_bot.users 
         (id, company_id, email, password_hash, first_name, last_name, role, 
          temp_password, must_change_password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
        [userId, companyId, email, passwordHash, firstName, lastName, role, temporaryPassword]
      );

      console.log('[USERS CREATE] Usuario creado exitosamente:', userId);

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role,
          companyId
        },
        temporaryPassword
      });
    } catch (error) {
      console.error('[USERS CREATE] Error creando usuario:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { firstName, lastName, role } = req.body;
      const companyId = req.user.companyId;

      // Verify permissions
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'No tienes permisos para editar usuarios' 
        });
      }

      // Update user
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.users 
         SET first_name = $1, last_name = $2, role = $3, updated_at = NOW()
         WHERE id = $4 AND company_id = $5
         RETURNING id, email`,
        [firstName, lastName, role, userId, companyId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
      console.error('[USERS UPDATE] Error actualizando usuario:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Get user details
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      const companyId = req.user.companyId;

      const result = await pool.query(
        `SELECT 
          u.id, u.email, u.first_name, u.last_name, u.role, 
          u.last_login, u.created_at, u.updated_at,
          u.must_change_password,
          true as is_active
         FROM whatsapp_bot.users u
         WHERE u.id = $1 AND u.company_id = $2`,
        [userId, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('[USERS DETAILS] Error obteniendo detalles:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Reset user password
  async resetPassword(req, res) {
    try {
      const { userId } = req.params;
      const { tempPassword, generatePassword = true } = req.body;
      const companyId = req.user.companyId;

      // Verify permissions
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'No tienes permisos para resetear contraseñas' 
        });
      }

      // Generate temporary password
      let temporaryPassword = tempPassword;
      if (generatePassword || !tempPassword) {
        temporaryPassword = this.generateSecurePassword();
      }

      // Hash password
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // Update user
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.users 
         SET password_hash = $1, temp_password = $2, must_change_password = true, updated_at = NOW()
         WHERE id = $3 AND company_id = $4
         RETURNING email, first_name, last_name`,
        [passwordHash, temporaryPassword, userId, companyId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        message: 'Contraseña reseteada exitosamente',
        temporaryPassword
      });
    } catch (error) {
      console.error('[USERS RESET PASSWORD] Error reseteando contraseña:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Toggle user active status
  async toggleStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      const companyId = req.user.companyId;

      // Verify permissions
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'No tienes permisos para cambiar el estado de usuarios' 
        });
      }

      // Prevent deactivating yourself
      if (userId === req.user.userId && !isActive) {
        return res.status(400).json({ 
          error: 'No puedes desactivar tu propia cuenta' 
        });
      }

      // Check if user exists in the company
      const userCheck = await pool.query(
        `SELECT id, email, first_name, last_name
         FROM whatsapp_bot.users 
         WHERE id = $1 AND company_id = $2`,
        [userId, companyId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // TODO: Implement actual status toggle when is_active column is added
      // For now, we just return success but don't actually change anything
      console.log('[USERS TOGGLE STATUS] Funcionalidad pendiente - columna is_active no existe');

      res.json({ 
        message: `Funcionalidad de ${isActive ? 'activar' : 'desactivar'} usuario estará disponible próximamente`,
        note: 'Columna is_active no está disponible en la tabla users'
      });
    } catch (error) {
      console.error('[USERS TOGGLE STATUS] Error cambiando estado:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Soft delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const companyId = req.user.companyId;

      // Verify permissions - only admins can delete
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Solo los administradores pueden eliminar usuarios' 
        });
      }

      // Prevent deleting yourself
      if (userId === req.user.userId) {
        return res.status(400).json({ 
          error: 'No puedes eliminar tu propia cuenta' 
        });
      }

      // Check if user exists in the company
      const userCheck = await pool.query(
        `SELECT id, email, first_name, last_name
         FROM whatsapp_bot.users 
         WHERE id = $1 AND company_id = $2`,
        [userId, companyId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // TODO: Implement actual soft delete when is_active column is added
      // For now, we just return success but don't actually delete anything
      console.log('[USERS DELETE] Funcionalidad pendiente - columna is_active no existe');

      res.json({ 
        message: 'Funcionalidad de eliminar usuario estará disponible próximamente',
        note: 'Columna is_active no está disponible en la tabla users'
      });
    } catch (error) {
      console.error('[USERS DELETE] Error eliminando usuario:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Generate secure password
  generateSecurePassword() {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

module.exports = new UsersController();