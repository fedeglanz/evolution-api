import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Clock, 
  Edit3, 
  Trash2, 
  Calendar,
  Send,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  User,
  Globe
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import api from '../services/api';

const ScheduledMessages = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['scheduled-messages', searchTerm, statusFilter],
    queryFn: () => api.get('/scheduled-messages', {
      params: {
        search: searchTerm,
        status: statusFilter,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: statsData } = useQuery({
    queryKey: ['scheduled-messages-stats'],
    queryFn: () => api.get('/scheduled-messages/stats').then(res => res.data)
  });

  const { data: instancesData } = useQuery({
    queryKey: ['instances-list'],
    queryFn: () => api.get('/instances?limit=100').then(res => res.data)
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => api.get('/contacts?limit=100').then(res => res.data)
  });

  // Mutations
  const createMessageMutation = useMutation({
    mutationFn: (data) => api.post('/scheduled-messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-messages']);
      queryClient.invalidateQueries(['scheduled-messages-stats']);
      setShowCreateModal(false);
      toast.success('Mensaje programado creado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear mensaje programado');
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/scheduled-messages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-messages']);
      setShowCreateModal(false);
      toast.success('Mensaje programado actualizado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar mensaje programado');
    }
  });

  const cancelMessageMutation = useMutation({
    mutationFn: (id) => api.delete(`/scheduled-messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-messages']);
      queryClient.invalidateQueries(['scheduled-messages-stats']);
      toast.success('Mensaje programado cancelado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al cancelar mensaje programado');
    }
  });

  const messages = messagesData?.data?.scheduled_messages || [];
  const stats = statsData?.stats || {};
  const instances = instancesData?.data || [];
  const contacts = contactsData?.data || [];

  const handleCreateMessage = (formData) => {
    if (selectedMessage) {
      updateMessageMutation.mutate({ id: selectedMessage.id, ...formData });
    } else {
      createMessageMutation.mutate(formData);
    }
  };

  const handleCancelMessage = (id) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar este mensaje programado?')) {
      cancelMessageMutation.mutate(id);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Pause className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mensajes Programados</h1>
          <p className="text-gray-600">Programa mensajes para ser enviados en fechas específicas</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Programar Mensaje</span>
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enviados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sent || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fallidos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <Pause className="h-8 w-8 text-gray-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cancelados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar mensajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="sent">Enviados</option>
              <option value="failed">Fallidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de Mensajes */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </Card>
          ))
        ) : messages.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay mensajes programados</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter ? 
                'No se encontraron mensajes con los filtros aplicados.' :
                'Programa tu primer mensaje para enviarlo en una fecha específica.'
              }
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Programar Mensaje
            </Button>
          </Card>
        ) : (
          messages.map(message => (
            <Card key={message.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(message.status)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                          {message.status === 'pending' ? 'Pendiente' :
                           message.status === 'sent' ? 'Enviado' :
                           message.status === 'failed' ? 'Fallido' : 'Cancelado'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Programado: {formatDateTime(message.scheduled_for)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>{message.timezone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-700 text-sm">{message.message}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{message.phone}</span>
                        </div>
                        {message.contact_name && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{message.contact_name}</span>
                          </div>
                        )}
                        <span>Instancia: {message.instance_name}</span>
                      </div>
                      
                      {message.sent_at && (
                        <span>Enviado: {formatDateTime(message.sent_at)}</span>
                      )}
                      
                      {message.error_message && (
                        <span className="text-red-500">Error: {message.error_message}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex space-x-2 ml-4">
                  {message.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMessage(message);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                  {(message.status === 'pending' || message.status === 'failed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelMessage(message.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {showCreateModal && (
        <ScheduledMessageModal
          message={selectedMessage}
          instances={instances}
          contacts={contacts}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedMessage(null);
          }}
          onSubmit={handleCreateMessage}
          isLoading={createMessageMutation.isLoading || updateMessageMutation.isLoading}
        />
      )}
    </div>
  );
};

// Modal para crear/editar mensaje programado
const ScheduledMessageModal = ({ message, instances, contacts, onClose, onSubmit, isLoading }) => {
  // Detectar timezone automáticamente
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'UTC';
    }
  };

  const [formData, setFormData] = useState({
    instance_id: message?.instance_id || '',
    contact_id: message?.contact_id || '',
    phone: message?.phone || '',
    message: message?.message || '',
    scheduled_for: message?.scheduled_for ? 
      new Date(message.scheduled_for).toISOString().slice(0, 16) : 
      new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hora en el futuro
    timezone: message?.timezone || getUserTimezone()
  });

  const [useContact, setUseContact] = useState(!!message?.contact_id);

  // Función para obtener la hora actual en la timezone seleccionada
  const getCurrentTimeInTimezone = (timezone) => {
    try {
      const now = new Date();
      return now.toLocaleString('es-AR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return new Date().toLocaleString();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.instance_id) {
      toast.error('Debe seleccionar una instancia');
      return;
    }

    if (!useContact && !formData.phone) {
      toast.error('Debe especificar un número de teléfono');
      return;
    }

    if (useContact && !formData.contact_id) {
      toast.error('Debe seleccionar un contacto');
      return;
    }

    // SIMPLIFICADO: Tratamos el input como hora local del navegador
    // y dejamos que el backend maneje la conversión usando la timezone enviada
    const scheduledDate = new Date(formData.scheduled_for);
    const now = new Date();
    
    // Validación básica: solo verificar que no sea una fecha pasada en términos absolutos
    // El backend hará la validación precisa con timezone
    if (scheduledDate <= now) {
      // Dar 5 minutos de gracia para diferencias menores
      const scheduledWithGrace = new Date(scheduledDate.getTime() + 5 * 60 * 1000);
      if (scheduledWithGrace <= now) {
        toast.error(`La fecha programada debe ser al menos 5 minutos en el futuro.`);
        return;
      }
    }

    const submitData = {
      ...formData,
      // Enviar tal como está - el backend usará la timezone para interpretar correctamente
      scheduled_for: scheduledDate.toISOString(),
      contact_id: useContact ? formData.contact_id : null,
      phone: useContact ? null : formData.phone
    };

    onSubmit(submitData);
  };

  const timezones = [
    'UTC',
    'America/Argentina/Buenos_Aires',
    'America/Sao_Paulo',
    'America/Santiago',
    'America/Lima',
    'America/Bogota',
    'America/Caracas',
    'America/Mexico_City',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/Madrid',
    'Europe/London'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {message ? 'Editar Mensaje Programado' : 'Programar Nuevo Mensaje'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Instancia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instancia WhatsApp *
              </label>
              <select
                value={formData.instance_id}
                onChange={(e) => setFormData(prev => ({ ...prev, instance_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">
                  {instances.length === 0 ? 'No hay instancias disponibles' : 'Seleccionar instancia...'}
                </option>
                {instances.map(instance => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name || instance.instance_name} - {
                      instance.status === 'connected' && (instance.phoneNumber || instance.phone_number)
                        ? `📱 ${instance.phoneNumber || instance.phone_number}` 
                        : `⚠️ ${instance.status || 'desconectado'}`
                    }
                  </option>
                ))}
              </select>
              {instances.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Necesitas crear una instancia primero en la página de Instancias
                </p>
              )}
            </div>

            {/* Destinatario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinatario *
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={!useContact}
                      onChange={() => setUseContact(false)}
                      className="form-radio"
                    />
                    <span className="ml-2">Número de teléfono</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={useContact}
                      onChange={() => setUseContact(true)}
                      className="form-radio"
                    />
                    <span className="ml-2">Contacto existente</span>
                  </label>
                </div>

                {useContact ? (
                  <select
                    value={formData.contact_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={useContact}
                  >
                    <option value="">Seleccionar contacto</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} - {contact.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1234567890"
                    required={!useContact}
                  />
                )}
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Escribe tu mensaje aquí..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Fecha y hora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha y Hora *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                🕐 Hora local del navegador: {new Date().toLocaleString('es-AR', {
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
              </p>
            </div>

            {/* Zona horaria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zona Horaria
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                🕐 Hora actual en {formData.timezone}: {getCurrentTimeInTimezone(formData.timezone)}
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Guardando...' : (message ? 'Actualizar' : 'Programar')}
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

export default ScheduledMessages; 