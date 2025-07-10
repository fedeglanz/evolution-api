const openaiService = require('../services/openaiService');
const { pool } = require('../database');
const config = require('../config');

class BotConfigController {

  /**
   * Obtener configuración del bot para una instancia
   * GET /api/bot-config/:instanceId
   */
  async getBotConfig(req, res) {
    try {
      const { id: instanceId } = req.params;
      const companyId = req.user.companyId;

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      // Obtener configuración del bot
      const configQuery = `
        SELECT 
          bc.*,
          wi.instance_name,
          wi.status as instance_status
        FROM whatsapp_bot.bot_configs bc
        JOIN whatsapp_bot.whatsapp_instances wi ON bc.instance_id = wi.id
        WHERE bc.instance_id = $1 AND bc.company_id = $2
      `;

      const result = await pool.query(configQuery, [instanceId, companyId]);

      if (result.rows.length === 0) {
        // Si no existe configuración, crear una con valores por defecto
        const defaultConfig = await this.createDefaultBotConfig(companyId, instanceId);
        
        return res.json({
          success: true,
          message: 'Configuración creada con valores por defecto',
          data: defaultConfig
        });
      }

      const botConfig = result.rows[0];

      // Formatear respuesta
      res.json({
        success: true,
        data: {
          id: botConfig.id,
          instanceId: botConfig.instance_id,
          instanceName: botConfig.instance_name,
          instanceStatus: botConfig.instance_status,
          systemPrompt: botConfig.system_prompt,
          businessHours: botConfig.business_hours,
          autoResponse: botConfig.auto_response,
          escalationNumber: botConfig.escalation_number,
          escalationKeywords: botConfig.escalation_keywords,
          welcomeMessage: botConfig.welcome_message,
          awayMessage: botConfig.away_message,
          embeddingsEnabled: botConfig.embeddings_enabled,
          maxTokens: botConfig.max_tokens,
          temperature: parseFloat(botConfig.temperature),
          createdAt: botConfig.created_at,
          updatedAt: botConfig.updated_at
        }
      });

    } catch (error) {
      console.error('Error al obtener configuración del bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar configuración del bot
   * PUT /api/bot-config/:instanceId
   */
  async updateBotConfig(req, res) {
    try {
      const { id: instanceId } = req.params;
      const companyId = req.user.companyId;
      const updates = req.body;

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      // Validar datos de entrada
      const validation = this.validateBotConfigUpdate(updates);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Datos de configuración inválidos',
          errors: validation.errors
        });
      }

      // Verificar si existe configuración
      const existingConfig = await this.getBotConfigByInstanceId(companyId, instanceId);
      
      let updatedConfig;
      if (existingConfig) {
        // Actualizar configuración existente
        updatedConfig = await this.updateExistingBotConfig(companyId, instanceId, updates);
      } else {
        // Crear nueva configuración con los valores proporcionados
        updatedConfig = await this.createBotConfigWithData(companyId, instanceId, updates);
      }

      res.json({
        success: true,
        message: 'Configuración del bot actualizada exitosamente',
        data: updatedConfig
      });

    } catch (error) {
      console.error('Error al actualizar configuración del bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Probar respuesta del bot con configuración actual
   * POST /api/bot-config/:instanceId/test
   */
  async testBotResponse(req, res) {
    try {
      const { id: instanceId } = req.params;
      const { testMessage } = req.body;
      const companyId = req.user.companyId;

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      // Verificar que OpenAI esté disponible
      if (!openaiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de OpenAI no está disponible. Verificar configuración de API Key.'
        });
      }

      // Obtener configuración del bot
      const botConfig = await this.getBotConfigByInstanceId(companyId, instanceId);
      if (!botConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuración del bot no encontrada'
        });
      }

      // Preparar configuración para OpenAI
      const openaiConfig = {
        system_prompt: botConfig.system_prompt,
        temperature: parseFloat(botConfig.temperature),
        max_tokens: botConfig.max_tokens,
        model: config.OPENAI_MODEL
      };

      // Probar con OpenAI
      const testResult = await openaiService.testBotConfiguration(
        openaiConfig, 
        testMessage || '¡Hola! ¿Cómo estás?'
      );

      res.json({
        success: true,
        message: 'Prueba del bot completada',
        data: {
          instanceId: instanceId,
          testResult: testResult,
          configUsed: {
            systemPrompt: botConfig.system_prompt.substring(0, 100) + '...',
            temperature: parseFloat(botConfig.temperature),
            maxTokens: botConfig.max_tokens,
            autoResponse: botConfig.auto_response
          }
        }
      });

    } catch (error) {
      console.error('Error al probar bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error al probar la respuesta del bot',
        error: error.message
      });
    }
  }

  /**
   * Restaurar configuración a valores por defecto
   * POST /api/bot-config/:instanceId/reset
   */
  async resetBotConfig(req, res) {
    try {
      const { id: instanceId } = req.params;
      const companyId = req.user.companyId;

      // Verificar que la instancia pertenece a la empresa
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      // Obtener valores por defecto
      const defaultValues = this.getDefaultBotConfig();

      // Actualizar con valores por defecto
      const resetConfig = await this.updateExistingBotConfig(companyId, instanceId, defaultValues);

      res.json({
        success: true,
        message: 'Configuración del bot restaurada a valores por defecto',
        data: resetConfig
      });

    } catch (error) {
      console.error('Error al resetear configuración del bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Métodos auxiliares

  /**
   * Verificar que la instancia pertenece a la empresa del usuario
   */
  async verifyInstanceOwnership(companyId, instanceId) {
    try {
      const query = 'SELECT id, instance_name, status FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2';
      const result = await pool.query(query, [instanceId, companyId]);

      if (result.rows.length === 0) {
        return {
          valid: false,
          statusCode: 404,
          message: 'Instancia de WhatsApp no encontrada'
        };
      }

      return {
        valid: true,
        instance: result.rows[0]
      };
    } catch (error) {
      return {
        valid: false,
        statusCode: 500,
        message: 'Error al verificar propiedad de la instancia'
      };
    }
  }

  /**
   * Obtener configuración del bot por ID de instancia
   */
  async getBotConfigByInstanceId(companyId, instanceId) {
    const query = 'SELECT * FROM whatsapp_bot.bot_configs WHERE company_id = $1 AND instance_id = $2';
    const result = await pool.query(query, [companyId, instanceId]);
    return result.rows[0] || null;
  }

  /**
   * Crear configuración por defecto para una instancia
   */
  async createDefaultBotConfig(companyId, instanceId) {
    const defaultValues = this.getDefaultBotConfig();
    
    const query = `
      INSERT INTO whatsapp_bot.bot_configs (
        company_id, instance_id, system_prompt, business_hours, auto_response,
        escalation_keywords, welcome_message, away_message, embeddings_enabled,
        max_tokens, temperature, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      companyId,
      instanceId,
      defaultValues.system_prompt,
      JSON.stringify(defaultValues.business_hours),
      defaultValues.auto_response,
      defaultValues.escalation_keywords,
      defaultValues.welcome_message,
      defaultValues.away_message,
      defaultValues.embeddings_enabled,
      defaultValues.max_tokens,
      defaultValues.temperature
    ]);

    return this.formatBotConfigResponse(result.rows[0]);
  }

  /**
   * Crear configuración con datos proporcionados
   */
  async createBotConfigWithData(companyId, instanceId, data) {
    const defaultValues = this.getDefaultBotConfig();
    const mergedData = { ...defaultValues, ...data };

    const query = `
      INSERT INTO whatsapp_bot.bot_configs (
        company_id, instance_id, system_prompt, business_hours, auto_response,
        escalation_number, escalation_keywords, welcome_message, away_message,
        embeddings_enabled, max_tokens, temperature, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      companyId,
      instanceId,
      mergedData.system_prompt,
      typeof mergedData.business_hours === 'string' ? mergedData.business_hours : JSON.stringify(mergedData.business_hours),
      mergedData.auto_response,
      mergedData.escalation_number,
      mergedData.escalation_keywords,
      mergedData.welcome_message,
      mergedData.away_message,
      mergedData.embeddings_enabled,
      mergedData.max_tokens,
      mergedData.temperature
    ]);

    return this.formatBotConfigResponse(result.rows[0]);
  }

  /**
   * Actualizar configuración existente
   */
  async updateExistingBotConfig(companyId, instanceId, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Construir query dinámicamente
    if (updates.system_prompt !== undefined) {
      setClause.push(`system_prompt = $${paramIndex++}`);
      values.push(updates.system_prompt);
    }
    if (updates.business_hours !== undefined) {
      setClause.push(`business_hours = $${paramIndex++}`);
      values.push(typeof updates.business_hours === 'string' ? updates.business_hours : JSON.stringify(updates.business_hours));
    }
    if (updates.auto_response !== undefined) {
      setClause.push(`auto_response = $${paramIndex++}`);
      values.push(updates.auto_response);
    }
    if (updates.escalation_number !== undefined) {
      setClause.push(`escalation_number = $${paramIndex++}`);
      values.push(updates.escalation_number);
    }
    if (updates.escalation_keywords !== undefined) {
      setClause.push(`escalation_keywords = $${paramIndex++}`);
      values.push(updates.escalation_keywords);
    }
    if (updates.welcome_message !== undefined) {
      setClause.push(`welcome_message = $${paramIndex++}`);
      values.push(updates.welcome_message);
    }
    if (updates.away_message !== undefined) {
      setClause.push(`away_message = $${paramIndex++}`);
      values.push(updates.away_message);
    }
    if (updates.embeddings_enabled !== undefined) {
      setClause.push(`embeddings_enabled = $${paramIndex++}`);
      values.push(updates.embeddings_enabled);
    }
    if (updates.max_tokens !== undefined) {
      setClause.push(`max_tokens = $${paramIndex++}`);
      values.push(updates.max_tokens);
    }
    if (updates.temperature !== undefined) {
      setClause.push(`temperature = $${paramIndex++}`);
      values.push(updates.temperature);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(companyId, instanceId);

    const query = `
      UPDATE whatsapp_bot.bot_configs 
      SET ${setClause.join(', ')}
      WHERE company_id = $${paramIndex++} AND instance_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return this.formatBotConfigResponse(result.rows[0]);
  }

  /**
   * Obtener valores por defecto
   */
  getDefaultBotConfig() {
    return {
      system_prompt: 'Eres un asistente virtual amigable y profesional. Responde de manera clara, útil y concisa. Mantén un tono cordial y profesional en todas tus interacciones.',
      business_hours: {
        enabled: false,
        timezone: 'America/Argentina/Buenos_Aires',
        hours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: { open: null, close: null }
        }
      },
      auto_response: true,
      escalation_number: null,
      escalation_keywords: ['humano', 'persona', 'operador', 'ayuda', 'representante'],
      welcome_message: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      away_message: 'Gracias por contactarnos. En este momento estamos fuera del horario de atención, pero responderemos tu mensaje lo antes posible.',
      embeddings_enabled: false,
      max_tokens: 150,
      temperature: 0.7
    };
  }

  /**
   * Validar actualización de configuración
   */
  validateBotConfigUpdate(data) {
    const errors = [];

    // Validar system_prompt
    if (data.system_prompt !== undefined) {
      if (typeof data.system_prompt !== 'string') {
        errors.push('system_prompt debe ser una cadena de texto');
      } else if (data.system_prompt.length > 2000) {
        errors.push('system_prompt no puede exceder 2000 caracteres');
      } else if (data.system_prompt.trim().length < 10) {
        errors.push('system_prompt debe tener al menos 10 caracteres');
      }
    }

    // Validar temperature
    if (data.temperature !== undefined) {
      if (typeof data.temperature !== 'number') {
        errors.push('temperature debe ser un número');
      } else if (data.temperature < 0.0 || data.temperature > 2.0) {
        errors.push('temperature debe estar entre 0.0 y 2.0');
      }
    }

    // Validar max_tokens
    if (data.max_tokens !== undefined) {
      if (!Number.isInteger(data.max_tokens)) {
        errors.push('max_tokens debe ser un número entero');
      } else if (data.max_tokens < 50 || data.max_tokens > 500) {
        errors.push('max_tokens debe estar entre 50 y 500');
      }
    }

    // Validar business_hours
    if (data.business_hours !== undefined) {
      try {
        const businessHours = typeof data.business_hours === 'string' 
          ? JSON.parse(data.business_hours) 
          : data.business_hours;
        
        if (!businessHours.hasOwnProperty('enabled')) {
          errors.push('business_hours debe incluir campo "enabled"');
        }
      } catch (error) {
        errors.push('business_hours debe ser un JSON válido');
      }
    }

    // Validar escalation_keywords
    if (data.escalation_keywords !== undefined && !Array.isArray(data.escalation_keywords)) {
      errors.push('escalation_keywords debe ser un array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Formatear respuesta de configuración
   */
  formatBotConfigResponse(config) {
    return {
      id: config.id,
      instanceId: config.instance_id,
      systemPrompt: config.system_prompt,
      businessHours: config.business_hours,
      autoResponse: config.auto_response,
      escalationNumber: config.escalation_number,
      escalationKeywords: config.escalation_keywords,
      welcomeMessage: config.welcome_message,
      awayMessage: config.away_message,
      embeddingsEnabled: config.embeddings_enabled,
      maxTokens: config.max_tokens,
      temperature: parseFloat(config.temperature),
      createdAt: config.created_at,
      updatedAt: config.updated_at
    };
  }
}

const botConfigController = new BotConfigController();

module.exports = {
  getBotConfig: botConfigController.getBotConfig.bind(botConfigController),
  updateBotConfig: botConfigController.updateBotConfig.bind(botConfigController),
  testBotResponse: botConfigController.testBotResponse.bind(botConfigController),
  resetBotConfig: botConfigController.resetBotConfig.bind(botConfigController)
};
