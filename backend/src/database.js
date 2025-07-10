const { Pool } = require('pg');
const config = require('./config');

class Database {
  constructor() {
    // SSL configuration - automatically detect if SSL is needed
    let sslConfig = false;
    
    if (config.DATABASE_URL) {
      // Check if URL contains SSL indicators or is from known SSL providers
      const urlRequiresSSL = 
        config.DATABASE_URL.includes('sslmode=require') ||
        config.DATABASE_URL.includes('amazonaws.com') ||
        config.DATABASE_URL.includes('heroku') ||
        config.DATABASE_URL.includes('render.com') ||
        config.DATABASE_URL.includes('railway.app') ||
        config.DATABASE_URL.includes('supabase.co') ||
        config.DATABASE_URL.includes('neon.tech') ||
        config.DATABASE_URL.includes('planetscale.com') ||
        process.env.NODE_ENV === 'production';
      
      if (urlRequiresSSL) {
        sslConfig = { rejectUnauthorized: false };
      }
    }
    
    // Allow manual SSL override via environment variable
    if (process.env.DATABASE_SSL === 'true') {
      sslConfig = { rejectUnauthorized: false };
    } else if (process.env.DATABASE_SSL === 'false') {
      sslConfig = false;
    }
    
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Set default schema
      options: '-c search_path=whatsapp_bot,public'
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      
      return res;
    } catch (err) {
      console.error('Database query error', { text, params, error: err.message });
      throw err;
    }
  }

  async getClient() {
    const client = await this.pool.connect();
    // Set search path for this connection
    await client.query('SET search_path TO whatsapp_bot, public');
    return client;
  }

  async close() {
    await this.pool.end();
  }

  // Helper methods with schema prefix
  async findOne(table, conditions, columns = '*') {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    
    // Add schema prefix if not present
    const fullTable = table.includes('.') ? table : `whatsapp_bot.${table}`;
    const query = `SELECT ${columns} FROM ${fullTable} WHERE ${whereClause} LIMIT 1`;
    const result = await this.query(query, values);
    
    return result.rows[0] || null;
  }

  async findMany(table, conditions = {}, options = {}) {
    const { limit = config.DEFAULT_PAGE_SIZE, offset = 0, orderBy = 'created_at DESC' } = options;
    
    // Add schema prefix if not present
    const fullTable = table.includes('.') ? table : `whatsapp_bot.${table}`;
    let query = `SELECT * FROM ${fullTable}`;
    let values = [];
    
    if (Object.keys(conditions).length > 0) {
      const keys = Object.keys(conditions);
      values = Object.values(conditions);
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    query += ` ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    const result = await this.query(query, values);
    return result.rows;
  }

  async create(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    // Add schema prefix if not present
    const fullTable = table.includes('.') ? table : `whatsapp_bot.${table}`;
    const query = `
      INSERT INTO ${fullTable} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    // Add schema prefix if not present
    const fullTable = table.includes('.') ? table : `whatsapp_bot.${table}`;
    const query = `
      UPDATE ${fullTable}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    const result = await this.query(query, [...values, id]);
    return result.rows[0];
  }

  async delete(table, id) {
    // Add schema prefix if not present
    const fullTable = table.includes('.') ? table : `whatsapp_bot.${table}`;
    const query = `DELETE FROM ${fullTable} WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // Migration helper
  async runMigration(migrationSql) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Schema utilities
  async listTables() {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'whatsapp_bot' 
      ORDER BY table_name
    `;
    const result = await this.query(query);
    return result.rows.map(row => row.table_name);
  }

  async checkSchema() {
    const query = `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'whatsapp_bot'`;
    const result = await this.query(query);
    return result.rows.length > 0;
  }
}

module.exports = new Database();