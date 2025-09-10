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

      // Buscar customer existente por email antes de crear
      try {
        console.log(`🔍 Buscando customer existente con email: ${customerData.email}`);
        
        const searchResponse = await this.mercadopago.customer.search({
          qs: {
            email: customerData.email
          }
        });

        console.log(`📝 Search response:`, JSON.stringify(searchResponse, null, 2));

        if (searchResponse && searchResponse.data && searchResponse.data.length > 0) {
          const existingCustomer = searchResponse.data[0];
          console.log(`✅ Customer existente encontrado por email: ${existingCustomer.id}`);
          
          // Guardar customer_id en BD si no lo tenemos
          const updateQuery = `
            UPDATE whatsapp_bot.companies 
            SET 
              mercadopago_customer_id = $2,
              updated_at = NOW()
            WHERE id = $1 AND (mercadopago_customer_id IS NULL OR mercadopago_customer_id != $2)
          `;
          await pool.query(updateQuery, [companyId, existingCustomer.id]);
          
          return {
            customer_id: existingCustomer.id,
            customer_data: existingCustomer,
            action: 'found_by_email'
          };
        } else {
          console.log(`📋 No existing customers found for email: ${customerData.email}`);
        }
      } catch (searchError) {
        console.log(`⚠️ Error buscando customer por email:`, JSON.stringify(searchError, null, 2));
        // Continuar para crear nuevo customer
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
      
      // Debug: Check if we have valid MercadoPago configuration
      if (!this.mercadopago.customer) {
        throw new Error('MercadoPago customer service not initialized');
      }
      
      try {
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
      } catch (createError) {
        // Si el error es "customer already exist", buscar por email una vez más
        if (createError.cause && createError.cause.some(c => c.code === '101')) {
          console.log(`⚠️ Customer ya existe, buscando por email como fallback...`);
          
          try {
            const fallbackSearchResponse = await this.mercadopago.customer.search({
              qs: {
                email: customerData.email
              }
            });

            console.log(`📝 Fallback search response:`, JSON.stringify(fallbackSearchResponse, null, 2));

            if (fallbackSearchResponse && fallbackSearchResponse.data && fallbackSearchResponse.data.length > 0) {
              const existingCustomer = fallbackSearchResponse.data[0];
              console.log(`✅ Customer encontrado en fallback: ${existingCustomer.id}`);
              
              // Guardar customer_id en BD
              const updateQuery = `
                UPDATE whatsapp_bot.companies 
                SET 
                  mercadopago_customer_id = $2,
                  updated_at = NOW()
                WHERE id = $1
              `;
              await pool.query(updateQuery, [companyId, existingCustomer.id]);
              
              return {
                customer_id: existingCustomer.id,
                customer_data: existingCustomer,
                action: 'found_after_create_failed'
              };
            } else {
              console.log(`📋 No customers found in fallback search for email: ${customerData.email}`);
            }
          } catch (fallbackError) {
            console.log(`❌ Error en fallback search:`, JSON.stringify(fallbackError, null, 2));
          }
        }
        
        // Re-throw el error original si no pudimos resolverlo
        throw createError;
      }

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