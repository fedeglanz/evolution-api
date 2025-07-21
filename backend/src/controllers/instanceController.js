const evolutionService = require('../services/evolutionService');
const { pool } = require('../database');
const config = require('../config');
const planService = require('../services/planService');

// Helper function para verificar límites del plan
async function checkPlanLimitsHelper(companyId) {
  const companyQuery = `
    SELECT 
      c.plan, 
      c.max_instances, 
      c.max_messages,
      c.max_contacts,
      c.created_at,
      c.plan_expires_at
    FROM whatsapp_bot.companies c 
    WHERE c.id = $1
  `;
  const companyResult = await pool.query(companyQuery, [companyId]);
  
  if (companyResult.rows.length === 0) {
    throw new Error('Empresa no encontrada');
  }
  
  const company = companyResult.rows[0];
  const planConfig = config.PLANS[company.plan];
  
  if (!planConfig) {
    throw new Error('Plan no válido');
  }

  // Verificar si el plan ha expirado (para planes temporales)
  const now = new Date();
  let planExpired = false;
  
  if (company.plan_expires_at && new Date(company.plan_expires_at) < now) {
    planExpired = true;
  }

  // Contar instancias actuales
  const countQuery = 'SELECT COUNT(*) as total FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1';
  const countResult = await pool.query(countQuery, [companyId]);
  const currentInstances = parseInt(countResult.rows[0].total);
  
  // Usar los límites de la base de datos (no del config)
  const maxInstances = company.max_instances === -1 ? Infinity : company.max_instances;
  
  // Si el plan expiró, usar límites del free_trial
  const effectiveMaxInstances = planExpired ? config.PLANS.free_trial.max_instances : maxInstances;
  
  return {
    planName: planConfig.name || company.plan,
    planKey: company.plan,
    maxInstances: company.max_instances,
    currentInstances,
    canCreateInstance: currentInstances < effectiveMaxInstances,
    planExpired,
    planExpiresAt: company.plan_expires_at
  };
}

// Helper function para obtener instancia por nombre
async function getInstanceByNameHelper(companyId, name) {
  const query = 'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1 AND instance_name = $2';
  const result = await pool.query(query, [companyId, name]);
  return result.rows[0] || null;
}

class InstanceController {
  
  /**
   * Crear nueva instancia de WhatsApp
   * POST /api/instances
   */
  async createInstance(req, res) {
    try {
      const { name, description, webhook_url, webhook_events, phone_number } = req.body;
      const companyId = req.user.companyId;

      // Validar datos requeridos
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la instancia es requerido'
        });
      }

      // Validar formato de número de teléfono si se proporciona
      if (phone_number) {
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        if (!phoneRegex.test(phone_number)) {
          return res.status(400).json({
            success: false,
            message: 'Formato de número de teléfono inválido. Debe incluir código de país (ej: +5491123456789)'
          });
        }
      }

      // Validar límites del plan antes de crear la instancia
      const limitCheck = await checkPlanLimitsHelper(companyId);
      
      if (!limitCheck.canCreateInstance) {
        return res.status(400).json({
          success: false,
          message: limitCheck.message,
          code: limitCheck.code || 'INSTANCE_LIMIT_REACHED',
          details: limitCheck.details
        });
      }

      // Verificar que el nombre no esté en uso
      const existingInstance = await pool.query(
        'SELECT id FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1 AND instance_name = $2',
        [companyId, name.trim()]
      );

      if (existingInstance.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una instancia con este nombre'
        });
      }

      // Crear nombre único para Evolution API (empresa_instancia) con mejor manejo de caracteres especiales
      const cleanName = name.trim()
        .normalize('NFD') // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos/tildes
        .replace(/ñ/gi, 'n') // Reemplazar ñ por n específicamente
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales excepto espacios
        .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
        .toLowerCase(); // Convertir a minúsculas para consistencia
        
      const evolutionInstanceName = `${companyId}_${cleanName}`;
      
      console.log(`[Controller] Instance name transformation:`, {
        originalName: name.trim(),
        cleanedName: cleanName,
        evolutionInstanceName: evolutionInstanceName
      });
      
      // Crear instancia en Evolution API con número de teléfono si se proporciona
      const evolutionInstance = await evolutionService.createInstance(
        evolutionInstanceName, 
        webhook_url,
        phone_number // Pasar el número de teléfono
      );
      
      // Extraer datos ya parseados del evolutionService
      const qrCodeBase64 = evolutionInstance.qrCode;
      const pairingCode = evolutionInstance.pairingCode;
      
      // Guardar en base de datos
      const dbQuery = `
        INSERT INTO whatsapp_bot.whatsapp_instances 
        (company_id, instance_name, evolution_instance_name, status, qr_code, pairing_code, description, webhook_url, webhook_events, phone_number, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
        RETURNING *
      `;
      
      const result = await pool.query(dbQuery, [
        companyId,
        name,
        evolutionInstanceName,
        evolutionInstance.status || 'connecting',
        qrCodeBase64, // Solo guardar el base64 limpio
        pairingCode,  // Guardar pairing code por separado
        description,
        webhook_url,
        webhook_events ? JSON.stringify(webhook_events) : null,
        phone_number || null // Guardar número de teléfono en BD
      ]);
      
      const instance = result.rows[0];
      
      res.status(201).json({
        success: true,
        message: 'Instancia creada exitosamente',
        data: {
          instance: {
            id: instance.id,
            name: instance.instance_name,
            phoneNumber: instance.phone_number, // Ahora debería tener el número
            status: instance.status,
            qrCode: instance.qr_code, // Base64 limpio
            pairingCode: instance.pairing_code, // Código numérico
            description: instance.description,
            webhookUrl: instance.webhook_url,
            webhookEvents: instance.webhook_events || null,
            createdAt: instance.created_at,
            evolutionInstanceName: evolutionInstanceName,
            supportsPairingCode: !!instance.phone_number // Basado en si tiene número guardado
          }
        }
      });
      
    } catch (error) {
      console.error('Error al crear instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Listar instancias de la empresa
   * GET /api/instances
   */
  async getInstances(req, res) {
    try {
      const companyId = req.user.companyId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const status = req.query.status;
      const offset = (page - 1) * limit;

      // Construir query con filtros
      let whereClause = 'WHERE company_id = $1';
      let params = [companyId];
      
      if (status) {
        whereClause += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      // Query para obtener instancias
      const instancesQuery = `
        SELECT 
          id, 
          instance_name, 
          phone_number, 
          status, 
          connected_at, 
          last_seen, 
          created_at, 
          updated_at
        FROM whatsapp_bot.whatsapp_instances 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM whatsapp_bot.whatsapp_instances 
        ${whereClause}
      `;
      
      const [instancesResult, countResult] = await Promise.all([
        pool.query(instancesQuery, params),
        pool.query(countQuery, params.slice(0, -2)) // Remover limit y offset del count
      ]);

      const instances = instancesResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: instances.map(instance => ({
          id: instance.id,
          name: instance.instance_name,
          phoneNumber: instance.phone_number,
          status: instance.status,
          connectedAt: instance.connected_at,
          lastSeen: instance.last_seen,
          createdAt: instance.created_at,
          updatedAt: instance.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages
        }
      });
      
    } catch (error) {
      console.error('Error al obtener instancias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener instancia por ID
   * GET /api/instances/:id
   */
  async getInstance(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      // Obtener estado actual de Evolution API
      let evolutionStatus = null;
      try {
        evolutionStatus = await evolutionService.getConnectionStatus(instance.evolution_instance_name);
      } catch (error) {
        console.warn('No se pudo obtener estado de Evolution API:', error.message);
      }

      res.json({
        success: true,
        data: {
          id: instance.id,
          name: instance.instance_name,
          phoneNumber: instance.phone_number,
          status: evolutionStatus ? evolutionStatus.status : instance.status,
          connected: evolutionStatus ? evolutionStatus.connected : false,
          profileName: evolutionStatus ? evolutionStatus.profileName : null,
          connectedAt: instance.connected_at,
          lastSeen: instance.last_seen,
          createdAt: instance.created_at,
          updatedAt: instance.updated_at
        }
      });
      
    } catch (error) {
      console.error('Error al obtener instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar instancia existente
   * PUT /api/instances/:id
   */
  async updateInstance(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const { name, description, webhook_url, webhook_events } = req.body;

      // Verificar que la instancia existe y pertenece a la empresa
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      // Validar datos si se proporcionan
      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre de la instancia no puede estar vacío'
          });
        }

        if (name.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El nombre de la instancia no puede exceder 50 caracteres'
          });
        }

        // Verificar que no existe otra instancia con el mismo nombre
        if (name !== instance.instance_name) {
          const existingInstance = await this.getInstanceByName(companyId, name);
          if (existingInstance) {
            return res.status(409).json({
              success: false,
              message: 'Ya existe una instancia con este nombre en tu empresa'
            });
          }
        }
      }

      // Construir query de actualización dinámicamente
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`instance_name = $${paramIndex++}`);
        params.push(name.trim());
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description?.trim() || null);
      }

      if (webhook_url !== undefined) {
        updates.push(`webhook_url = $${paramIndex++}`);
        params.push(webhook_url?.trim() || null);
      }

      if (webhook_events !== undefined) {
        updates.push(`webhook_events = $${paramIndex++}`);
        params.push(webhook_events ? JSON.stringify(webhook_events) : null);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron datos para actualizar'
        });
      }

      updates.push(`updated_at = NOW()`);
      params.push(id, companyId);

      const updateQuery = `
        UPDATE whatsapp_bot.whatsapp_instances 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, params);
      const updatedInstance = result.rows[0];

      // Si se cambió el webhook_url, actualizar en Evolution API
      if (webhook_url !== undefined && webhook_url !== instance.webhook_url) {
        try {
          // Usar el evolution_instance_name fijo (no el display name actualizable)
          await evolutionService.updateWebhook(instance.evolution_instance_name, webhook_url);
        } catch (error) {
          console.warn('Error al actualizar webhook en Evolution API:', error.message);
          // Continuar aunque falle la actualización del webhook
        }
      }

      res.json({
        success: true,
        message: 'Instancia actualizada exitosamente',
        data: {
          instance: {
            id: updatedInstance.id,
            name: updatedInstance.instance_name,
            phoneNumber: updatedInstance.phone_number,
            status: updatedInstance.status,
            description: updatedInstance.description,
            webhookUrl: updatedInstance.webhook_url,
            webhookEvents: updatedInstance.webhook_events || null,
            createdAt: updatedInstance.created_at,
            updatedAt: updatedInstance.updated_at
          }
        }
      });

    } catch (error) {
      console.error('Error al actualizar instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener código QR
   * GET /api/instances/:id/qr
   */
  async getQRCode(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      try {
        // Usar el nuevo método que obtiene ambos códigos
        const connectionData = await evolutionService.getConnectionCodes(instance.evolution_instance_name);
        
        // Actualizar QR en base de datos si existe
        if (connectionData.qrCode) {
          await this.updateInstanceQR(companyId, id, connectionData.qrCode);
        }
        
        res.json({
          success: true,
          data: {
            instanceId: id,
            qrCode: connectionData.qrCode,
            pairingCode: connectionData.pairingCode,
            status: connectionData.status,
            message: connectionData.message || 'Códigos de conexión obtenidos'
          }
        });
        
      } catch (error) {
        if (error.message.includes('no encontrada')) {
          return res.status(404).json({
            success: false,
            message: 'Instancia no encontrada en Evolution API'
          });
        }
        
        throw error;
      }
      
    } catch (error) {
      console.error('Error al obtener códigos de conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Conectar/reconectar instancia
   * POST /api/instances/:id/connect
   */
  async connectInstance(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const connectionResult = await evolutionService.connectInstance(instance.evolution_instance_name);
      
      // Actualizar estado en base de datos
      await this.updateInstanceStatus(companyId, id, connectionResult.status, connectionResult.qrCode);
      
      res.json({
        success: true,
        message: 'Conexión iniciada exitosamente',
        data: {
          instanceId: id,
          status: connectionResult.status,
          qrCode: connectionResult.qrCode,
          message: connectionResult.message
        }
      });
      
    } catch (error) {
      console.error('Error al conectar instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estado de la instancia
   * GET /api/instances/:id/status
   */
  async getInstanceStatus(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      try {
        const status = await evolutionService.getConnectionStatus(instance.evolution_instance_name);
        
        // Actualizar estado en base de datos si está conectada
        if (status.connected) {
          await this.updateInstanceConnection(companyId, id, status.phone, status.profileName);
        }
        
        res.json({
          success: true,
          data: {
            instanceId: id,
            instanceName: instance.instance_name,
            status: status.status,
            connected: status.connected,
            phone: status.phone,
            profileName: status.profileName,
            lastSeen: instance.last_seen,
            connectedAt: instance.connected_at
          }
        });
        
      } catch (error) {
        console.warn('No se pudo verificar estado en Evolution API:', error.message);
        
        // Si no se puede conectar con Evolution API, devolver estado de BD
        res.json({
          success: true,
          data: {
            instanceId: id,
            instanceName: instance.instance_name,
            status: instance.status,
            connected: false,
            phone: instance.phone_number,
            profileName: null,
            lastSeen: instance.last_seen,
            connectedAt: instance.connected_at,
            warning: 'No se pudo verificar estado en Evolution API'
          }
        });
      }
      
    } catch (error) {
      console.error('Error al obtener estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Eliminar instancia
   * DELETE /api/instances/:id
   */
  async deleteInstance(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      
      const instance = await this.getInstanceById(companyId, id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      try {
        // Eliminar de Evolution API
        await evolutionService.deleteInstance(instance.evolution_instance_name);
      } catch (error) {
        console.warn('Error al eliminar de Evolution API:', error.message);
        // Continuar con la eliminación de la BD aunque falle la API
      }
      
      // Eliminar de base de datos
      const deleteQuery = 'DELETE FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2';
      await pool.query(deleteQuery, [id, companyId]);
      
      res.json({
        success: true,
        message: 'Instancia eliminada exitosamente'
      });
      
    } catch (error) {
      console.error('Error al eliminar instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar estado de una instancia con Evolution API
   * PUT /api/instances/:id/sync-state
   */
  async syncInstanceState(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Buscar la instancia en nuestra BD
      const instanceQuery = await pool.query(
        'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (instanceQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceQuery.rows[0];
      const evolutionInstanceName = instance.evolution_instance_name;

      console.log(`[Controller] Syncing state for instance: ${evolutionInstanceName}`);

      // Obtener estado actual desde Evolution API
      const evolutionState = await evolutionService.getInstanceState(evolutionInstanceName);

      // Mapear estados de Evolution API a nuestros estados
      let ourStatus = 'connecting';
      let connectedAt = instance.connected_at;
      let lastSeen = instance.last_seen;

      if (evolutionState.isConnected) {
        ourStatus = 'connected';
        // Si no tenía connected_at y ahora está conectado, establecer timestamp
        if (!instance.connected_at) {
          connectedAt = new Date().toISOString();
        }
        lastSeen = new Date().toISOString();
      } else if (evolutionState.status === 'not_found' || evolutionState.status === 'error') {
        ourStatus = 'disconnected';
      }

      // Actualizar en nuestra BD
      const updateQuery = await pool.query(
        `UPDATE whatsapp_bot.whatsapp_instances 
         SET status = $1, connected_at = $2, last_seen = $3, updated_at = NOW()
         WHERE id = $4 AND company_id = $5
         RETURNING *`,
        [ourStatus, connectedAt, lastSeen, id, companyId]
      );

      const updatedInstance = updateQuery.rows[0];

      console.log(`[Controller] Instance state updated:`, {
        instanceName: updatedInstance.instance_name,
        oldStatus: instance.status,
        newStatus: ourStatus,
        evolutionStatus: evolutionState.status,
        isConnected: evolutionState.isConnected
      });

      res.json({
        success: true,
        message: 'Estado sincronizado exitosamente',
        data: {
          instance: {
            id: updatedInstance.id,
            name: updatedInstance.instance_name,
            phoneNumber: updatedInstance.phone_number,
            status: updatedInstance.status,
            connectedAt: updatedInstance.connected_at,
            lastSeen: updatedInstance.last_seen,
            evolutionStatus: evolutionState.status,
            evolutionData: evolutionState.profileName ? {
              profileName: evolutionState.profileName,
              profilePictureUrl: evolutionState.profilePictureUrl,
              phone: evolutionState.phone
            } : null
          }
        }
      });

    } catch (error) {
      console.error('Error al sincronizar estado de instancia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar estado de todas las instancias de una empresa
   * PUT /api/instances/sync-all
   */
  async syncAllInstancesState(req, res) {
    try {
      const companyId = req.user.companyId;

      // Obtener todas las instancias de la empresa
      const instancesQuery = await pool.query(
        'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1',
        [companyId]
      );

      const instances = instancesQuery.rows;
      const syncResults = [];

      console.log(`[Controller] Syncing ${instances.length} instances for company: ${companyId}`);

      // Sincronizar cada instancia
      for (const instance of instances) {
        try {
          console.log(`[SYNC] Processing instance:`, {
            id: instance.id,
            name: instance.instance_name,
            currentStatus: instance.status,
            evolutionInstanceName: instance.evolution_instance_name
          });
          
          const evolutionState = await evolutionService.getInstanceState(instance.evolution_instance_name);

          console.log(`[SYNC] Evolution API response for ${instance.instance_name}:`, {
            evolutionStatus: evolutionState.status,
            isConnected: evolutionState.isConnected,
            profileName: evolutionState.profileName,
            phone: evolutionState.phone,
            rawDataKeys: evolutionState._rawData ? Object.keys(evolutionState._rawData) : 'null'
          });

          let ourStatus = 'connecting';
          let connectedAt = instance.connected_at;
          let lastSeen = instance.last_seen;

          if (evolutionState.isConnected) {
            ourStatus = 'connected';
            if (!instance.connected_at) {
              connectedAt = new Date().toISOString();
            }
            lastSeen = new Date().toISOString();
          } else if (evolutionState.status === 'not_found' || evolutionState.status === 'error') {
            ourStatus = 'disconnected';
          }

          console.log(`[SYNC] Status mapping for ${instance.instance_name}:`, {
            oldStatus: instance.status,
            newStatus: ourStatus,
            evolutionStatus: evolutionState.status,
            evolutionIsConnected: evolutionState.isConnected,
            willUpdate: ourStatus !== instance.status || (!instance.last_seen && lastSeen)
          });

          // Actualizar solo si hay cambios
          if (ourStatus !== instance.status || (!instance.last_seen && lastSeen)) {
            await pool.query(
              `UPDATE whatsapp_bot.whatsapp_instances 
               SET status = $1, connected_at = $2, last_seen = $3, updated_at = NOW()
               WHERE id = $4`,
              [ourStatus, connectedAt, lastSeen, instance.id]
            );

            syncResults.push({
              instanceId: instance.id,
              instanceName: instance.instance_name,
              oldStatus: instance.status,
              newStatus: ourStatus,
              updated: true
            });
            
            console.log(`[SYNC] Updated instance ${instance.instance_name}: ${instance.status} → ${ourStatus}`);
          } else {
            syncResults.push({
              instanceId: instance.id,
              instanceName: instance.instance_name,
              status: ourStatus,
              updated: false
            });
            
            console.log(`[SYNC] No changes for instance ${instance.instance_name}: ${instance.status}`);
          }
        } catch (error) {
          console.error(`Error syncing instance ${instance.instance_name}:`, error.message);
          syncResults.push({
            instanceId: instance.id,
            instanceName: instance.instance_name,
            error: error.message,
            updated: false
          });
        }
      }

      const updatedCount = syncResults.filter(r => r.updated).length;

      res.json({
        success: true,
        message: `Sincronización completada: ${updatedCount} instancias actualizadas de ${instances.length} total`,
        data: {
          totalInstances: instances.length,
          updatedInstances: updatedCount,
          results: syncResults
        }
      });

    } catch (error) {
      console.error('Error al sincronizar todas las instancias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Métodos auxiliares

  /**
   * Verificar límites del plan
   */
  async checkPlanLimits(companyId) {
    return await checkPlanLimitsHelper(companyId);
  }

  /**
   * Obtener instancia por nombre
   */
  async getInstanceByName(companyId, name) {
    const query = 'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1 AND instance_name = $2';
    const result = await pool.query(query, [companyId, name]);
    return result.rows[0] || null;
  }

  /**
   * Obtener instancia por ID
   */
  async getInstanceById(companyId, id) {
    const query = 'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE company_id = $1 AND id = $2';
    const result = await pool.query(query, [companyId, id]);
    return result.rows[0] || null;
  }

  /**
   * Actualizar QR de instancia
   */
  async updateInstanceQR(companyId, instanceId, qrCode) {
    const query = `
      UPDATE whatsapp_bot.whatsapp_instances 
      SET qr_code = $1, updated_at = NOW() 
      WHERE company_id = $2 AND id = $3
    `;
    await pool.query(query, [qrCode, companyId, instanceId]);
  }

  /**
   * Actualizar estado de instancia
   */
  async updateInstanceStatus(companyId, instanceId, status, qrCode = null) {
    const query = `
      UPDATE whatsapp_bot.whatsapp_instances 
      SET status = $1, qr_code = $2, updated_at = NOW() 
      WHERE company_id = $3 AND id = $4
    `;
    await pool.query(query, [status, qrCode, companyId, instanceId]);
  }

  /**
   * Actualizar conexión de instancia
   */
  async updateInstanceConnection(companyId, instanceId, phoneNumber, profileName) {
    const query = `
      UPDATE whatsapp_bot.whatsapp_instances 
      SET 
        phone_number = $1, 
        status = 'connected', 
        connected_at = NOW(), 
        last_seen = NOW(),
        updated_at = NOW() 
      WHERE company_id = $2 AND id = $3
    `;
    await pool.query(query, [phoneNumber, companyId, instanceId]);
  }
}

const instanceController = new InstanceController();

module.exports = {
  createInstance: instanceController.createInstance.bind(instanceController),
  getInstances: instanceController.getInstances.bind(instanceController),
  getInstance: instanceController.getInstance.bind(instanceController),
  updateInstance: instanceController.updateInstance.bind(instanceController),
  getQRCode: instanceController.getQRCode.bind(instanceController),
  connectInstance: instanceController.connectInstance.bind(instanceController),
  getInstanceStatus: instanceController.getInstanceStatus.bind(instanceController),
  deleteInstance: instanceController.deleteInstance.bind(instanceController),
  syncInstanceState: instanceController.syncInstanceState.bind(instanceController),
  syncAllInstancesState: instanceController.syncAllInstancesState.bind(instanceController)
};
