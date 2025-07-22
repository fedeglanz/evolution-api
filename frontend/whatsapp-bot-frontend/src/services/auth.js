import apiClient from './api';

export const authService = {
  // Login
  async login(email, password) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    
    const { token, user, company } = response.data.data;
    
    // Guardar token en localStorage
    localStorage.setItem('auth-token', token);
    
    return { token, user, company };
  },

  // Registro
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    
    const { token, user, company } = response.data.data;
    
    // Guardar token en localStorage
    localStorage.setItem('auth-token', token);
    
    return { token, user, company };
  },

  // Logout
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Siempre limpiar el token local
      localStorage.removeItem('auth-token');
    }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  // Cambiar contraseña
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Renovar token
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    const { token } = response.data.data;
    
    localStorage.setItem('auth-token', token);
    return token;
  },

  // Verificar si hay token válido
  hasValidToken() {
    const token = localStorage.getItem('auth-token');
    return !!token;
  },

  // Obtener token del localStorage
  getToken() {
    return localStorage.getItem('auth-token');
  },
}; 