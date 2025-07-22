import api from './api';

// Servicio para gestión de Knowledge Base
export const knowledgeService = {
  
  // ========================================
  // KNOWLEDGE ITEMS MANAGEMENT
  // ========================================

  /**
   * Obtener todos los knowledge items de la empresa
   */
  async getKnowledgeItems(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.active_only) params.append('active_only', filters.active_only);
    if (filters.content_type) params.append('content_type', filters.content_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await api.get(`/knowledge?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener knowledge item específico
   */
  async getKnowledgeItem(id) {
    const response = await api.get(`/knowledge/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo knowledge item manualmente
   */
  async createKnowledgeItem(data) {
    const response = await api.post('/knowledge', data);
    return response.data;
  },

  /**
   * Actualizar knowledge item
   */
  async updateKnowledgeItem(id, data) {
    const response = await api.put(`/knowledge/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar knowledge item
   */
  async deleteKnowledgeItem(id) {
    const response = await api.delete(`/knowledge/${id}`);
    return response.data;
  },

  // ========================================
  // FILE UPLOAD AND PROCESSING
  // ========================================

  /**
   * Subir archivo y crear knowledge item
   */
  async uploadFile(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata.title) {
      formData.append('title', metadata.title);
    }
    
    if (metadata.tags && Array.isArray(metadata.tags)) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }

    const response = await api.post('/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 segundos para archivos grandes
    });
    
    return response.data;
  },

  // ========================================
  // BOT ASSIGNMENTS
  // ========================================

  /**
   * Obtener knowledge items asignados a un bot
   */
  async getBotKnowledge(botId) {
    const response = await api.get(`/knowledge/bots/${botId}`);
    return response.data;
  },

  /**
   * Obtener knowledge items disponibles para asignar a un bot
   */
  async getAvailableKnowledgeForBot(botId) {
    const response = await api.get(`/knowledge/bots/${botId}/available`);
    return response.data;
  },

  /**
   * Asignar knowledge item a bot
   */
  async assignKnowledgeToBot(botId, knowledgeItemId, priority = 3) {
    const response = await api.post(`/knowledge/bots/${botId}/assign`, {
      knowledge_item_id: knowledgeItemId,
      priority
    });
    return response.data;
  },

  /**
   * Quitar knowledge item de bot
   */
  async unassignKnowledgeFromBot(botId, knowledgeItemId) {
    const response = await api.delete(`/knowledge/bots/${botId}/assign/${knowledgeItemId}`);
    return response.data;
  },

  // ========================================
  // SEARCH AND ANALYTICS
  // ========================================

  /**
   * Buscar en knowledge base
   */
  async searchKnowledge(query, options = {}) {
    const response = await api.post('/knowledge/search', {
      query,
      content_types: options.content_types,
      limit: options.limit || 20
    });
    return response.data;
  },

  /**
   * Obtener estadísticas de knowledge base
   */
  async getKnowledgeStats() {
    const response = await api.get('/knowledge/stats');
    return response.data;
  },

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Obtener información de la API
   */
  async getApiInfo() {
    const response = await api.get('/knowledge/info');
    return response.data;
  },

  /**
   * Validar archivo antes de subir
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    const allowedExtensions = ['pdf', 'docx', 'doc', 'txt'];

    const errors = [];

    // Validar tamaño
    if (file.size > maxSize) {
      errors.push('El archivo es demasiado grande. Máximo 10MB permitido.');
    }

    // Validar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      errors.push('Tipo de archivo no permitido. Permitidos: PDF, DOCX, TXT.');
    }

    // Validar extensión como backup
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push('Extensión de archivo no válida. Permitidas: pdf, docx, doc, txt.');
    }

    // Validar que no esté vacío
    if (file.size === 0) {
      errors.push('El archivo está vacío.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Formatear tamaño de archivo para mostrar
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Obtener icono por tipo de archivo
   */
  getFileIcon(contentType) {
    const iconMap = {
      'pdf': '📄',
      'docx': '📝',
      'doc': '📝', 
      'txt': '📃',
      'manual': '✍️',
      'url': '🔗',
      'api': '🔌'
    };
    
    return iconMap[contentType] || '📋';
  },

  /**
   * Obtener color por prioridad
   */
  getPriorityColor(priority) {
    const colorMap = {
      1: 'red',      // Alta
      2: 'orange',   // Media-Alta
      3: 'yellow',   // Media
      4: 'blue',     // Media-Baja
      5: 'gray'      // Baja
    };
    
    return colorMap[priority] || 'gray';
  },

  /**
   * Obtener texto de prioridad
   */
  getPriorityText(priority) {
    const textMap = {
      1: 'Alta',
      2: 'Media-Alta',
      3: 'Media',
      4: 'Media-Baja',
      5: 'Baja'
    };
    
    return textMap[priority] || 'Media';
  }
};

export default knowledgeService; 