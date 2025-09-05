// Check plans table structure
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_URI,
  ssl: { rejectUnauthorized: false }
});

async function checkPlansTable() {
  try {
    console.log('🔍 Checking plans table structure...');
    
    // Get table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'whatsapp_bot' AND table_name = 'plans'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    console.log('📋 Plans table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '- nullable' : ''}`);
    });
    
    console.log('---');
    
    // Get sample data
    const dataQuery = 'SELECT * FROM whatsapp_bot.plans LIMIT 2';
    const dataResult = await pool.query(dataQuery);
    
    console.log('📊 Sample plans data:');
    dataResult.rows.forEach((row, index) => {
      console.log(`Plan ${index + 1}:`);
      Object.keys(row).forEach(key => {
        console.log(`  ${key}: ${row[key]}`);
      });
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPlansTable();