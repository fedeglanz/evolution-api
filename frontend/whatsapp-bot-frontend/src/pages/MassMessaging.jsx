import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Clock, 
  FileText, 
  Target,
  Calendar,
  Settings,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const MassMessaging = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedView, setSelectedView] = useState('create'); // 'create', 'history', 'stats'
  const queryClient = useQueryClient();

  // Obtener opciones disponibles
  const { data: optionsData, isLoading: optionsLoading } = useQuery({
    queryKey: ['mass-messaging-options'],
    queryFn: () => api.get('/mass-messaging/options')
  });

  // Obtener historial
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['mass-messaging-history'],
    queryFn: () => api.get('/mass-messaging/history'),
    enabled: selectedView === 'history'
  });

  // Obtener estadísticas
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['mass-messaging-stats'],
    queryFn: () => api.get('/mass-messaging/stats/overview'),
    enabled: selectedView === 'stats'
  });

  const options = optionsData?.data || {};
  const history = historyData?.data || [];
  const stats = statsData?.data || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Send className="h-8 w-8 text-blue-600 mr-3" />
            Mensajería Masiva
          </h1>
          <p className="text-gray-600 mt-2">
            Sistema unificado para envío masivo usando templates, contactos y campañas
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Mensaje Masivo
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { key: 'create', label: 'Crear Mensaje', icon: Plus },
          { key: 'history', label: 'Historial', icon: Clock },
          { key: 'stats', label: 'Estadísticas', icon: Target }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key)}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
              selectedView === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Content based on selected view */}
      {selectedView === 'create' && (
        <CreateMessageView 
          options={options} 
          optionsLoading={optionsLoading}
          onCreateSuccess={() => queryClient.invalidateQueries(['mass-messaging-history'])}
        />
      )}

      {selectedView === 'history' && (
        <HistoryView 
          history={history} 
          loading={historyLoading}
        />
      )}

      {selectedView === 'stats' && (
        <StatsView 
          stats={stats} 
          loading={statsLoading}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMessageModal
          options={options}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries(['mass-messaging-history']);
          }}
        />
      )}
    </div>
  );
};

// Vista de creación de mensajes
const CreateMessageView = ({ options, optionsLoading, onCreateSuccess }) => {
  if (optionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const { templates = [], campaigns = [], instances = [], contactsStats = {} } = options;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Opciones disponibles */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-600" />
            Templates Disponibles
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {templates.length}
          </div>
          <p className="text-sm text-gray-600">
            Plantillas de mensajes listas para usar
          </p>
          {templates.length > 0 && (
            <div className="mt-3 space-y-1">
              {templates.slice(0, 3).map(template => (
                <div key={template.id} className="text-xs bg-green-50 px-2 py-1 rounded">
                  {template.name} ({template.usage_count} usos)
                </div>
              ))}
              {templates.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{templates.length - 3} más...
                </div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Campañas Activas
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {campaigns.length}
          </div>
          <p className="text-sm text-gray-600">
            Campañas con grupos disponibles
          </p>
          {campaigns.length > 0 && (
            <div className="mt-3 space-y-1">
              {campaigns.slice(0, 3).map(campaign => (
                <div key={campaign.id} className="text-xs bg-purple-50 px-2 py-1 rounded">
                  {campaign.name} ({campaign.total_members} miembros)
                </div>
              ))}
              {campaigns.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{campaigns.length - 3} más...
                </div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
            Instancias Conectadas
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {instances.length}
          </div>
          <p className="text-sm text-gray-600">
            Instancias listas para envío
          </p>
          <div className="mt-3">
            <div className="text-xs text-gray-500">
              Contactos totales: {contactsStats.total_contacts || 0}
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

// Vista de historial
const HistoryView = ({ history, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <Card.Content className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay mensajes masivos
          </h3>
          <p className="text-gray-600">
            Crea tu primer mensaje masivo para comenzar
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Historial de Mensajes Masivos</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {history.map(message => (
            <MessageHistoryItem key={message.id} message={message} />
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

// Item de historial
const MessageHistoryItem = ({ message }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-medium text-gray-900">
              {message.title || 'Mensaje sin título'}
            </h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
              {getStatusIcon(message.status)}
              <span className="ml-1 capitalize">{message.status}</span>
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {message.description || 'Sin descripción'}
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>
              {message.message_type === 'template' ? 'Template' : 'Personalizado'}
            </span>
            <span>
              {message.target_type === 'campaigns' ? 'Campañas' : 
               message.target_type === 'contacts' ? 'Contactos' : 'Manual'}
            </span>
            <span>
              {message.total_recipients} destinatarios
            </span>
            <span>
              {new Date(message.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {message.sent_count}/{message.total_recipients}
          </div>
          <div className="text-xs text-gray-500">enviados</div>
        </div>
      </div>
    </div>
  );
};

// Vista de estadísticas
const StatsView = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const { overview = {}, dailyStats = [], topTemplates = [] } = stats;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Campañas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.total_campaigns || 0}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Mensajes Enviados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.total_sent_all_time || 0}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.success_rate_percentage || 0}%
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.completed_campaigns || 0}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Templates más usados */}
      {topTemplates.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Templates Más Utilizados</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {topTemplates.map((template, index) => (
                <div key={template.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{template.usage_count}</p>
                    <p className="text-xs text-gray-500">usos</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

// Modal de creación completo
const CreateMessageModal = ({ options, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Contenido del mensaje
    messageType: 'custom', // 'template' o 'custom'
    templateId: '',
    templateVariables: {},
    customMessage: '',
    
    // Destinatarios
    targetType: 'campaigns', // 'contacts', 'campaigns', 'manual'
    contactIds: [],
    campaignIds: [],
    manualPhones: '',
    
    // Instancia
    instanceId: '',
    
    // Programación
    schedulingType: 'immediate', // 'immediate' o 'scheduled'
    scheduledFor: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Configuración
    delayBetweenGroups: 10,
    delayBetweenMessages: 2,
    
    // Metadata
    title: '',
    description: ''
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMessage, setPreviewMessage] = useState('');

  const { templates = [], campaigns = [], instances = [], contactsStats = {} } = options;

  // Mutación para crear mensaje masivo
  const createMessageMutation = useMutation({
    mutationFn: (data) => api.post('/mass-messaging/create', data),
    onSuccess: (response) => {
      toast.success('Mensaje masivo creado exitosamente');
      onSuccess();
    },
    onError: (error) => {
      console.error('Error creando mensaje masivo:', error);
      toast.error(error.response?.data?.message || 'Error al crear mensaje masivo');
    }
  });

  // Actualizar preview cuando cambia el template o variables
  useEffect(() => {
    if (formData.messageType === 'template' && selectedTemplate) {
      let preview = selectedTemplate.content;
      
      // Reemplazar variables en el preview
      const templateVars = JSON.parse(selectedTemplate.variables || '[]');
      templateVars.forEach(variable => {
        const value = formData.templateVariables[variable.name] || `{${variable.name}}`;
        const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
        preview = preview.replace(regex, value);
      });
      
      setPreviewMessage(preview);
    } else if (formData.messageType === 'custom') {
      setPreviewMessage(formData.customMessage);
    }
  }, [formData.messageType, formData.templateVariables, formData.customMessage, selectedTemplate]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, templateId: template.id }));
    
    // Inicializar variables del template
    const templateVars = JSON.parse(template.variables || '[]');
    const initialVars = {};
    templateVars.forEach(variable => {
      initialVars[variable.name] = variable.default_value || '';
    });
    setFormData(prev => ({ ...prev, templateVariables: initialVars }));
  };

  const handleVariableChange = (variableName, value) => {
    setFormData(prev => ({
      ...prev,
      templateVariables: {
        ...prev.templateVariables,
        [variableName]: value
      }
    }));
  };

  const getSelectedRecipientsCount = () => {
    switch (formData.targetType) {
      case 'campaigns':
        const selectedCampaigns = campaigns.filter(c => formData.campaignIds.includes(c.id));
        return selectedCampaigns.reduce((sum, c) => sum + (c.total_members || 0), 0);
      case 'contacts':
        return formData.contactIds.length;
      case 'manual':
        const phones = formData.manualPhones.split('\n').filter(p => p.trim());
        return phones.length;
      default:
        return 0;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.instanceId) {
      toast.error('Selecciona una instancia');
      return;
    }

    if (formData.messageType === 'template' && !formData.templateId) {
      toast.error('Selecciona un template');
      return;
    }

    if (formData.messageType === 'custom' && !formData.customMessage.trim()) {
      toast.error('Escribe un mensaje personalizado');
      return;
    }

    if (getSelectedRecipientsCount() === 0) {
      toast.error('Selecciona al menos un destinatario');
      return;
    }

    // Preparar datos para envío
    const submitData = {
      ...formData,
      manualPhones: formData.targetType === 'manual' 
        ? formData.manualPhones.split('\n').map(p => p.trim()).filter(p => p)
        : []
    };

    createMessageMutation.mutate(submitData);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Contenido del Mensaje';
      case 2: return 'Seleccionar Destinatarios';
      case 3: return 'Configuración de Envío';
      case 4: return 'Revisar y Enviar';
      default: return 'Crear Mensaje Masivo';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{getStepTitle()}</h3>
              <div className="flex items-center mt-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === currentStep 
                        ? 'bg-blue-600 text-white' 
                        : step < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step < currentStep ? '✓' : step}
                    </div>
                    {step < 4 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                  </div>
                ))}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Contenido del Mensaje */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Tipo de mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Mensaje
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, messageType: 'template' }))}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        formData.messageType === 'template'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="h-6 w-6 text-blue-600 mb-2" />
                      <div className="font-medium">Usar Template</div>
                      <div className="text-sm text-gray-600">Seleccionar plantilla existente</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, messageType: 'custom' }))}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        formData.messageType === 'custom'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <MessageSquare className="h-6 w-6 text-green-600 mb-2" />
                      <div className="font-medium">Mensaje Personalizado</div>
                      <div className="text-sm text-gray-600">Redactar desde cero</div>
                    </button>
                  </div>
                </div>

                {/* Template Selection */}
                {formData.messageType === 'template' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Seleccionar Template
                    </label>
                    {templates.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">No hay templates disponibles</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleTemplateSelect(template)}
                            className={`p-4 border rounded-lg text-left transition-colors ${
                              selectedTemplate?.id === template.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{template.category}</div>
                            <div className="text-xs text-gray-500 mt-2 truncate">
                              {template.content.substring(0, 100)}...
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Variables del template */}
                    {selectedTemplate && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Variables del Template
                        </label>
                        {JSON.parse(selectedTemplate.variables || '[]').map((variable) => (
                          <div key={variable.name} className="mb-3">
                            <label className="block text-sm text-gray-600 mb-1">
                              {variable.name} {variable.required && <span className="text-red-500">*</span>}
                            </label>
                            <Input
                              value={formData.templateVariables[variable.name] || ''}
                              onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                              placeholder={variable.default_value || `Ingresa ${variable.name}`}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Message */}
                {formData.messageType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Mensaje Personalizado
                    </label>
                    <textarea
                      value={formData.customMessage}
                      onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                      placeholder="Escribe tu mensaje aquí..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Preview */}
                {previewMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Vista Previa
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="whitespace-pre-wrap text-sm">{previewMessage}</div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título (opcional)
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Promoción Black Friday"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción (opcional)
                    </label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Breve descripción del envío"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Destinatarios */}
            {currentStep === 2 && (
              <TargetSelectionStep 
                formData={formData}
                setFormData={setFormData}
                options={options}
              />
            )}

            {/* Step 3: Configuración */}
            {currentStep === 3 && (
              <ConfigurationStep 
                formData={formData}
                setFormData={setFormData}
                instances={instances}
              />
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <ReviewStep 
                formData={formData}
                selectedTemplate={selectedTemplate}
                previewMessage={previewMessage}
                recipientsCount={getSelectedRecipientsCount()}
                options={options}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? onClose : prevStep}
              >
                {currentStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>
              
              <div className="flex space-x-3">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && formData.messageType === 'template' && !selectedTemplate) ||
                      (currentStep === 1 && formData.messageType === 'custom' && !formData.customMessage.trim()) ||
                      (currentStep === 2 && getSelectedRecipientsCount() === 0) ||
                      (currentStep === 3 && !formData.instanceId)
                    }
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createMessageMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createMessageMutation.isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {formData.schedulingType === 'immediate' ? 'Enviar Ahora' : 'Programar Envío'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Vista de selección de destinatarios
const TargetSelectionStep = ({ formData, setFormData, options }) => {
  const { campaigns = [] } = options;

  const handleCampaignToggle = (campaignId) => {
    setFormData(prev => ({
      ...prev,
      campaignIds: prev.campaignIds.includes(campaignId)
        ? prev.campaignIds.filter(id => id !== campaignId)
        : [...prev.campaignIds, campaignId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Tipo de destinatario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Destinatario
        </label>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, targetType: 'campaigns' }))}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.targetType === 'campaigns'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Target className="h-6 w-6 text-purple-600 mb-2" />
            <div className="font-medium">Campañas</div>
            <div className="text-sm text-gray-600">Enviar a grupos de campañas</div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, targetType: 'contacts' }))}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.targetType === 'contacts'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <div className="font-medium">Contactos</div>
            <div className="text-sm text-gray-600">Seleccionar contactos específicos</div>
          </button>

          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, targetType: 'manual' }))}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.targetType === 'manual'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="h-6 w-6 text-blue-600 mb-2" />
            <div className="font-medium">Manual</div>
            <div className="text-sm text-gray-600">Ingresar números manualmente</div>
          </button>
        </div>
      </div>

      {/* Selección de campañas */}
      {formData.targetType === 'campaigns' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Seleccionar Campañas ({formData.campaignIds.length} seleccionadas)
          </label>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No hay campañas disponibles</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.campaignIds.includes(campaign.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCampaignToggle(campaign.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-gray-600">
                        {campaign.total_groups} grupos • {campaign.total_members} miembros
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      formData.campaignIds.includes(campaign.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.campaignIds.includes(campaign.id) && (
                        <CheckCircle className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selección manual de números */}
      {formData.targetType === 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Números de Teléfono (uno por línea)
          </label>
          <textarea
            value={formData.manualPhones}
            onChange={(e) => setFormData(prev => ({ ...prev, manualPhones: e.target.value }))}
            placeholder="Ejemplo:&#10;+573001234567&#10;+573007654321&#10;+573009876543"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Ingresa los números con código de país. Ejemplo: +57 para Colombia.
          </p>
          {formData.manualPhones && (
            <div className="mt-2 text-sm text-gray-600">
              {formData.manualPhones.split('\n').filter(p => p.trim()).length} números ingresados
            </div>
          )}
        </div>
      )}

      {/* Placeholder para contactos */}
      {formData.targetType === 'contacts' && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Selección de contactos disponible próximamente</p>
        </div>
      )}
    </div>
  );
};

// Vista de configuración
const ConfigurationStep = ({ formData, setFormData, instances }) => {
  const timezones = [
    'UTC',
    'America/Bogota',
    'America/Mexico_City', 
    'America/Argentina/Buenos_Aires',
    'America/New_York',
    'Europe/Madrid'
  ];

  return (
    <div className="space-y-6">
      {/* Selección de instancia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Instancia de WhatsApp
        </label>
        {instances.length === 0 ? (
          <div className="text-center py-4 bg-red-50 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">No hay instancias conectadas</p>
          </div>
        ) : (
          <select
            value={formData.instanceId}
            onChange={(e) => setFormData(prev => ({ ...prev, instanceId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar instancia</option>
            {instances.map((instance) => (
              <option key={instance.id} value={instance.id}>
                {instance.instance_name} ({instance.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tipo de programación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Programación de Envío
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, schedulingType: 'immediate' }))}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.schedulingType === 'immediate'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Send className="h-6 w-6 text-blue-600 mb-2" />
            <div className="font-medium">Enviar Ahora</div>
            <div className="text-sm text-gray-600">Procesamiento inmediato</div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, schedulingType: 'scheduled' }))}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.schedulingType === 'scheduled'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Clock className="h-6 w-6 text-purple-600 mb-2" />
            <div className="font-medium">Programar</div>
            <div className="text-sm text-gray-600">Seleccionar fecha y hora</div>
          </button>
        </div>
      </div>

      {/* Programación específica */}
      {formData.schedulingType === 'scheduled' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona Horaria
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Configuración de delays */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Configuración de Delays
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Entre Grupos (segundos)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={formData.delayBetweenGroups}
              onChange={(e) => setFormData(prev => ({ ...prev, delayBetweenGroups: parseInt(e.target.value) || 10 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Entre Mensajes (segundos)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.delayBetweenMessages}
              onChange={(e) => setFormData(prev => ({ ...prev, delayBetweenMessages: parseInt(e.target.value) || 2 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Delays recomendados: 10s entre grupos, 2s entre mensajes individuales
        </p>
      </div>
    </div>
  );
};

// Vista de revisión final
const ReviewStep = ({ formData, selectedTemplate, previewMessage, recipientsCount, options }) => {
  const { campaigns = [], instances = [] } = options;
  
  const selectedCampaigns = campaigns.filter(c => formData.campaignIds.includes(c.id));
  const selectedInstance = instances.find(i => i.id === formData.instanceId);
  
  const getEstimatedTime = () => {
    if (formData.targetType === 'campaigns') {
      const totalGroups = selectedCampaigns.reduce((sum, c) => sum + (c.total_groups || 0), 0);
      const estimatedMinutes = Math.ceil((totalGroups * formData.delayBetweenGroups) / 60);
      return `~${estimatedMinutes} minutos`;
    }
    return '< 1 minuto';
  };

  return (
    <div className="space-y-6">
      {/* Resumen del mensaje */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
            Resumen del Mensaje
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Contenido</div>
              <div className="bg-gray-50 p-3 rounded-lg mt-1">
                <div className="text-sm whitespace-pre-wrap">{previewMessage}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Tipo:</span>
                <span className="ml-2">{formData.messageType === 'template' ? 'Template' : 'Personalizado'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Template:</span>
                <span className="ml-2">{selectedTemplate?.name || 'N/A'}</span>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Destinatarios */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Destinatarios
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">
                {recipientsCount} destinatarios
              </div>
              <div className="text-sm text-gray-600">
                Tiempo estimado: {getEstimatedTime()}
              </div>
            </div>
            
            {formData.targetType === 'campaigns' && selectedCampaigns.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Campañas seleccionadas:</div>
                <div className="space-y-1">
                  {selectedCampaigns.map(campaign => (
                    <div key={campaign.id} className="text-sm bg-purple-50 px-2 py-1 rounded">
                      {campaign.name} ({campaign.total_members} miembros en {campaign.total_groups} grupos)
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {formData.targetType === 'manual' && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Números manuales:</div>
                <div className="text-sm bg-blue-50 px-2 py-1 rounded">
                  {formData.manualPhones.split('\n').filter(p => p.trim()).length} números ingresados
                </div>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Configuración */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-gray-600" />
            Configuración
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Instancia:</span>
              <span className="ml-2">{selectedInstance?.instance_name || 'No seleccionada'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Programación:</span>
              <span className="ml-2">
                {formData.schedulingType === 'immediate' ? 'Inmediato' : 'Programado'}
              </span>
            </div>
            {formData.schedulingType === 'scheduled' && (
              <>
                <div>
                  <span className="font-medium text-gray-600">Fecha:</span>
                  <span className="ml-2">{formData.scheduledFor}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Zona horaria:</span>
                  <span className="ml-2">{formData.timezone}</span>
                </div>
              </>
            )}
            <div>
              <span className="font-medium text-gray-600">Delay grupos:</span>
              <span className="ml-2">{formData.delayBetweenGroups}s</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Delay mensajes:</span>
              <span className="ml-2">{formData.delayBetweenMessages}s</span>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Advertencia final */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <div className="font-medium text-yellow-800">Confirmación de Envío</div>
            <div className="text-yellow-700 mt-1">
              Una vez iniciado el envío, no se podrá cancelar. Verifica que toda la información sea correcta.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassMessaging; 