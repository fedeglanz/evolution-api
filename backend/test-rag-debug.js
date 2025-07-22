#!/usr/bin/env node

/**
 * 🔧 TEST RAG DEBUG SCRIPT
 * 
 * Script para testear si el bot está usando correctamente la knowledge base
 * 
 * USO:
 * 1. Obtener tu botId desde /bots en el frontend
 * 2. node test-rag-debug.js <botId> "<tu consulta>"
 * 
 * EJEMPLO:
 * node test-rag-debug.js "12345-bot-id" "cuales son los horarios de atencion"
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'https://whatsapp-bot-backend.onrender.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // Configura tu token

async function testBotRAG(botId, query) {
  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: Configura AUTH_TOKEN como variable de entorno');
    console.log('Ejemplo: AUTH_TOKEN="tu-token-jwt" node test-rag-debug.js <botId> "<query>"');
    process.exit(1);
  }

  if (!botId || !query) {
    console.error('❌ ERROR: Faltan parámetros');
    console.log('USO: node test-rag-debug.js <botId> "<query>"');
    console.log('EJEMPLO: node test-rag-debug.js "12345-bot-id" "horarios de atencion"');
    process.exit(1);
  }

  console.log('🔍 TESTING RAG DEBUGGING...\n');
  console.log(`Bot ID: ${botId}`);
  console.log(`Query: "${query}"\n`);

  try {
    // Headers para autenticación
    const headers = {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    };

    console.log('📊 PASO 1: Verificando asignaciones del bot...');
    
    // Test 1: Ver asignaciones detalladas del bot
    const assignmentsResponse = await axios.get(
      `${BASE_URL}/knowledge/debug/bot/${botId}/assignments`,
      { headers }
    );

    const assignments = assignmentsResponse.data.data;
    console.log(`✅ Bot encontrado: ${assignments.bot_name}`);
    console.log(`📝 Knowledge asignado: ${assignments.active_assignments}/${assignments.total_assignments}`);
    
    if (assignments.assignments_detail && assignments.assignments_detail.length > 0) {
      console.log('\n📋 DETALLES DE KNOWLEDGE ASIGNADO:');
      assignments.assignments_detail.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.knowledge_title}`);
        console.log(`     - Embeddings: ${item.embeddings_generated ? '✅' : '❌'} (${item.embeddings_count} chunks)`);
        console.log(`     - Estado: ${item.processing_status}`);
        console.log(`     - Prioridad: ${item.assignment_priority}`);
        console.log(`     - Activo: ${item.assignment_active ? '✅' : '❌'}`);
      });
    } else {
      console.log('⚠️  NO HAY KNOWLEDGE ASIGNADO A ESTE BOT');
      return;
    }

    console.log('\n🧠 PASO 2: Probando búsqueda RAG...');

    // Test 2: Probar búsqueda RAG
    const ragResponse = await axios.post(
      `${BASE_URL}/knowledge/debug/bot-search`,
      {
        botId,
        query,
        similarityThreshold: 0.6,
        maxResults: 3
      },
      { headers }
    );

    const debug = ragResponse.data.debug;

    console.log('\n📈 RESULTADOS RAG:');
    console.log(`🎯 Items con embeddings: ${debug.embeddings.items_with_embeddings}`);
    console.log(`🔍 Búsqueda exitosa: ${debug.rag_search.success ? '✅' : '❌'}`);
    
    if (!debug.rag_search.success) {
      console.log(`❌ Error en búsqueda: ${debug.rag_search.error}`);
      return;
    }

    console.log(`📊 Resultados encontrados: ${debug.rag_search.results_count}`);
    console.log(`🎚️  Threshold usado: ${debug.rag_search.similarity_threshold}`);

    if (debug.rag_search.results_count > 0) {
      console.log('\n🎯 MATCHES ENCONTRADOS:');
      debug.rag_search.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.knowledge_title}`);
        console.log(`     - Similarity: ${(result.similarity_score * 100).toFixed(1)}%`);
        console.log(`     - Prioridad: ${result.priority}`);
        console.log(`     - Texto: "${result.chunk_text}"`);
      });

      if (debug.rag_search.context) {
        console.log('\n📝 CONTEXTO GENERADO:');
        console.log(`  - Tokens: ${debug.rag_search.context.total_tokens}`);
        console.log(`  - Chunks usados: ${debug.rag_search.context.chunks_used}`);
        console.log(`  - Vista previa: "${debug.rag_search.context.text_preview}"`);
      }

      console.log('\n✅ RAG FUNCIONA CORRECTAMENTE');
      console.log('🤖 El bot DEBERÍA usar este contexto para responder');
      
    } else {
      console.log('\n❌ NO SE ENCONTRARON MATCHES');
      console.log('Posibles causas:');
      console.log('1. Los embeddings no están relacionados con tu consulta');
      console.log('2. El similarity threshold es muy alto (0.6)');
      console.log('3. Los embeddings no se generaron correctamente');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 SOLUCIÓN: Verifica que el AUTH_TOKEN sea válido');
    }
  }
}

// Ejecutar el test
const botId = process.argv[2];
const query = process.argv[3];

testBotRAG(botId, query); 