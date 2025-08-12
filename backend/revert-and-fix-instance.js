const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx',
  ssl: { rejectUnauthorized: false }
});

async function fixInstanceStructure() {
  try {
    console.log('🔄 Revirtiendo cambio y agregando estructura correcta...');
    
    // 1. Revertir el nombre a "Federico ESP"
    console.log('1️⃣ Revirtiendo instance_name...');
    await pool.query(`
      UPDATE whatsapp_bot.whatsapp_instances 
      SET instance_name = 'Federico ESP'
      WHERE instance_name = '2ea324e7-7ea7-437e-8e44-14c4002c72eb_federico_esp';
    `);
    
    // 2. Agregar columna evolution_instance_name si no existe
    console.log('2️⃣ Agregando columna evolution_instance_name...');
    try {
      await pool.query(`
        ALTER TABLE whatsapp_bot.whatsapp_instances 
        ADD COLUMN evolution_instance_name VARCHAR(255);
      `);
      console.log('✅ Columna evolution_instance_name agregada');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️ Columna evolution_instance_name ya existe');
      } else {
        throw error;
      }
    }
    
    // 3. Actualizar con el nombre correcto de Evolution API
    console.log('3️⃣ Configurando evolution_instance_name...');
    await pool.query(`
      UPDATE whatsapp_bot.whatsapp_instances 
      SET evolution_instance_name = '2ea324e7-7ea7-437e-8e44-14c4002c72eb_federico_esp'
      WHERE instance_name = 'Federico ESP';
    `);
    
    // 4. Verificar resultado
    console.log('4️⃣ Verificando resultado...');
    const result = await pool.query(`
      SELECT id, instance_name, evolution_instance_name, status 
      FROM whatsapp_bot.whatsapp_instances 
      WHERE instance_name = 'Federico ESP';
    `);
    
    if (result.rows.length > 0) {
      const instance = result.rows[0];
      console.log('✅ Estructura corregida:');
      console.log(`  - ID: ${instance.id}`);
      console.log(`  - Nombre amigable: "${instance.instance_name}"`);
      console.log(`  - Nombre Evolution API: "${instance.evolution_instance_name}"`);
      console.log(`  - Estado: ${instance.status}`);
    }
    
    console.log('\n🎉 Estructura corregida exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixInstanceStructure(); 