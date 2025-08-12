import axios from 'axios';

// Configuración de la API usando variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-bot-backend-fnte.onrender.com/api';
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 10000;

// Debug: Mostrar la configuración actual
console.log('🔧 API Configuration:');
console.log('📡 VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('📡 API_URL:', API_URL);
console.log('⏱️ API_TIMEOUT:', API_TIMEOUT);
console.log('🌍 NODE_ENV:', import.meta.env.MODE);

// Configurar axios con interceptores
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: parseInt(API_TIMEOUT),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log para debugging en desarrollo
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => {
    // Log para debugging en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Log para debugging en desarrollo
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.response?.status || 'Network'} ${error.config?.url}`);
      console.error('Error details:', error);
    }
    
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    }
    
    // Manejar otros errores
    const errorMessage = error.response?.data?.message || 'Error de conexión';
    
    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  }
);

// Función para obtener información de la API
export const getApiInfo = () => ({
  url: API_URL,
  timeout: API_TIMEOUT,
  environment: import.meta.env.MODE,
  version: import.meta.env.VITE_APP_VERSION,
});

export default apiClient; 