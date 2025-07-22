import apiClient from './api';

export const instancesService = {
  // Obtener todas las instancias
  async getInstances(page = 1, limit = 10, status = null) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }
    
    const response = await apiClient.get(`/instances?${params}`);
    return response.data;
  },

  // Obtener una instancia específica
  async getInstance(id) {
    const response = await apiClient.get(`/instances/${id}`);
    return response.data;
  },

  // Crear nueva instancia
  async createInstance(data) {
    const response = await apiClient.post('/instances', data);
    return response.data;
  },

  // Actualizar instancia
  async updateInstance(id, data) {
    const response = await apiClient.put(`/instances/${id}`, data);
    return response.data;
  },

  // Eliminar instancia
  async deleteInstance(id) {
    const response = await apiClient.delete(`/instances/${id}`);
    return response.data;
  },

  // Obtener código QR para conectar WhatsApp
  async getQRCode(id) {
    const response = await apiClient.get(`/instances/${id}/qr`);
    return response.data;
  },

  // Conectar instancia
  async connectInstance(id) {
    const response = await apiClient.post(`/instances/${id}/connect`);
    return response.data;
  },

  // Desconectar instancia
  async disconnectInstance(id) {
    const response = await apiClient.post(`/instances/${id}/disconnect`);
    return response.data;
  },

  // Sincronizar estado de una instancia
  async syncInstanceState(id) {
    const response = await apiClient.put(`/instances/${id}/sync-state`);
    return response.data;
  },

  // Sincronizar estado de todas las instancias
  async syncAllInstancesState() {
    const response = await apiClient.put(`/instances/sync-all`);
    return response.data;
  },

  // Obtener estado de la instancia
  async getInstanceStatus(id) {
    const response = await apiClient.get(`/instances/${id}/status`);
    return response.data;
  },

  // Obtener estadísticas de la instancia
  async getInstanceStats(id) {
    const response = await apiClient.get(`/instances/${id}/stats`);
    return response.data;
  }
}; 