import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  MessageSquare,
  Tag,
  Calendar,
  TrendingUp
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import api from '../services/api';

const Templates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates', searchTerm, selectedCategory],
    queryFn: () => api.get('/templates', {
      params: {
        search: searchTerm,
        category: selectedCategory,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => api.get('/templates/categories').then(res => res.data)
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (templateData) => api.post('/templates', templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setShowCreateModal(false);
      toast.success('Template creado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear template');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => api.delete(`/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      toast.success('Template eliminado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar template');
    }
  });

  const previewTemplateMutation = useMutation({
    mutationFn: ({ templateId, variables }) => 
      api.post(`/templates/${templateId}/preview`, { variables }),
    onSuccess: (response) => {
      setPreviewData(response.data);
      setShowPreviewModal(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al previsualizar template');
    }
  });

  const templates = templatesData?.data?.templates || [];
  const categories = categoriesData?.categories || [];

  const handleCreateTemplate = (formData) => {
    createTemplateMutation.mutate(formData);
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este template?')) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    
    // Crear variables de ejemplo
    const variables = {};
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach(variable => {
        variables[variable.name] = variable.default || `[${variable.name}]`;
      });
    }

    previewTemplateMutation.mutate({
      templateId: template.id,
      variables
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Mensajes</h1>
          <p className="text-gray-600">Gestiona plantillas de mensajes reutilizables con variables dinámicas</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Template</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar templates..."
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

      {/* Lista de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingTemplates ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4 w-1/2"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))
        ) : templates.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay templates</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory ? 
                'No se encontraron templates con los filtros aplicados.' :
                'Crea tu primer template de mensaje para comenzar.'
              }
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Crear Template
            </Button>
          </Card>
        ) : (
          templates.map(template => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{template.category}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{template.usage_count || 0}</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {template.content}
                </p>
              </div>

              {template.variables && template.variables.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {`{${variable.name}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-1 rounded-full ${
                  template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewTemplate(template)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowCreateModal(true);
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Crear/Editar Template */}
      {showCreateModal && (
        <CreateTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={handleCreateTemplate}
          isLoading={createTemplateMutation.isLoading}
        />
      )}

      {/* Modal de Preview */}
      {showPreviewModal && previewData && (
        <PreviewModal
          previewData={previewData}
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewData(null);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};

// Modal para crear/editar template
const CreateTemplateModal = ({ template, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'general',
    content: template?.content || '',
    variables: template?.variables || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const extractVariables = () => {
    const matches = formData.content.match(/\{([^}]+)\}/g);
    if (matches) {
      const variables = matches.map(match => {
        const name = match.slice(1, -1);
        return { name, default: '', required: true };
      });
      setFormData(prev => ({ ...prev, variables }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {template ? 'Editar Template' : 'Crear Nuevo Template'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del template"
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
                placeholder="Categoría (ej: saludo, informacion)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenido del Mensaje
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Hola {nombre}! Bienvenido a {empresa}..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Usa {`{variable}`} para insertar variables dinámicas
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={extractVariables}
                className="mt-2"
              >
                Extraer Variables
              </Button>
            </div>

            {formData.variables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables Detectadas
                </label>
                <div className="space-y-2">
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{`{${variable.name}}`}</span>
                      <Input
                        placeholder="Valor por defecto"
                        value={variable.default}
                        onChange={(e) => {
                          const newVariables = [...formData.variables];
                          newVariables[index].default = e.target.value;
                          setFormData(prev => ({ ...prev, variables: newVariables }));
                        }}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Guardando...' : (template ? 'Actualizar' : 'Crear Template')}
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

// Modal de preview
const PreviewModal = ({ previewData, template, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Preview: {template?.name}</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mensaje Original:</h3>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                {previewData.preview?.original}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mensaje Procesado:</h3>
              <div className="p-3 bg-blue-50 rounded-md text-sm">
                {previewData.preview?.processed}
              </div>
            </div>

            {previewData.preview?.variables_used && Object.keys(previewData.preview.variables_used).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Variables Utilizadas:</h3>
                <div className="space-y-1">
                  {Object.entries(previewData.preview.variables_used).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="font-medium">{`{${key}}`}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates; 