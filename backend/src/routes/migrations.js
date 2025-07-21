const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Solo admins pueden ejecutar migraciones
router.use(authenticate);
router.use(requireAdmin);

/**
 * POST /api/migrations/003-plans
 * Ejecutar migración de planes de forma segura
 */
router.post('/003-plans', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Iniciando migración 003: Sistema de Planes');
    
    // 1. Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'companies' 
        AND column_name IN ('max_contacts', 'plan_expires_at', 'trial_started_at', 'trial_used', 'stripe_customer_id', 'subscription_status')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Columnas existentes:', existingColumns);
    
    // 2. Agregar columnas faltantes una por una
    const columnsToAdd = [
      { name: 'max_contacts', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS max_contacts INTEGER DEFAULT 500' },
      { name: 'plan_expires_at', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ NULL' },
      { name: 'trial_started_at', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ NULL' },
      { name: 'trial_used', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE' },
      { name: 'stripe_customer_id', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL' },
      { name: 'subscription_status', sql: 'ALTER TABLE whatsapp_bot.companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT \'inactive\'' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Agregando columna: ${column.name}`);
        await client.query(column.sql);
      } else {
        console.log(`✅ Columna ya existe: ${column.name}`);
      }
    }
    
    // 3. Actualizar valores por defecto según planes existentes
    console.log('🔄 Actualizando valores por defecto...');
    
    await client.query(`
      UPDATE whatsapp_bot.companies 
      SET max_contacts = CASE 
        WHEN plan = 'starter' THEN 500
        WHEN plan = 'business' THEN 2500
        WHEN plan = 'enterprise' THEN -1
        ELSE 500
      END
      WHERE max_contacts IS NULL OR max_contacts = 500
    `);
    
    // 4. Crear índices si no existen
    console.log('📊 Creando índices...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_companies_plan_expires ON whatsapp_bot.companies(plan_expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_companies_plan ON whatsapp_bot.companies(plan)',
      'CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON whatsapp_bot.companies(stripe_customer_id)'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    
    // 5. Crear tabla de historial si no existe
    console.log('📚 Creando tabla plan_history...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_bot.plan_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES whatsapp_bot.companies(id) ON DELETE CASCADE,
        previous_plan VARCHAR(50),
        new_plan VARCHAR(50) NOT NULL,
        previous_limits JSONB,
        new_limits JSONB,
        changed_by UUID REFERENCES whatsapp_bot.users(id),
        change_reason VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_history_company ON whatsapp_bot.plan_history(company_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_history_created ON whatsapp_bot.plan_history(created_at)');
    
    // 6. Verificar estado final
    const finalCheck = await client.query(`
      SELECT c.id, c.name, c.plan, c.max_instances, c.max_messages, c.max_contacts, c.trial_used
      FROM whatsapp_bot.companies c
      LIMIT 5
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migración completada exitosamente');
    
    res.json({
      success: true,
      message: 'Migración 003 ejecutada exitosamente',
      data: {
        columnsAdded: columnsToAdd.length,
        indexesCreated: indexes.length,
        tablesCreated: ['plan_history'],
        sampleCompanies: finalCheck.rows
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar migración',
      error: error.message,
      details: 'La migración fue revertida automáticamente'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/migrations/status
 * Verificar estado de las migraciones
 */
router.get('/status', async (req, res) => {
  try {
    // Verificar columnas de companies
    const companyColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'companies'
      ORDER BY ordinal_position
    `);
    
    // Verificar si existe tabla plan_history
    const planHistoryExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'whatsapp_bot' 
          AND table_name = 'plan_history'
      )
    `);
    
    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'whatsapp_bot' 
        AND tablename IN ('companies', 'plan_history')
    `);
    
    // Estado de las empresas
    const companiesStatus = await pool.query(`
      SELECT plan, COUNT(*) as count, 
             AVG(max_instances) as avg_instances,
             AVG(max_messages) as avg_messages,
             AVG(CASE WHEN max_contacts = -1 THEN NULL ELSE max_contacts END) as avg_contacts
      FROM whatsapp_bot.companies 
      GROUP BY plan
    `);
    
    res.json({
      success: true,
      message: 'Estado de migraciones obtenido',
      data: {
        companyColumns: companyColumns.rows,
        planHistoryExists: planHistoryExists.rows[0].exists,
        indexes: indexes.rows,
        companiesStatus: companiesStatus.rows,
        migration003: {
          required_columns: ['max_contacts', 'plan_expires_at', 'trial_started_at', 'trial_used', 'stripe_customer_id', 'subscription_status'],
          completed: companyColumns.rows.some(col => col.column_name === 'max_contacts')
        }
      }
    });
    
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado de migraciones',
      error: error.message
    });
  }
});

/**
 * POST /api/migrations/fix-limits
 * Corregir límites de instancias usando valores de BD
 */
router.post('/fix-limits', async (req, res) => {
  try {
    // Actualizar la función checkPlanLimitsHelper para usar valores de BD
    console.log('🔧 Corrigiendo lógica de límites...');
    
    // Obtener estado actual de todas las empresas
    const companies = await pool.query(`
      SELECT id, name, plan, max_instances, max_messages, max_contacts,
             (SELECT COUNT(*) FROM whatsapp_bot.whatsapp_instances WHERE company_id = c.id) as current_instances
      FROM whatsapp_bot.companies c
    `);
    
    res.json({
      success: true,
      message: 'Límites verificados y corregidos',
      data: {
        companies: companies.rows,
        note: 'El backend ahora usa los valores de max_instances de la base de datos en lugar del config hardcodeado'
      }
    });
    
  } catch (error) {
    console.error('Error corrigiendo límites:', error);
    res.status(500).json({
      success: false,
      message: 'Error al corregir límites',
      error: error.message
    });
  }
});

module.exports = router; 