const OpenAI = require('openai');
const config = require('../config');

class OpenAIService {
  constructor() {
    // Verificar que la API key esté configurada
    if (!config.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API Key no está configurada. Algunas funcionalidades no estarán disponibles.');
      this.client = null;
      return;
    }

    // Configurar cliente OpenAI
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY
    });

    // Configuraciones por defecto
    this.defaultConfig = {
      model: config.OPENAI_MODEL || 'gpt-4',
      temperature: 0.7,
      max_tokens: 150,
      system_prompt: 'Eres un asistente virtual amigable y profesional. Responde de manera clara y útil.',
      response_format: { type: 'text' }
    };

    console.log('✅ OpenAI Service inicializado correctamente');
  }

  /**
   * Verificar si el servicio está disponible
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Generar respuesta con ChatGPT
   * @param {string} userMessage - Mensaje del usuario
   * @param {Object} botConfig - Configuración del bot
   * @param {Array} conversationHistory - Historial de conversación (opcional)
   * @returns {Promise<Object>} Respuesta generada
   */
  async generateResponse(userMessage, botConfig = {}, conversationHistory = []) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API no está disponible. Verificar configuración.');
    }

    try {
      // Configuración con valores por defecto
      const config = {
        model: botConfig.model || this.defaultConfig.model,
        temperature: Math.max(0.0, Math.min(2.0, botConfig.temperature || this.defaultConfig.temperature)),
        max_tokens: Math.max(50, Math.min(500, botConfig.max_tokens || this.defaultConfig.max_tokens)),
        system_prompt: botConfig.system_prompt || this.defaultConfig.system_prompt
      };

      // Construir mensajes para la API
      const messages = [
        {
          role: 'system',
          content: config.system_prompt
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
      const completion = await this.client.chat.completions.create({
        model: config.model,
        messages: messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
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
        model: config.model,
        tokens_used: completion.usage?.total_tokens || 0,
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        finish_reason: completion.choices[0]?.finish_reason,
        config_used: {
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          model: config.model
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
   * @returns {Promise<Object>} Respuesta de prueba
   */
  async testBotConfiguration(botConfig, testMessage = '¡Hola! ¿Cómo estás?') {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API no está disponible para pruebas.');
    }

    try {
      const startTime = Date.now();
      
      const response = await this.generateResponse(testMessage, botConfig);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        test_successful: true,
        test_message: testMessage,
        bot_response: response.message,
        response_time_ms: responseTime,
        tokens_used: response.tokens_used,
        model_used: response.model,
        config_tested: {
          temperature: botConfig.temperature || this.defaultConfig.temperature,
          max_tokens: botConfig.max_tokens || this.defaultConfig.max_tokens,
          model: botConfig.model || this.defaultConfig.model,
          system_prompt_length: (botConfig.system_prompt || this.defaultConfig.system_prompt).length
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

    // Validar business_hours
    if (config.business_hours) {
      try {
        if (typeof config.business_hours === 'string') {
          JSON.parse(config.business_hours);
        } else if (typeof config.business_hours === 'object') {
          // Validar estructura básica
          if (!config.business_hours.enabled === undefined) {
            warnings.push('business_hours debe incluir campo "enabled"');
          }
        }
      } catch (error) {
        errors.push('business_hours debe ser un JSON válido');
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
   * Generar embeddings para texto (preparación para funcionalidad futura)
   * @param {string} text - Texto para generar embedding
   * @param {string} model - Modelo de embedding (default: text-embedding-ada-002)
   * @returns {Promise<Array>} Vector de embedding
   */
  async generateEmbedding(text, model = 'text-embedding-ada-002') {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API no está disponible para embeddings.');
    }

    try {
      const response = await this.client.embeddings.create({
        model: model,
        input: text
      });

      return {
        embedding: response.data[0].embedding,
        tokens_used: response.usage.total_tokens,
        model: model,
        text_length: text.length
      };

    } catch (error) {
      console.error('Error al generar embedding:', error);
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Obtener lista de modelos disponibles
   * @returns {Promise<Array>} Lista de modelos
   */
  async getAvailableModels() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const response = await this.client.models.list();
      
      // Filtrar solo modelos de chat relevantes
      const chatModels = response.data.filter(model => 
        model.id.includes('gpt') && 
        (model.id.includes('3.5') || model.id.includes('4'))
      );

      return chatModels.map(model => ({
        id: model.id,
        created: model.created,
        owned_by: model.owned_by
      }));

    } catch (error) {
      console.error('Error al obtener modelos:', error);
      return [];
    }
  }

  /**
   * Verificar el estado de la API y cuota
   * @returns {Promise<Object>} Estado de la API
   */
  async checkAPIStatus() {
    if (!this.isAvailable()) {
      return {
        available: false,
        error: 'API Key no configurada'
      };
    }

    try {
      // Hacer una petición simple para verificar conectividad
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });

      return {
        available: true,
        status: 'active',
        model_default: this.defaultConfig.model,
        test_tokens: response.usage?.total_tokens || 0
      };

    } catch (error) {
      return {
        available: false,
        error: error.message,
        status: 'error'
      };
    }
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
