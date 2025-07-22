import React, { useState } from 'react';
import { 
  Plus, 
  Bot, 
  Power, 
  PowerOff, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Sparkles,
  Headphones,
  TrendingUp,
  Activity,
  MessageCircle,
  Clock,
  Settings,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CreateBotModal from '../components/bots/CreateBotModal';
import { 
  useBots, 
  useDeleteBot, 
  useToggleBot 
} from '../hooks/useBots';
import { useInstances } from '../hooks/useInstances';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const Bots = () => {
  const [instanceFilter, setInstanceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: botsData, isLoading, error, refetch } = useBots(instanceFilter || null);
  const { data: instancesData } = useInstances();
  const deleteBot = useDeleteBot({
    onSuccess: () => {
      refetch();
    }
  });
  const toggleBot = useToggleBot({
    onSuccess: () => {
      refetch();
    }
  });

  const bots = botsData?.data?.bots || [];
  const instances = instancesData?.data?.instances || [];
  const planLimits = botsData?.data?.planLimits || null;

  // Filtrar bots
  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.instance_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && bot.is_active) ||
                         (statusFilter === 'inactive' && !bot.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteBot = (bot) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el bot "${bot.name}"? Esta acción no se puede deshacer.`)) {
      deleteBot.mutate(bot.id);
    }
  };

  const handleToggleBot = (bot) => {
    toggleBot.mutate({ 
      id: bot.id, 
      isActive: !bot.is_active 
    });
  };

  const handleEditBot = (bot) => {
    setEditingBot(bot);
    setIsCreateModalOpen(true);
  };

  const getBotIcon = (systemPrompt) => {
    const prompt = systemPrompt.toLowerCase();
    if (prompt.includes('venta') || prompt.includes('comercial')) {
      return { Icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' };
    }
    if (prompt.includes('soporte') || prompt.includes('técnico') || prompt.includes('ayuda')) {
      return { Icon: Headphones, color: 'text-green-600', bg: 'bg-green-100' };
    }
    return { Icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'text-green-600 bg-green-100' 
      : 'text-gray-600 bg-gray-100';
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar los bots</h3>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Bots</h1>
            <p className="text-gray-600">
              {planLimits ? `${bots.length}/${planLimits.max_bots === -1 ? '∞' : planLimits.max_bots} bots` : `${bots.length} bots`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="order-1 sm:order-2"
            disabled={planLimits && planLimits.max_bots !== -1 && bots.length >= planLimits.max_bots}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Bot
          </Button>
          
          {planLimits && planLimits.max_bots !== -1 && bots.length >= planLimits.max_bots && (
            <div className="order-2 sm:order-1 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Has alcanzado el límite de tu plan ({planLimits.plan})
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Buscar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar bots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por Instancia */}
        <div className="relative">
          <select
            value={instanceFilter}
            onChange={(e) => setInstanceFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">Todas las instancias</option>
            {instances.map(instance => (
              <option key={instance.id} value={instance.id}>
                {instance.instance_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtro por Estado */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Refresh */}
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <Activity className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Lista de Bots */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || instanceFilter || statusFilter !== 'all' ? 'No se encontraron bots' : 'No tienes bots aún'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || instanceFilter || statusFilter !== 'all' 
              ? 'Intenta ajustar tus filtros de búsqueda'
              : 'Crea tu primer bot para comenzar a automatizar tus conversaciones'}
          </p>
          {!searchTerm && !instanceFilter && statusFilter === 'all' && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Mi Primer Bot
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => {
            const { Icon, color, bg } = getBotIcon(bot.system_prompt);
            
            return (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${bg} rounded-lg`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{bot.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{bot.instance_name}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bot.is_active)}`}>
                      {bot.is_active ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>

                  {/* Description */}
                  {bot.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bot.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{bot.total_conversations || 0} conv.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {formatDistanceToNow(new Date(bot.created_at), { locale: es, addSuffix: false })}
                      </span>
                    </div>
                  </div>

                  {/* Config Info */}
                  <div className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <span>Modelo: {bot.openai_model}</span>
                      <span>Temp: {bot.openai_temperature}</span>
                      <span>Tokens: {bot.max_tokens}</span>
                      <span>Memoria: {bot.context_memory_turns} turnos</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBot(bot)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBot(bot)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={bot.is_active ? "outline" : "default"}
                      onClick={() => handleToggleBot(bot)}
                      disabled={toggleBot.isLoading}
                      className={bot.is_active ? 'text-gray-600' : ''}
                    >
                      {bot.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateBotModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBot(null);
        }}
        bot={editingBot}
        onSuccess={() => {
          refetch();
          setEditingBot(null);
        }}
      />
    </div>
  );
};

export default Bots; 