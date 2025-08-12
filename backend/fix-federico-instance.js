const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx',
  ssl: { rejectUnauthorized: false }
});

async function fixFedericoInstance() {
  try {
    console.log('🔧 Corrigiendo instancia de Federico...');
    
    // Corregir SOLO el instance_name de la instancia de Federico
    const updateResult = await pool.query(`
      UPDATE whatsapp_bot.whatsapp_instances 
      SET instance_name = 'Federico ESP'
      WHERE id = '76478b11-bb0f-41c1-b422-ea378317c109'
      RETURNING id, instance_name, evolution_instance_name;
    `);
    
    if (updateResult.rows.length > 0) {
      const instance = updateResult.rows[0];
      console.log('✅ Instancia corregida:');
      console.log(`  - ID: ${instance.id}`);
      console.log(`  - Nombre amigable: "${instance.instance_name}"`);
      console.log(`  - Nombre Evolution API: "${instance.evolution_instance_name}"`);
    } else {
      console.log('⚠️  No se encontró la instancia de Federico');
    }
    
    console.log('\n🎉 Corrección completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixFedericoInstance(); 