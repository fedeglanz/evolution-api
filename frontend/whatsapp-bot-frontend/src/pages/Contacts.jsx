import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  User, 
  Phone, 
  Tag, 
  Calendar,
  BarChart3,
  RefreshCcw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../services/api';

const Contacts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', searchTerm, selectedTag],
    queryFn: () => api.get('/contacts', {
      params: {
        search: searchTerm,
        tags: selectedTag,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: syncStats } = useQuery({
    queryKey: ['contacts-sync-stats'],
    queryFn: () => api.get('/contacts/sync-stats').then(res => res.data),
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  // Mutations
  const syncMutation = useMutation({
    mutationFn: () => api.post('/contacts/sync'),
    onSuccess: (data) => {
      toast.success('Sincronización completada exitosamente');
      queryClient.invalidateQueries(['contacts']);
      queryClient.invalidateQueries(['contacts-sync-stats']);
      setShowSyncModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al sincronizar contactos');
      setShowSyncModal(false);
    }
  });

  const contacts = contactsData?.data || [];
  const pagination = contactsData?.pagination || {};
  const stats = syncStats?.stats || {};

  const handleSync = () => {
    setShowSyncModal(true);
    syncMutation.mutate();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContactInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-600">Gestiona y sincroniza tus contactos de WhatsApp</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries(['contacts'])}
            disabled={contactsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${contactsLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            onClick={handleSync}
            disabled={syncMutation.isLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${syncMutation.isLoading ? 'animate-spin' : ''}`} />
            {syncMutation.isLoading ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Contactos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalContacts || 0}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Sincronizados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.syncedContacts || 0}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Actualizados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.updatedToday || 0}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">% Sincronizado</p>
                <p className="text-2xl font-bold text-gray-900">{stats.syncPercentage || 0}%</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las etiquetas</option>
                <option value="evolution-sync">Sincronizados</option>
                <option value="manual">Manuales</option>
                <option value="important">Importantes</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Contacts List */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center justify-between">
            <span>Lista de Contactos</span>
            <span className="text-sm font-normal text-gray-500">
              {pagination.total ? `${pagination.total} contactos` : ''}
            </span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {contactsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Cargando contactos...</p>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contactos</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedTag 
                    ? 'No se encontraron contactos con los filtros aplicados' 
                    : 'Sincroniza tus contactos desde Evolution API para comenzar'
                  }
                </p>
                {!searchTerm && !selectedTag && (
                  <Button onClick={handleSync} disabled={syncMutation.isLoading}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Sincronizar Contactos
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <div key={contact.id} className="py-4 flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {contact.profile_pic_url ? (
                      <img
                        src={contact.profile_pic_url}
                        alt={contact.name || contact.phone}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {getContactInitials(contact.name || contact.phone)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.name || 'Sin nombre'}
                      </p>
                      {contact.tags?.includes('evolution-sync') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sincronizado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {contact.phone}
                      </p>
                      {contact.total_messages > 0 && (
                        <p className="text-sm text-gray-500">
                          {contact.total_messages} mensajes
                        </p>
                      )}
                      {contact.last_message_at && (
                        <p className="text-sm text-gray-500">
                          Último: {formatDate(contact.last_message_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{contact.tags.length - 2} más
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
                             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <RefreshCcw className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sincronizando Contactos
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Obteniendo contactos desde Evolution API...
              </p>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  Esto puede tomar unos minutos dependiendo de la cantidad de contactos
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Sync Info */}
      {stats.lastSync && (
        <div className="text-center text-sm text-gray-500">
          Última sincronización: {formatDate(stats.lastSync)}
        </div>
      )}
    </div>
  );
};

export default Contacts; 