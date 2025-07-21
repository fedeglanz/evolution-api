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
    canCreate: currentInstances < effectiveMaxInstances,
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
      const { name, description, webhook_url, webhook_events } = req.body;
      const companyId = req.user.companyId;
      
      // Validaciones básicas
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la instancia es requerido'
        });
      }

      if (name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la instancia no puede exceder 50 caracteres'
        });
      }

      // Verificar límites del plan
      console.log('Verificando límites del plan para companyId:', companyId);
      const planLimits = await checkPlanLimitsHelper(companyId);
      
      if (planLimits.planExpired) {
        return res.status(403).json({
          success: false,
          message: `Tu plan ${planLimits.planName} ha expirado. Actualiza tu plan para continuar creando instancias.`,
          error_code: 'PLAN_EXPIRED'
        });
      }
      
      if (!planLimits.canCreate) {
        return res.status(403).json({
          success: false,
          message: `Has alcanzado el límite de instancias para tu plan ${planLimits.planName} (${planLimits.maxInstances} instancias)`,
          error_code: 'INSTANCE_LIMIT_REACHED',
          details: {
            current_instances: planLimits.currentInstances,
            max_instances: planLimits.maxInstances,
            plan: planLimits.planKey
          }
        });
      }

      // Verificar si ya existe una instancia con ese nombre
      const existingInstance = await getInstanceByNameHelper(companyId, name);
      if (existingInstance) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una instancia con este nombre en tu empresa'
        });
      }

      // Crear nombre único para Evolution API (empresa_instancia)
      const evolutionInstanceName = `${companyId}_${name}`.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Crear instancia en Evolution API
      const evolutionInstance = await evolutionService.createInstance(evolutionInstanceName, webhook_url);
      
      // Guardar en base de datos
      const dbQuery = `
        INSERT INTO whatsapp_bot.whatsapp_instances 
        (company_id, instance_name, evolution_instance_name, status, qr_code, description, webhook_url, webhook_events, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
        RETURNING *
      `;
      
      const result = await pool.query(dbQuery, [
        companyId,
        name,
        evolutionInstanceName,
        evolutionInstance.status || 'connecting',
        evolutionInstance.qrCode,
        description,
        webhook_url,
        webhook_events ? JSON.stringify(webhook_events) : null
      ]);
      
      const instance = result.rows[0];
      
      res.status(201).json({
        success: true,
        message: 'Instancia creada exitosamente',
        data: {
          instance: {
            id: instance.id,
            name: instance.instance_name,
            phoneNumber: instance.phone_number,
            status: instance.status,
            qrCode: instance.qr_code,
            description: instance.description,
            webhookUrl: instance.webhook_url,
            webhookEvents: instance.webhook_events || null,
            createdAt: instance.created_at,
            evolutionInstanceName: evolutionInstanceName
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
  deleteInstance: instanceController.deleteInstance.bind(instanceController)
};
