export const API_ENDPOINTS = {
  AUTH: '/auth',
  INSTANCES: '/instances',
  CONTACTS: '/contacts',
  MESSAGES: '/messages',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  BOT_CONFIG: '/bot-config',
};

export const STATUS_COLORS = {
  success: 'text-success-600 bg-success-50',
  error: 'text-error-600 bg-error-50',
  warning: 'text-warning-600 bg-warning-50',
  info: 'text-primary-600 bg-primary-50',
};

export const INSTANCE_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error',
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
};

export const APP_CONFIG = {
  NAME: 'WhatsApp Bot Platform',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
}; 