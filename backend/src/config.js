require('dotenv').config();

const config = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_CONNECTION_URI || process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL, // 'true', 'false', or undefined (auto-detect)
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Evolution API
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || 'https://evolution-api-jz3j.onrender.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100, // requests per window
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Business rules
  PLANS: {
    starter: {
      max_instances: 1,
      max_messages: 1000,
      embeddings: false,
      campaigns: false
    },
    business: {
      max_instances: 3,
      max_messages: 5000,
      embeddings: true,
      campaigns: true
    },
    enterprise: {
      max_instances: -1, // unlimited
      max_messages: -1, // unlimited
      embeddings: true,
      campaigns: true
    }
  }
};

module.exports = config;