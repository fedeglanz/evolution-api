import axios from 'axios';

// Cliente HTTP sin interceptores para endpoints públicos (sin auth)
const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://whatsapp-bot-backend-fnte.onrender.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log básico para debugging (sin interceptores que redirijan a login)
publicApiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🌐 Public API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  }
);

publicApiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ Public API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error(`❌ Public API Error: ${error.response?.status || 'Network'} ${error.config?.url}`);
    }
    // NO redirigir a login en errores 401 (endpoints públicos)
    return Promise.reject(error);
  }
);

/**
 * Servicio de pagos para el onboarding/registro
 * Usa endpoints públicos que no requieren autenticación
 */
class OnboardingPaymentsService {

  // ===== MERCADOPAGO METHODS =====

  /**
   * Crear customer MercadoPago (público para onboarding)
   */
  async createMercadoPagoCustomer(customerData) {
    try {
      console.log('🔄 Creating MP customer (onboarding):', customerData);
      
      const response = await publicApiClient.post('/public/mercadopago/customer', customerData);
      
      console.log('✅ MP Customer response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating MP customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Crear card token MercadoPago (público para onboarding)
   */
  async createMercadoPagoCardToken(cardData) {
    try {
      console.log('🔄 Creating MP card token (onboarding):', { 
        ...cardData, 
        card_number: '****' + (cardData.card_number || '').slice(-4) 
      });
      
      const response = await publicApiClient.post('/public/mercadopago/card-token/new', cardData);
      
      console.log('✅ MP Card token response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating MP card token:', error);
      throw this.handleError(error);
    }
  }

  // ===== STRIPE METHODS =====

  /**
   * Crear customer Stripe (público para onboarding)
   */
  async createStripeCustomer(customerData) {
    try {
      console.log('🔄 Creating Stripe customer (onboarding):', customerData);
      
      const response = await publicApiClient.post('/public/stripe/customer', customerData);
      
      console.log('✅ Stripe Customer response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating Stripe customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Crear payment method Stripe (público para onboarding)
   */
  async createStripePaymentMethod(customerId, paymentMethodData) {
    try {
      console.log('🔄 Creating Stripe payment method (onboarding):', { customerId, paymentMethodData });
      
      const response = await publicApiClient.post('/public/stripe/payment-method', {
        customer_id: customerId,
        payment_method_data: paymentMethodData
      });
      
      console.log('✅ Stripe Payment method response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating Stripe payment method:', error);
      throw this.handleError(error);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Detectar región para determinar método de pago
   */
  detectRegion(customerData) {
    const { phone_number = '', email = '' } = customerData;
    
    // Detectar Argentina
    const isArgentina = 
      phone_number.startsWith('+54') ||
      email.includes('.com.ar') ||
      email.includes('.ar');
    
    return {
      region: isArgentina ? 'argentina' : 'international',
      paymentProvider: isArgentina ? 'mercadopago' : 'stripe',
      currency: isArgentina ? 'ARS' : 'USD'
    };
  }

  /**
   * Procesar tokenización según región
   */
  async processPaymentTokenization(customerData, cardData) {
    const regionInfo = this.detectRegion(customerData);
    console.log(`🌍 Region detected: ${regionInfo.region} -> ${regionInfo.paymentProvider}`);

    if (regionInfo.paymentProvider === 'mercadopago') {
      // Flujo MercadoPago
      const customer = await this.createMercadoPagoCustomer(customerData);
      const cardToken = await this.createMercadoPagoCardToken(cardData);
      
      return {
        provider: 'mercadopago',
        customer_id: customer.data.customer_id,
        card_token_id: cardToken.data.card_token_id,
        region: regionInfo
      };
    } else {
      // Flujo Stripe
      const customer = await this.createStripeCustomer({
        email: customerData.email,
        name: `${customerData.first_name} ${customerData.last_name}`,
        phone: customerData.phone_number
      });
      
      const paymentMethod = await this.createStripePaymentMethod(
        customer.data.customer_id,
        {
          number: cardData.card_number,
          exp_month: cardData.expiration_month,
          exp_year: cardData.expiration_year,
          cvc: cardData.security_code
        }
      );
      
      return {
        provider: 'stripe',
        customer_id: customer.data.customer_id,
        payment_method_id: paymentMethod.data.payment_method_id,
        region: regionInfo
      };
    }
  }

  /**
   * Manejar errores de API
   */
  handleError(error) {
    if (error.response) {
      // Error de respuesta de la API
      const apiError = error.response.data;
      return {
        message: apiError.message || 'Error del servidor',
        code: apiError.code || 'UNKNOWN_ERROR',
        status: error.response.status,
        details: apiError.error || null
      };
    } else if (error.request) {
      // Error de red
      return {
        message: 'Error de conexión. Verifica tu conexión a internet.',
        code: 'NETWORK_ERROR',
        status: 0
      };
    } else {
      // Error de configuración
      return {
        message: error.message || 'Error inesperado',
        code: 'CONFIG_ERROR',
        status: 0
      };
    }
  }
}

// Export singleton instance
export const onboardingPayments = new OnboardingPaymentsService();

// Also export class for flexibility
export default OnboardingPaymentsService;