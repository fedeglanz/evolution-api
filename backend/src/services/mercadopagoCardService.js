const { MercadoPagoConfig, Customer, CustomerCard, CardToken } = require('mercadopago');
const { pool } = require('../database');

class MercadoPagoCardService {
  constructor() {
    this.version = '1.0-Sept9-TokenizationFlow';
    
    // Configurar MercadoPago
    this.mercadopago = null;
    if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
      try {
        const client = new MercadoPagoConfig({ 
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
          options: { timeout: 5000 }
        });
        
        this.mercadopago = {
          client: client,
          customer: new Customer(client),
          customerCard: new CustomerCard(client),
          cardToken: new CardToken(client)
        };
        
        console.log('💳 MercadoPagoCardService: Configurado correctamente');
      } catch (error) {
        console.log('⚠️ Error configurando MercadoPago en CardService:', error.message);
        this.mercadopago = null;
      }
    } else {
      console.log('⚠️ MercadoPagoCardService: MERCADOPAGO_ACCESS_TOKEN no configurado');
    }
  }

  /**
   * Crear o obtener customer de MercadoPago
   */
  async createOrGetCustomer(companyId, customerData) {
    try {
      console.log(`🔍 Creating/Getting MercadoPago customer for company ${companyId}`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      // Verificar si ya existe customer en BD
      const existingQuery = `
        SELECT mercadopago_customer_id 
        FROM whatsapp_bot.companies 
        WHERE id = $1 AND mercadopago_customer_id IS NOT NULL
      `;
      const existingResult = await pool.query(existingQuery, [companyId]);
      
      if (existingResult.rows.length > 0) {
        const customerId = existingResult.rows[0].mercadopago_customer_id;
        
        try {
          // Verificar que el customer existe en MercadoPago
          const customer = await this.mercadopago.customer.get({
            id: customerId
          });
          
          console.log(`✅ Customer existente encontrado: ${customerId}`);
          return {
            customer_id: customerId,
            customer_data: customer,
            action: 'existing'
          };
        } catch (error) {
          console.log(`⚠️ Customer ${customerId} no existe en MP, creando nuevo...`);
          // Continuar para crear nuevo customer
        }
      }

      // Crear nuevo customer en MercadoPago
      const customerPayload = {
        email: customerData.email,
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        phone: {
          area_code: customerData.phone_area_code || '',
          number: customerData.phone_number?.replace(/[^\d]/g, '') || ''
        },
        identification: customerData.identification ? {
          type: customerData.identification.type,
          number: customerData.identification.number
        } : undefined,
        description: `Customer for company ${companyId}`,
        metadata: {
          company_id: companyId
        }
      };

      console.log('📋 Creating customer with data:', JSON.stringify(customerPayload, null, 2));
      
      const customer = await this.mercadopago.customer.create({
        body: customerPayload
      });

      console.log(`✅ Customer creado: ${customer.id}`);

      // Guardar customer_id en BD
      const updateQuery = `
        UPDATE whatsapp_bot.companies 
        SET 
          mercadopago_customer_id = $2,
          updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(updateQuery, [companyId, customer.id]);

      return {
        customer_id: customer.id,
        customer_data: customer,
        action: 'created'
      };

    } catch (error) {
      console.error('❌ Error creating/getting customer:', error);
      throw error;
    }
  }

  /**
   * Obtener tarjetas guardadas de un customer
   */
  async getCustomerCards(customerId) {
    try {
      console.log(`🔍 Getting cards for customer ${customerId}`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      const response = await this.mercadopago.customerCard.search({
        customer_id: customerId
      });

      const cards = response.data || [];
      
      console.log(`✅ Found ${cards.length} cards for customer ${customerId}`);
      
      // Filtrar solo tarjetas activas y formatear
      const activeCards = cards
        .filter(card => card.status === 'active')
        .map(card => ({
          id: card.id,
          first_six_digits: card.first_six_digits,
          last_four_digits: card.last_four_digits,
          payment_method: {
            id: card.payment_method.id,
            name: card.payment_method.name,
            payment_type_id: card.payment_method.payment_type_id
          },
          security_code: {
            length: card.security_code.length,
            card_location: card.security_code.card_location
          },
          expiration_month: card.expiration_month,
          expiration_year: card.expiration_year,
          date_created: card.date_created,
          status: card.status
        }));

      return {
        success: true,
        cards: activeCards,
        total: activeCards.length
      };

    } catch (error) {
      console.error('❌ Error getting customer cards:', error);
      
      if (error.message?.includes('not found')) {
        return {
          success: true,
          cards: [],
          total: 0
        };
      }
      
      throw error;
    }
  }

  /**
   * Crear token de tarjeta existente (para usarla en suscripción)
   */
  async createCardToken(cardId, securityCode) {
    try {
      console.log(`🔐 Creating card token for card ${cardId}`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      const cardToken = await this.mercadopago.cardToken.create({
        body: {
          card_id: cardId,
          security_code: securityCode
        }
      });

      console.log(`✅ Card token created: ${cardToken.id}`);

      return {
        success: true,
        card_token_id: cardToken.id,
        card_token_data: cardToken
      };

    } catch (error) {
      console.error('❌ Error creating card token:', error);
      throw error;
    }
  }

  /**
   * Crear token de tarjeta nueva (desde frontend card form)
   */
  async createCardTokenFromForm(cardData) {
    try {
      console.log(`🆕 Creating card token from form data`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      // Validar datos requeridos
      if (!cardData.card_number || !cardData.expiration_month || !cardData.expiration_year || !cardData.security_code || !cardData.cardholder) {
        throw new Error('Datos de tarjeta incompletos');
      }

      const tokenPayload = {
        card_number: cardData.card_number,
        expiration_month: parseInt(cardData.expiration_month),
        expiration_year: parseInt(cardData.expiration_year),
        security_code: cardData.security_code,
        cardholder: {
          name: cardData.cardholder.name,
          identification: cardData.cardholder.identification
        }
      };

      console.log('📋 Creating card token with data:', JSON.stringify({
        ...tokenPayload,
        card_number: `****-****-****-${tokenPayload.card_number.slice(-4)}`,
        security_code: '***'
      }, null, 2));

      const cardToken = await this.mercadopago.cardToken.create({
        body: tokenPayload
      });

      console.log(`✅ Card token created from form: ${cardToken.id}`);

      return {
        success: true,
        card_token_id: cardToken.id,
        card_token_data: cardToken
      };

    } catch (error) {
      console.error('❌ Error creating card token from form:', error);
      throw error;
    }
  }

  /**
   * Guardar tarjeta en customer (después de un pago exitoso)
   */
  async saveCardToCustomer(customerId, cardTokenId) {
    try {
      console.log(`💾 Saving card to customer ${customerId} using token ${cardTokenId}`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      const card = await this.mercadopago.customerCard.create({
        body: {
          token: cardTokenId
        },
        customer_id: customerId
      });

      console.log(`✅ Card saved to customer: ${card.id}`);

      return {
        success: true,
        card_id: card.id,
        card_data: card
      };

    } catch (error) {
      console.error('❌ Error saving card to customer:', error);
      throw error;
    }
  }

  /**
   * Eliminar tarjeta de customer
   */
  async deleteCard(customerId, cardId) {
    try {
      console.log(`🗑️ Deleting card ${cardId} from customer ${customerId}`);
      
      if (!this.mercadopago) {
        throw new Error('MercadoPago no está configurado');
      }

      await this.mercadopago.customerCard.remove({
        customer_id: customerId,
        id: cardId
      });

      console.log(`✅ Card ${cardId} deleted from customer ${customerId}`);

      return {
        success: true,
        message: 'Tarjeta eliminada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error deleting card:', error);
      throw error;
    }
  }
}

module.exports = new MercadoPagoCardService();