#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Use production database URL if available
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function createSuperAdmin() {
  const email = process.argv[2] || 'admin@platform.com';
  const password = process.argv[3] || 'ChangeMe123!';
  
  try {
    console.log('🔐 Creando Super Admin...');
    console.log(`📧 Email: ${email}`);
    
    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM public.platform_admins WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      console.log('⚠️  El admin ya existe. Actualizando password...');
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Update existing admin
      await pool.query(
        `UPDATE public.platform_admins 
         SET password_hash = $1, 
             temp_password = $2,
             must_change_password = true,
             updated_at = NOW()
         WHERE email = $3`,
        [passwordHash, password, email]
      );
      
      console.log('✅ Password actualizado exitosamente');
    } else {
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create new super admin
      await pool.query(
        `INSERT INTO public.platform_admins (
          email,
          password_hash,
          first_name,
          last_name,
          role,
          temp_password,
          must_change_password
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [email, passwordHash, 'Super', 'Admin', 'super_admin', password, true]
      );
      
      console.log('✅ Super Admin creado exitosamente');
    }
    
    console.log('\n📝 Credenciales:');
    console.log(`   Email: ${email}`);
    console.log(`   Password temporal: ${password}`);
    console.log('\n⚠️  IMPORTANTE: Debes cambiar la contraseña en el primer login');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createSuperAdmin();
}

module.exports = createSuperAdmin;