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
    this.createCompany = this.createCompany.bind(this);
    this.updateCompany = this.updateCompany.bind(this);
  }

  // Listar todas las empresas con estadísticas
  async listCompanies(req, res) {
    try {
      console.log('[PLATFORM LIST COMPANIES] Iniciando listado de empresas...');
      console.log('[PLATFORM LIST COMPANIES] Query params:', req.query);
      console.log('[PLATFORM LIST COMPANIES] User:', req.platformAdmin);
      
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
          (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances WHERE company_id = c.id) as active_instances,
          COALESCE((SELECT COUNT(*) FROM whatsapp_bot.messages WHERE company_id = c.id AND created_at > NOW() - INTERVAL '30 days'), 0) as messages_last_30d
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

      console.log('[PLATFORM LIST COMPANIES] Ejecutando query:', query);
      console.log('[PLATFORM LIST COMPANIES] Params:', params);
      
      const result = await pool.query(query, params);
      
      console.log('[PLATFORM LIST COMPANIES] Resultado query:', result.rows.length, 'empresas encontradas');

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

      console.log('[PLATFORM LIST COMPANIES] Enviando respuesta con', companies.length, 'empresas');

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
      console.error('[PLATFORM LIST COMPANIES] Error listando empresas:', error);
      console.error('[PLATFORM LIST COMPANIES] Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
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
      console.log('[PLATFORM LIST USERS] Iniciando listado de usuarios...');
      console.log('[PLATFORM LIST USERS] Query params:', req.query);
      console.log('[PLATFORM LIST USERS] User:', req.platformAdmin);
      
      const { page = 1, limit = 20, search = '', companyId = '', role = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
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

      console.log('[PLATFORM LIST USERS] Ejecutando query:', query);
      console.log('[PLATFORM LIST USERS] Params:', params);
      
      const result = await pool.query(query, params);
      
      console.log('[PLATFORM LIST USERS] Resultado query:', result.rows.length, 'usuarios encontrados');
      console.log('[PLATFORM LIST USERS] Enviando respuesta con', result.rows.length, 'usuarios');

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
      console.error('[PLATFORM LIST USERS] Error listando usuarios:', error);
      console.error('[PLATFORM LIST USERS] Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
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
         (id, company_id, email, password_hash, first_name, last_name, role, 
          temp_password, must_change_password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
        [userId, companyId, email, tempHash, firstName, lastName, role, temporaryPassword]
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
    const { firstName, lastName, role } = req.body;

    try {
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.users 
         SET first_name = $1, last_name = $2, role = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, email, company_id`,
        [firstName, lastName, role, userId]
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

  // Crear nueva empresa
  async createCompany(req, res) {
    const {
      name,
      email,
      plan = 'starter',
      maxInstances,
      maxMessages,
      maxContacts
    } = req.body;

    try {
      console.log('[PLATFORM CREATE COMPANY] Creando empresa:', { name, email, plan });

      // Verificar que el email no existe
      const existingCompany = await pool.query(
        'SELECT id FROM whatsapp_bot.companies WHERE email = $1',
        [email]
      );

      if (existingCompany.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe una empresa con este email' });
      }

      // Verificar que el nombre no existe
      const existingName = await pool.query(
        'SELECT id FROM whatsapp_bot.companies WHERE name = $1',
        [name]
      );

      if (existingName.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe una empresa con este nombre' });
      }

      // Obtener límites por plan
      const planLimits = {
        free_trial: { instances: 1, messages: 50, contacts: 25 },
        trial: { instances: 1, messages: 200, contacts: 100 },
        starter: { instances: 1, messages: 1000, contacts: 500 },
        business: { instances: 5, messages: 5000, contacts: 2500 },
        pro: { instances: 15, messages: 15000, contacts: 7500 },
        enterprise: { instances: 999, messages: 999999, contacts: 999999 }
      };

      const limits = planLimits[plan] || planLimits.starter;

      // Crear empresa
      const companyId = uuidv4();
      const result = await pool.query(
        `INSERT INTO whatsapp_bot.companies 
         (id, name, email, plan, max_instances, max_messages, max_contacts, 
          subscription_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
         RETURNING *`,
        [
          companyId, 
          name, 
          email, 
          plan,
          maxInstances || limits.instances,
          maxMessages || limits.messages,
          maxContacts || limits.contacts
        ]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'create_company', 'company', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          companyId,
          JSON.stringify({ name, email, plan }),
          req.ip
        ]
      );

      console.log('[PLATFORM CREATE COMPANY] Empresa creada exitosamente:', companyId);

      res.status(201).json({
        message: 'Empresa creada exitosamente',
        company: result.rows[0]
      });
    } catch (error) {
      console.error('[PLATFORM CREATE COMPANY] Error creando empresa:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }

  // Actualizar información básica de empresa
  async updateCompany(req, res) {
    const { companyId } = req.params;
    const {
      name,
      email,
      maxInstances,
      maxMessages,
      maxContacts,
      subscriptionStatus
    } = req.body;

    try {
      console.log('[PLATFORM UPDATE COMPANY] Actualizando empresa:', companyId);

      // Verificar que la empresa existe
      const existing = await pool.query(
        'SELECT * FROM whatsapp_bot.companies WHERE id = $1',
        [companyId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const currentCompany = existing.rows[0];

      // Verificar unicidad de email (si cambió)
      if (email && email !== currentCompany.email) {
        const emailExists = await pool.query(
          'SELECT id FROM whatsapp_bot.companies WHERE email = $1 AND id != $2',
          [email, companyId]
        );

        if (emailExists.rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe otra empresa con este email' });
        }
      }

      // Verificar unicidad de nombre (si cambió)
      if (name && name !== currentCompany.name) {
        const nameExists = await pool.query(
          'SELECT id FROM whatsapp_bot.companies WHERE name = $1 AND id != $2',
          [name, companyId]
        );

        if (nameExists.rows.length > 0) {
          return res.status(400).json({ error: 'Ya existe otra empresa con este nombre' });
        }
      }

      // Actualizar empresa
      const updateResult = await pool.query(
        `UPDATE whatsapp_bot.companies 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             max_instances = COALESCE($3, max_instances),
             max_messages = COALESCE($4, max_messages),
             max_contacts = COALESCE($5, max_contacts),
             subscription_status = COALESCE($6, subscription_status),
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [name, email, maxInstances, maxMessages, maxContacts, subscriptionStatus, companyId]
      );

      // Log de actividad
      await pool.query(
        `INSERT INTO public.platform_admin_logs 
         (admin_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, 'update_company', 'company', $2, $3, $4)`,
        [
          req.platformAdmin.adminId,
          companyId,
          JSON.stringify({ updates: req.body }),
          req.ip
        ]
      );

      console.log('[PLATFORM UPDATE COMPANY] Empresa actualizada exitosamente');

      res.json({
        message: 'Empresa actualizada exitosamente',
        company: updateResult.rows[0]
      });
    } catch (error) {
      console.error('[PLATFORM UPDATE COMPANY] Error actualizando empresa:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  }
}

module.exports = new PlatformUsersController();