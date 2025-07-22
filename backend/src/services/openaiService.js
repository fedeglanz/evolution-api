const OpenAI = require('openai');
const config = require('../config');
const { decryptOpenAIKey } = require('../utils/encryption');

class OpenAIService {
  constructor() {
    // Cliente del sistema (API key por defecto)
    this.systemClient = null;
    this.systemApiKey = config.OPENAI_API_KEY;

    if (this.systemApiKey) {
      this.systemClient = new OpenAI({
        apiKey: this.systemApiKey
      });
      console.log('✅ OpenAI Service (sistema) inicializado correctamente');
    } else {
      console.warn('⚠️ OpenAI API Key del sistema no está configurada. Solo funcionarán API keys de clientes.');
    }

    // Cache de clientes por API key
    this.clientCache = new Map();

    // Configuraciones por defecto
    this.defaultConfig = {
      model: config.OPENAI_MODEL || 'gpt-4',
      temperature: 0.7,
      max_tokens: 150,
      system_prompt: 'Eres un asistente virtual amigable y profesional. Responde de manera clara y útil.',
      response_format: { type: 'text' }
    };
  }

  /**
   * Obtener cliente OpenAI apropiado según configuración
   * @param {Object} botConfig - Configuración del bot
   * @param {string} plan - Plan del usuario
   * @returns {OpenAI|null} Cliente OpenAI configurado
   */
  getClient(botConfig, plan = 'free') {
    // Si el plan permite API key propia y tiene una configurada
    if (this.canUseCustomAPIKey(plan) && botConfig.openai_api_key) {
      try {
        // Desencriptar API key del cliente
        const decryptedApiKey = decryptOpenAIKey(botConfig.openai_api_key);
        
        if (!decryptedApiKey) {
          console.warn('[OpenAI] API key del cliente es inválida, usando sistema');
          return this.systemClient;
        }

        // Verificar cache para evitar recrear cliente
        if (this.clientCache.has(decryptedApiKey)) {
          return this.clientCache.get(decryptedApiKey);
        }

        // Crear nuevo cliente para este API key
        const customClient = new OpenAI({
          apiKey: decryptedApiKey
        });

        // Cachear cliente (máximo 100 clientes en cache)
        if (this.clientCache.size < 100) {
          this.clientCache.set(decryptedApiKey, customClient);
        }

        console.log('[OpenAI] Usando API key del cliente');
        return customClient;

      } catch (error) {
        console.error('[OpenAI] Error con API key del cliente:', error.message);
        console.log('[OpenAI] Fallback a API key del sistema');
        return this.systemClient;
      }
    }

    // Usar cliente del sistema por defecto
    console.log('[OpenAI] Usando API key del sistema');
    return this.systemClient;
  }

  /**
   * Verificar si un plan permite usar API key personalizada
   * @param {string} plan - Nombre del plan
   * @returns {boolean} Si permite API key propia
   */
  canUseCustomAPIKey(plan) {
    const plansWithCustomAPIKey = ['business', 'pro', 'enterprise'];
    return plansWithCustomAPIKey.includes(plan?.toLowerCase());
  }

  /**
   * Verificar si el servicio está disponible para un bot específico
   */
  isAvailable(botConfig = {}, plan = 'free') {
    const client = this.getClient(botConfig, plan);
    return client !== null;
  }

  /**
   * Generar respuesta con ChatGPT usando la configuración apropiada
   * @param {string} userMessage - Mensaje del usuario
   * @param {Object} botConfig - Configuración del bot (incluye openai_api_key si aplica)
   * @param {Array} conversationHistory - Historial de conversación
   * @param {string} plan - Plan del usuario
   * @returns {Promise<Object>} Respuesta generada
   */
  async generateResponse(userMessage, botConfig = {}, conversationHistory = [], plan = 'free') {
    const client = this.getClient(botConfig, plan);
    
    if (!client) {
      throw new Error('OpenAI API no está disponible. Verificar configuración de API keys.');
    }

    try {
      // Configuración con valores por defecto
      const apiConfig = {
        model: botConfig.model || this.defaultConfig.model,
        temperature: Math.max(0.0, Math.min(2.0, botConfig.temperature || this.defaultConfig.temperature)),
        max_tokens: Math.max(50, Math.min(500, botConfig.max_tokens || this.defaultConfig.max_tokens)),
        system_prompt: botConfig.system_prompt || this.defaultConfig.system_prompt
      };

      // Construir mensajes para la API
      const messages = [
        {
          role: 'system',
          content: apiConfig.system_prompt
        }
      ];

      // Agregar historial de conversación (últimos 10 mensajes)
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.is_from_bot ? 'assistant' : 'user',
            content: msg.message_text
          });
        });
      }

      // Agregar mensaje actual del usuario
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Realizar petición a OpenAI
      const completion = await client.chat.completions.create({
        model: apiConfig.model,
        messages: messages,
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.max_tokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      return {
        message: response.trim(),
        model: apiConfig.model,
        tokens_used: completion.usage?.total_tokens || 0,
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        finish_reason: completion.choices[0]?.finish_reason,
        using_custom_key: this.canUseCustomAPIKey(plan) && !!botConfig.openai_api_key,
        config_used: {
          temperature: apiConfig.temperature,
          max_tokens: apiConfig.max_tokens,
          model: apiConfig.model
        }
      };

    } catch (error) {
      console.error('Error al generar respuesta con OpenAI:', error);
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Probar configuración del bot con mensaje de prueba
   * @param {Object} botConfig - Configuración del bot
   * @param {string} testMessage - Mensaje de prueba (opcional)
   * @param {string} plan - Plan del usuario
   * @returns {Promise<Object>} Respuesta de prueba
   */
  async testBotConfiguration(botConfig, testMessage = '¡Hola! ¿Cómo estás?', plan = 'free') {
    if (!this.isAvailable(botConfig, plan)) {
      throw new Error('OpenAI API no está disponible para pruebas.');
    }

    try {
      const startTime = Date.now();
      
      const response = await this.generateResponse(testMessage, botConfig, [], plan);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        test_successful: true,
        test_message: testMessage,
        bot_response: response.message,
        response_time_ms: responseTime,
        tokens_used: response.tokens_used,
        model_used: response.model,
        using_custom_key: response.using_custom_key,
        config_tested: {
          temperature: botConfig.temperature || this.defaultConfig.temperature,
          max_tokens: botConfig.max_tokens || this.defaultConfig.max_tokens,
          model: botConfig.model || this.defaultConfig.model,
          system_prompt_length: (botConfig.system_prompt || this.defaultConfig.system_prompt).length,
          has_custom_api_key: !!botConfig.openai_api_key,
          can_use_custom_key: this.canUseCustomAPIKey(plan)
        }
      };

    } catch (error) {
      return {
        test_successful: false,
        error: error.message,
        test_message: testMessage,
        config_tested: botConfig
      };
    }
  }

  /**
   * Validar y verificar API key personalizada
   * @param {string} encryptedApiKey - API key encriptada
   * @returns {Promise<Object>} Resultado de la validación
   */
  async validateCustomAPIKey(encryptedApiKey) {
    if (!encryptedApiKey) {
      return {
        valid: false,
        error: 'API key no proporcionada'
      };
    }

    try {
      // Desencriptar API key
      const decryptedApiKey = decryptOpenAIKey(encryptedApiKey);
      
      if (!decryptedApiKey || !decryptedApiKey.startsWith('sk-')) {
        return {
          valid: false,
          error: 'Formato de API key inválido'
        };
      }

      // Probar API key con una petición simple
      const testClient = new OpenAI({
        apiKey: decryptedApiKey
      });

      const response = await testClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });

      return {
        valid: true,
        model_tested: 'gpt-3.5-turbo',
        test_tokens: response.usage?.total_tokens || 0,
        message: 'API key válida y funcional'
      };

    } catch (error) {
      return {
        valid: false,
        error: this.handleOpenAIError(error).message
      };
    }
  }

  /**
   * Limpiar cache de clientes (para mantenimiento)
   */
  clearClientCache() {
    this.clientCache.clear();
    console.log('[OpenAI] Cache de clientes limpiado');
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats() {
    return {
      cached_clients: this.clientCache.size,
      system_client_available: !!this.systemClient
    };
  }

  // === MANTENER MÉTODOS EXISTENTES PARA COMPATIBILIDAD ===

  /**
   * Validar configuración del bot
   * @param {Object} config - Configuración a validar
   * @returns {Object} Resultado de validación
   */
  validateBotConfig(config) {
    const errors = [];
    const warnings = [];

    // Validar system_prompt
    if (config.system_prompt) {
      if (typeof config.system_prompt !== 'string') {
        errors.push('system_prompt debe ser una cadena de texto');
      } else if (config.system_prompt.length > 2000) {
        errors.push('system_prompt no puede exceder 2000 caracteres');
      } else if (config.system_prompt.length < 10) {
        warnings.push('system_prompt muy corto, considera agregar más contexto');
      }
    }

    // Validar temperature
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number') {
        errors.push('temperature debe ser un número');
      } else if (config.temperature < 0.0 || config.temperature > 2.0) {
        errors.push('temperature debe estar entre 0.0 y 2.0');
      } else if (config.temperature > 1.5) {
        warnings.push('temperature alto (>1.5) puede generar respuestas impredecibles');
      }
    }

    // Validar max_tokens
    if (config.max_tokens !== undefined) {
      if (!Number.isInteger(config.max_tokens)) {
        errors.push('max_tokens debe ser un número entero');
      } else if (config.max_tokens < 50 || config.max_tokens > 500) {
        errors.push('max_tokens debe estar entre 50 y 500');
      } else if (config.max_tokens < 100) {
        warnings.push('max_tokens bajo (<100) puede limitar respuestas complejas');
      }
    }

    // Validar model
    if (config.model) {
      const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      if (!validModels.includes(config.model)) {
        warnings.push(`Modelo ${config.model} no está en la lista de modelos recomendados`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
    };
  }

  /**
   * Manejar errores específicos de OpenAI
   * @param {Error} error - Error de OpenAI
   * @returns {Error} Error procesado
   */
  handleOpenAIError(error) {
    if (error.status) {
      switch (error.status) {
        case 401:
          return new Error('API Key de OpenAI inválida o expirada');
        case 403:
          return new Error('Acceso denegado a OpenAI API. Verificar permisos.');
        case 429:
          return new Error('Límite de rate limiting alcanzado en OpenAI API');
        case 500:
          return new Error('Error interno en OpenAI API');
        case 503:
          return new Error('OpenAI API temporalmente no disponible');
        default:
          return new Error(`Error de OpenAI API (${error.status}): ${error.message}`);
      }
    }

    if (error.code === 'insufficient_quota') {
      return new Error('Cuota de OpenAI API agotada. Verificar billing.');
    }

    if (error.code === 'model_not_found') {
      return new Error('Modelo de OpenAI no encontrado o no disponible');
    }

    return new Error(`Error en OpenAI: ${error.message}`);
  }

  /**
   * Obtener configuración por defecto
   * @returns {Object} Configuración por defecto
   */
  getDefaultConfig() {
    return { ...this.defaultConfig };
  }

  /**
   * Calcular costo aproximado de una petición
   * @param {string} model - Modelo utilizado
   * @param {number} promptTokens - Tokens del prompt
   * @param {number} completionTokens - Tokens de la respuesta
   * @returns {Object} Información de costo
   */
  calculateCost(model, promptTokens, completionTokens) {
    // Precios aproximados por 1K tokens (actualizar según precios actuales)
    const pricing = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;
    const totalCost = promptCost + completionCost;

    return {
      prompt_cost: promptCost,
      completion_cost: completionCost,
      total_cost: totalCost,
      currency: 'USD',
      model: model,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      }
    };
  }
}

module.exports = new OpenAIService();
