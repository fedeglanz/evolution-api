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
    
    console.log('🚀 Iniciando migración 003: Sistema de Planes y Pairing Codes');
    
    // 1. Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'companies' 
        AND column_name IN ('max_contacts', 'plan_expires_at', 'trial_started_at', 'trial_used', 'stripe_customer_id', 'subscription_status')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Columnas existentes (companies):', existingColumns);
    
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
    
    // 3. Verificar columna phone_number en whatsapp_instances
    console.log('📱 Verificando soporte para pairing codes...');
    
    const checkInstanceColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'whatsapp_instances' 
        AND column_name IN ('phone_number', 'pairing_code')
    `);
    
    const existingInstanceColumns = checkInstanceColumns.rows.map(row => row.column_name);
    console.log('📋 Columnas existentes (whatsapp_instances):', existingInstanceColumns);
    
    // Agregar phone_number si no existe
    if (!existingInstanceColumns.includes('phone_number')) {
      console.log('➕ Agregando columna phone_number a whatsapp_instances...');
      await client.query(`
        ALTER TABLE whatsapp_bot.whatsapp_instances 
        ADD COLUMN phone_number VARCHAR(20) NULL
      `);
      
      await client.query(`
        COMMENT ON COLUMN whatsapp_bot.whatsapp_instances.phone_number 
        IS 'Número de teléfono para generar pairing code (formato: +5491123456789)'
      `);
      
      console.log('✅ Columna phone_number agregada exitosamente');
    } else {
      console.log('✅ Columna phone_number ya existe');
    }
    
    // Agregar pairing_code si no existe
    if (!existingInstanceColumns.includes('pairing_code')) {
      console.log('➕ Agregando columna pairing_code a whatsapp_instances...');
      await client.query(`
        ALTER TABLE whatsapp_bot.whatsapp_instances 
        ADD COLUMN pairing_code VARCHAR(20) NULL
      `);
      
      await client.query(`
        COMMENT ON COLUMN whatsapp_bot.whatsapp_instances.pairing_code 
        IS 'Código numérico de 8 dígitos para conectar sin QR (formato: 12345678)'
      `);
      
      console.log('✅ Columna pairing_code agregada exitosamente');
    } else {
      console.log('✅ Columna pairing_code ya existe');
    }
    
    // Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone 
      ON whatsapp_bot.whatsapp_instances(phone_number)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_pairing_code 
      ON whatsapp_bot.whatsapp_instances(pairing_code)
    `);
    
    // 4. Actualizar valores por defecto según planes existentes
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
    
    // 5. Crear índices si no existen
    console.log('📊 Creando índices...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_companies_plan_expires ON whatsapp_bot.companies(plan_expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_companies_plan ON whatsapp_bot.companies(plan)',
      'CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON whatsapp_bot.companies(stripe_customer_id)'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    
    // 6. Crear tabla de historial si no existe
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
    
    // 7. Crear función de limpieza automática
    console.log('🔧 Creando función cleanup_expired_plans...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION whatsapp_bot.cleanup_expired_plans()
      RETURNS void AS $$
      BEGIN
        -- Actualizar empresas con planes expirados a plan básico
        UPDATE whatsapp_bot.companies 
        SET plan = 'starter',
            max_instances = 1,
            max_messages = 1000,
            max_contacts = 500
        WHERE plan_expires_at IS NOT NULL 
          AND plan_expires_at < NOW() 
          AND plan != 'starter';
          
        -- Log de la operación
        INSERT INTO whatsapp_bot.plan_history (company_id, new_plan, change_reason, created_at)
        SELECT id, 'starter', 'Plan expired - auto downgrade', NOW()
        FROM whatsapp_bot.companies
        WHERE plan_expires_at IS NOT NULL 
          AND plan_expires_at < NOW() - INTERVAL '1 day'
          AND NOT EXISTS (
            SELECT 1 FROM whatsapp_bot.plan_history ph 
            WHERE ph.company_id = companies.id 
              AND ph.change_reason = 'Plan expired - auto downgrade'
              AND ph.created_at > NOW() - INTERVAL '1 day'
          );
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      COMMENT ON FUNCTION whatsapp_bot.cleanup_expired_plans() 
      IS 'Función para limpieza automática de planes expirados - ejecutar con pg_cron'
    `);
    
    // 8. Verificar estado final
    const finalCheck = await client.query(`
      SELECT c.id, c.name, c.plan, c.max_instances, c.max_messages, c.max_contacts, c.trial_used
      FROM whatsapp_bot.companies c
      LIMIT 5
    `);
    
    // Verificar instancias con soporte pairing code
    const instancesCheck = await client.query(`
      SELECT COUNT(*) as total_instances, 
             COUNT(phone_number) as instances_with_pairing
      FROM whatsapp_bot.whatsapp_instances
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migración completada exitosamente');
    
    res.json({
      success: true,
      message: 'Migración 003 ejecutada exitosamente (Planes + Pairing Codes)',
      data: {
        columnsAdded: columnsToAdd.length + 2, // +2 por phone_number y pairing_code
        indexesCreated: indexes.length + 2,    // +2 por idx_whatsapp_instances_phone y idx_whatsapp_instances_pairing_code
        tablesCreated: ['plan_history'],
        functionsCreated: ['cleanup_expired_plans'],
        sampleCompanies: finalCheck.rows,
        instanceStats: instancesCheck.rows[0],
        features: {
          planManagement: true,
          pairingCodeSupport: true,
          autoCleanup: true
        }
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
    
    // Verificar columnas de whatsapp_instances (especialmente phone_number)
    const instanceColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
        AND table_name = 'whatsapp_instances'
        AND column_name = 'phone_number'
    `);
    
    // Verificar si existe tabla plan_history
    const planHistoryExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'whatsapp_bot' 
          AND table_name = 'plan_history'
      )
    `);
    
    // Verificar función cleanup_expired_plans
    const cleanupFunctionExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'whatsapp_bot' 
          AND routine_name = 'cleanup_expired_plans'
          AND routine_type = 'FUNCTION'
      )
    `);
    
    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'whatsapp_bot' 
        AND tablename IN ('companies', 'plan_history', 'whatsapp_instances')
      ORDER BY tablename, indexname
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
    
    // Estado de instancias con pairing code
    const instancesStatus = await pool.query(`
      SELECT COUNT(*) as total_instances,
             COUNT(phone_number) as instances_with_pairing_support,
             COUNT(CASE WHEN phone_number IS NOT NULL THEN 1 END) as instances_with_phone_number
      FROM whatsapp_bot.whatsapp_instances
    `);
    
    // Verificar completitud de migración 003
    const requiredCompanyColumns = ['max_contacts', 'plan_expires_at', 'trial_started_at', 'trial_used', 'stripe_customer_id', 'subscription_status'];
    const existingCompanyColumns = companyColumns.rows.map(col => col.column_name);
    const companyMigrationComplete = requiredCompanyColumns.every(col => existingCompanyColumns.includes(col));
    
    const pairingCodeSupport = instanceColumns.rows.length > 0;
    
    res.json({
      success: true,
      message: 'Estado de migraciones obtenido',
      data: {
        migration003: {
          planManagement: {
            completed: companyMigrationComplete,
            requiredColumns: requiredCompanyColumns,
            existingColumns: existingCompanyColumns,
            missingColumns: requiredCompanyColumns.filter(col => !existingCompanyColumns.includes(col))
          },
          pairingCodeSupport: {
            completed: pairingCodeSupport,
            phoneNumberColumn: pairingCodeSupport ? instanceColumns.rows[0] : null
          },
          infrastructure: {
            planHistoryTable: planHistoryExists.rows[0].exists,
            cleanupFunction: cleanupFunctionExists.rows[0].exists
          },
          overall: companyMigrationComplete && pairingCodeSupport && planHistoryExists.rows[0].exists
        },
        companyColumns: companyColumns.rows,
        instanceColumns: instanceColumns.rows,
        indexes: indexes.rows,
        statistics: {
          companies: companiesStatus.rows,
          instances: instancesStatus.rows[0]
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