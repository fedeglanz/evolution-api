const mercadopagoCardService = require('../services/mercadopagoCardService');

class MercadoPagoCardController {
  constructor() {
    // Bind methods to preserve context
    this.getCustomerCards = this.getCustomerCards.bind(this);
    this.createCardToken = this.createCardToken.bind(this);
    this.createCardTokenFromForm = this.createCardTokenFromForm.bind(this);
    this.deleteCard = this.deleteCard.bind(this);
    this.getOrCreateCustomer = this.getOrCreateCustomer.bind(this);
  }

  /**
   * GET /api/mercadopago/customer
   * Crear o obtener customer MercadoPago
   */
  async getOrCreateCustomer(req, res) {
    try {
      const { companyId } = req.user;
      const customerData = req.body;

      console.log(`💳 Creating/Getting MP customer for company ${companyId}`);

      // Validar datos requeridos
      if (!customerData?.email) {
        return res.status(400).json({
          success: false,
          message: 'Email es requerido'
        });
      }

      const result = await mercadopagoCardService.createOrGetCustomer(companyId, customerData);

      res.json({
        success: true,
        data: result,
        message: result.action === 'created' ? 'Customer creado exitosamente' : 'Customer encontrado'
      });

    } catch (error) {
      console.error('❌ Error getting/creating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando customer',
        error: error.message
      });
    }
  }

  /**
   * GET /api/mercadopago/cards
   * Obtener tarjetas guardadas del usuario
   */
  async getCustomerCards(req, res) {
    try {
      const { companyId } = req.user;

      console.log(`💳 Getting cards for company ${companyId}`);

      // Obtener customer_id de la BD
      const { pool } = require('../database');
      const customerQuery = 'SELECT mercadopago_customer_id FROM whatsapp_bot.companies WHERE id = $1';
      const customerResult = await pool.query(customerQuery, [companyId]);
      
      if (customerResult.rows.length === 0 || !customerResult.rows[0].mercadopago_customer_id) {
        return res.json({
          success: true,
          data: {
            cards: [],
            total: 0
          },
          message: 'No hay customer MercadoPago asociado. Crea uno primero.'
        });
      }

      const customerId = customerResult.rows[0].mercadopago_customer_id;
      const result = await mercadopagoCardService.getCustomerCards(customerId);

      res.json({
        success: true,
        data: result,
        customer_id: customerId
      });

    } catch (error) {
      console.error('❌ Error getting customer cards:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo tarjetas',
        error: error.message
      });
    }
  }

  /**
   * POST /api/mercadopago/card-token
   * Crear token de tarjeta existente
   */
  async createCardToken(req, res) {
    try {
      const { card_id, security_code } = req.body;

      console.log(`🔐 Creating card token for card ${card_id}`);

      // Validar datos
      if (!card_id || !security_code) {
        return res.status(400).json({
          success: false,
          message: 'card_id y security_code son requeridos'
        });
      }

      const result = await mercadopagoCardService.createCardToken(card_id, security_code);

      res.json({
        success: true,
        data: result,
        message: 'Token de tarjeta creado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creating card token:', error);
      
      // Manejar errores específicos de MercadoPago
      if (error.message?.includes('invalid security_code')) {
        return res.status(400).json({
          success: false,
          message: 'Código de seguridad inválido',
          error_type: 'invalid_security_code'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creando token de tarjeta',
        error: error.message
      });
    }
  }

  /**
   * POST /api/mercadopago/card-token/new
   * Crear token de tarjeta nueva desde formulario
   */
  async createCardTokenFromForm(req, res) {
    try {
      const cardData = req.body;

      console.log(`🆕 Creating card token from form`);

      // Validar datos requeridos
      const requiredFields = ['card_number', 'expiration_month', 'expiration_year', 'security_code'];
      const missingFields = requiredFields.filter(field => !cardData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        });
      }

      if (!cardData.cardholder?.name) {
        return res.status(400).json({
          success: false,
          message: 'Nombre del titular es requerido'
        });
      }

      const result = await mercadopagoCardService.createCardTokenFromForm(cardData);

      res.json({
        success: true,
        data: result,
        message: 'Token de tarjeta nueva creado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creating card token from form:', error);

      // Manejar errores específicos
      if (error.message?.includes('invalid card_number')) {
        return res.status(400).json({
          success: false,
          message: 'Número de tarjeta inválido',
          error_type: 'invalid_card_number'
        });
      }

      if (error.message?.includes('invalid expiration')) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de vencimiento inválida',
          error_type: 'invalid_expiration'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error procesando tarjeta',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/mercadopago/cards/:cardId
   * Eliminar tarjeta guardada
   */
  async deleteCard(req, res) {
    try {
      const { companyId } = req.user;
      const { cardId } = req.params;

      console.log(`🗑️ Deleting card ${cardId} for company ${companyId}`);

      // Obtener customer_id
      const { pool } = require('../database');
      const customerQuery = 'SELECT mercadopago_customer_id FROM whatsapp_bot.companies WHERE id = $1';
      const customerResult = await pool.query(customerQuery, [companyId]);
      
      if (customerResult.rows.length === 0 || !customerResult.rows[0].mercadopago_customer_id) {
        return res.status(404).json({
          success: false,
          message: 'Customer MercadoPago no encontrado'
        });
      }

      const customerId = customerResult.rows[0].mercadopago_customer_id;
      const result = await mercadopagoCardService.deleteCard(customerId, cardId);

      res.json({
        success: true,
        message: 'Tarjeta eliminada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error deleting card:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando tarjeta',
        error: error.message
      });
    }
  }
}

// Export individual methods
const cardControllerInstance = new MercadoPagoCardController();

module.exports = {
  getOrCreateCustomer: cardControllerInstance.getOrCreateCustomer,
  getCustomerCards: cardControllerInstance.getCustomerCards,
  createCardToken: cardControllerInstance.createCardToken,
  createCardTokenFromForm: cardControllerInstance.createCardTokenFromForm,
  deleteCard: cardControllerInstance.deleteCard,

  // Export instance for flexibility
  instance: cardControllerInstance
};