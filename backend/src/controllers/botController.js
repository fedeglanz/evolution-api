const pool = require('../database');
const openaiService = require('../services/openaiService');
const ragService = require('../services/ragService'); // 🧠 RAG Integration

// === FUNCIONES HELPER PARA EVITAR PROBLEMAS DE CONTEXTO ===

/**
 * Obtener o crear contacto
 */
async function getOrCreateContactHelper(companyId, phone, senderName) {
  // Buscar contacto existente
  let contactQuery = await pool.query(`
    SELECT * FROM whatsapp_bot.contacts 
    WHERE company_id = $1 AND phone = $2
  `, [companyId, phone]);

  if (contactQuery.rows.length > 0) {
    // Actualizar nombre si es diferente
    if (senderName && contactQuery.rows[0].name !== senderName) {
      await pool.query(`
        UPDATE whatsapp_bot.contacts 
        SET name = $1, updated_at = NOW()
        WHERE id = $2
      `, [senderName, contactQuery.rows[0].id]);
    }
    return contactQuery.rows[0];
  }

  // Crear nuevo contacto
  const newContactQuery = await pool.query(`
    INSERT INTO whatsapp_bot.contacts (
      company_id, phone, name, created_at, updated_at
    ) VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING *
  `, [companyId, phone, senderName || 'Usuario']);

  return newContactQuery.rows[0];
}

/**
 * Obtener historial de conversación
 */
async function getConversationHistoryHelper(contactId, instanceId, limit = 10) {
  const historyQuery = await pool.query(`
    SELECT message_text, is_from_bot, created_at
    FROM whatsapp_bot.conversations
    WHERE contact_id = $1 AND instance_id = $2
    ORDER BY created_at DESC
    LIMIT $3
  `, [contactId, instanceId, limit]);

  return historyQuery.rows.reverse(); // Orden cronológico
}

/**
 * Guardar mensaje en la BD
 */
async function saveMessageHelper(companyId, contactId, instanceId, content, messageId, isFromBot, messageType = 'text', metadata = {}) {
  await pool.query(`
    INSERT INTO whatsapp_bot.conversations (
      company_id, contact_id, instance_id, message_text, 
      is_from_bot, message_id, message_type, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    companyId,
    contactId,
    instanceId,
    content,
    isFromBot,
    messageId,
    messageType,
    JSON.stringify(metadata)
  ]);
}

/**
 * Verificar si estamos dentro del horario de negocio
 */
function checkBusinessHoursHelper(businessHoursConfig) {
  try {
    const config = typeof businessHoursConfig === 'string' 
      ? JSON.parse(businessHoursConfig) 
      : businessHoursConfig;

    if (!config.enabled) {
      return { isOpen: true };
    }

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().substr(0, 5); // HH:MM

    const dayConfig = config.hours[dayName];
    if (!dayConfig || !dayConfig.open || !dayConfig.close) {
      return { isOpen: false };
    }

    const isOpen = currentTime >= dayConfig.open && currentTime <= dayConfig.close;
    return { isOpen };

  } catch (error) {
    console.error('[Bot] Error checking business hours:', error);
    return { isOpen: true }; // Default to open if error
  }
}

/**
 * Verificar palabras clave de escalation
 */
function checkEscalationKeywordsHelper(message, keywords) {
  if (!keywords || !Array.isArray(keywords)) {
    return { shouldEscalate: false };
  }

  const messageLower = message.toLowerCase();
  const shouldEscalate = keywords.some(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );

  return { shouldEscalate };
}

const tokenLimitService = require('../services/tokenLimitService');

class BotController {

  /**
   * Procesar mensaje entrante desde n8n
   * POST /api/bot/process-message
   */
  async processMessage(req, res) {
    try {
      const { instance, phone, message, senderName, messageType, messageId } = req.body;

      console.log(`[Bot] Processing message from ${phone} on instance ${instance}`);

      // 1. Obtener bot activo para esta instancia
      const botConfigQuery = await pool.query(`
        SELECT 
          b.*,
          wi.instance_name,
          wi.company_id,
          wi.status as instance_status,
          c.plan
        FROM whatsapp_bot.bots b
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        JOIN whatsapp_bot.companies c ON wi.company_id = c.id
        WHERE wi.evolution_instance_name = $1 AND b.is_active = true
      `, [instance]);

      if (botConfigQuery.rows.length === 0) {
        console.log(`[Bot] No active bot found for instance: ${instance}`);
        return res.json({
          shouldRespond: false,
          reason: 'No active bot found for this instance'
        });
      }

      const botConfig = botConfigQuery.rows[0];
      const companyPlan = botConfig.plan || 'free';
      
      // Agregar companyId al request para middleware de token tracking
      req.body.companyId = botConfig.company_id;
      req.body.botId = botConfig.id;

      // 2. Verificar que la instancia esté conectada
      if (botConfig.instance_status !== 'connected') {
        console.log(`[Bot] Instance not connected: ${instance}`);
        return res.json({
          shouldRespond: false,
          reason: 'Instance not connected'
        });
      }

      // 3. Obtener o crear contacto - USANDO HELPER
      const contact = await getOrCreateContactHelper(botConfig.company_id, phone, senderName);

      // 4. Guardar mensaje del usuario - USANDO HELPER
      await saveMessageHelper(botConfig.company_id, contact.id, botConfig.instance_id, message, messageId, false, messageType);

      // 5. Obtener contexto de mensajes previos - USANDO HELPER
      const conversationHistory = await getConversationHistoryHelper(contact.id, botConfig.instance_id, 10);

      // 🧠 6. RAG: Buscar contexto relevante en Knowledge Base
      let ragContext = null;
      let ragMetadata = null;
      try {
        console.log(`[Bot RAG] Searching knowledge for bot ${botConfig.id}: "${message}"`);
        const ragResult = await ragService.retrieveKnowledgeForBot(botConfig.id, message, {
          similarityThreshold: 0.3, // 🔧 Permisivo para capturar tanto content complejo como simple
          maxResults: 3 // Máximo 3 chunks relevantes
        });
        
        ragContext = ragResult.context;
        ragMetadata = ragResult.metadata;
        
        console.log(`[Bot RAG] Found ${ragResult.sources.length} relevant sources, ${ragContext.totalTokens} tokens`);
      } catch (ragError) {
        console.warn('[Bot RAG] Knowledge search failed, continuing without RAG:', ragError.message);
      }

      // 7. Generar respuesta con OpenAI (con contexto RAG si disponible)
      const startTime = Date.now();
      
      // Construir prompt mejorado con contexto RAG
      let enhancedSystemPrompt = botConfig.system_prompt || 'Eres un asistente útil y amigable.';
      
      if (ragContext && ragContext.text) {
        enhancedSystemPrompt += `\n\nCONTEXTO DE KNOWLEDGE BASE:\n${ragContext.text}\n\nUsa la información del contexto anterior para responder de manera más precisa y específica. Si la información del contexto es relevante para la pregunta, úsala. Si no encuentras información relevante en el contexto, responde basándote en tu conocimiento general pero menciona que no tienes información específica sobre ese tema.`;
      }
      
      const openaiResponse = await openaiService.generateResponse(
        message,
        {
          model: botConfig.openai_model || 'gpt-4',
          temperature: parseFloat(botConfig.openai_temperature) || 0.7,
          max_tokens: botConfig.max_tokens || 1000,
          system_prompt: enhancedSystemPrompt
        },
        conversationHistory,
        companyPlan // Pasar el plan de la empresa
      );

      const responseTime = Date.now() - startTime;

      // 8. Guardar respuesta del bot - USANDO HELPER (con metadatos RAG)
      await saveMessageHelper(
        botConfig.company_id, 
        contact.id, 
        botConfig.instance_id, 
        openaiResponse.message, 
        null, 
        true, 
        'text',
        {
          tokens_used: openaiResponse.tokens_used,
          response_time: responseTime,
          model: openaiResponse.model,
          // 🧠 RAG metadata
          rag_used: ragContext ? true : false,
          rag_sources_count: ragContext ? ragContext.chunksUsed : 0,
          rag_context_tokens: ragContext ? ragContext.totalTokens : 0,
          rag_avg_similarity: ragMetadata ? ragMetadata.avgSimilarity : null
        }
      );

      console.log(`[Bot] Response generated for ${phone}:`, {
        responseTime: `${responseTime}ms`,
        tokens: openaiResponse.tokens_used,
        responseLength: openaiResponse.message.length,
        // 🧠 RAG info in logs
        ragUsed: ragContext ? true : false,
        ragSources: ragContext ? ragContext.chunksUsed : 0,
        ragTokens: ragContext ? ragContext.totalTokens : 0
      });

      res.json({
        success: true,
        shouldRespond: true,
        response: openaiResponse.message,
        reason: ragContext ? 'openai_response_with_rag' : 'openai_response',
        // Información necesaria para el middleware de token tracking
        tokensUsed: openaiResponse.tokens_used,
        promptTokens: openaiResponse.prompt_tokens,
        completionTokens: openaiResponse.completion_tokens,
        botId: botConfig.id,
        companyId: botConfig.company_id,
        model: openaiResponse.model,
        metadata: {
          tokensUsed: openaiResponse.tokens_used,
          responseTime: responseTime,
          model: openaiResponse.model,
          contactId: contact.id,
          // 🧠 RAG metadata in API response
          rag: ragContext ? {
            used: true,
            sourcesCount: ragContext.chunksUsed,
            contextTokens: ragContext.totalTokens,
            avgSimilarity: ragMetadata ? ragMetadata.avgSimilarity.toFixed(3) : null,
            sources: ragMetadata && ragMetadata.resultsCount ? `${ragMetadata.resultsCount} knowledge items found` : null
          } : {
            used: false,
            reason: 'No relevant knowledge found or RAG failed'
          }
        }
      });

    } catch (error) {
      console.error('[Bot] Error processing message:', error);
      
      // Respuesta de fallback
      res.json({
        shouldRespond: true,
        response: 'Lo siento, hubo un problema técnico. Por favor intenta de nuevo en unos minutos.',
        reason: 'error',
        error: error.message
      });
    }
  }

  /**
   * Registrar interacción completada desde n8n
   * POST /api/bot/log-interaction
   */
  async logInteraction(req, res) {
    try {
      const { 
        instance, 
        phone, 
        userMessage, 
        botResponse, 
        responseTime, 
        tokensUsed 
      } = req.body;

      console.log(`[Bot] Logging interaction: ${phone} on ${instance}`);

      // Actualizar uso de API para facturación (using correct table structure)
      await pool.query(`
        INSERT INTO whatsapp_bot.api_usage (
          company_id, endpoint, method, status_code, response_time
        ) 
        SELECT 
          wi.company_id, 'bot_message', 'POST', 200, $2
        FROM whatsapp_bot.whatsapp_instances wi
        WHERE wi.evolution_instance_name = $1
      `, [instance, responseTime || 0]);

      res.json({
        success: true,
        message: 'Interaction logged successfully'
      });

    } catch (error) {
      console.error('[Bot] Error logging interaction:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // === MÉTODOS DEPRECADOS (mantenidos por compatibilidad pero usando helpers) ===

  /**
   * Verificar si estamos dentro del horario de negocio
   */
  checkBusinessHours(businessHoursConfig) {
    return checkBusinessHoursHelper(businessHoursConfig);
  }

  /**
   * Verificar palabras clave de escalation
   */
  checkEscalationKeywords(message, keywords) {
    return checkEscalationKeywordsHelper(message, keywords);
  }

  /**
   * Obtener o crear contacto
   */
  async getOrCreateContact(companyId, phone, senderName) {
    return getOrCreateContactHelper(companyId, phone, senderName);
  }

  /**
   * Obtener historial de conversación
   */
  async getConversationHistory(contactId, instanceId, limit = 10) {
    return getConversationHistoryHelper(contactId, instanceId, limit);
  }

  /**
   * Guardar mensaje en la BD
   */
  async saveMessage(companyId, contactId, instanceId, content, messageId, isFromBot, messageType = 'text', metadata = {}) {
    return saveMessageHelper(companyId, contactId, instanceId, content, messageId, isFromBot, messageType, metadata);
  }

  /**
   * Obtener estadísticas de uso de tokens
   * GET /api/bot/usage-stats
   */
  async getUsageStats(req, res) {
    try {
      const { companyId } = req.user;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID requerido'
        });
      }

      const stats = await tokenLimitService.getUsageStats(companyId);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron estadísticas de uso'
        });
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new BotController(); 