import axiosConfig from '../config/axios';

class MercadoPagoService {
  constructor() {
    this.baseUrl = '/mercadopago';
  }

  /**
   * Crear o obtener customer MercadoPago
   */
  async createOrGetCustomer(customerData) {
    try {
      console.log('🔄 Creating/getting MP customer:', customerData);
      
      const response = await axiosConfig.post(`${this.baseUrl}/customer`, customerData);
      
      console.log('✅ Customer response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating/getting customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener tarjetas guardadas del usuario
   */
  async getCustomerCards() {
    try {
      console.log('🔄 Getting customer cards');
      
      const response = await axiosConfig.get(`${this.baseUrl}/cards`);
      
      console.log('✅ Cards response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting cards:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Crear token de tarjeta existente
   */
  async createCardToken(cardId, securityCode) {
    try {
      console.log('🔄 Creating card token for card:', cardId);
      
      const response = await axiosConfig.post(`${this.baseUrl}/card-token`, {
        card_id: cardId,
        security_code: securityCode
      });
      
      console.log('✅ Card token response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating card token:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Crear token de tarjeta nueva desde formulario
   */
  async createCardTokenFromForm(cardData) {
    try {
      console.log('🔄 Creating card token from form');
      
      const response = await axiosConfig.post(`${this.baseUrl}/card-token/new`, cardData);
      
      console.log('✅ New card token response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating new card token:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar tarjeta guardada
   */
  async deleteCard(cardId) {
    try {
      console.log('🔄 Deleting card:', cardId);
      
      const response = await axiosConfig.delete(`${this.baseUrl}/cards/${cardId}`);
      
      console.log('✅ Delete card response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting card:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Manejar errores de API
   */
  handleError(error) {
    if (error.response?.data) {
      return new Error(error.response.data.message || 'Error desconocido');
    } else if (error.request) {
      return new Error('Error de conexión con el servidor');
    } else {
      return new Error(error.message || 'Error desconocido');
    }
  }
}

export const mercadopagoService = new MercadoPagoService();
export default mercadopagoService;