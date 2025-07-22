import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { botsService } from '../services/bots';
import { toast } from 'react-hot-toast';

export const useBots = (instanceId = null, activeOnly = false) => {
  return useQuery({
    queryKey: ['bots', instanceId, activeOnly],
    queryFn: () => botsService.getBots(instanceId, activeOnly),
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useBot = (id) => {
  return useQuery({
    queryKey: ['bot', id],
    queryFn: () => botsService.getBot(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
};

export const useActiveBotForInstance = (instanceId) => {
  return useQuery({
    queryKey: ['active-bot', instanceId],
    queryFn: () => botsService.getActiveBotForInstance(instanceId),
    enabled: !!instanceId,
    staleTime: 30 * 1000, // 30 segundos
  });
};

export const useBotTemplates = () => {
  return useQuery({
    queryKey: ['bot-templates'],
    queryFn: botsService.getBotTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutos (templates no cambian frecuentemente)
    cacheTime: 30 * 60 * 1000, // 30 minutos
  });
};

export const useCreateBot = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: botsService.createBot,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['active-bot', variables.instance_id] });
      toast.success(`Bot "${data.data.bot.name}" creado exitosamente`);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Error al crear el bot');
      options.onError?.(error, variables, context);
    },
  });
};

export const useUpdateBot = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => botsService.updateBot(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['bot', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['active-bot'] });
      toast.success(`Bot "${data.data.bot.name}" actualizado exitosamente`);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Error al actualizar el bot');
      options.onError?.(error, variables, context);
    },
  });
};

export const useDeleteBot = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: botsService.deleteBot,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['active-bot'] });
      toast.success('Bot eliminado exitosamente');
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Error al eliminar el bot');
      options.onError?.(error, variables, context);
    },
  });
};

export const useToggleBot = (options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }) => botsService.toggleBot(id, isActive),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['bot', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['active-bot'] });
      toast.success(`Bot ${variables.isActive ? 'activado' : 'desactivado'} exitosamente`);
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || 'Error al cambiar estado del bot');
      options.onError?.(error, variables, context);
    },
  });
}; 