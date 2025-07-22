import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '../services/knowledge';
import { toast } from 'react-hot-toast';

// ========================================
// QUERY HOOKS (Lectura)
// ========================================

/**
 * Hook para obtener todos los knowledge items
 */
export const useKnowledgeItems = (filters = {}) => {
  return useQuery({
    queryKey: ['knowledge-items', filters],
    queryFn: () => knowledgeService.getKnowledgeItems(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obtener knowledge item específico
 */
export const useKnowledgeItem = (id) => {
  return useQuery({
    queryKey: ['knowledge-item', id],
    queryFn: () => knowledgeService.getKnowledgeItem(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para obtener knowledge items de un bot
 */
export const useBotKnowledge = (botId) => {
  return useQuery({
    queryKey: ['bot-knowledge', botId],
    queryFn: () => knowledgeService.getBotKnowledge(botId),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener knowledge disponible para asignar a un bot
 */
export const useAvailableKnowledge = (botId) => {
  return useQuery({
    queryKey: ['available-knowledge', botId],
    queryFn: () => knowledgeService.getAvailableKnowledgeForBot(botId),
    enabled: !!botId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener estadísticas de knowledge base
 */
export const useKnowledgeStats = () => {
  return useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: knowledgeService.getKnowledgeStats,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para buscar en knowledge base
 */
export const useKnowledgeSearch = (query, options = {}) => {
  return useQuery({
    queryKey: ['knowledge-search', query, options],
    queryFn: () => knowledgeService.searchKnowledge(query, options),
    enabled: !!(query && query.length >= 2),
    staleTime: 2 * 60 * 1000, // 2 minutos para búsquedas
  });
};

// ========================================
// MUTATION HOOKS (Escritura)
// ========================================

/**
 * Hook para crear knowledge item
 */
export const useCreateKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: knowledgeService.createKnowledgeItem,
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
      
      toast.success('Knowledge item creado exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error creando knowledge item';
      toast.error(message);
      throw error;
    },
  });
};

/**
 * Hook para actualizar knowledge item
 */
export const useUpdateKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => knowledgeService.updateKnowledgeItem(id, data),
    onSuccess: (data, variables) => {
      // Actualizar cache específico
      queryClient.invalidateQueries({ queryKey: ['knowledge-item', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
      
      toast.success('Knowledge item actualizado exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error actualizando knowledge item';
      toast.error(message);
      throw error;
    },
  });
};

/**
 * Hook para eliminar knowledge item
 */
export const useDeleteKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: knowledgeService.deleteKnowledgeItem,
    onSuccess: (data, id) => {
      // Remover del cache y invalidar listas
      queryClient.removeQueries({ queryKey: ['knowledge-item', id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
      queryClient.invalidateQueries({ queryKey: ['bot-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['available-knowledge'] });
      
      toast.success('Knowledge item eliminado exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error eliminando knowledge item';
      toast.error(message);
      throw error;
    },
  });
};

/**
 * Hook para subir archivo
 */
export const useUploadFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, metadata }) => knowledgeService.uploadFile(file, metadata),
    onSuccess: (data) => {
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-stats'] });
      
      toast.success('Archivo procesado exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error procesando archivo';
      toast.error(message);
      throw error;
    },
  });
};

/**
 * Hook para asignar knowledge a bot
 */
export const useAssignKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ botId, knowledgeItemId, priority }) => 
      knowledgeService.assignKnowledgeToBot(botId, knowledgeItemId, priority),
    onSuccess: (data, variables) => {
      // Actualizar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['bot-knowledge', variables.botId] });
      queryClient.invalidateQueries({ queryKey: ['available-knowledge', variables.botId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-item', variables.knowledgeItemId] });
      
      toast.success('Knowledge asignado al bot exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error asignando knowledge al bot';
      toast.error(message);
      throw error;
    },
  });
};

/**
 * Hook para quitar knowledge de bot
 */
export const useUnassignKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ botId, knowledgeItemId }) => 
      knowledgeService.unassignKnowledgeFromBot(botId, knowledgeItemId),
    onSuccess: (data, variables) => {
      // Actualizar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['bot-knowledge', variables.botId] });
      queryClient.invalidateQueries({ queryKey: ['available-knowledge', variables.botId] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-item', variables.knowledgeItemId] });
      
      toast.success('Knowledge removido del bot exitosamente');
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error removiendo knowledge del bot';
      toast.error(message);
      throw error;
    },
  });
};

// ========================================
// HOOKS COMPUESTOS Y UTILIDADES
// ========================================

/**
 * Hook para gestionar knowledge con paginación
 */
export const useKnowledgePagination = (initialFilters = {}, pageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState(initialFilters);

  const queryFilters = {
    ...filters,
    limit: pageSize,
    offset: currentPage * pageSize
  };

  const query = useKnowledgeItems(queryFilters);

  const totalPages = Math.ceil((query.data?.data?.total || 0) / pageSize);

  return {
    ...query,
    currentPage,
    totalPages,
    pageSize,
    filters,
    setCurrentPage,
    setFilters,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    goToNext: () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1)),
    goToPrevious: () => setCurrentPage(prev => Math.max(prev - 1, 0)),
    goToFirst: () => setCurrentPage(0),
    goToLast: () => setCurrentPage(totalPages - 1),
  };
};

/**
 * Hook para gestionar upload con progreso
 */
export const useFileUploadWithProgress = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = useUploadFile();

  const uploadWithProgress = async (file, metadata) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso (en producción real se podría usar axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 100);

      const result = await uploadMutation.mutateAsync({ file, metadata });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Resetear después de un momento
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

      return result;

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };

  return {
    uploadWithProgress,
    uploadProgress,
    isUploading,
    ...uploadMutation
  };
};

/**
 * Hook para operaciones bulk (múltiples knowledge items)
 */
export const useKnowledgeBulkOperations = () => {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteKnowledgeItem();

  const deleteBulk = async (ids) => {
    const results = await Promise.allSettled(
      ids.map(id => deleteMutation.mutateAsync(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful > 0) {
      toast.success(`${successful} knowledge items eliminados`);
    }
    
    if (failed > 0) {
      toast.error(`Error eliminando ${failed} knowledge items`);
    }

    return { successful, failed, results };
  };

  return {
    deleteBulk,
    isLoading: deleteMutation.isPending
  };
}; 