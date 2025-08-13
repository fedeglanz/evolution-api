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

// Modal de creación (placeholder por ahora)
const CreateMessageModal = ({ options, onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Crear Mensaje Masivo</h3>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Modal en Construcción
            </h3>
            <p className="text-gray-600">
              El formulario de creación estará disponible próximamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassMessaging; 