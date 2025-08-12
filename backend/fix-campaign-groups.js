const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://evolution_user:VWXYDFfvsik7aQvRWn88PBrnSb9H0dz9@dpg-d1n3kumr433s73babl4g-a.oregon-postgres.render.com/evolution_9znx',
  ssl: { rejectUnauthorized: false }
});

async function fixCampaignGroups() {
  try {
    console.log('🔍 Diagnosticando estado de grupos...\n');
    
    // 1. Ver estado actual de todos los grupos
    const groupsResult = await pool.query(`
      SELECT 
        cg.id,
        cg.group_name,
        cg.group_number,
        cg.current_members,
        cg.max_members,
        cg.is_active_for_distribution,
        cg.status,
        c.name as campaign_name,
        c.id as campaign_id
      FROM whatsapp_bot.whatsapp_campaign_groups cg
      JOIN whatsapp_bot.whatsapp_campaigns c ON cg.campaign_id = c.id
      WHERE cg.status = 'active'
      ORDER BY c.name, cg.group_number
    `);

    console.log('📊 GRUPOS ENCONTRADOS:');
    console.log('========================');
    
    if (groupsResult.rows.length === 0) {
      console.log('❌ No hay grupos activos');
      return;
    }

    groupsResult.rows.forEach(group => {
      const activeStatus = group.is_active_for_distribution ? '🟢 ACTIVO' : '🔴 INACTIVO';
      const fullStatus = group.current_members >= group.max_members ? '🔴 LLENO' : '🟢 ESPACIO';
      
      console.log(`
📋 ${group.campaign_name} - ${group.group_name}
   └── Estado: ${activeStatus} | Capacidad: ${fullStatus} (${group.current_members}/${group.max_members})
   └── ID: ${group.id}
      `);
    });

    // 2. Buscar campañas sin grupo activo
    const campaignsWithoutActive = await pool.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(cg.id) as total_groups,
        COUNT(CASE WHEN cg.is_active_for_distribution THEN 1 END) as active_groups
      FROM whatsapp_bot.whatsapp_campaigns c
      LEFT JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id AND cg.status = 'active'
      WHERE c.status IN ('active', 'paused')
      GROUP BY c.id, c.name
      HAVING COUNT(CASE WHEN cg.is_active_for_distribution THEN 1 END) = 0
        AND COUNT(cg.id) > 0
    `);

    if (campaignsWithoutActive.rows.length > 0) {
      console.log('\n🚨 CAMPAÑAS SIN GRUPO ACTIVO:');
      console.log('===============================');
      
      for (const campaign of campaignsWithoutActive.rows) {
        console.log(`\n❌ ${campaign.name} (${campaign.total_groups} grupos, 0 activos)`);
        
        // Buscar el grupo menos lleno para activar
        const bestGroupResult = await pool.query(`
          SELECT id, group_name, current_members, max_members
          FROM whatsapp_bot.whatsapp_campaign_groups 
          WHERE campaign_id = $1 AND status = 'active'
          ORDER BY (current_members::float / max_members::float) ASC
          LIMIT 1
        `, [campaign.id]);

        if (bestGroupResult.rows.length > 0) {
          const bestGroup = bestGroupResult.rows[0];
          console.log(`   🎯 Mejor opción: ${bestGroup.group_name} (${bestGroup.current_members}/${bestGroup.max_members})`);
          
          // Preguntar si activar
          console.log(`   🔄 Activando ${bestGroup.group_name}...`);
          
          // Desactivar todos los grupos de la campaña
          await pool.query(`
            UPDATE whatsapp_bot.whatsapp_campaign_groups 
            SET is_active_for_distribution = false 
            WHERE campaign_id = $1
          `, [campaign.id]);
          
          // Activar el mejor grupo
          await pool.query(`
            UPDATE whatsapp_bot.whatsapp_campaign_groups 
            SET is_active_for_distribution = true, updated_at = NOW()
            WHERE id = $1
          `, [bestGroup.id]);
          
          console.log(`   ✅ ${bestGroup.group_name} activado para distribución`);
        }
      }
    } else {
      console.log('\n✅ Todas las campañas activas tienen un grupo disponible');
    }

    // 3. Verificar links rotos
    console.log('\n🔗 VERIFICANDO DISPONIBILIDAD DE LINKS...');
    console.log('==========================================');
    
    const activeDistributionGroups = await pool.query(`
      SELECT 
        c.name as campaign_name,
        c.distributor_slug,
        cg.group_name,
        cg.current_members,
        cg.max_members
      FROM whatsapp_bot.whatsapp_campaigns c
      JOIN whatsapp_bot.whatsapp_campaign_groups cg ON c.id = cg.campaign_id
      WHERE c.status IN ('active', 'paused')
        AND cg.is_active_for_distribution = true
        AND cg.status = 'active'
    `);

    if (activeDistributionGroups.rows.length > 0) {
      activeDistributionGroups.rows.forEach(group => {
        console.log(`✅ ${group.campaign_name}: ${group.group_name} (${group.current_members}/${group.max_members})`);
        console.log(`   🔗 /campaigns/public/${group.distributor_slug}`);
      });
    } else {
      console.log('❌ No hay grupos activos para distribución');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixCampaignGroups(); 