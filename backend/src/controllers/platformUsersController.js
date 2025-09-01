const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');

class PlatformUsersController {
  constructor() {
    this.listCompanies = this.listCompanies.bind(this);
    this.getCompanyDetails = this.getCompanyDetails.bind(this);
    this.listUsers = this.listUsers.bind(this);
    this.createUser = this.createUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.toggleUserStatus = this.toggleUserStatus.bind(this);
    this.resetUserPassword = this.resetUserPassword.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.updateCompanyPlan = this.updateCompanyPlan.bind(this);
  }

  // Listar todas las empresas con estadísticas
  async listCompanies(req, res) {
    try {
      const { page = 1, limit = 20, search = '', plan = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          c.id,
          c.name,
          c.email,
          c.plan,
          c.max_instances,
          c.max_messages,
          c.max_contacts,
          c.plan_expires_at,
          c.subscription_status,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM whatsapp_bot.users WHERE company_id = c.id) as user_count,
          (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances WHERE company_id = c.id) as instance_count,
          (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances WHERE company_id = c.id AND is_active = true) as active_instances,
          (SELECT COUNT(*) FROM whatsapp_bot.messages WHERE company_id = c.id AND created_at > NOW() - INTERVAL '30 days') as messages_last_30d
        FROM whatsapp_bot.companies c
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (plan) {
        paramCount++;
        query += ` AND c.plan = $${paramCount}`;
        params.push(plan);
      }

      // Contar total
      const countQuery = query.replace('SELECT c.*', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Agregar paginación
      query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Obtener información de precios de planes
      const planPrices = {
        free_trial: 0,
        trial: 0,
        starter: 15,
        business: 49,
        pro: 99,
        enterprise: 299
      };

      const companies = result.rows.map(company => ({
        ...company,
        plan_price: planPrices[company.plan] || 0
      }));

      res.json({
        companies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listando empresas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener detalles de una empresa específica
  async getCompanyDetails(req, res) {
    const { companyId } = req.params;

    try {
      // Información básica de la empresa
      const companyResult = await pool.query(
        'SELECT * FROM whatsapp_bot.companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const company = companyResult.rows[0];

      // Usuarios de la empresa
      const usersResult = await pool.query(
        `SELECT id, email, first_name, last_name, role, phone, last_login, created_at
         FROM whatsapp_bot.users 
         WHERE company_id = $1 
         ORDER BY created_at DESC`,
        [companyId]
      );

      // Instancias de WhatsApp
      const instancesResult = await pool.query(
        `SELECT id, name, phone_number, is_active, webhook_url, created_at
         FROM whatsapp_bot.whatsapp_instances 
         WHERE company_id = $1 
         ORDER BY created_at DESC`,
        [companyId]
      );

      // Estadísticas de uso
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT m.id) as total_messages,
          COUNT(DISTINCT m.contact_phone) as unique_contacts,
          COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '24 hours' THEN m.id END) as messages_24h,
          COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN m.id END) as messages_7d,
          COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '30 days' THEN m.id END) as messages_30d
         FROM whatsapp_bot.messages m
         WHERE m.company_id = $1`,
        [companyId]
      );

      // Knowledge base stats
      const kbStatsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          SUM(d.chunk_count) as total_chunks,
          COUNT(DISTINCT c.id) as total_categories
         FROM whatsapp_bot.knowledge_base_documents d
         LEFT JOIN whatsapp_bot.knowledge_base_categories c ON d.instance_id = c.instance_id
         WHERE d.company_id = $1`,
        [companyId]
      );

      res.json({
        company,
        users: usersResult.rows,
        instances: instancesResult.rows,
        stats: {
          ...statsResult.rows[0],
          ...kbStatsResult.rows[0]
        }
      });
    } catch (error) {
      console.error('Error obteniendo detalles de empresa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Listar usuarios (con filtros)
  async listUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', companyId = '', role = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.phone,
          u.last_login,
          u.created_at,
          u.must_change_password,
          c.id as company_id,
          c.name as company_name,
          c.plan as company_plan
        FROM whatsapp_bot.users u
        JOIN whatsapp_bot.companies c ON u.company_id = c.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (companyId) {
        paramCount++;
        query += ` AND u.company_id = $${paramCount}`;
        params.push(companyId);
      }

      if (role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        params.push(role);
      }

      // Contar total
      const countQuery = query.replace('SELECT u.*', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Agregar paginación
      query += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        users: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listando usuarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear nuevo usuario
  async createUser(req, res) {
    const { 
      email, 
      firstName, 
      lastName, 
      companyId, 
      role = 'admin',
      phone,
      tempPassword,
      generatePassword = false
    } = req.body;

    try {
      // Verificar que la empresa existe
      const companyResult = await pool.query(
        'SELECT id, name FROM whatsapp_bot.companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      // Verificar que el email no existe
      const existingUser = await pool.query(
        'SELECT id FROM whatsapp_bot.users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      // Generar password temporal si se solicita
      let temporaryPassword = tempPassword;
      if (generatePassword || !tempPassword) {
        temporaryPassword = this.generateSecurePassword();
      }

      // Hash temporal para el password_hash inicial
      const tempHash = await bcrypt.hash(temporaryPassword, 12);

      // Crear usuario
      const userId = uuidv4();
      await pool.query(
        `INSERT INTO whatsapp_bot.users 
         (id, company_id, email, password_hash, first_name, last_name, role, phone, 
          temp_password, must_change_password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
        [userId, companyId, email, tempHash, firstName, lastName, role, phone, temporaryPassword]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'create_user', 'user', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          userId,
          JSON.stringify({ email, companyId, role }),
          req.ip
        ]
      );

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role,
          companyId,
          companyName: companyResult.rows[0].name,
          temporaryPassword
        }
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar usuario
  async updateUser(req, res) {
    const { userId } = req.params;
    const { firstName, lastName, role, phone } = req.body;

    try {
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.users 
         SET first_name = $1, last_name = $2, role = $3, phone = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, company_id`,
        [firstName, lastName, role, phone, userId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'update_user', 'user', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          userId,
          JSON.stringify({ updates: req.body }),
          req.ip
        ]
      );

      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Activar/desactivar usuario
  async toggleUserStatus(req, res) {
    const { userId } = req.params;
    const { isActive } = req.body;

    try {
      // Por ahora no tenemos campo is_active en users, lo agregamos en la query
      const result = await pool.query(
        'SELECT id FROM whatsapp_bot.users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // TODO: Agregar campo is_active a la tabla users en una migración futura

      res.json({ 
        message: 'Estado del usuario actualizado',
        note: 'Funcionalidad pendiente: agregar campo is_active a tabla users'
      });
    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Resetear contraseña de usuario
  async resetUserPassword(req, res) {
    const { userId } = req.params;
    const { tempPassword, generatePassword = true } = req.body;

    try {
      // Generar password temporal
      let temporaryPassword = tempPassword;
      if (generatePassword || !tempPassword) {
        temporaryPassword = this.generateSecurePassword();
      }

      // Hash temporal
      const tempHash = await bcrypt.hash(temporaryPassword, 12);

      // Actualizar usuario
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.users 
         SET password_hash = $1, temp_password = $2, must_change_password = true, updated_at = NOW()
         WHERE id = $3
         RETURNING email`,
        [tempHash, temporaryPassword, userId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'reset_password', 'user', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          userId,
          JSON.stringify({ email: updateResult.rows[0].email }),
          req.ip
        ]
      );

      res.json({
        message: 'Contraseña reseteada exitosamente',
        temporaryPassword
      });
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener estadísticas globales
  async getStatistics(req, res) {
    try {
      console.log('[PLATFORM STATS] Obteniendo estadísticas...');
      
      // Obtener estadísticas básicas directamente de las tablas
      const basicStats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM whatsapp_bot.companies) as total_companies,
          (SELECT COUNT(*) FROM whatsapp_bot.companies WHERE subscription_status = 'active') as active_companies,
          (SELECT COUNT(*) FROM whatsapp_bot.users) as total_users,
          (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances) as active_instances
      `);

      console.log('[PLATFORM STATS] Estadísticas básicas obtenidas:', basicStats.rows[0]);

      // Estadísticas por plan
      const planStats = await pool.query(`
        SELECT 
          COUNT(CASE WHEN plan = 'free_trial' THEN 1 END) as free_trial_companies,
          COUNT(CASE WHEN plan = 'trial' THEN 1 END) as trial_companies,
          COUNT(CASE WHEN plan = 'starter' THEN 1 END) as starter_companies,
          COUNT(CASE WHEN plan = 'business' THEN 1 END) as business_companies,
          COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_companies,
          COUNT(CASE WHEN plan = 'enterprise' THEN 1 END) as enterprise_companies
        FROM whatsapp_bot.companies
      `);

      console.log('[PLATFORM STATS] Estadísticas por plan obtenidas:', planStats.rows[0]);

      // Estadísticas de mensajes (con manejo de tabla faltante)
      let messageStats = {
        messages_last_24h: 0,
        messages_last_7d: 0,
        messages_last_30d: 0,
        messages_last_hour: 0
      };

      try {
        const msgResult = await pool.query(`
          SELECT 
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as messages_last_hour,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as messages_last_7d,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as messages_last_30d
          FROM whatsapp_bot.messages
        `);
        messageStats = msgResult.rows[0];
        console.log('[PLATFORM STATS] Estadísticas de mensajes obtenidas:', messageStats);
      } catch (msgError) {
        console.log('[PLATFORM STATS] Tabla messages no encontrada, usando valores por defecto');
      }

      // Estadísticas adicionales (con manejo de tablas faltantes)
      let additionalStats = {
        active_bots: 0,
        total_documents: 0,
        monthly_revenue_estimate: 0
      };

      try {
        const addResult = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM whatsapp_bot.bots WHERE is_active = true) as active_bots,
            (SELECT COUNT(*) FROM whatsapp_bot.knowledge_base_documents) as total_documents
        `);
        additionalStats = { ...additionalStats, ...addResult.rows[0] };
        console.log('[PLATFORM STATS] Estadísticas adicionales obtenidas:', addResult.rows[0]);
      } catch (addError) {
        console.log('[PLATFORM STATS] Algunas tablas no encontradas, usando valores por defecto');
      }

      // Calcular ingresos estimados
      const revenueData = planStats.rows[0];
      additionalStats.monthly_revenue_estimate = 
        (revenueData.starter_companies * 15) +
        (revenueData.business_companies * 49) +
        (revenueData.pro_companies * 99) +
        (revenueData.enterprise_companies * 299);

      const finalStats = {
        ...basicStats.rows[0],
        ...planStats.rows[0],
        ...messageStats,
        ...additionalStats,
        last_updated: new Date().toISOString()
      };

      console.log('[PLATFORM STATS] Estadísticas finales:', finalStats);

      res.json(finalStats);
    } catch (error) {
      console.error('[PLATFORM STATS] Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Actualizar plan de empresa
  async updateCompanyPlan(req, res) {
    const { companyId } = req.params;
    const { plan, expiresAt } = req.body;

    try {
      // Verificar que la empresa existe
      const companyResult = await pool.query(
        'SELECT id, plan FROM whatsapp_bot.companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const oldPlan = companyResult.rows[0].plan;

      // Actualizar plan
      await pool.query(
        `UPDATE whatsapp_bot.companies 
         SET plan = $1, plan_expires_at = $2, subscription_status = 'active', updated_at = NOW()
         WHERE id = $3`,
        [plan, expiresAt, companyId]
      );

      // Registrar en historial de planes
      await pool.query(
        `INSERT INTO whatsapp_bot.plan_history 
         (company_id, old_plan, new_plan, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [companyId, oldPlan, plan, req.platformAdmin.adminId]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'update_company_plan', 'company', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          companyId,
          JSON.stringify({ oldPlan, newPlan: plan }),
          req.ip
        ]
      );

      res.json({ message: 'Plan actualizado exitosamente' });
    } catch (error) {
      console.error('Error actualizando plan:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Función auxiliar para generar contraseñas seguras
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

module.exports = new PlatformUsersController();