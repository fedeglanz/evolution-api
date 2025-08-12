import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instancesService } from '../services/instances';
import { toast } from 'react-hot-toast';

export const useInstances = (page = 1, limit = 10, status = null) => {
  return useQuery({
    queryKey: ['instances', page, limit, status],
    queryFn: () => instancesService.getInstances(page, limit, status),
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useInstance = (id) => {
  return useQuery({
    queryKey: ['instance', id],
    queryFn: () => instancesService.getInstance(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
};

export const useInstanceStatus = (id) => {
  return useQuery({
    queryKey: ['instance-status', id],
    queryFn: () => instancesService.getInstanceStatus(id),
    enabled: !!id,
    refetchInterval: 30 * 1000, // Actualizar cada 30 segundos
    staleTime: 15 * 1000, // 15 segundos
  });
};

export const useQRCode = (id) => {
  return useQuery({
    queryKey: ['instance-qr', id],
    queryFn: () => instancesService.getQRCode(id),
    enabled: !!id,
    refetchInterval: 10 * 1000, // Actualizar cada 10 segundos
    staleTime: 5 * 1000, // 5 segundos
    retry: 3,
  });
};

export const useCreateInstance = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.createInstance,
    onSuccess: (data, variables, context) => {
      // Callbacks base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success('¡Instancia creada exitosamente!');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al crear la instancia');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useUpdateInstance = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => instancesService.updateInstance(id, data),
    onSuccess: (data, variables, context) => {
      // Callbacks base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables.id] });
      toast.success('Instancia actualizada correctamente');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al actualizar la instancia');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useDeleteInstance = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.deleteInstance,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success('Instancia eliminada correctamente');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al eliminar la instancia');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useConnectInstance = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.connectInstance,
    onSuccess: (data, variables, context) => {
      // Callbacks base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      toast.success('Instancia conectada correctamente');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al conectar la instancia');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useDisconnectInstance = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.disconnectInstance,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      toast.success('Instancia desconectada correctamente');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al desconectar la instancia');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useSyncInstanceState = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.syncInstanceState,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      toast.success('Estado sincronizado correctamente');
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al sincronizar estado');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useSyncAllInstancesState = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.syncAllInstancesState,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success(`Sincronización completada: ${data.data.updatedInstances} instancias actualizadas`);
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al sincronizar instancias');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useRegenerateWorkflow = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.regenerateWorkflow,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      
      const instanceName = data.data.instance.name;
      const webhookUrl = data.data.instance.webhookUrl;
      
      toast.success(
        `Automatización regenerada exitosamente para "${instanceName}". Nueva URL: ${webhookUrl.substring(0, 50)}...`
      );
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al regenerar automatización');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useActivateWorkflow = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.activateWorkflow,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      
      const instanceName = data.data.instance.name;
      
      toast.success(
        `Automatización activada exitosamente para "${instanceName}"`
      );
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al activar automatización');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
};

export const useDeactivateWorkflow = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: instancesService.deactivateWorkflow,
    onSuccess: (data, variables, context) => {
      // Callback base del hook
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['instance', variables] });
      
      const instanceName = data.data.instance.name;
      
      toast.success(
        `Automatización desactivada exitosamente para "${instanceName}"`
      );
      
      // Callback personalizado si se proporciona
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Callback base del hook
      toast.error(error.message || 'Error al desactivar automatización');
      
      // Callback personalizado si se proporciona
      options.onError?.(error, variables, context);
    },
  });
}; 