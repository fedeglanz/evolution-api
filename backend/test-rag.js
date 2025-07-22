#!/usr/bin/env node

/**
 * 🧪 RAG Testing Script
 * Script para probar el sistema RAG completo
 */

const axios = require('axios');
const fs = require('fs');

// Configuración
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your-jwt-token-here';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function success(...args) { log('green', '✅', ...args); }
function error(...args) { log('red', '❌', ...args); }
function warning(...args) { log('yellow', '⚠️', ...args); }
function info(...args) { log('blue', 'ℹ️', ...args); }
function step(...args) { log('magenta', '🔄', ...args); }

// Funciones de testing
async function testRAGStatus() {
  step('Testing RAG Status...');
  try {
    const response = await api.get('/knowledge/rag/status');
    const { data } = response.data;
    
    success('RAG Status Retrieved:');
    console.log(`  - Total Items: ${data.summary.total_items}`);
    console.log(`  - Items with Embeddings: ${data.summary.items_with_embeddings}`);
    console.log(`  - Ready for RAG: ${data.summary.ready_for_rag}`);
    console.log(`  - Processing: ${data.summary.processing_items}`);
    console.log(`  - Errors: ${data.summary.error_items}`);
    
    return data;
  } catch (err) {
    error('RAG Status Failed:', err.response?.data?.message || err.message);
    return null;
  }
}

async function testEmbeddingGeneration() {
  step('Testing Embedding Generation...');
  
  const testTexts = [
    "¿Cómo funciona el sistema de pagos en nuestra plataforma?",
    "Políticas de devolución y garantías",
    "Información sobre horarios de atención al cliente"
  ];
  
  for (const text of testTexts) {
    try {
      const response = await api.post('/knowledge/rag/test-embeddings', {
        text,
        provider: 'openai',
        model: 'text-embedding-3-small'
      });
      
      const { data } = response.data;
      success(`Embedding Generated for: "${text.substring(0, 50)}..."`);
      console.log(`  - Vector Size: ${data.embedding_vector_size}`);
      console.log(`  - Tokens: ${data.token_count}`);
      console.log(`  - Time: ${data.generation_time_ms}ms`);
      console.log(`  - Preview: [${data.embedding_preview.map(v => v.toFixed(4)).join(', ')}...]`);
      
    } catch (err) {
      error(`Embedding Failed for: "${text}"`, err.response?.data?.message || err.message);
    }
  }
}

async function testRAGSearch() {
  step('Testing RAG Search...');
  
  const testQueries = [
    "¿Cuáles son los horarios de atención?",
    "Información sobre pagos y facturación",
    "Políticas de cancelación",
    "¿Cómo contactar soporte técnico?",
    "Requisitos del sistema"
  ];
  
  for (const query of testQueries) {
    try {
      const response = await api.post('/knowledge/rag/test-search', {
        query,
        similarityThreshold: 0.6,
        maxResults: 3
      });
      
      const { data } = response.data;
      success(`RAG Search: "${query}"`);
      console.log(`  - Sources Found: ${data.sources.length}`);
      console.log(`  - Context Tokens: ${data.context.totalTokens}`);
      console.log(`  - Chunks Used: ${data.context.chunksUsed}`);
      console.log(`  - Avg Similarity: ${data.metadata.avgSimilarity.toFixed(3)}`);
      
      if (data.sources.length > 0) {
        console.log(`  - Top Source: "${data.sources[0].title}" (${data.sources[0].similarityScore.toFixed(3)})`);
      }
      
    } catch (err) {
      warning(`RAG Search Failed for: "${query}"`, err.response?.data?.message || err.message);
    }
  }
}

async function testRAGMigration() {
  step('Testing RAG Migration...');
  
  try {
    const response = await api.post('/knowledge/rag/migrate');
    const { data } = response.data;
    
    success('RAG Migration Completed:');
    console.log(`  - Total Processed: ${data.summary.total_processed}`);
    console.log(`  - Successful: ${data.summary.successful}`);
    console.log(`  - Failed: ${data.summary.failed}`);
    console.log(`  - Total Embeddings: ${data.summary.total_embeddings}`);
    
    // Show details for failed items
    const failed = data.details.filter(item => !item.success);
    if (failed.length > 0) {
      warning(`Failed Items:`);
      failed.forEach(item => {
        console.log(`    - ${item.knowledgeItemId}: ${item.error}`);
      });
    }
    
    return data;
  } catch (err) {
    error('RAG Migration Failed:', err.response?.data?.message || err.message);
    return null;
  }
}

async function testKnowledgeCreation() {
  step('Testing Knowledge Creation with Auto-Embedding...');
  
  const testKnowledge = [
    {
      title: "Horarios de Atención",
      content: "Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM. Los fines de semana tenemos servicio limitado de 10:00 AM a 2:00 PM. Para emergencias fuera de horario, contactar al +1-800-EMERGENCY.",
      tags: ["horarios", "atencion", "contacto"]
    },
    {
      title: "Política de Devoluciones",
      content: "Aceptamos devoluciones dentro de 30 días de la compra. El producto debe estar en condiciones originales. Se requiere recibo de compra. Las devoluciones se procesan en 5-7 días hábiles. Los gastos de envío de devolución son responsabilidad del cliente.",
      tags: ["devoluciones", "politica", "garantia"]
    },
    {
      title: "Métodos de Pago",
      content: "Aceptamos tarjetas de crédito Visa, MasterCard y American Express. También PayPal, transferencias bancarias y pagos en efectivo en tienda. Los pagos se procesan de forma segura con encriptación SSL. Para pagos a plazos, consultar con nuestro equipo de ventas.",
      tags: ["pagos", "tarjetas", "paypal", "seguridad"]
    }
  ];
  
  const createdItems = [];
  
  for (const knowledge of testKnowledge) {
    try {
      const response = await api.post('/knowledge', knowledge);
      const item = response.data.data;
      
      success(`Knowledge Created: "${item.title}"`);
      console.log(`  - ID: ${item.id}`);
      console.log(`  - Content Length: ${item.content.length} chars`);
      console.log(`  - Embeddings Generated: ${item.embeddings_generated}`);
      
      createdItems.push(item);
      
      // Wait a bit for embedding generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      error(`Knowledge Creation Failed: "${knowledge.title}"`, err.response?.data?.message || err.message);
    }
  }
  
  return createdItems;
}

async function runFullTest() {
  console.log(colors.cyan + '🧠 RAG System Full Test Suite' + colors.reset);
  console.log('=====================================\n');
  
  // Check if we have proper authentication
  if (JWT_TOKEN === 'your-jwt-token-here') {
    error('JWT_TOKEN not configured. Set environment variable JWT_TOKEN');
    process.exit(1);
  }
  
  // Test 1: RAG Status
  await testRAGStatus();
  console.log('');
  
  // Test 2: Create Knowledge with Auto-Embedding
  const createdItems = await testKnowledgeCreation();
  console.log('');
  
  // Wait for embeddings to be generated
  if (createdItems.length > 0) {
    info('Waiting 3 seconds for embedding generation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Test 3: RAG Migration (for existing items)
  await testRAGMigration();
  console.log('');
  
  // Test 4: Embedding Generation
  await testEmbeddingGeneration();
  console.log('');
  
  // Test 5: RAG Search
  await testRAGSearch();
  console.log('');
  
  // Final Status Check
  info('Final RAG Status Check...');
  await testRAGStatus();
  
  console.log('\n' + colors.green + '🎉 RAG Testing Complete!' + colors.reset);
}

// Command line interface
async function main() {
  const command = process.argv[2] || 'full';
  
  switch (command) {
    case 'status':
      await testRAGStatus();
      break;
    case 'embedding':
      await testEmbeddingGeneration();
      break;
    case 'search':
      await testRAGSearch();
      break;
    case 'migrate':
      await testRAGMigration();
      break;
    case 'create':
      await testKnowledgeCreation();
      break;
    case 'full':
    default:
      await runFullTest();
      break;
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧠 RAG Testing Script

Usage:
  node test-rag.js [command]

Commands:
  full      - Run complete test suite (default)
  status    - Check RAG system status
  embedding - Test embedding generation
  search    - Test RAG search functionality
  migrate   - Test knowledge migration to RAG
  create    - Create test knowledge items

Environment Variables:
  API_BASE    - API base URL (default: http://localhost:3001/api)
  JWT_TOKEN   - Authentication token (required)

Example:
  JWT_TOKEN=your-token-here node test-rag.js full
  `);
  process.exit(0);
}

// Run the script
main().catch(err => {
  error('Script failed:', err.message);
  process.exit(1);
}); 