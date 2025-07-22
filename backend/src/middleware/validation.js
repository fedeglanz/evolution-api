const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      throw new AppError(
        `Error de validación: ${error.details.map(d => d.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
        errorDetails
      );
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Common validation schemas
const commonSchemas = {
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'string.empty': 'El email es requerido',
      'any.required': 'El email es requerido'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede tener más de 128 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    }),

  simplePassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.max': 'La contraseña no puede tener más de 128 caracteres',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    }),

  fullName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres',
      'string.empty': 'El nombre es requerido',
      'any.required': 'El nombre es requerido'
    }),

  phone: Joi.string()
    .pattern(new RegExp('^\\+?[1-9]\\d{1,14}$'))
    .optional()
    .messages({
      'string.pattern.base': 'El teléfono debe tener un formato válido (+1234567890)'
    }),

  companyName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'El nombre de la empresa debe tener al menos 2 caracteres',
      'string.max': 'El nombre de la empresa no puede tener más de 100 caracteres',
      'string.empty': 'El nombre de la empresa es requerido',
      'any.required': 'El nombre de la empresa es requerido'
    }),

  uuid: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required()
    .messages({
      'string.guid': 'El ID debe ser un UUID válido',
      'any.required': 'El ID es requerido'
    })
};

// Auth validation schemas
const authSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    full_name: commonSchemas.fullName,
    company_name: commonSchemas.companyName,
    phone: commonSchemas.phone
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.simplePassword // Use simpler validation for login
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'string.empty': 'El token es requerido',
      'any.required': 'El token es requerido'
    }),
    password: commonSchemas.password
  }),

  changePassword: Joi.object({
    current_password: commonSchemas.simplePassword,
    new_password: commonSchemas.password
  })
};

// Instance validation schemas
const instanceSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 50 caracteres',
        'string.empty': 'El nombre es requerido',
        'any.required': 'El nombre es requerido'
      }),
    description: Joi.string()
      .max(500)
      .trim()
      .optional()
      .messages({
        'string.max': 'La descripción no puede tener más de 500 caracteres'
      }),
    webhook_url: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'La URL del webhook debe ser válida'
      }),
    webhook_events: Joi.array()
      .items(Joi.string().valid('message', 'status', 'connection'))
      .optional()
      .messages({
        'array.includes': 'Los eventos del webhook deben ser válidos (message, status, connection)'
      }),
    phone_number: Joi.string()
      .pattern(/^\+[1-9]\d{9,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'El número de teléfono debe tener formato internacional (+5491123456789)'
      })
  }),

  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .optional()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 50 caracteres'
      }),
    description: Joi.string()
      .max(500)
      .trim()
      .optional()
      .messages({
        'string.max': 'La descripción no puede tener más de 500 caracteres'
      }),
    webhook_url: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'La URL del webhook debe ser válida'
      }),
    webhook_events: Joi.array()
      .items(Joi.string().valid('message', 'status', 'connection'))
      .optional()
      .messages({
        'array.includes': 'Los eventos del webhook deben ser válidos (message, status, connection)'
      }),
    phone_number: Joi.string()
      .pattern(/^\+[1-9]\d{9,14}$/)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'El número de teléfono debe tener formato internacional (+5491123456789)'
      })
  })
};

// Bot configuration validation schemas
const botConfigSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 50 caracteres',
        'string.empty': 'El nombre es requerido',
        'any.required': 'El nombre es requerido'
      }),
    description: Joi.string()
      .max(500)
      .trim()
      .optional()
      .messages({
        'string.max': 'La descripción no puede tener más de 500 caracteres'
      }),
    system_prompt: Joi.string()
      .min(10)
      .max(4000)
      .trim()
      .required()
      .messages({
        'string.min': 'El prompt del sistema debe tener al menos 10 caracteres',
        'string.max': 'El prompt del sistema no puede tener más de 4000 caracteres',
        'string.empty': 'El prompt del sistema es requerido',
        'any.required': 'El prompt del sistema es requerido'
      }),
    model: Joi.string()
      .valid('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o')
      .default('gpt-4')
      .messages({
        'any.only': 'El modelo debe ser uno de: gpt-3.5-turbo, gpt-4, gpt-4-turbo, gpt-4o'
      }),
    temperature: Joi.number()
      .min(0)
      .max(2)
      .default(0.7)
      .messages({
        'number.min': 'La temperatura debe ser mayor o igual a 0',
        'number.max': 'La temperatura debe ser menor o igual a 2'
      }),
    max_tokens: Joi.number()
      .min(1)
      .max(4096)
      .default(1000)
      .messages({
        'number.min': 'Los tokens máximos deben ser mayor a 0',
        'number.max': 'Los tokens máximos no pueden ser mayores a 4096'
      }),
    enabled: Joi.boolean()
      .default(true)
  })
};

// Message validation schemas
const messageSchemas = {
  send: Joi.object({
    to: Joi.string()
      .pattern(new RegExp('^[1-9]\\d{1,14}$'))
      .required()
      .messages({
        'string.pattern.base': 'El número debe tener un formato válido (sin + ni espacios)',
        'string.empty': 'El número de destino es requerido',
        'any.required': 'El número de destino es requerido'
      }),
    message: Joi.string()
      .min(1)
      .max(4096)
      .required()
      .messages({
        'string.min': 'El mensaje no puede estar vacío',
        'string.max': 'El mensaje no puede tener más de 4096 caracteres',
        'string.empty': 'El mensaje es requerido',
        'any.required': 'El mensaje es requerido'
      }),
    type: Joi.string()
      .valid('text', 'image', 'audio', 'video', 'document')
      .default('text')
      .messages({
        'any.only': 'El tipo debe ser uno de: text, image, audio, video, document'
      })
  })
};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.integer': 'La página debe ser un número entero',
        'number.min': 'La página debe ser mayor a 0'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.integer': 'El límite debe ser un número entero',
        'number.min': 'El límite debe ser mayor a 0',
        'number.max': 'El límite no puede ser mayor a 100'
      }),
    sort: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'El orden debe ser asc o desc'
      }),
    search: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'La búsqueda no puede tener más de 100 caracteres'
      })
  })
};

// Validation middleware functions
const validateRegister = validate(authSchemas.register);
const validateLogin = validate(authSchemas.login);
const validateForgotPassword = validate(authSchemas.forgotPassword);
const validateResetPassword = validate(authSchemas.resetPassword);
const validateChangePassword = validate(authSchemas.changePassword);

const validateCreateInstance = validate(instanceSchemas.create);
const validateUpdateInstance = validate(instanceSchemas.update);

const validateCreateBotConfig = validate(botConfigSchemas.create);
const validateSendMessage = validate(messageSchemas.send);

const validatePagination = (req, res, next) => {
  const { error, value } = querySchemas.pagination.validate(req.query, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value
    }));

    throw new AppError(
      `Error de validación en query: ${error.details.map(d => d.message).join(', ')}`,
      400,
      'QUERY_VALIDATION_ERROR',
      errorDetails
    );
  }

  // Add validated query parameters
  req.pagination = {
    page: value.page,
    limit: value.limit,
    sort: value.sort,
    search: value.search,
    offset: (value.page - 1) * value.limit
  };

  next();
};

// Validación para creación de múltiples bots (nuevo sistema)
const validateBotCreation = (req, res, next) => {
  const schema = Joi.object({
    instance_id: commonSchemas.uuid.required(),
    name: Joi.string().min(2).max(50).trim().required(),
    description: Joi.string().max(500).trim().optional(),
    system_prompt: Joi.string().min(10).max(4000).trim().required(),
    openai_model: Joi.string().valid('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o').default('gpt-4'),
    openai_temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().min(1).max(4096).default(1000),
    welcome_message: Joi.string().max(1000).default('¡Hola! ¿En qué puedo ayudarte?'),
    fallback_message: Joi.string().max(1000).default('Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?'),
    context_memory_turns: Joi.number().min(1).max(20).default(5),
    response_delay_ms: Joi.number().min(0).max(10000).default(1000),
    typing_simulation: Joi.boolean().default(true),
    daily_message_limit: Joi.number().min(1).optional(),
    monthly_token_limit: Joi.number().min(1).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

// Validación para creación de knowledge items
const validateKnowledgeCreation = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
      'string.min': 'El título debe tener al menos 3 caracteres',
      'string.max': 'El título no puede exceder 200 caracteres',
      'any.required': 'El título es requerido'
    }),
    content: Joi.string().min(10).required().messages({
      'string.min': 'El contenido debe tener al menos 10 caracteres',
      'any.required': 'El contenido es requerido'
    }),
    tags: Joi.array().items(Joi.string().max(50)).max(20).default([]).messages({
      'array.max': 'Máximo 20 tags permitidos',
      'string.max': 'Cada tag no puede exceder 50 caracteres'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

// Validación para asignación de knowledge a bot
const validateKnowledgeAssignment = (req, res, next) => {
  const schema = Joi.object({
    knowledge_item_id: Joi.string().uuid().required().messages({
      'string.guid': 'El ID del knowledge item debe ser un UUID válido',
      'any.required': 'El ID del knowledge item es requerido'
    }),
    priority: Joi.number().integer().min(1).max(5).default(3).messages({
      'number.min': 'La prioridad debe ser entre 1 y 5',
      'number.max': 'La prioridad debe ser entre 1 y 5',
      'number.integer': 'La prioridad debe ser un número entero'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

// Validación para parámetros UUID en URLs
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const schema = Joi.object({
      [paramName]: Joi.string().uuid().required().messages({
        'string.guid': `${paramName} debe ser un UUID válido`,
        'any.required': `${paramName} es requerido`
      })
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro inválido',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validación para UUID en diferentes partes del request (params, body, query)
const validateUUIDField = (fieldName = 'id', location = 'params') => {
  return (req, res, next) => {
    const data = req[location];
    const schema = Joi.object({
      [fieldName]: Joi.string().uuid().required().messages({
        'string.guid': `${fieldName} debe ser un UUID válido`,
        'any.required': `${fieldName} es requerido`
      })
    });

    const { error } = schema.validate(data);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `${location === 'body' ? 'Datos' : 'Parámetro'} inválido`,
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateCreateInstance,
  validateUpdateInstance,
  validateCreateBotConfig,
  validateSendMessage,
  validatePagination,
  validateBotCreation,
  validateKnowledgeCreation,
  validateKnowledgeAssignment,
  validateUUID,
  validateUUIDField, // Nueva función más flexible
  schemas: {
    auth: authSchemas,
    instance: instanceSchemas,
    botConfig: botConfigSchemas,
    message: messageSchemas,
    query: querySchemas,
    common: commonSchemas
  }
};
