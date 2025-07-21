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
  
  // Business rules - Sistema de Planes Mejorado
  PLANS: {
    free_trial: {
      name: 'Free Trial',
      max_instances: 1,
      max_messages: 50,
      max_contacts: 25,
      duration_hours: 48, // 48 horas
      embeddings: false,
      campaigns: false,
      priority_support: false,
      analytics: false,
      price: 0
    },
    trial: {
      name: 'Trial',
      max_instances: 1,
      max_messages: 200,
      max_contacts: 100,
      duration_days: 7, // 7 días
      embeddings: true,
      campaigns: false,
      priority_support: false,
      analytics: true,
      price: 0
    },
    starter: {
      name: 'Starter',
      max_instances: 1,
      max_messages: 1000,
      max_contacts: 500,
      duration_days: -1, // ilimitado
      embeddings: true,
      campaigns: true,
      priority_support: false,
      analytics: true,
      price: 15 // USD por mes
    },
    business: {
      name: 'Business',
      max_instances: 5,
      max_messages: 5000,
      max_contacts: 2500,
      duration_days: -1, // ilimitado
      embeddings: true,
      campaigns: true,
      priority_support: true,
      analytics: true,
      price: 49 // USD por mes
    },
    pro: {
      name: 'Professional',
      max_instances: 15,
      max_messages: 15000,
      max_contacts: 7500,
      duration_days: -1, // ilimitado
      embeddings: true,
      campaigns: true,
      priority_support: true,
      analytics: true,
      price: 99 // USD por mes
    },
    enterprise: {
      name: 'Enterprise',
      max_instances: -1, // ilimitado
      max_messages: -1, // ilimitado
      max_contacts: -1, // ilimitado
      duration_days: -1, // ilimitado
      embeddings: true,
      campaigns: true,
      priority_support: true,
      analytics: true,
      price: 299 // USD por mes
    }
  }
};

module.exports = config;