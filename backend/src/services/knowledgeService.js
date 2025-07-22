const { pool } = require('../database');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth'); // Para DOCX
const openaiService = require('./openaiService');

class KnowledgeService {
  constructor() {
    this.uploadPath = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads/knowledge');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedFileTypes = ['pdf', 'docx', 'txt'];
    
    console.log('✅ Knowledge Service inicializado');
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  /**
   * Obtener todos los knowledge items de una empresa
   */
  async getCompanyKnowledge(companyId, filters = {}) {
    try {
      const { active_only, content_type, search, limit = 50, offset = 0 } = filters;
      
      let query = `
        SELECT 
          ki.*,
          COUNT(bka.id) as assigned_bots_count,
          STRING_AGG(DISTINCT b.name, ', ') as assigned_bot_names
        FROM whatsapp_bot.knowledge_items ki
        LEFT JOIN whatsapp_bot.bot_knowledge_assignments bka ON ki.id = bka.knowledge_item_id AND bka.is_active = true
        LEFT JOIN whatsapp_bot.bots b ON bka.bot_id = b.id
        WHERE ki.company_id = $1
      `;
      
      const queryParams = [companyId];
      let paramIndex = 2;

      // Filtros adicionales
      if (active_only === 'true') {
        query += ` AND ki.is_active = true`;
      }

      if (content_type) {
        query += ` AND ki.content_type = $${paramIndex}`;
        queryParams.push(content_type);
        paramIndex++;
      }

      if (search) {
        query += ` AND (
          ki.title ILIKE $${paramIndex} OR 
          ki.content ILIKE $${paramIndex} OR 
          ki.content_summary ILIKE $${paramIndex} OR
          $${paramIndex} = ANY(ki.tags)
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      query += `
        GROUP BY ki.id
        ORDER BY ki.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Contar total para paginación
      let countQuery = `SELECT COUNT(*) as total FROM whatsapp_bot.knowledge_items ki WHERE ki.company_id = $1`;
      const countParams = [companyId];
      let countParamIndex = 2;

      if (active_only === 'true') {
        countQuery += ` AND ki.is_active = true`;
      }
      if (content_type) {
        countQuery += ` AND ki.content_type = $${countParamIndex}`;
        countParams.push(content_type);
        countParamIndex++;
      }
      if (search) {
        countQuery += ` AND (ki.title ILIKE $${countParamIndex} OR ki.content ILIKE $${countParamIndex} OR ki.content_summary ILIKE $${countParamIndex} OR $${countParamIndex} = ANY(ki.tags))`;
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);

      return {
        items: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('[Knowledge] Error getting company knowledge:', error);
      throw new Error('Error obteniendo base de conocimientos');
    }
  }

  /**
   * Obtener knowledge item específico
   */
  async getKnowledgeItem(itemId, companyId) {
    try {
      const result = await pool.query(`
        SELECT 
          ki.*,
          COUNT(bka.id) as assigned_bots_count,
          ARRAY_AGG(
            CASE WHEN b.id IS NOT NULL THEN 
              JSON_BUILD_OBJECT(
                'id', b.id,
                'name', b.name,
                'priority', bka.priority,
                'assigned_at', bka.created_at
              )
            END
          ) FILTER (WHERE b.id IS NOT NULL) as assigned_bots
        FROM whatsapp_bot.knowledge_items ki
        LEFT JOIN whatsapp_bot.bot_knowledge_assignments bka ON ki.id = bka.knowledge_item_id AND bka.is_active = true
        LEFT JOIN whatsapp_bot.bots b ON bka.bot_id = b.id
        WHERE ki.id = $1 AND ki.company_id = $2
        GROUP BY ki.id
      `, [itemId, companyId]);

      if (result.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      return result.rows[0];

    } catch (error) {
      console.error('[Knowledge] Error getting knowledge item:', error);
      throw new Error('Error obteniendo knowledge item');
    }
  }

  /**
   * Crear nuevo knowledge item
   */
  async createKnowledgeItem(companyId, data) {
    try {
      const {
        title,
        content,
        content_type = 'manual',
        tags = [],
        file_url,
        file_name,
        file_size
      } = data;

      // Validaciones básicas
      if (!title || title.trim().length < 3) {
        throw new Error('El título debe tener al menos 3 caracteres');
      }

      if (!content || content.trim().length < 10) {
        throw new Error('El contenido debe tener al menos 10 caracteres');
      }

      // Generar resumen automático del contenido
      const contentSummary = await this.generateSummary(content);

      const query = `
        INSERT INTO whatsapp_bot.knowledge_items (
          company_id, title, content, content_summary, content_type,
          tags, file_url, file_name, file_size, processing_status,
          embeddings_generated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await pool.query(query, [
        companyId,
        title.trim(),
        content.trim(),
        contentSummary,
        content_type,
        Array.isArray(tags) ? tags : [],
        file_url || null,
        file_name || null,
        file_size || null,
        'completed', // Manual content is immediately ready
        false // Embeddings will be generated separately
      ]);

      const knowledgeItem = result.rows[0];

      console.log(`[Knowledge] Created item: ${knowledgeItem.title} for company ${companyId}`);

      return knowledgeItem;

    } catch (error) {
      console.error('[Knowledge] Error creating knowledge item:', error);
      throw new Error(`Error creando knowledge item: ${error.message}`);
    }
  }

  /**
   * Actualizar knowledge item
   */
  async updateKnowledgeItem(itemId, companyId, data) {
    try {
      const existingItem = await this.getKnowledgeItem(itemId, companyId);

      const {
        title,
        content,
        tags,
        is_active
      } = data;

      const setClause = [];
      const values = [itemId, companyId];
      let paramIndex = 3;

      if (title !== undefined) {
        if (!title || title.trim().length < 3) {
          throw new Error('El título debe tener al menos 3 caracteres');
        }
        setClause.push(`title = $${paramIndex++}`);
        values.push(title.trim());
      }

      if (content !== undefined) {
        if (!content || content.trim().length < 10) {
          throw new Error('El contenido debe tener al menos 10 caracteres');
        }
        setClause.push(`content = $${paramIndex++}`);
        values.push(content.trim());

        // Regenerar resumen si el contenido cambió
        const newSummary = await this.generateSummary(content);
        setClause.push(`content_summary = $${paramIndex++}`);
        values.push(newSummary);

        // Marcar embeddings como desactualizados
        setClause.push(`embeddings_generated = false`);
      }

      if (tags !== undefined) {
        setClause.push(`tags = $${paramIndex++}`);
        values.push(Array.isArray(tags) ? tags : []);
      }

      if (is_active !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`);
        values.push(Boolean(is_active));
      }

      if (setClause.length === 0) {
        return existingItem;
      }

      setClause.push('updated_at = NOW()');

      const query = `
        UPDATE whatsapp_bot.knowledge_items
        SET ${setClause.join(', ')}
        WHERE id = $1 AND company_id = $2
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      console.log(`[Knowledge] Updated item: ${result.rows[0].title}`);

      return result.rows[0];

    } catch (error) {
      console.error('[Knowledge] Error updating knowledge item:', error);
      throw new Error(`Error actualizando knowledge item: ${error.message}`);
    }
  }

  /**
   * Eliminar knowledge item
   */
  async deleteKnowledgeItem(itemId, companyId) {
    try {
      // Verificar que existe y pertenece a la empresa
      const existingItem = await this.getKnowledgeItem(itemId, companyId);

      // Eliminar archivo físico si existe
      if (existingItem.file_url) {
        await this.deleteFile(existingItem.file_url);
      }

      // Eliminar de BD (CASCADE eliminará asignaciones y embeddings)
      const result = await pool.query(`
        DELETE FROM whatsapp_bot.knowledge_items
        WHERE id = $1 AND company_id = $2
        RETURNING title
      `, [itemId, companyId]);

      if (result.rows.length === 0) {
        throw new Error('Knowledge item no encontrado');
      }

      console.log(`[Knowledge] Deleted item: ${result.rows[0].title}`);

      return {
        success: true,
        message: 'Knowledge item eliminado exitosamente'
      };

    } catch (error) {
      console.error('[Knowledge] Error deleting knowledge item:', error);
      throw new Error(`Error eliminando knowledge item: ${error.message}`);
    }
  }

  // ========================================
  // FILE PROCESSING
  // ========================================

  /**
   * Configurar multer para upload de archivos
   */
  getUploadMiddleware() {
    // Asegurar que el directorio existe
    this.ensureUploadDirectory();

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
        cb(null, uniqueName);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
        if (this.allowedFileTypes.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de archivo no permitido. Permitidos: ${this.allowedFileTypes.join(', ')}`));
        }
      }
    });
  }

  /**
   * Procesar archivo subido y crear knowledge item
   */
  async processUploadedFile(file, companyId, metadata = {}) {
    try {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let extractedText = '';
      let title = metadata.title || path.basename(file.originalname, fileExtension);

      // Actualizar estado a processing
      const tempItem = await pool.query(`
        INSERT INTO whatsapp_bot.knowledge_items (
          company_id, title, content, content_type, file_url, file_name, file_size,
          processing_status, embeddings_generated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        companyId,
        title,
        'Procesando archivo...', // Temporal
        fileExtension.substring(1), // Sin el punto
        file.filename,
        file.originalname,
        file.size,
        'processing',
        false
      ]);

      const itemId = tempItem.rows[0].id;

      try {
        // Extraer texto según tipo de archivo
        switch (fileExtension) {
          case '.pdf':
            extractedText = await this.extractTextFromPDF(file.path);
            break;
          case '.docx':
            extractedText = await this.extractTextFromDOCX(file.path);
            break;
          case '.txt':
            extractedText = await fs.readFile(file.path, 'utf8');
            break;
          default:
            throw new Error(`Tipo de archivo no soportado: ${fileExtension}`);
        }

        if (!extractedText || extractedText.trim().length < 10) {
          throw new Error('No se pudo extraer texto válido del archivo');
        }

        // Generar resumen
        const summary = await this.generateSummary(extractedText);

        // Actualizar item con texto extraído
        await pool.query(`
          UPDATE whatsapp_bot.knowledge_items
          SET content = $1, content_summary = $2, processing_status = $3, updated_at = NOW()
          WHERE id = $4
        `, [extractedText.trim(), summary, 'completed', itemId]);

        console.log(`[Knowledge] Processed file: ${file.originalname} → ${extractedText.length} chars`);

        return await this.getKnowledgeItem(itemId, companyId);

      } catch (processingError) {
        // Actualizar estado de error
        await pool.query(`
          UPDATE whatsapp_bot.knowledge_items
          SET processing_status = $1, processing_error = $2, updated_at = NOW()
          WHERE id = $3
        `, ['error', processingError.message, itemId]);

        throw processingError;
      }

    } catch (error) {
      console.error('[Knowledge] Error processing uploaded file:', error);
      // Limpiar archivo si hubo error
      if (file && file.path) {
        await this.deleteFile(file.path);
      }
      throw new Error(`Error procesando archivo: ${error.message}`);
    }
  }

  /**
   * Extraer texto de PDF
   */
  async extractTextFromPDF(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      console.error('[Knowledge] Error extracting PDF text:', error);
      throw new Error('Error extrayendo texto del PDF');
    }
  }

  /**
   * Extraer texto de DOCX
   */
  async extractTextFromDOCX(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch (error) {
      console.error('[Knowledge] Error extracting DOCX text:', error);
      throw new Error('Error extrayendo texto del DOCX');
    }
  }

  // ========================================
  // BOT ASSIGNMENTS
  // ========================================

  /**
   * Obtener knowledge items asignados a un bot
   */
  async getBotKnowledge(botId) {
    try {
      const result = await pool.query(`
        SELECT 
          ki.*,
          bka.priority,
          bka.is_active as is_assigned,
          bka.created_at as assigned_at
        FROM whatsapp_bot.knowledge_items ki
        JOIN whatsapp_bot.bot_knowledge_assignments bka ON ki.id = bka.knowledge_item_id
        WHERE bka.bot_id = $1 AND bka.is_active = true AND ki.is_active = true
        ORDER BY bka.priority ASC, ki.title ASC
      `, [botId]);

      return result.rows;

    } catch (error) {
      console.error('[Knowledge] Error getting bot knowledge:', error);
      throw new Error('Error obteniendo knowledge del bot');
    }
  }

  /**
   * Asignar knowledge item a bot
   */
  async assignKnowledgeToBot(botId, knowledgeItemId, priority = 3) {
    try {
      // Verificar que el bot existe y obtener company_id
      const botResult = await pool.query(`
        SELECT b.id, wi.company_id 
        FROM whatsapp_bot.bots b
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        WHERE b.id = $1
      `, [botId]);

      if (botResult.rows.length === 0) {
        throw new Error('Bot no encontrado');
      }

      const companyId = botResult.rows[0].company_id;

      // Verificar que el knowledge item existe y pertenece a la misma empresa
      const knowledgeResult = await pool.query(`
        SELECT id FROM whatsapp_bot.knowledge_items
        WHERE id = $1 AND company_id = $2 AND is_active = true
      `, [knowledgeItemId, companyId]);

      if (knowledgeResult.rows.length === 0) {
        throw new Error('Knowledge item no encontrado o no accesible');
      }

      // Crear o actualizar asignación
      const result = await pool.query(`
        INSERT INTO whatsapp_bot.bot_knowledge_assignments (
          bot_id, knowledge_item_id, priority, assigned_by
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (bot_id, knowledge_item_id)
        DO UPDATE SET 
          priority = EXCLUDED.priority,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [botId, knowledgeItemId, priority, companyId]);

      console.log(`[Knowledge] Assigned knowledge ${knowledgeItemId} to bot ${botId}`);

      return result.rows[0];

    } catch (error) {
      console.error('[Knowledge] Error assigning knowledge to bot:', error);
      throw new Error(`Error asignando knowledge a bot: ${error.message}`);
    }
  }

  /**
   * Quitar knowledge item de bot
   */
  async unassignKnowledgeFromBot(botId, knowledgeItemId) {
    try {
      const result = await pool.query(`
        UPDATE whatsapp_bot.bot_knowledge_assignments
        SET is_active = false, updated_at = NOW()
        WHERE bot_id = $1 AND knowledge_item_id = $2
        RETURNING *
      `, [botId, knowledgeItemId]);

      if (result.rows.length === 0) {
        throw new Error('Asignación no encontrada');
      }

      console.log(`[Knowledge] Unassigned knowledge ${knowledgeItemId} from bot ${botId}`);

      return result.rows[0];

    } catch (error) {
      console.error('[Knowledge] Error unassigning knowledge from bot:', error);
      throw new Error('Error quitando knowledge del bot');
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Generar resumen automático del contenido
   */
  async generateSummary(content, maxLength = 200) {
    try {
      // Si el contenido es corto, usar las primeras líneas
      if (content.length <= maxLength * 2) {
        return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
      }

      // TODO: Integrar con OpenAI para generar resúmenes inteligentes
      // Por ahora, usar extracción simple
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const summary = sentences.slice(0, 3).join('. ').substring(0, maxLength);
      
      return summary + (summary.length < content.length ? '...' : '');

    } catch (error) {
      console.error('[Knowledge] Error generating summary:', error);
      return content.substring(0, maxLength) + '...';
    }
  }

  /**
   * Asegurar que el directorio de uploads existe
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('[Knowledge] Error creating upload directory:', error);
    }
  }

  /**
   * Eliminar archivo físico
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
      await fs.unlink(fullPath);
      console.log(`[Knowledge] Deleted file: ${fullPath}`);
    } catch (error) {
      console.error('[Knowledge] Error deleting file:', error);
      // No throw, ya que el archivo podría no existir
    }
  }

  /**
   * Obtener estadísticas de knowledge base por empresa
   */
  async getCompanyKnowledgeStats(companyId) {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_items,
          COUNT(CASE WHEN content_type = 'manual' THEN 1 END) as manual_items,
          COUNT(CASE WHEN content_type != 'manual' THEN 1 END) as file_items,
          COUNT(CASE WHEN embeddings_generated = true THEN 1 END) as items_with_embeddings,
          COUNT(CASE WHEN processing_status = 'processing' THEN 1 END) as processing_items,
          COUNT(CASE WHEN processing_status = 'error' THEN 1 END) as error_items,
          AVG(LENGTH(content)) as avg_content_length
        FROM whatsapp_bot.knowledge_items 
        WHERE company_id = $1
      `, [companyId]);

      const assignmentStats = await pool.query(`
        SELECT COUNT(*) as total_assignments
        FROM whatsapp_bot.bot_knowledge_assignments bka
        JOIN whatsapp_bot.bots b ON bka.bot_id = b.id
        JOIN whatsapp_bot.whatsapp_instances wi ON b.instance_id = wi.id
        WHERE wi.company_id = $1 AND bka.is_active = true
      `, [companyId]);

      return {
        ...stats.rows[0],
        total_assignments: assignmentStats.rows[0].total_assignments
      };

    } catch (error) {
      console.error('[Knowledge] Error getting company stats:', error);
      throw new Error('Error obteniendo estadísticas');
    }
  }
}

module.exports = new KnowledgeService(); 