const { pool } = require('../database');
const config = require('../config');
const openaiService = require('../services/openaiService');

class BotsController {

  /**
   * Obtener todos los bots de la empresa
   * GET /api/bots
   */
  async getAllBots(req, res) {
    try {
      const companyId = req.user.companyId;
      const { instance_id, active_only } = req.query;

      let query = `
        SELECT 
          b.*,
          wi.instance_name,
          wi.status as instance_status,
          wi.phone_number as instance_phone,
          (SELECT COUNT(*) FROM whatsapp_bot.bot_conversations WHERE bot_id = b.id) as total_conversations,
          (SELECT COUNT(*) FROM whatsapp_bot.bot_messages bm 
           JOIN whatsapp_bot.bot_conversations bc ON bm.conversation_id = bc.id 
           WHERE bc.bot_id = b.id) as total_messages
        FROM whatsapp_bot.bots b
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        WHERE wi.company_id = $1
      `;

      const queryParams = [companyId];
      let paramIndex = 2;

      if (instance_id) {
        query += ` AND b.instance_id = $${paramIndex}`;
        queryParams.push(instance_id);
        paramIndex++;
      }

      if (active_only === 'true') {
        query += ` AND b.is_active = true`;
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await pool.query(query, queryParams);

      res.json({
        success: true,
        data: {
          bots: result.rows,
          total: result.rows.length,
          planLimits: await this.getBotLimitsForCompany(companyId)
        }
      });

    } catch (error) {
      console.error('Error al obtener bots:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Crear un nuevo bot
   * POST /api/bots
   */
  async createBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        instance_id,
        name,
        description,
        system_prompt,
        openai_model = 'gpt-4',
        openai_temperature = 0.7,
        max_tokens = 1000,
        welcome_message = 'Hola! ¿En qué puedo ayudarte?',
        fallback_message = 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
        context_memory_turns = 5,
        response_delay_ms = 1000,
        typing_simulation = true,
        daily_message_limit,
        monthly_token_limit
      } = req.body;

      // Verificar ownership de la instancia
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instance_id);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      // Verificar límites del plan
      const limitsCheck = await this.checkBotLimits(companyId);
      if (!limitsCheck.canCreate) {
        return res.status(400).json({
          success: false,
          message: limitsCheck.message,
          planInfo: limitsCheck.planInfo
        });
      }

      // Validar datos requeridos
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del bot debe tener al menos 2 caracteres'
        });
      }

      if (!system_prompt || system_prompt.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'El prompt del sistema debe tener al menos 10 caracteres'
        });
      }

      // Crear el bot
      const createQuery = `
        INSERT INTO whatsapp_bot.bots (
          instance_id, name, description, system_prompt,
          openai_model, openai_temperature, max_tokens,
          welcome_message, fallback_message, context_memory_turns,
          response_delay_ms, typing_simulation, daily_message_limit,
          monthly_token_limit, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(createQuery, [
        instance_id,
        name.trim(),
        description?.trim() || null,
        system_prompt.trim(),
        openai_model,
        parseFloat(openai_temperature),
        parseInt(max_tokens),
        welcome_message.trim(),
        fallback_message.trim(),
        parseInt(context_memory_turns),
        parseInt(response_delay_ms),
        Boolean(typing_simulation),
        daily_message_limit ? parseInt(daily_message_limit) : null,
        monthly_token_limit ? parseInt(monthly_token_limit) : null
      ]);

      // Obtener datos completos del bot creado
      const botWithDetails = await this.getBotWithDetails(result.rows[0].id);

      res.status(201).json({
        success: true,
        message: 'Bot creado exitosamente',
        data: { bot: botWithDetails }
      });

    } catch (error) {
      console.error('Error al crear bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener bot específico
   * GET /api/bots/:id
   */
  async getBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const bot = await this.getBotWithDetails(id);

      if (!bot) {
        return res.status(404).json({
          success: false,
          message: 'Bot no encontrado'
        });
      }

      // Verificar ownership
      const instanceCheck = await this.verifyInstanceOwnership(companyId, bot.instance_id);
      if (!instanceCheck.valid) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este bot'
        });
      }

      res.json({
        success: true,
        data: { bot }
      });

    } catch (error) {
      console.error('Error al obtener bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar bot
   * PUT /api/bots/:id
   */
  async updateBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const updates = req.body;

      // Verificar que el bot existe y pertenece a la empresa
      const existingBot = await this.getBotWithDetails(id);
      if (!existingBot) {
        return res.status(404).json({
          success: false,
          message: 'Bot no encontrado'
        });
      }

      const instanceCheck = await this.verifyInstanceOwnership(companyId, existingBot.instance_id);
      if (!instanceCheck.valid) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este bot'
        });
      }

      // Construir query de actualización dinámicamente
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'description', 'system_prompt', 'openai_model',
        'openai_temperature', 'max_tokens', 'welcome_message',
        'fallback_message', 'context_memory_turns', 'response_delay_ms',
        'typing_simulation', 'daily_message_limit', 'monthly_token_limit'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          let value = updates[field];
          
          // Validaciones específicas
          if (field === 'name' && (!value || value.trim().length < 2)) {
            return res.status(400).json({
              success: false,
              message: 'El nombre debe tener al menos 2 caracteres'
            });
          }

          if (field === 'system_prompt' && (!value || value.trim().length < 10)) {
            return res.status(400).json({
              success: false,
              message: 'El prompt del sistema debe tener al menos 10 caracteres'
            });
          }

          // Conversiones de tipo
          if (['openai_temperature'].includes(field)) {
            value = parseFloat(value);
          } else if (['max_tokens', 'context_memory_turns', 'response_delay_ms', 'daily_message_limit', 'monthly_token_limit'].includes(field)) {
            value = value ? parseInt(value) : null;
          } else if (field === 'typing_simulation') {
            value = Boolean(value);
          } else if (typeof value === 'string') {
            value = value.trim();
          }

          values.push(value);
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos válidos para actualizar'
        });
      }

      setClause.push('updated_at = NOW()');
      values.push(id);

      const updateQuery = `
        UPDATE whatsapp_bot.bots 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      await pool.query(updateQuery, values);

      // Obtener bot actualizado con todos los detalles
      const updatedBot = await this.getBotWithDetails(id);

      res.json({
        success: true,
        message: 'Bot actualizado exitosamente',
        data: { bot: updatedBot }
      });

    } catch (error) {
      console.error('Error al actualizar bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Eliminar bot
   * DELETE /api/bots/:id
   */
  async deleteBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      // Verificar que el bot existe y pertenece a la empresa
      const existingBot = await this.getBotWithDetails(id);
      if (!existingBot) {
        return res.status(404).json({
          success: false,
          message: 'Bot no encontrado'
        });
      }

      const instanceCheck = await this.verifyInstanceOwnership(companyId, existingBot.instance_id);
      if (!instanceCheck.valid) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este bot'
        });
      }

      // Eliminar bot (cascade eliminará conversaciones y mensajes)
      await pool.query('DELETE FROM whatsapp_bot.bots WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Bot eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Activar/Desactivar bot
   * POST /api/bots/:id/toggle
   */
  async toggleBot(req, res) {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const { is_active } = req.body;

      // Verificar que el bot existe y pertenece a la empresa
      const existingBot = await this.getBotWithDetails(id);
      if (!existingBot) {
        return res.status(404).json({
          success: false,
          message: 'Bot no encontrado'
        });
      }

      const instanceCheck = await this.verifyInstanceOwnership(companyId, existingBot.instance_id);
      if (!instanceCheck.valid) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este bot'
        });
      }

      // Si activamos este bot, desactivar otros bots de la misma instancia
      if (is_active === true) {
        await pool.query(
          'UPDATE whatsapp_bot.bots SET is_active = false WHERE instance_id = $1 AND id != $2',
          [existingBot.instance_id, id]
        );
      }

      // Actualizar estado del bot
      await pool.query(
        'UPDATE whatsapp_bot.bots SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [Boolean(is_active), id]
      );

      const updatedBot = await this.getBotWithDetails(id);

      res.json({
        success: true,
        message: `Bot ${is_active ? 'activado' : 'desactivado'} exitosamente`,
        data: { bot: updatedBot }
      });

    } catch (error) {
      console.error('Error al cambiar estado del bot:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener bot activo de una instancia
   * GET /api/instances/:instanceId/active-bot
   */
  async getActiveBotForInstance(req, res) {
    try {
      const companyId = req.user.companyId;
      const { instanceId } = req.params;

      // Verificar ownership de la instancia
      const instanceCheck = await this.verifyInstanceOwnership(companyId, instanceId);
      if (!instanceCheck.valid) {
        return res.status(instanceCheck.statusCode).json({
          success: false,
          message: instanceCheck.message
        });
      }

      const query = `
        SELECT 
          b.*,
          wi.instance_name,
          wi.status as instance_status,
          wi.phone_number as instance_phone
        FROM whatsapp_bot.bots b
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        WHERE b.instance_id = $1 AND b.is_active = true AND wi.company_id = $2
        LIMIT 1
      `;

      const result = await pool.query(query, [instanceId, companyId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: { activeBot: null },
          message: 'No hay bot activo para esta instancia'
        });
      }

      res.json({
        success: true,
        data: { activeBot: result.rows[0] }
      });

    } catch (error) {
      console.error('Error al obtener bot activo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener templates predefinidos
   * GET /api/bots/templates
   */
  async getBotTemplates(req, res) {
    try {
      const templates = {
        assistant: {
          name: 'Asistente General',
          description: 'Bot de propósito general para atención al cliente',
          system_prompt: 'Eres un asistente virtual útil y amigable. Tu trabajo es ayudar a los usuarios con sus consultas de manera profesional y cordial. Siempre mantén un tono positivo y busca resolver las dudas de la mejor manera posible.',
          welcome_message: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
          fallback_message: 'Lo siento, no pude entender tu mensaje. ¿Podrías reformularlo de otra manera?',
          openai_model: 'gpt-4',
          openai_temperature: 0.7,
          max_tokens: 800
        },
        sales: {
          name: 'Bot de Ventas',
          description: 'Especializado en prospección y cierre de ventas',
          system_prompt: 'Eres un asistente de ventas experto y persuasivo. Tu objetivo es ayudar a los clientes a encontrar la mejor solución para sus necesidades, generar interés en nuestros productos/servicios y guiarlos hacia una compra. Mantén siempre un enfoque consultivo y profesional.',
          welcome_message: '¡Hola! 🚀 Me especializo en ayudarte a encontrar la solución perfecta para ti. ¿Cuéntame, qué necesitas?',
          fallback_message: 'Permíteme ayudarte mejor. ¿Podrías darme más detalles sobre lo que buscas?',
          openai_model: 'gpt-4',
          openai_temperature: 0.8,
          max_tokens: 1000
        },
        support: {
          name: 'Soporte Técnico',
          description: 'Especializado en resolver problemas y dar soporte',
          system_prompt: 'Eres un especialista en soporte técnico. Tu trabajo es diagnosticar problemas, ofrecer soluciones paso a paso y asegurar que los usuarios resuelvan sus inconvenientes. Sé preciso, detallado y paciente. Siempre pregunta por detalles específicos para dar mejor ayuda.',
          welcome_message: '¡Hola! 🔧 Estoy aquí para ayudarte a resolver cualquier problema técnico. ¿Cuál es el inconveniente que tienes?',
          fallback_message: 'Para ayudarte mejor, ¿podrías describir el problema con más detalle? Por ejemplo: ¿cuándo ocurre? ¿qué error aparece?',
          openai_model: 'gpt-4',
          openai_temperature: 0.5,
          max_tokens: 1200
        }
      };

      res.json({
        success: true,
        data: { templates }
      });

    } catch (error) {
      console.error('Error al obtener templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtener bot con todos los detalles
   */
  async getBotWithDetails(botId) {
    const query = `
      SELECT 
        b.*,
        wi.instance_name,
        wi.status as instance_status,
        wi.phone_number as instance_phone,
        wi.evolution_instance_name,
        (SELECT COUNT(*) FROM whatsapp_bot.bot_conversations WHERE bot_id = b.id) as total_conversations,
        (SELECT COUNT(*) FROM whatsapp_bot.bot_messages bm 
         JOIN whatsapp_bot.bot_conversations bc ON bm.conversation_id = bc.id 
         WHERE bc.bot_id = b.id) as total_messages,
        (SELECT COUNT(*) FROM whatsapp_bot.bot_messages bm 
         JOIN whatsapp_bot.bot_conversations bc ON bm.conversation_id = bc.id 
         WHERE bc.bot_id = b.id AND bm.created_at >= CURRENT_DATE) as messages_today
      FROM whatsapp_bot.bots b
      JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
      WHERE b.id = $1
    `;

    const result = await pool.query(query, [botId]);
    return result.rows[0] || null;
  }

  /**
   * Verificar ownership de instancia
   */
  async verifyInstanceOwnership(companyId, instanceId) {
    const result = await pool.query(
      'SELECT id FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2',
      [instanceId, companyId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        statusCode: 404,
        message: 'Instancia no encontrada o no tienes acceso a ella'
      };
    }

    return { valid: true };
  }

  /**
   * Verificar límites de bots por plan
   */
  async checkBotLimits(companyId) {
    // Obtener plan de la empresa
    const companyQuery = await pool.query(
      'SELECT plan FROM whatsapp_bot.companies WHERE id = $1',
      [companyId]
    );

    if (companyQuery.rows.length === 0) {
      return {
        canCreate: false,
        message: 'Empresa no encontrada'
      };
    }

    const plan = companyQuery.rows[0].plan;
    const planLimits = this.getBotLimitsForPlan(plan);

    // Contar bots actuales
    const botCountQuery = await pool.query(`
      SELECT COUNT(*) as current_bots
      FROM whatsapp_bot.bots b
      JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
      WHERE wi.company_id = $1
    `, [companyId]);

    const currentBots = parseInt(botCountQuery.rows[0].current_bots);

    if (planLimits.max_bots !== -1 && currentBots >= planLimits.max_bots) {
      return {
        canCreate: false,
        message: `Has alcanzado el límite de bots para tu plan ${plan} (${planLimits.max_bots} bots)`,
        planInfo: {
          plan,
          current: currentBots,
          limit: planLimits.max_bots
        }
      };
    }

    return {
      canCreate: true,
      planInfo: {
        plan,
        current: currentBots,
        limit: planLimits.max_bots
      }
    };
  }

  /**
   * Obtener límites de bots por plan
   */
  getBotLimitsForPlan(plan) {
    const limits = {
      free_trial: { max_bots: 1 },
      trial: { max_bots: 1 },
      starter: { max_bots: 3 },
      business: { max_bots: 10 },
      pro: { max_bots: 25 },
      enterprise: { max_bots: -1 } // ilimitado
    };

    return limits[plan] || limits.starter;
  }

  /**
   * Obtener límites de bots para una empresa
   */
  async getBotLimitsForCompany(companyId) {
    const companyQuery = await pool.query(
      'SELECT plan FROM whatsapp_bot.companies WHERE id = $1',
      [companyId]
    );

    if (companyQuery.rows.length === 0) {
      return null;
    }

    const plan = companyQuery.rows[0].plan;
    return {
      plan,
      ...this.getBotLimitsForPlan(plan)
    };
  }
}

module.exports = new BotsController(); 