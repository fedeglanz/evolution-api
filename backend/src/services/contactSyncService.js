const database = require('../database');
const evolutionService = require('./evolutionService');

class ContactSyncService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Sincronizar contactos de una instancia específica
   * @param {string} companyId - ID de la empresa
   * @param {string} instanceId - ID de la instancia en nuestra DB
   * @param {string} evolutionInstanceName - Nombre de la instancia en Evolution
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncInstanceContacts(companyId, instanceId, evolutionInstanceName) {
    try {
      console.log(`[ContactSync] Iniciando sincronización para instancia: ${evolutionInstanceName}`);

      // 1. Obtener contactos desde Evolution API
      const evolutionContacts = await evolutionService.getContacts(evolutionInstanceName);
      
      console.log(`[ContactSync] Obtenidos ${evolutionContacts.length} contactos desde Evolution API`);

      const results = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: [],
        contacts: []
      };

      // 2. Procesar cada contacto
      for (const evolutionContact of evolutionContacts) {
        try {
          results.processed++;

          // Validar que el contacto tenga teléfono
          if (!evolutionContact.phone) {
            results.errors.push(`Contacto sin teléfono: ${evolutionContact.id}`);
            continue;
          }

          // 3. Verificar si el contacto ya existe en nuestra DB
          const existingContactQuery = `
            SELECT id, name, profile_pic_url, updated_at 
            FROM whatsapp_bot.contacts 
            WHERE company_id = $1 AND phone = $2
          `;
          
          const existingResult = await database.query(existingContactQuery, [companyId, evolutionContact.phone]);

          if (existingResult.rows.length > 0) {
            // Contacto existe - actualizar si es necesario
            const existingContact = existingResult.rows[0];
            const needsUpdate = this.shouldUpdateContact(existingContact, evolutionContact);

            if (needsUpdate) {
              await this.updateContact(existingContact.id, evolutionContact);
              results.updated++;
              console.log(`[ContactSync] Actualizado contacto: ${evolutionContact.phone}`);
            }

            results.contacts.push({
              id: existingContact.id,
              phone: evolutionContact.phone,
              action: needsUpdate ? 'updated' : 'unchanged'
            });

          } else {
            // Contacto nuevo - crear
            const newContact = await this.createContact(companyId, evolutionContact);
            results.created++;
            results.contacts.push({
              id: newContact.id,
              phone: evolutionContact.phone,
              action: 'created'
            });
            console.log(`[ContactSync] Creado contacto: ${evolutionContact.phone}`);
          }

        } catch (error) {
          console.error(`[ContactSync] Error procesando contacto ${evolutionContact.phone}:`, error);
          results.errors.push(`${evolutionContact.phone}: ${error.message}`);
        }
      }

      console.log(`[ContactSync] Sincronización completada:`, {
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      console.error(`[ContactSync] Error en sincronización:`, error);
      throw new Error(`Failed to sync contacts: ${error.message}`);
    }
  }

  /**
   * Sincronizar contactos de todas las instancias de una empresa
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAllCompanyContacts(companyId) {
    try {
      console.log(`[ContactSync] Sincronizando todas las instancias de empresa: ${companyId}`);

      // Obtener todas las instancias activas de la empresa
      const instancesQuery = `
        SELECT id, evolution_instance_name, instance_name
        FROM whatsapp_bot.whatsapp_instances 
        WHERE company_id = $1 AND status = 'connected'
      `;
      
      const instancesResult = await database.query(instancesQuery, [companyId]);
      const instances = instancesResult.rows;

      if (instances.length === 0) {
        return {
          success: true,
          message: 'No hay instancias conectadas para sincronizar',
          results: []
        };
      }

      const allResults = {
        totalProcessed: 0,
        totalCreated: 0,
        totalUpdated: 0,
        totalErrors: 0,
        instanceResults: []
      };

      // Sincronizar cada instancia
      for (const instance of instances) {
        try {
          const syncResult = await this.syncInstanceContacts(
            companyId, 
            instance.id, 
            instance.evolution_instance_name
          );

          allResults.totalProcessed += syncResult.processed;
          allResults.totalCreated += syncResult.created;
          allResults.totalUpdated += syncResult.updated;
          allResults.totalErrors += syncResult.errors.length;

          allResults.instanceResults.push({
            instanceId: instance.id,
            instanceName: instance.instance_name,
            evolutionInstanceName: instance.evolution_instance_name,
            ...syncResult
          });

        } catch (error) {
          console.error(`[ContactSync] Error sincronizando instancia ${instance.instance_name}:`, error);
          allResults.instanceResults.push({
            instanceId: instance.id,
            instanceName: instance.instance_name,
            error: error.message
          });
        }
      }

      return allResults;

    } catch (error) {
      console.error(`[ContactSync] Error en sincronización masiva:`, error);
      throw error;
    }
  }

  /**
   * Determinar si un contacto necesita actualización
   * @param {Object} existingContact - Contacto existente en DB
   * @param {Object} evolutionContact - Contacto desde Evolution API
   * @returns {boolean} Si necesita actualización
   */
  shouldUpdateContact(existingContact, evolutionContact) {
    // Actualizar si el nombre ha cambiado
    if (existingContact.name !== evolutionContact.name && evolutionContact.name) {
      return true;
    }

    // Actualizar si la foto de perfil ha cambiado
    if (existingContact.profile_pic_url !== evolutionContact.profilePictureUrl && evolutionContact.profilePictureUrl) {
      return true;
    }

    // Actualizar si ha pasado más de 1 día desde la última actualización
    const lastUpdate = new Date(existingContact.updated_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (lastUpdate < oneDayAgo) {
      return true;
    }

    return false;
  }

  /**
   * Crear nuevo contacto en la base de datos
   * @param {string} companyId - ID de la empresa
   * @param {Object} evolutionContact - Datos del contacto desde Evolution
   * @returns {Promise<Object>} Contacto creado
   */
  async createContact(companyId, evolutionContact) {
    const query = `
      INSERT INTO whatsapp_bot.contacts (
        company_id, phone, name, profile_pic_url, 
        tags, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      companyId,
      evolutionContact.phone,
      evolutionContact.name || evolutionContact.pushName,
      evolutionContact.profilePictureUrl,
      ['evolution-sync'], // Tag para identificar contactos sincronizados
      `Sincronizado desde Evolution API. Estado WhatsApp: ${evolutionContact.isWAContact ? 'Activo' : 'Inactivo'}`
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Actualizar contacto existente
   * @param {string} contactId - ID del contacto
   * @param {Object} evolutionContact - Datos actualizados desde Evolution
   * @returns {Promise<Object>} Contacto actualizado
   */
  async updateContact(contactId, evolutionContact) {
    const query = `
      UPDATE whatsapp_bot.contacts 
      SET 
        name = COALESCE($2, name),
        profile_pic_url = COALESCE($3, profile_pic_url),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      contactId,
      evolutionContact.name || evolutionContact.pushName,
      evolutionContact.profilePictureUrl
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Obtener estadísticas de sincronización
   * @param {string} companyId - ID de la empresa
   * @returns {Promise<Object>} Estadísticas
   */
  async getSyncStats(companyId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(*) FILTER (WHERE 'evolution-sync' = ANY(tags)) as synced_contacts,
          COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as updated_today,
          MAX(updated_at) as last_sync
        FROM whatsapp_bot.contacts
        WHERE company_id = $1
      `;

      const result = await database.query(statsQuery, [companyId]);
      return result.rows[0];

    } catch (error) {
      console.error('[ContactSync] Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = new ContactSyncService(); 