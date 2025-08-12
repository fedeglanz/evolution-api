import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus,
  Play,
  Pause,
  Archive,
  Eye,
  Edit,
  Copy,
  ExternalLink,
  BarChart3,
  Calendar,
  Globe,
  Hash,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Link as LinkIcon
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../services/api';

// Función auxiliar para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Campaigns = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', searchTerm, selectedStatus],
    queryFn: () => api.get('/campaigns', {
      params: {
        search: searchTerm,
        status: selectedStatus,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: () => api.get('/instances').then(res => res.data)
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (campaignData) => api.post('/campaigns', campaignData),
    onSuccess: () => {
      toast.success('Campaña creada exitosamente');
      queryClient.invalidateQueries(['campaigns']);
      setShowCreateModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear campaña');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ campaignId, status }) => 
      api.patch(`/campaigns/${campaignId}/status`, { status }),
    onSuccess: () => {
      toast.success('Estado actualizado exitosamente');
      queryClient.invalidateQueries(['campaigns']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ campaignId, instanceId }) => 
      api.post(`/campaigns/${campaignId}/groups`, { instanceId }),
    onSuccess: () => {
      toast.success('Grupo creado exitosamente');
      queryClient.invalidateQueries(['campaigns']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear grupo');
    }
  });

  // Mutación para editar campaña
  const editCampaignMutation = useMutation({
    mutationFn: ({ campaignId, updates }) => 
      api.put(`/campaigns/${campaignId}`, updates),
    onSuccess: (response) => {
      toast.success('Actualización masiva iniciada en segundo plano');
      queryClient.invalidateQueries(['campaigns']);
      setShowEditModal(false);
      setEditingCampaign(null);
      
      // Mostrar información adicional
      if (response.data?.data?.note) {
        setTimeout(() => {
          toast.success(response.data.data.note, { duration: 6000 });
        }, 1000);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar campaña');
    }
  });

  // Query para obtener progreso de actualización
  const { data: updateProgressData } = useQuery({
    queryKey: ['campaign-update-progress', editingCampaign?.id],
    queryFn: () => editingCampaign?.id ? api.get(`/campaigns/${editingCampaign.id}/update-progress`) : null,
    enabled: !!editingCampaign?.id && showEditModal,
    refetchInterval: 2000, // Actualizar cada 2 segundos
  });

  const campaigns = campaignsData?.data || [];
  const pagination = campaignsData?.pagination || {};
  const instances = instancesData?.data || [];

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      archived: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: Clock,
      active: Play,
      paused: Pause,
      completed: CheckCircle,
      archived: Archive
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-3 w-3" />;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  // Funciones para manejar edición
  const handleEditCampaign = (campaign) => {
    setEditingCampaign({
      ...campaign,
      // Convertir valores para el formulario
      only_admins: campaign.only_admins_can_send || false,
      max_members_per_group: campaign.max_members_per_group || 950,
      group_description: campaign.group_description || '',
      group_image_url: campaign.group_image_url || ''
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = (formData) => {
    if (!editingCampaign) return;

    // Preparar datos para envío
    const updates = {
      name: formData.name,
      group_description: formData.group_description,
      only_admins: formData.only_admins,
      max_members_per_group: parseInt(formData.max_members_per_group),
      group_image_url: formData.group_image_url
    };

    // Filtrar solo campos que han cambiado
    const changedFields = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== editingCampaign[key === 'only_admins' ? 'only_admins_can_send' : key]) {
        changedFields[key] = updates[key];
      }
    });

    if (Object.keys(changedFields).length === 0) {
      toast.info('No hay cambios para aplicar');
      return;
    }

    editCampaignMutation.mutate({
      campaignId: editingCampaign.id,
      updates: changedFields
    });
  };

  const getUpdateProgress = () => {
    return updateProgressData?.data?.data || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas de Grupos</h1>
          <p className="text-gray-600">Gestiona campañas de WhatsApp con auto-creación de grupos</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries(['campaigns'])}
            disabled={campaignsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${campaignsLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Campañas</p>
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Miembros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.total_members || 0), 0)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Hash className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Grupos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.groups_count || 0), 0)}
                </p>
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
                  placeholder="Buscar campañas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
                <option value="completed">Completada</option>
                <option value="archived">Archivada</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Campaigns List */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center justify-between">
            <span>Lista de Campañas</span>
            <span className="text-sm font-normal text-gray-500">
              {pagination.total ? `${pagination.total} campañas` : ''}
            </span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {campaignsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Cargando campañas...</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay campañas</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedStatus 
                    ? 'No se encontraron campañas con los filtros aplicados' 
                    : 'Crea tu primera campaña para comenzar'
                  }
                </p>
                {!searchTerm && !selectedStatus && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Campaña
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          <span className="ml-1 capitalize">{campaign.status}</span>
                        </span>
                      </div>

                      {/* Description */}
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {campaign.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 mr-1" />
                          <span>{campaign.groups_count || 0} grupos</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{campaign.total_members || 0} miembros</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Creada {formatDate(campaign.created_at)}</span>
                        </div>
                      </div>

                      {/* Distributor Link */}
                      {campaign.distributor_slug && (
                        <div className="mt-3 flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            /campaigns/public/{campaign.distributor_slug}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${window.location.origin}/campaigns/public/${campaign.distributor_slug}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCampaign(campaign)}
                        title="Editar campaña y grupos"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {campaign.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ campaignId: campaign.id, status: 'active' })}
                          disabled={updateStatusMutation.isLoading}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}

                      {campaign.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ campaignId: campaign.id, status: 'paused' })}
                          disabled={updateStatusMutation.isLoading}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}

                      {campaign.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ campaignId: campaign.id, status: 'active' })}
                          disabled={updateStatusMutation.isLoading}
                          title="Reactivar campaña"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}

                      {(campaign.status === 'completed' || campaign.status === 'paused') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres archivar esta campaña? Los grupos existentes se mantendrán pero la campaña se ocultará de la vista principal.')) {
                              updateStatusMutation.mutate({ campaignId: campaign.id, status: 'archived' });
                            }
                          }}
                          disabled={updateStatusMutation.isLoading}
                          title="Archivar campaña"
                          className="text-gray-600 hover:text-red-600"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}

                      {instances.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              createGroupMutation.mutate({ 
                                campaignId: campaign.id, 
                                instanceId: e.target.value 
                              });
                              e.target.value = '';
                            }
                          }}
                          className="text-xs px-2 py-1 border border-gray-300 rounded"
                          disabled={createGroupMutation.isLoading}
                        >
                          <option value="">+ Grupo</option>
                          {instances.map(instance => (
                            <option key={instance.id} value={instance.id}>
                              {instance.name || instance.instance_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createCampaignMutation.mutate(data)}
          isLoading={createCampaignMutation.isLoading}
        />
      )}

      {/* Campaign Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <EditCampaignModal
          isOpen={showEditModal}
          campaign={editingCampaign}
          onClose={() => {
            setShowEditModal(false);
            setEditingCampaign(null);
          }}
          onSubmit={handleSubmitEdit}
          isLoading={editCampaignMutation.isLoading}
          updateProgress={getUpdateProgress()}
        />
      )}
    </div>
  );
};

// Modal para crear campaña
const CreateCampaignModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupNameTemplate: '',
    groupDescription: '',
    maxMembersPerGroup: 950,
    autoCreateNewGroups: true,
    distributorTitle: '',
    distributorWelcomeMessage: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.groupNameTemplate.trim()) {
      toast.error('Nombre y plantilla de grupo son requeridos');
      return;
    }

    if (!formData.groupNameTemplate.includes('#{group_number}')) {
      toast.error('La plantilla del grupo debe incluir #{group_number}');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Nueva Campaña</h3>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Campaña *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Inversiones VIP 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la campaña..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plantilla del Nombre del Grupo *
              </label>
              <Input
                value={formData.groupNameTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, groupNameTemplate: e.target.value }))}
                placeholder="Ej: Inversiones VIP #{group_number}"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Debe incluir #{'{group_number}'} que será reemplazado por 1, 2, 3...
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Grupo
              </label>
              <textarea
                value={formData.groupDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, groupDescription: e.target.value }))}
                placeholder="Descripción que aparecerá en cada grupo de WhatsApp..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de Miembros por Grupo
              </label>
              <Input
                type="number"
                value={formData.maxMembersPerGroup}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMembersPerGroup: parseInt(e.target.value) || 950 }))}
                min="10"
                max="950"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del Distribuidor
              </label>
              <Input
                value={formData.distributorTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, distributorTitle: e.target.value }))}
                placeholder={`Únete a ${formData.name}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje de Bienvenida
              </label>
              <textarea
                value={formData.distributorWelcomeMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, distributorWelcomeMessage: e.target.value }))}
                placeholder={`Bienvenido a ${formData.name}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoCreate"
                checked={formData.autoCreateNewGroups}
                onChange={(e) => setFormData(prev => ({ ...prev, autoCreateNewGroups: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoCreate" className="ml-2 block text-sm text-gray-900">
                Crear automáticamente nuevos grupos cuando se llene uno
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Campaña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para detalles de campaña
const CampaignDetailsModal = ({ campaign, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Información General</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Estado:</span> <span className="capitalize">{campaign.status}</span></div>
                <div><span className="font-medium">Grupos:</span> {campaign.groups_count || 0}</div>
                <div><span className="font-medium">Miembros:</span> {campaign.total_members || 0}</div>
                <div><span className="font-medium">Creada:</span> {formatDate(campaign.created_at)}</div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Link con Formulario */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  Link con Formulario
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Los usuarios completan sus datos y son agregados automáticamente al grupo
                </p>
                <div className="bg-blue-50 p-3 rounded text-sm mb-3 border border-blue-200">
                  <code className="text-blue-700 break-all">
                    {window.location.origin}/campaigns/public/{campaign.distributor_slug}
                  </code>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/campaigns/public/${campaign.distributor_slug}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Link con formulario copiado');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/campaigns/public/${campaign.distributor_slug}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir
                  </Button>
                </div>
              </div>

              {/* Link Directo */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-green-600" />
                  Link Directo al Grupo
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Redirección instantánea al grupo de WhatsApp sin formulario
                </p>
                <div className="bg-green-50 p-3 rounded text-sm mb-3 border border-green-200">
                  <code className="text-green-700 break-all">
                    https://whatsapp-bot-backend-fnte.onrender.com/api/campaigns/direct/{campaign.distributor_slug}
                  </code>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const url = `https://whatsapp-bot-backend-fnte.onrender.com/api/campaigns/direct/${campaign.distributor_slug}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Link directo copiado');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const url = `https://whatsapp-bot-backend-fnte.onrender.com/api/campaigns/direct/${campaign.distributor_slug}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Probar
                  </Button>
                </div>
              </div>

              {/* Estadísticas de Uso */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                  Recomendaciones de Uso
                </h5>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Con Formulario:</strong> Para capturar leads y datos de contacto</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Link Directo:</strong> Para conversión rápida y viral</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para Editar Campaña
const EditCampaignModal = ({ isOpen, onClose, campaign, onSubmit, isLoading, updateProgress }) => {
  const [formData, setFormData] = useState({
    name: '',
    group_description: '',
    only_admins: false,
    max_members_per_group: 950,
    group_image_url: ''
  });

  // Inicializar formulario cuando cambia la campaña
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        group_description: campaign.group_description || '',
        only_admins: campaign.only_admins || false,
        max_members_per_group: campaign.max_members_per_group || 950,
        group_image_url: campaign.group_image_url || ''
      });
    }
  }, [campaign]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Editar Campaña: {campaign?.name}
            </h2>
            <Button variant="ghost" onClick={onClose} size="sm">
              ×
            </Button>
          </div>

          {/* Progreso de actualización */}
          {updateProgress && updateProgress.status === 'processing' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900">
                  🚀 Actualizando grupos...
                </h3>
                <span className="text-blue-700 font-medium">
                  {updateProgress.progressPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${updateProgress.progressPercentage || 0}%` }}
                />
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Procesando {updateProgress.processedGroups || 0} de {updateProgress.totalGroups || 0} grupos
              </p>
              {updateProgress.errors && updateProgress.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-600">
                    ⚠️ {updateProgress.errors.length} errores detectados
                  </p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre de la campaña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Nombre de la Campaña
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Traders VIP 2024"
                required
                minLength={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Se actualizará el nombre en todos los grupos existentes
              </p>
            </div>

            {/* Descripción del grupo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📄 Descripción de los Grupos
              </label>
              <textarea
                value={formData.group_description}
                onChange={(e) => handleChange('group_description', e.target.value)}
                placeholder="Descripción que aparecerá en todos los grupos de WhatsApp..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se aplicará a todos los grupos de la campaña
              </p>
            </div>

            {/* Solo admins pueden escribir */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.only_admins}
                  onChange={(e) => handleChange('only_admins', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    🔒 Solo admins pueden enviar mensajes
                  </span>
                  <p className="text-xs text-gray-500">
                    Configura todos los grupos para que solo los administradores puedan escribir
                  </p>
                </div>
              </label>
            </div>

            {/* Máximo de miembros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 Máximo de Miembros por Grupo
              </label>
              <Input
                type="number"
                value={formData.max_members_per_group}
                onChange={(e) => handleChange('max_members_per_group', parseInt(e.target.value) || 950)}
                min={5}
                max={1000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Entre 5 y 1000 miembros. Se aplicará a grupos futuros.
              </p>
            </div>

            {/* URL de imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🖼️ URL de Imagen del Grupo
              </label>
              <Input
                type="url"
                value={formData.group_image_url}
                onChange={(e) => handleChange('group_image_url', e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se actualizará la imagen en todos los grupos existentes
              </p>
            </div>

            {/* Advertencia */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Actualización Masiva</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Los cambios se aplicarán a <strong>todos los grupos</strong> de esta campaña.
                    El proceso puede tomar varios minutos y se ejecutará en segundo plano.
                  </p>
                  <div className="mt-2 text-xs text-amber-600">
                    • Se aplicarán delays humanizados entre grupos<br/>
                    • Recibirás notificaciones del progreso<br/>
                    • Los errores se registrarán individualmente
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando Actualización...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Actualizar Campaña y Grupos
                  </>
                )}
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

export default Campaigns; 