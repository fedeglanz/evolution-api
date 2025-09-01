#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use production database URL
const DATABASE_URL = 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🚀 Ejecutando migración 016_platform_admin_system.sql...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/016_platform_admin_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verify tables were created
    const checkTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('platform_admins', 'platform_admin_sessions', 'platform_admin_logs', 'platform_stats')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tablas creadas:');
    checkTables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check if temp_password columns were added to users table
    const checkUserColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
      AND table_name = 'users'
      AND column_name IN ('temp_password', 'must_change_password', 'password_changed_at')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Columnas agregadas a users:');
    checkUserColumns.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Detalles:', error.detail || error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();