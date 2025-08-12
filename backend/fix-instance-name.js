const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateInstanceName() {
  try {
    console.log('🔍 Consultando instancias actuales...');
    
    // Ver instancias actuales
    const currentInstances = await pool.query(
      'SELECT id, instance_name, status FROM whatsapp_bot.whatsapp_instances ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('📋 Instancias encontradas:');
    currentInstances.rows.forEach(instance => {
      console.log(`  - ID: ${instance.id}`);
      console.log(`    Nombre: "${instance.instance_name}"`);
      console.log(`    Estado: ${instance.status}`);
      console.log('');
    });
    
    // Actualizar el nombre de "Federico ESP" al formato correcto
    const updateResult = await pool.query(`
      UPDATE whatsapp_bot.whatsapp_instances 
      SET instance_name = '2ea324e7-7ea7-437e-8e44-14c4002c72eb_federico_esp'
      WHERE instance_name = 'Federico ESP'
      RETURNING id, instance_name;
    `);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Instancia actualizada:');
      updateResult.rows.forEach(instance => {
        console.log(`  - ID: ${instance.id}`);
        console.log(`    Nuevo nombre: "${instance.instance_name}"`);
      });
    } else {
      console.log('⚠️  No se encontró instancia con nombre "Federico ESP"');
    }
    
    console.log('\n🎉 Script completado!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateInstanceName(); 