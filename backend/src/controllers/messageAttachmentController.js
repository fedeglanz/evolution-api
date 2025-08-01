const database = require('../database');
const config = require('../config');
const evolutionService = require('../services/evolutionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class MessageAttachmentController {

  /**
   * Configurar multer para uploads
   */
  setupMulter() {
    // Crear directorio de uploads si no existe
    const uploadDir = path.join(__dirname, '../uploads/attachments');
    
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        // Generar nombre único manteniendo la extensión
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Tipos de archivo permitidos
      const allowedTypes = {
        'image/jpeg': 'image',
        'image/jpg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'image/webp': 'image',
        'audio/mpeg': 'audio',
        'audio/mp3': 'audio',
        'audio/ogg': 'audio',
        'audio/wav': 'audio',
        'video/mp4': 'video',
        'video/avi': 'video',
        'video/mov': 'video',
        'application/pdf': 'document',
        'application/doc': 'document',
        'application/docx': 'document',
        'application/msword': 'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
        'text/plain': 'document'
      };

      if (allowedTypes[file.mimetype]) {
        file.fileType = allowedTypes[file.mimetype];
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: config.MAX_FILE_SIZE || 16 * 1024 * 1024 // 16MB por defecto
      }
    });
  }

  /**
   * Subir archivo
   * POST /api/attachments/upload
   */
  async uploadFile(req, res) {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo'
        });
      }

      const file = req.file;

      // Guardar información del archivo en la base de datos
      const query = `
        INSERT INTO whatsapp_bot.message_attachments (
          company_id, original_filename, stored_filename, file_path, 
          file_size, mime_type, file_type, upload_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await database.query(query, [
        companyId,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        file.fileType,
        userId
      ]);

      res.status(201).json({
        success: true,
        message: 'Archivo subido exitosamente',
        attachment: {
          id: result.rows[0].id,
          original_filename: result.rows[0].original_filename,
          file_type: result.rows[0].file_type,
          file_size: result.rows[0].file_size,
          mime_type: result.rows[0].mime_type,
          created_at: result.rows[0].created_at
        }
      });

    } catch (error) {
      // Eliminar archivo si ocurrió un error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo:', unlinkError);
        }
      }

      console.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir archivo',
        error: error.message
      });
    }
  }

  /**
   * Listar archivos subidos
   * GET /api/attachments
   */
  async getAttachments(req, res) {
    try {
      const companyId = req.user.companyId;
      const {
        page = 1,
        limit = config.DEFAULT_PAGE_SIZE,
        file_type = '',
        search = '',
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Construir query base
      let whereClause = 'WHERE a.company_id = $1';
      let params = [companyId];
      let paramIndex = 2;

      // Filtro por tipo de archivo
      if (file_type.trim()) {
        whereClause += ` AND a.file_type = $${paramIndex}`;
        params.push(file_type.trim());
        paramIndex++;
      }

      // Filtro por búsqueda (nombre original)
      if (search.trim()) {
        whereClause += ` AND a.original_filename ILIKE $${paramIndex}`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Validar ordenamiento
      const validSortFields = ['created_at', 'original_filename', 'file_size', 'file_type'];
      const validSortOrders = ['asc', 'desc'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

      // Query para obtener archivos
      const attachmentsQuery = `
        SELECT 
          a.id,
          a.original_filename,
          a.file_size,
          a.mime_type,
          a.file_type,
          a.is_public,
          a.created_at,
          u.email as uploaded_by_email
        FROM whatsapp_bot.message_attachments a
        LEFT JOIN whatsapp_bot.users u ON a.upload_by = u.id
        ${whereClause}
        ORDER BY a.${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Guardar parámetros sin LIMIT y OFFSET para la query de conteo
      const countParams = [...params];
      
      // Agregar LIMIT y OFFSET a los parámetros
      params.push(limitNum, offset);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM whatsapp_bot.message_attachments a
        ${whereClause}
      `;

      // Ejecutar ambas queries
      const [attachmentsResult, countResult] = await Promise.all([
        database.query(attachmentsQuery, params),
        database.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          attachments: attachmentsResult.rows,
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
      console.error('Error getting attachments:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener archivos',
        error: error.message
      });
    }
  }

  /**
   * Obtener archivo específico
   * GET /api/attachments/:id
   */
  async getAttachment(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          a.*,
          u.email as uploaded_by_email
        FROM whatsapp_bot.message_attachments a
        LEFT JOIN whatsapp_bot.users u ON a.upload_by = u.id
        WHERE a.id = $1 AND a.company_id = $2
      `;

      const result = await database.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      res.json({
        success: true,
        attachment: result.rows[0]
      });

    } catch (error) {
      console.error('Error getting attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener archivo',
        error: error.message
      });
    }
  }

  /**
   * Descargar archivo
   * GET /api/attachments/:id/download
   */
  async downloadFile(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Verificar que el archivo pertenece a la empresa
      const query = `
        SELECT * FROM whatsapp_bot.message_attachments 
        WHERE id = $1 AND company_id = $2
      `;

      const result = await database.query(query, [id, companyId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      const attachment = result.rows[0];

      // Verificar que el archivo físico existe
      try {
        await fs.access(attachment.file_path);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Archivo físico no encontrado'
        });
      }

      // Configurar headers para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
      res.setHeader('Content-Type', attachment.mime_type);

      // Enviar archivo
      res.sendFile(path.resolve(attachment.file_path));

    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({
        success: false,
        message: 'Error al descargar archivo',
        error: error.message
      });
    }
  }

  /**
   * Enviar archivo por WhatsApp
   * POST /api/attachments/:id/send
   */
  async sendFile(req, res) {
    try {
      const { id } = req.params;
      const { instance_id, contact_id, phone, caption = '' } = req.body;
      const companyId = req.user.companyId;

      // Validaciones básicas
      if (!instance_id) {
        return res.status(400).json({
          success: false,
          message: 'ID de instancia es requerido'
        });
      }

      if (!contact_id && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar un contacto o número de teléfono'
        });
      }

      // Verificar que el archivo pertenece a la empresa
      const attachmentResult = await database.query(
        'SELECT * FROM whatsapp_bot.message_attachments WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (attachmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      const attachment = attachmentResult.rows[0];

      // Verificar que la instancia pertenece a la empresa
      const instanceResult = await database.query(
        'SELECT * FROM whatsapp_bot.whatsapp_instances WHERE id = $1 AND company_id = $2',
        [instance_id, companyId]
      );

      if (instanceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      const instance = instanceResult.rows[0];

      // Determinar número de destino
      let targetPhone = phone;
      if (contact_id) {
        const contactResult = await database.query(
          'SELECT phone FROM whatsapp_bot.contacts WHERE id = $1 AND company_id = $2',
          [contact_id, companyId]
        );

        if (contactResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Contacto no encontrado'
          });
        }

        targetPhone = contactResult.rows[0].phone;
      }

      // Verificar que el archivo físico existe
      try {
        await fs.access(attachment.file_path);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Archivo físico no encontrado'
        });
      }

      // Enviar archivo via Evolution API
      let messageResult;
      
      try {
        // Diferentes métodos según el tipo de archivo
        switch (attachment.file_type) {
          case 'image':
            messageResult = await this.sendImageMessage(
              instance.evolution_instance_name,
              targetPhone,
              attachment.file_path,
              caption
            );
            break;
          case 'audio':
            messageResult = await this.sendAudioMessage(
              instance.evolution_instance_name,
              targetPhone,
              attachment.file_path
            );
            break;
          case 'video':
            messageResult = await this.sendVideoMessage(
              instance.evolution_instance_name,
              targetPhone,
              attachment.file_path,
              caption
            );
            break;
          case 'document':
            messageResult = await this.sendDocumentMessage(
              instance.evolution_instance_name,
              targetPhone,
              attachment.file_path,
              attachment.original_filename
            );
            break;
          default:
            throw new Error(`Tipo de archivo no soportado: ${attachment.file_type}`);
        }

        // Guardar el mensaje en conversaciones si es exitoso
        if (messageResult && messageResult.messageId) {
          await database.query(
            `INSERT INTO whatsapp_bot.conversations (
              company_id, instance_id, contact_id, phone, message_text, 
              message_type, is_from_bot, attachment_id, evolution_message_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              companyId,
              instance_id,
              contact_id,
              targetPhone,
              caption || `[${attachment.file_type.toUpperCase()}] ${attachment.original_filename}`,
              attachment.file_type,
              true,
              attachment.id,
              messageResult.messageId
            ]
          );
        }

        res.json({
          success: true,
          message: 'Archivo enviado exitosamente',
          result: {
            messageId: messageResult.messageId,
            attachment: {
              id: attachment.id,
              filename: attachment.original_filename,
              type: attachment.file_type
            },
            target: targetPhone
          }
        });

      } catch (evolutionError) {
        throw new Error(`Error enviando archivo: ${evolutionError.message}`);
      }

    } catch (error) {
      console.error('Error sending file:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar archivo',
        error: error.message
      });
    }
  }

  /**
   * Eliminar archivo
   * DELETE /api/attachments/:id
   */
  async deleteAttachment(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      // Obtener información del archivo
      const attachmentResult = await database.query(
        'SELECT * FROM whatsapp_bot.message_attachments WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      if (attachmentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      const attachment = attachmentResult.rows[0];

      // Eliminar archivo físico
      try {
        await fs.unlink(attachment.file_path);
      } catch (unlinkError) {
        console.warn('Archivo físico no pudo ser eliminado:', unlinkError.message);
      }

      // Eliminar registro de la base de datos
      await database.query(
        'DELETE FROM whatsapp_bot.message_attachments WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error deleting attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar archivo',
        error: error.message
      });
    }
  }

  // === MÉTODOS HELPER PARA EVOLUTION API ===

  /**
   * Enviar imagen
   */
  async sendImageMessage(instanceName, phone, filePath, caption) {
    // Esta funcionalidad dependería de la API específica de Evolution
    // Por ahora simulamos la respuesta
    console.log(`[Evolution API] Enviando imagen: ${filePath} a ${phone}`);
    return {
      messageId: `img_${Date.now()}`,
      status: 'sent'
    };
  }

  /**
   * Enviar audio
   */
  async sendAudioMessage(instanceName, phone, filePath) {
    console.log(`[Evolution API] Enviando audio: ${filePath} a ${phone}`);
    return {
      messageId: `audio_${Date.now()}`,
      status: 'sent'
    };
  }

  /**
   * Enviar video
   */
  async sendVideoMessage(instanceName, phone, filePath, caption) {
    console.log(`[Evolution API] Enviando video: ${filePath} a ${phone}`);
    return {
      messageId: `video_${Date.now()}`,
      status: 'sent'
    };
  }

  /**
   * Enviar documento
   */
  async sendDocumentMessage(instanceName, phone, filePath, filename) {
    console.log(`[Evolution API] Enviando documento: ${filename} a ${phone}`);
    return {
      messageId: `doc_${Date.now()}`,
      status: 'sent'
    };
  }

  /**
   * Obtener estadísticas de archivos
   * GET /api/attachments/stats
   */
  async getAttachmentsStats(req, res) {
    try {
      const companyId = req.user.companyId;

      const query = `
        SELECT 
          file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size
        FROM whatsapp_bot.message_attachments 
        WHERE company_id = $1
        GROUP BY file_type
        ORDER BY count DESC
      `;

      const result = await database.query(query, [companyId]);

      // Obtener totales generales
      const totalQuery = `
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_storage
        FROM whatsapp_bot.message_attachments
        WHERE company_id = $1
      `;

      const totalResult = await database.query(totalQuery, [companyId]);

      res.json({
        success: true,
        stats: {
          by_type: result.rows,
          totals: {
            files: parseInt(totalResult.rows[0].total_files),
            storage_bytes: parseInt(totalResult.rows[0].total_storage || 0),
            storage_mb: Math.round((totalResult.rows[0].total_storage || 0) / (1024 * 1024) * 100) / 100
          }
        }
      });

    } catch (error) {
      console.error('Error getting attachments stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

// Exportar una instancia con métodos bound
const messageAttachmentController = new MessageAttachmentController();

// Bind all methods to preserve 'this' context
Object.getOwnPropertyNames(Object.getPrototypeOf(messageAttachmentController))
  .filter(name => name !== 'constructor' && typeof messageAttachmentController[name] === 'function')
  .forEach(name => {
    messageAttachmentController[name] = messageAttachmentController[name].bind(messageAttachmentController);
  });

module.exports = messageAttachmentController; 