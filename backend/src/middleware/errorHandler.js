const config = require('../config');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error handler
const handleDatabaseError = (err) => {
  let message = 'Error de base de datos';
  let statusCode = 500;
  
  // PostgreSQL specific error codes
  if (err.code === '23505') {
    message = 'El registro ya existe';
    statusCode = 409;
  } else if (err.code === '23503') {
    message = 'Referencia inválida';
    statusCode = 400;
  } else if (err.code === '23502') {
    message = 'Campo requerido faltante';
    statusCode = 400;
  } else if (err.code === '42P01') {
    message = 'Tabla no encontrada';
    statusCode = 500;
  }
  
  return new AppError(message, statusCode, err.code);
};

// JWT error handler
const handleJWTError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expirado', 401, 'TOKEN_EXPIRED');
  }
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401, 'TOKEN_INVALID');
  }
  return new AppError('Error de autenticación', 401, 'AUTH_ERROR');
};

// Validation error handler
const handleValidationError = (err) => {
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    return new AppError(message, 400, 'VALIDATION_ERROR');
  }
  return new AppError('Error de validación', 400, 'VALIDATION_ERROR');
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Handle specific error types
  if (err.code && err.code.startsWith('23')) {
    error = handleDatabaseError(err);
  } else if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    error = handleJWTError(err);
  } else if (err.isJoi) {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = new AppError('Formato de ID inválido', 400, 'INVALID_ID');
  } else if (err.type === 'entity.too.large') {
    error = new AppError('Archivo demasiado grande', 413, 'FILE_TOO_LARGE');
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('Archivo demasiado grande', 413, 'FILE_TOO_LARGE');
  } else if (err.code === 'ECONNREFUSED') {
    error = new AppError('Servicio no disponible', 503, 'SERVICE_UNAVAILABLE');
  } else if (err.code === 'ENOTFOUND') {
    error = new AppError('Servicio no encontrado', 503, 'SERVICE_NOT_FOUND');
  }

  // Default error
  if (!error.isOperational) {
    error = new AppError('Error interno del servidor', 500, 'INTERNAL_ERROR');
  }

  // Prepare response
  const response = {
    success: false,
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Include stack trace in development
  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Send response
  res.status(error.statusCode || 500).json(response);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
