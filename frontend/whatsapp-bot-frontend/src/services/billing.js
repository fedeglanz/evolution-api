import api from './api';

class BillingService {
  // Crear subscripción
  async createSubscription(planId, customerData, cardTokenId = null) {
    const requestData = {
      planId,
      customerData
    };
    
    // Agregar card_token_id si está disponible (para MercadoPago)
    if (cardTokenId) {
      requestData.card_token_id = cardTokenId;
    }
    
    const response = await api.post('/billing/create-subscription', requestData);
    return response.data;
  }

  // Obtener estado de subscripción actual
  async getSubscriptionStatus() {
    const response = await api.get('/billing/subscription-status');
    return response.data;
  }

  // Obtener historial de facturación
  async getBillingHistory(params = {}) {
    const response = await api.get('/billing/history', { params });
    return response.data;
  }

  // Cancelar subscripción
  async cancelSubscription(reason) {
    const response = await api.post('/billing/cancel-subscription', {
      reason
    });
    return response.data;
  }

  // Obtener planes disponibles (sin autenticación para mostrar pricing)
  async getAvailablePlans() {
    const response = await api.get('/billing/plans/available');
    return response.data;
  }
}

export default new BillingService();