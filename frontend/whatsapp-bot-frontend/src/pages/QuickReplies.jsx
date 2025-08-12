import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Zap, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  Tag,
  Calendar,
  Hash,
  Star,
  Copy
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import api from '../services/api';

const QuickReplies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuickReply, setSelectedQuickReply] = useState(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: quickRepliesData, isLoading } = useQuery({
    queryKey: ['quick-replies', searchTerm, selectedCategory],
    queryFn: () => api.get('/quick-replies', {
      params: {
        search: searchTerm,
        category: selectedCategory,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['quick-reply-categories'],
    queryFn: () => api.get('/quick-replies/categories').then(res => res.data)
  });

  const { data: popularData } = useQuery({
    queryKey: ['popular-shortcuts'],
    queryFn: () => api.get('/quick-replies/popular?limit=5').then(res => res.data)
  });

  // Mutations
  const createQuickReplyMutation = useMutation({
    mutationFn: (data) => api.post('/quick-replies', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quick-replies']);
      queryClient.invalidateQueries(['popular-shortcuts']);
      setShowCreateModal(false);
      toast.success('Respuesta rápida creada exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear respuesta rápida');
    }
  });

  const updateQuickReplyMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/quick-replies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quick-replies']);
      setShowCreateModal(false);
      toast.success('Respuesta rápida actualizada exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar respuesta rápida');
    }
  });

  const deleteQuickReplyMutation = useMutation({
    mutationFn: (id) => api.delete(`/quick-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['quick-replies']);
      queryClient.invalidateQueries(['popular-shortcuts']);
      toast.success('Respuesta rápida eliminada exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar respuesta rápida');
    }
  });

  const quickReplies = quickRepliesData?.data?.quick_replies || [];
  const categories = categoriesData?.categories || [];
  const popularShortcuts = popularData?.popular_shortcuts || [];

  const handleCreateQuickReply = (formData) => {
    if (selectedQuickReply) {
      updateQuickReplyMutation.mutate({ id: selectedQuickReply.id, ...formData });
    } else {
      createQuickReplyMutation.mutate(formData);
    }
  };

  const handleDeleteQuickReply = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta respuesta rápida?')) {
      deleteQuickReplyMutation.mutate(id);
    }
  };

  const copyShortcut = (shortcut) => {
    navigator.clipboard.writeText(shortcut);
    toast.success('Shortcut copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Respuestas Rápidas</h1>
          <p className="text-gray-600">Crea shortcuts para responder rápidamente con mensajes predefinidos</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Respuesta</span>
        </Button>
      </div>

      {/* Stats y Populares */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Filtros */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar shortcuts o mensajes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category.category} value={category.category}>
                      {category.category} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Lista de Respuestas Rápidas */}
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : quickReplies.length === 0 ? (
              <Card className="p-8 text-center">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay respuestas rápidas</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory ? 
                    'No se encontraron respuestas con los filtros aplicados.' :
                    'Crea tu primera respuesta rápida para agilizar tus conversaciones.'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Crear Respuesta Rápida
                </Button>
              </Card>
            ) : (
              quickReplies.map(quickReply => (
                <Card key={quickReply.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* Shortcut */}
                    <div className="flex-shrink-0">
                      <div 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                        onClick={() => copyShortcut(quickReply.shortcut)}
                        title="Click para copiar"
                      >
                        <Hash className="h-3 w-3 mr-1" />
                        {quickReply.shortcut}
                        <Copy className="h-3 w-3 ml-1 opacity-50" />
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{quickReply.category}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>{quickReply.usage_count || 0} usos</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(quickReply.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{quickReply.message}</p>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          quickReply.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quickReply.is_active ? 'Activo' : 'Inactivo'}
                        </span>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQuickReply(quickReply);
                              setShowCreateModal(true);
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuickReply(quickReply.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar con populares */}
        <div>
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-4 w-4 mr-2 text-yellow-500" />
              Shortcuts Más Usados
            </h3>
            
            {popularShortcuts.length === 0 ? (
              <p className="text-sm text-gray-500">No hay datos de uso aún</p>
            ) : (
              <div className="space-y-3">
                {popularShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <code 
                        className="text-sm bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                        onClick={() => copyShortcut(shortcut.shortcut)}
                      >
                        {shortcut.shortcut}
                      </code>
                    </div>
                    <span className="text-xs text-gray-500">
                      {shortcut.usage_count} usos
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Guía de uso */}
          <Card className="p-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">💡 Cómo usar</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>1.</strong> Crea shortcuts que empiecen con "/"</p>
              <p><strong>2.</strong> Usa shortcuts en conversaciones</p>
              <p><strong>3.</strong> El sistema detecta automáticamente el comando</p>
              <p><strong>4.</strong> Se envía la respuesta predefinida</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {showCreateModal && (
        <QuickReplyModal
          quickReply={selectedQuickReply}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedQuickReply(null);
          }}
          onSubmit={handleCreateQuickReply}
          isLoading={createQuickReplyMutation.isLoading || updateQuickReplyMutation.isLoading}
        />
      )}
    </div>
  );
};

// Modal para crear/editar respuesta rápida
const QuickReplyModal = ({ quickReply, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    shortcut: quickReply?.shortcut || '/',
    message: quickReply?.message || '',
    category: quickReply?.category || 'general',
    is_active: quickReply?.is_active !== undefined ? quickReply.is_active : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar shortcut
    if (!formData.shortcut.startsWith('/')) {
      toast.error('El shortcut debe empezar con "/"');
      return;
    }

    if (!/^\/[a-zA-Z0-9-]+$/.test(formData.shortcut)) {
      toast.error('El shortcut solo puede contener letras, números y guiones');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {quickReply ? 'Editar Respuesta Rápida' : 'Crear Nueva Respuesta Rápida'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shortcut *
              </label>
              <Input
                value={formData.shortcut}
                onChange={(e) => setFormData(prev => ({ ...prev, shortcut: e.target.value }))}
                placeholder="/gracias"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Debe empezar con "/" y contener solo letras, números y guiones
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="¡Gracias por contactarnos! Te responderemos pronto 😊"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="general"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Respuesta activa
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Guardando...' : (quickReply ? 'Actualizar' : 'Crear')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickReplies; 