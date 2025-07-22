import apiClient from './api';

export const botsService = {
  // Obtener todos los bots de la empresa
  async getBots(instanceId = null, activeOnly = false) {
    const params = new URLSearchParams();
    
    if (instanceId) {
      params.append('instance_id', instanceId);
    }
    
    if (activeOnly) {
      params.append('active_only', 'true');
    }
    
    const response = await apiClient.get(`/bots?${params}`);
    return response.data;
  },

  // Obtener un bot específico
  async getBot(id) {
    const response = await apiClient.get(`/bots/${id}`);
    return response.data;
  },

  // Crear nuevo bot
  async createBot(data) {
    const response = await apiClient.post('/bots', data);
    return response.data;
  },

  // Actualizar bot existente
  async updateBot(id, data) {
    const response = await apiClient.put(`/bots/${id}`, data);
    return response.data;
  },

  // Eliminar bot
  async deleteBot(id) {
    const response = await apiClient.delete(`/bots/${id}`);
    return response.data;
  },

  // Activar/Desactivar bot
  async toggleBot(id, isActive) {
    const response = await apiClient.post(`/bots/${id}/toggle`, {
      is_active: isActive
    });
    return response.data;
  },

  // Obtener bot activo de una instancia
  async getActiveBotForInstance(instanceId) {
    const response = await apiClient.get(`/instances/${instanceId}/active-bot`);
    return response.data;
  },

  // Obtener templates predefinidos
  async getBotTemplates() {
    const response = await apiClient.get('/bots/templates');
    return response.data;
  },

  // Obtener información de la API de bots
  async getBotInfo() {
    const response = await apiClient.get('/bots/info');
    return response.data;
  }
};

export default botsService; 