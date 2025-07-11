const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const database = require('../database');
const config = require('../config');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Register new company and admin user
const register = asyncHandler(async (req, res) => {
  const { email, password, company_name, full_name, phone } = req.body;

  // Check if user already exists
  const existingUser = await database.findOne('users', { email });
  if (existingUser) {
    throw new AppError('El email ya está registrado', 400, 'EMAIL_ALREADY_EXISTS');
  }

  // Check if company name is already taken
  const existingCompany = await database.findOne('companies', { name: company_name });
  if (existingCompany) {
    throw new AppError('El nombre de la empresa ya está en uso', 400, 'COMPANY_NAME_EXISTS');
  }

  // Start transaction
  const client = await database.getClient();
  
  try {
    await client.query('BEGIN');

    // Create company
    const companyData = {
      id: uuidv4(),
      name: company_name,
      email: email, // Use admin email as company email
      plan: 'starter', // Default plan
      max_instances: config.PLANS.starter.max_instances,
      max_messages: config.PLANS.starter.max_messages,
      created_at: new Date(),
      updated_at: new Date()
    };

    const company = await client.query(
      `INSERT INTO whatsapp_bot.companies (id, name, email, plan, max_instances, max_messages, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [companyData.id, companyData.name, companyData.email, companyData.plan, 
       companyData.max_instances, companyData.max_messages, companyData.created_at, companyData.updated_at]
    );

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Split full_name into first_name and last_name
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create admin user
    const userData = {
      id: uuidv4(),
      company_id: company.rows[0].id,
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    };

    const user = await client.query(
      `INSERT INTO whatsapp_bot.users (id, company_id, email, password_hash, first_name, last_name, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, company_id, email, first_name, last_name, role, created_at`,
      [userData.id, userData.company_id, userData.email, userData.password_hash, userData.first_name, 
       userData.last_name, userData.role, userData.created_at, userData.updated_at]
    );

    await client.query('COMMIT');

    // Generate JWT token
    const token = generateToken({
      userId: user.rows[0].id,
      companyId: company.rows[0].id,
      email: user.rows[0].email,
      role: user.rows[0].role
    });

    res.status(201).json({
      success: true,
      message: 'Empresa y usuario creados exitosamente',
      data: {
        token,
        user: user.rows[0],
        company: company.rows[0]
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with company data
  const result = await database.query(
    `SELECT u.*, c.name as company_name, c.plan, c.max_instances, c.max_messages
     FROM whatsapp_bot.users u
     JOIN whatsapp_bot.companies c ON u.company_id = c.id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];
  
  if (!user) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  // Compare password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await database.query(
    'UPDATE whatsapp_bot.users SET last_login = NOW() WHERE id = $1',
    [user.id]
  );

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    companyId: user.company_id,
    email: user.email,
    role: user.role
  });

  // Remove password from response and combine names
  const { password_hash: _, ...userWithoutPassword } = user;
  userWithoutPassword.full_name = `${user.first_name} ${user.last_name}`.trim();

  res.json({
    success: true,
    message: 'Inicio de sesión exitoso',
    data: {
      token,
      user: userWithoutPassword
    }
  });
});

// Get current user
const me = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get user with company data
  const result = await database.query(
    `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, u.last_login, u.created_at,
            c.name as company_name, c.plan, c.max_instances, c.max_messages
     FROM whatsapp_bot.users u
     JOIN whatsapp_bot.companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [userId]
  );

  const user = result.rows[0];
  
  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  // Combine names and create company settings
  user.full_name = `${user.first_name} ${user.last_name}`.trim();
  user.company_settings = {
    max_instances: user.max_instances,
    max_messages: user.max_messages,
    embeddings: user.plan !== 'starter',
    campaigns: user.plan !== 'starter'
  };

  res.json({
    success: true,
    message: 'Datos del usuario obtenidos exitosamente',
    data: {
      user
    }
  });
});

// Logout user (optional - for token blacklisting)
const logout = asyncHandler(async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return success (client should remove token)
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// Refresh token
const refreshToken = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const companyId = req.user.companyId;

  // Verify user still exists
  const result = await database.query(
    `SELECT u.id, u.company_id, u.email, u.role
     FROM whatsapp_bot.users u
     JOIN whatsapp_bot.companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [userId]
  );

  const user = result.rows[0];
  
  if (!user) {
    throw new AppError('Usuario no encontrado', 401, 'USER_NOT_FOUND');
  }

  // Generate new token
  const token = generateToken({
    userId: user.id,
    companyId: user.company_id,
    email: user.email,
    role: user.role
  });

  res.json({
    success: true,
    message: 'Token renovado exitosamente',
    data: {
      token
    }
  });
});

// Forgot password (placeholder - requires email service)
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if user exists
  const user = await database.findOne('users', { email });
  
  if (!user) {
    // Don't reveal if user exists or not for security
    return res.json({
      success: true,
      message: 'Si el email existe, se enviará un enlace de recuperación'
    });
  }

  // TODO: Generate reset token and send email
  // For now, just return success
  res.json({
    success: true,
    message: 'Si el email existe, se enviará un enlace de recuperación'
  });
});

// Reset password (placeholder - requires token system)
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // TODO: Implement token verification and password reset
  // For now, just return error
  throw new AppError('Función no implementada aún', 501, 'NOT_IMPLEMENTED');
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.userId;

  // Get current user
  const user = await database.findOne('users', { id: userId });
  
  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValidPassword = await comparePassword(current_password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Contraseña actual incorrecta', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const hashedPassword = await hashPassword(new_password);

  // Update password
  await database.update('users', userId, { 
    password_hash: hashedPassword
  });

  res.json({
    success: true,
    message: 'Contraseña cambiada exitosamente'
  });
});

module.exports = {
  register,
  login,
  me,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword
};
