const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx',
  ssl: { rejectUnauthorized: false }
});

async function checkInstancesStructure() {
  try {
    console.log('🔍 Revisando estructura de whatsapp_instances...');
    
    // 1. Ver estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' 
      AND table_name = 'whatsapp_instances'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas de whatsapp_instances:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
    });
    
    console.log('\n📊 Datos actuales de instancias:');
    
    // 2. Ver todas las instancias
    const instances = await pool.query(`
      SELECT * FROM whatsapp_bot.whatsapp_instances 
      ORDER BY created_at DESC 
      LIMIT 3;
    `);
    
    instances.rows.forEach((instance, index) => {
      console.log(`\n🔸 Instancia ${index + 1}:`);
      Object.keys(instance).forEach(key => {
        if (instance[key] !== null) {
          console.log(`    ${key}: ${instance[key]}`);
        }
      });
    });
    
    console.log('\n🎉 Revisión completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstancesStructure(); 