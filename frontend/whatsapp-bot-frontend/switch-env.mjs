#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configFile = path.join(__dirname, 'api-config.json');
const envFile = path.join(__dirname, '.env');

// Leer configuración
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Obtener argumento de línea de comandos
const targetEnv = process.argv[2];

if (!targetEnv) {
  console.log('\n🔧 Ambientes disponibles:');
  Object.entries(config.environments).forEach(([key, env]) => {
    const current = key === config.current ? ' (actual)' : '';
    console.log(`  - ${key}: ${env.name}${current}`);
  });
  console.log('\n📖 Uso: node switch-env.mjs <ambiente>');
  console.log('   Ejemplo: node switch-env.mjs local');
  process.exit(0);
}

if (!config.environments[targetEnv]) {
  console.error(`❌ Error: Ambiente "${targetEnv}" no encontrado`);
  process.exit(1);
}

// Obtener configuración del ambiente
const envConfig = config.environments[targetEnv];

// Crear contenido del archivo .env
const envContent = `# Variables de entorno para WhatsApp Bot Frontend
# Ambiente: ${envConfig.name}

# URL de la API Backend
VITE_API_URL=${envConfig.url}

# Timeout para las peticiones HTTP (en ms)
VITE_API_TIMEOUT=${envConfig.timeout}

# Nombre de la aplicación
VITE_APP_NAME=WhatsApp Bot Platform

# Versión de la aplicación
VITE_APP_VERSION=1.0.0

# Entorno de la aplicación
VITE_NODE_ENV=${targetEnv === 'local' ? 'development' : 'production'}
`;

// Escribir archivo .env
fs.writeFileSync(envFile, envContent);

// Actualizar configuración actual
config.current = targetEnv;
fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

console.log(`\n✅ Ambiente cambiado a: ${envConfig.name}`);
console.log(`📡 URL de API: ${envConfig.url}`);
console.log(`⏱️  Timeout: ${envConfig.timeout}ms`);
console.log('\n🔄 Reinicia el servidor de desarrollo para aplicar los cambios');
