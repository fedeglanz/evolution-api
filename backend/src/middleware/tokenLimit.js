const tokenLimitService = require('../services/tokenLimitService');

/**
 * Middleware para verificar límites de tokens antes del procesamiento
 */
const checkTokenLimits = async (req, res, next) => {
  try {
    const { instanceName, companyId } = req.body;
    
    if (!companyId) {
      console.log('⚠️ No companyId provided, skipping token limit check');
      return next();
    }

    // Estimar tokens basado en el mensaje (aproximación)
    const messageText = req.body.message || req.body.text || '';
    const estimatedTokens = Math.max(100, Math.ceil(messageText.length / 3)); // ~3 chars = 1 token
    
    console.log(`🔍 Verificando límites para empresa ${companyId}: ~${estimatedTokens} tokens estimados`);

    const limitCheck = await tokenLimitService.canUseTokens(companyId, estimatedTokens);

    if (!limitCheck.canUse) {
      console.log(`🚫 Límite de tokens excedido para empresa ${companyId}:`, limitCheck.reason);
      
      // Respuesta específica según el tipo de límite
      let errorMessage = 'Su plan ha alcanzado el límite de uso mensual. ';
      let statusCode = 429; // Too Many Requests

      switch (limitCheck.reason) {
        case 'token_limit_exceeded':
          errorMessage += 'Actualice su plan o espere al próximo período de facturación.';
          break;
        case 'overage_limit_exceeded':
          errorMessage += 'Ha alcanzado el límite máximo de uso adicional permitido.';
          break;
        default:
          errorMessage += 'Contacte al administrador para más información.';
      }

      return res.status(statusCode).json({
        success: false,
        error: 'TOKEN_LIMIT_EXCEEDED',
        message: errorMessage,
        details: limitCheck.details,
        canRetry: false
      });
    }

    // Si permite overage, agregar información al request
    if (limitCheck.reason === 'overage_allowed') {
      req.overageInfo = limitCheck.details;
      console.log(`💰 Overage permitido para empresa ${companyId}:`, limitCheck.details);
    }

    // Agregar información del check al request para logging posterior
    req.tokenLimitCheck = limitCheck;
    
    next();
    
  } catch (error) {
    console.error('❌ Error en middleware de límites de tokens:', error);
    // En caso de error, continuar (fail-open para disponibilidad)
    next();
  }
};

/**
 * Middleware para registrar uso de tokens después del procesamiento
 */
const recordTokenUsage = async (req, res, next) => {
  // Override del método json para interceptar la respuesta
  const originalJson = res.json;
  
  res.json = function(data) {
    // Llamar al método original primero
    originalJson.call(this, data);
    
    // Procesar registro de tokens de forma asíncrona (no bloquear respuesta)
    setImmediate(async () => {
      try {
        const { companyId } = req.body;
        
        if (!companyId || !data.success) {
          return;
        }

        // Extraer información de tokens de la respuesta
        const tokensUsed = data.tokensUsed || data.tokens_used || 0;
        const promptTokens = data.promptTokens || data.prompt_tokens || Math.ceil(tokensUsed * 0.7); // Estimación si no viene
        const completionTokens = data.completionTokens || data.completion_tokens || Math.ceil(tokensUsed * 0.3);
        const botId = data.botId || req.body.botId;
        const model = data.model || 'gpt-3.5-turbo';
        
        if (tokensUsed > 0) {
          // Calcular costo usando el servicio OpenAI existente
          const openaiService = require('../services/openaiService');
          let cost = data.openaiCost || 0;
          
          // Si no viene el costo calculado, calcularlo nosotros
          if (cost === 0 && tokensUsed > 0) {
            try {
              const costInfo = openaiService.calculateCost(model, promptTokens, completionTokens);
              cost = costInfo.total_cost;
              console.log(`💰 Costo calculado: $${cost.toFixed(6)} para ${tokensUsed} tokens (${model})`);
            } catch (error) {
              console.error('Error calculando costo:', error);
              // Fallback: estimación básica
              cost = tokensUsed * 0.002 / 1000; // ~$0.002 por 1K tokens (GPT-3.5-turbo promedio)
            }
          }
          
          await tokenLimitService.recordTokenUsage(
            companyId, 
            botId, 
            tokensUsed, 
            cost, 
            model
          );
          
          console.log(`✅ Uso registrado: ${tokensUsed} tokens para empresa ${companyId}`);
        }
        
      } catch (error) {
        console.error('❌ Error registrando uso de tokens:', error);
      }
    });
  };
  
  next();
};

/**
 * Middleware combinado para verificar antes y registrar después
 */
const tokenLimitMiddleware = [checkTokenLimits, recordTokenUsage];

module.exports = {
  checkTokenLimits,
  recordTokenUsage,
  tokenLimitMiddleware
};