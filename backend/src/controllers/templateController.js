const database = require('../database');
const config = require('../config');

class TemplateController {

  /**
   * Listar templates de mensajes con filtros
   * GET /api/templates
   */
  async getTemplates(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        search = '',
        category = '',
        is_active = '',
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por búsqueda (nombre o contenido)
      if (search.trim()) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Filtro por categoría
      if (category.trim()) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category.trim());
        paramIndex++;
      }

      // Filtro por estado activo
      if (is_active === 'true') {
        whereClause += ` AND is_active = true`;
      } else if (is_active === 'false') {
        whereClause += ` AND is_active = false`;
      }

      // Validar ordenamiento
      const validSortFields = ['created_at', 'name', 'category', 'usage_count', 'updated_at'];
      const validSortOrders = ['asc', 'desc'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

      // Query para obtener templates
      const templatesQuery = `
        SELECT 
          t.id,
          t.name,
          t.category,
          t.content,
          t.variables,
          t.is_active,
          t.usage_count,
          t.created_at,
          t.updated_at,
          u.email as created_by_email
        FROM whatsapp_bot.message_templates t
        LEFT JOIN whatsapp_bot.users u ON t.created_by = u.id
        ${whereClause}
        ORDER BY t.${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Guardar parámetros sin LIMIT y OFFSET para la query de conteo
      const countParams = [...params];
      
      // Agregar LIMIT y OFFSET a los parámetros
      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.message_templates
        ${whereClause}
      `;

      // Ejecutar ambas queries
      const [templatesResult, countResult] = await Promise.all([
        database.query(templatesQuery, params),
        database.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          templates: templatesResult.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener templates',
        error: error.message
      });
    }
  }

  /**
   * Obtener template específico
   * GET /api/templates/:id
   */
  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          t.*,
          u.email as created_by_email
        FROM whatsapp_bot.message_templates t
        LEFT JOIN whatsapp_bot.users u ON t.created_by = u.id
        WHERE t.id = $1 AND t.company_id = $2
      `;

      const result = await database.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Template no encontrado'
        });
      }

      res.json({
        success: true,
        template: result.rows[0]
      });

    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener template',
        error: error.message
      });
    }
  }

  /**
   * Crear nuevo template
   * POST /api/templates
   */
  async createTemplate(req, res) {
    try {
      const { name, category = 'general', content, variables = [] } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.id;

      // Validaciones
      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y contenido son requeridos'
        });
      }

      // Verificar que no existe un template con el mismo nombre
      const existingCheck = await database.query(
        'SELECT id FROM whatsapp_bot.message_templates WHERE company_id = $1 AND name = $2',
        [companyId, name]
      );

      if (existingCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un template con ese nombre'
        });
      }

      // Extraer variables automáticamente del contenido
      const extractedVars = await this.extractVariablesFromContent(content);
      
      // Combinar variables proporcionadas con las extraídas
      const finalVariables = this.mergeVariables(variables, extractedVars);

      const query = `
        INSERT INTO whatsapp_bot.message_templates (
          company_id, name, category, content, variables, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await database.query(query, [
        companyId, 
        name, 
        category, 
        content, 
        JSON.stringify(finalVariables),
        userId
      ]);

      res.status(201).json({
        success: true,
        message: 'Template creado exitosamente',
        template: result.rows[0]
      });

    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear template',
        error: error.message
      });
    }
  }

  /**
   * Actualizar template existente
   * PUT /api/templates/:id
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, category, content, variables, is_active } = req.body;
      const companyId = req.user.companyId;

      // Verificar que el template existe y pertenece a la empresa
      const existingTemplate = await database.query(
        'SELECT * FROM whatsapp_bot.message_templates WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (existingTemplate.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Template no encontrado'
        });
      }

      // Verificar nombre único (excluyendo el template actual)
      if (name) {
        const nameCheck = await database.query(
          'SELECT id FROM whatsapp_bot.message_templates WHERE company_id = $1 AND name = $2 AND id != $3',
          [companyId, name, id]
        );

        if (nameCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro template con ese nombre'
          });
        }
      }

      // Construir campos a actualizar
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }

      if (category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
      }

      if (content !== undefined) {
        updates.push(`content = $${paramIndex}`);
        values.push(content);
        paramIndex++;

        // Extraer variables del nuevo contenido
        const extractedVars = await this.extractVariablesFromContent(content);
        const finalVariables = this.mergeVariables(variables || [], extractedVars);
        
        updates.push(`variables = $${paramIndex}`);
        values.push(JSON.stringify(finalVariables));
        paramIndex++;
      } else if (variables !== undefined) {
        updates.push(`variables = $${paramIndex}`);
        values.push(JSON.stringify(variables));
        paramIndex++;
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updates.push(`updated_at = NOW()`);

      const query = `
        UPDATE whatsapp_bot.message_templates 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(id, companyId);

      const result = await database.query(query, values);

      res.json({
        success: true,
        message: 'Template actualizado exitosamente',
        template: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar template',
        error: error.message
      });
    }
  }

  /**
   * Eliminar template
   * DELETE /api/templates/:id
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const result = await database.query(
        'DELETE FROM whatsapp_bot.message_templates WHERE id = $1 AND company_id = $2 RETURNING *',
        [id, companyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Template no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Template eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar template',
        error: error.message
      });
    }
  }

  /**
   * Previsualizar template con variables reemplazadas
   * POST /api/templates/:id/preview
   */
  async previewTemplate(req, res) {
    try {
      const { id } = req.params;
      const { variables: userVariables = {} } = req.body;
      const companyId = req.user.companyId;

      // Obtener template
      const templateResult = await database.query(
        'SELECT * FROM whatsapp_bot.message_templates WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Template no encontrado'
        });
      }

      const template = templateResult.rows[0];
      const previewContent = this.replaceVariables(template.content, userVariables);

      res.json({
        success: true,
        preview: {
          original: template.content,
          processed: previewContent,
          variables_used: userVariables,
          available_variables: template.variables
        }
      });

    } catch (error) {
      console.error('Error previewing template:', error);
      res.status(500).json({
        success: false,
        message: 'Error al previsualizar template',
        error: error.message
      });
    }
  }

  /**
   * Obtener categorías disponibles
   * GET /api/templates/categories
   */
  async getCategories(req, res) {
    try {
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          category,
          COUNT(*) as count
        FROM whatsapp_bot.message_templates 
        WHERE company_id = $1 AND is_active = true
        GROUP BY category
        ORDER BY count DESC, category ASC
      `;

      const result = await database.query(query, [companyId]);

      res.json({
        success: true,
        categories: result.rows
      });

    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }

  // === MÉTODOS HELPER ===

  /**
   * Extraer variables del contenido del template
   */
  async extractVariablesFromContent(content) {
    try {
      const result = await database.query(
        'SELECT whatsapp_bot.extract_template_variables($1) as variables',
        [content]
      );
      
      const extractedVars = result.rows[0].variables || [];
      return extractedVars.map(varName => ({
        name: varName,
        default: '',
        required: true
      }));
    } catch (error) {
      console.error('Error extracting variables:', error);
      return [];
    }
  }

  /**
   * Combinar variables del usuario con variables extraídas
   */
  mergeVariables(userVariables, extractedVariables) {
    const merged = [...extractedVariables];
    
    // Agregar variables del usuario que no están en las extraídas
    userVariables.forEach(userVar => {
      const exists = merged.find(v => v.name === userVar.name);
      if (!exists) {
        merged.push(userVar);
      } else if (userVar.default || userVar.description) {
        // Actualizar con datos del usuario
        Object.assign(exists, userVar);
      }
    });

    return merged;
  }

  /**
   * Reemplazar variables en el contenido
   */
  replaceVariables(content, variables) {
    let processed = content;
    
    Object.keys(variables).forEach(varName => {
      const regex = new RegExp(`\\{${varName}\\}`, 'g');
      processed = processed.replace(regex, variables[varName] || `{${varName}}`);
    });

    return processed;
  }

  /**
   * Incrementar contador de uso de template
   */
  async incrementUsage(templateId) {
    try {
      await database.query(
        'UPDATE whatsapp_bot.message_templates SET usage_count = usage_count + 1 WHERE id = $1',
        [templateId]
      );
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }
  }
}

module.exports = new TemplateController(); 