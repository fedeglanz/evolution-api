const express = require('express');
const router = express.Router();
const messageAttachmentController = require('../controllers/messageAttachmentController');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Configurar multer
const upload = messageAttachmentController.setupMulter();

/**
 * @route GET /api/attachments/stats
 * @desc Obtener estadísticas de archivos multimedia
 * @access Private
 */
router.get('/stats', messageAttachmentController.getAttachmentsStats);

/**
 * @route POST /api/attachments/upload
 * @desc Subir archivo multimedia
 * @access Private
 * @form {file} file - Archivo a subir (image, audio, video, document)
 */
router.post('/upload', upload.single('file'), messageAttachmentController.uploadFile);

/**
 * @route GET /api/attachments
 * @desc Listar archivos multimedia con filtros y paginación
 * @access Private
 * @query {number} page - Página (default: 1)
 * @query {number} limit - Límite por página (default: 20)
 * @query {string} file_type - Filtro por tipo (image, audio, video, document)
 * @query {string} search - Búsqueda por nombre de archivo
 * @query {string} sort_by - Campo de ordenamiento
 * @query {string} sort_order - Orden (asc/desc)
 */
router.get('/', messageAttachmentController.getAttachments);

/**
 * @route GET /api/attachments/:id
 * @desc Obtener archivo específico
 * @access Private
 */
router.get('/:id', messageAttachmentController.getAttachment);

/**
 * @route GET /api/attachments/:id/download
 * @desc Descargar archivo
 * @access Private
 */
router.get('/:id/download', messageAttachmentController.downloadFile);

/**
 * @route POST /api/attachments/:id/send
 * @desc Enviar archivo por WhatsApp
 * @access Private
 * @body {string} instance_id - ID de la instancia
 * @body {string} contact_id - ID del contacto (opcional si se proporciona phone)
 * @body {string} phone - Número de teléfono (opcional si se proporciona contact_id)
 * @body {string} caption - Texto adicional (opcional, para imágenes y videos)
 */
router.post('/:id/send', messageAttachmentController.sendFile);

/**
 * @route DELETE /api/attachments/:id
 * @desc Eliminar archivo
 * @access Private
 */
router.delete('/:id', messageAttachmentController.deleteAttachment);

module.exports = router; 