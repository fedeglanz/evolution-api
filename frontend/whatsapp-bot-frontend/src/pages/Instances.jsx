import React, { useState } from 'react';
import { 
  Plus, 
  QrCode, 
  Power, 
  PowerOff, 
  Trash2, 
  Search, 
  RefreshCw, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Smartphone,
  Globe,
  Calendar,
  Activity,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CreateInstanceModal from '../components/instances/CreateInstanceModal';
import QRCodeModal from '../components/instances/QRCodeModal';
import { 
  useInstances, 
  useCreateInstance, 
  useUpdateInstance, 
  useDeleteInstance, 
  useConnectInstance, 
  useDisconnectInstance,
  useSyncInstanceState,
  useSyncAllInstancesState,
  useRegenerateWorkflow,
  useActivateWorkflow,
  useDeactivateWorkflow
} from '../hooks/useInstances';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const Instances = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModal, setQrModal] = useState({ isOpen: false, instanceId: null, instanceName: '' });
  
  const { data, isLoading, error, refetch } = useInstances(currentPage, 10, statusFilter);
  const deleteInstanceMutation = useDeleteInstance();
  const connectInstanceMutation = useConnectInstance();
  const disconnectInstanceMutation = useDisconnectInstance();
  const syncAllInstancesMutation = useSyncAllInstancesState({
    onSuccess: () => {
      refetch(); // Refrescar la lista después de sincronizar
    }
  });
  const regenerateWorkflowMutation = useRegenerateWorkflow({
    onSuccess: () => {
      refetch(); // Refrescar la lista después de regenerar
    }
  });
  const activateWorkflowMutation = useActivateWorkflow({
    onSuccess: () => {
      refetch(); // Refrescar la lista después de activar
    }
  });
  const deactivateWorkflowMutation = useDeactivateWorkflow({
    onSuccess: () => {
      refetch(); // Refrescar la lista después de desactivar
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-success-700 bg-success-100 border-success-200';
      case 'connecting':
        return 'text-warning-700 bg-warning-100 border-warning-200';
      case 'disconnected':
        return 'text-error-700 bg-error-100 border-error-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Conectada';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectada';
      default:
        return 'Desconocido';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'connecting':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleShowQR = (instance) => {
    setQrModal({
      isOpen: true,
      instanceId: instance.id,
      instanceName: instance.name
    });
  };

  const handleConnect = async (instanceId) => {
    try {
      await connectInstanceMutation.mutateAsync(instanceId);
    } catch (error) {
      console.error('Error connecting instance:', error);
    }
  };

  const handleDisconnect = async (instanceId) => {
    try {
      await disconnectInstanceMutation.mutateAsync(instanceId);
    } catch (error) {
      console.error('Error disconnecting instance:', error);
    }
  };

  const handleDelete = async (instanceId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta instancia? Esta acción no se puede deshacer.')) {
      try {
        await deleteInstanceMutation.mutateAsync(instanceId);
      } catch (error) {
        console.error('Error deleting instance:', error);
      }
    }
  };

  const handleRegenerateWorkflow = async (instanceId) => {
    if (window.confirm('¿Regenerar la automatización de mensajes? Esto creará una nueva configuración automática.')) {
      try {
        await regenerateWorkflowMutation.mutateAsync(instanceId);
      } catch (error) {
        console.error('Error regenerating workflow:', error);
      }
    }
  };

  const handleActivateWorkflow = async (instanceId) => {
    try {
      await activateWorkflowMutation.mutateAsync(instanceId);
    } catch (error) {
      console.error('Error activating workflow:', error);
    }
  };

  const handleDeactivateWorkflow = async (instanceId) => {
    if (window.confirm('¿Desactivar la automatización de mensajes? Los mensajes no se procesarán automáticamente.')) {
      try {
        await deactivateWorkflowMutation.mutateAsync(instanceId);
      } catch (error) {
        console.error('Error deactivating workflow:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Nunca';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} días`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instancias WhatsApp</h1>
            <p className="text-gray-600">Gestiona tus conexiones de WhatsApp Business</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instancias WhatsApp</h1>
            <p className="text-gray-600">Gestiona tus conexiones de WhatsApp Business</p>
          </div>
        </div>
        
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar instancias</h3>
          <p className="text-gray-600 mb-4">{error.message || 'No se pudieron cargar las instancias'}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  const instances = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instancias WhatsApp</h1>
          <p className="text-gray-600">Gestiona tus conexiones de WhatsApp Business</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button 
            onClick={() => syncAllInstancesMutation.mutate()} 
            variant="outline" 
            size="sm"
            loading={syncAllInstancesMutation.isLoading}
            disabled={syncAllInstancesMutation.isLoading}
          >
            <Activity className="h-4 w-4 mr-2" />
            Sincronizar Estados
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} variant="whatsapp">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Instancia
          </Button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setStatusFilter(null)}
          variant={statusFilter === null ? 'primary' : 'outline'}
          size="sm"
        >
          Todas ({pagination.total || 0})
        </Button>
        <Button
          onClick={() => setStatusFilter('connected')}
          variant={statusFilter === 'connected' ? 'success' : 'outline'}
          size="sm"
        >
          Conectadas
        </Button>
        <Button
          onClick={() => setStatusFilter('disconnected')}
          variant={statusFilter === 'disconnected' ? 'danger' : 'outline'}
          size="sm"
        >
          Desconectadas
        </Button>
      </div>

      {instances.length === 0 ? (
        <Card className="p-8 text-center">
          <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay instancias</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter 
              ? `No hay instancias con estado "${statusFilter}"`
              : 'Crea tu primera instancia de WhatsApp para comenzar'
            }
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} variant="whatsapp">
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Instancia
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <Card key={instance.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-whatsapp-500 to-whatsapp-600 rounded-xl flex items-center justify-center">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{instance.name}</h3>
                      <p className="text-sm text-gray-500">{instance.phoneNumber || 'Sin número'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-full border ${getStatusColor(instance.status)}`}>
                    {getStatusIcon(instance.status)}
                    <span>{getStatusText(instance.status)}</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Última actividad:</span>
                    <span className="text-gray-900">{formatRelativeTime(instance.lastSeen)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Creada:</span>
                    <span className="text-gray-900">{formatDate(instance.createdAt)}</span>
                  </div>
                  {instance.connectedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Conectada:</span>
                      <span className="text-gray-900">{formatDate(instance.connectedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Debug: Mostrar status actual */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500 w-full">
                      Debug status: "{instance.status}"
                    </div>
                  )}
                  
                  {/* Botones para instancias NO conectadas */}
                  {(instance.status === 'disconnected' || 
                    instance.status === 'created' || 
                    instance.status === 'inactive' || 
                    instance.status === 'connecting' ||
                    !instance.status ||
                    instance.status !== 'connected') && (
                    <>
                      <Button
                        onClick={() => handleShowQR(instance)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR
                      </Button>
                      <Button
                        onClick={() => handleConnect(instance.id)}
                        size="sm"
                        variant="success"
                        className="flex-1"
                        loading={connectInstanceMutation.isLoading}
                      >
                        <Power className="h-4 w-4 mr-1" />
                        Conectar
                      </Button>
                    </>
                  )}

                  {/* Botones para instancias conectadas */}
                  {instance.status === 'connected' && (
                    <>
                      <Button
                        onClick={() => handleShowQR(instance)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        Ver QR
                      </Button>
                      <Button
                        onClick={() => handleDisconnect(instance.id)}
                        size="sm"
                        variant="warning"
                        className="flex-1"
                        loading={disconnectInstanceMutation.isLoading}
                      >
                        <PowerOff className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                    </>
                  )}

                  {/* Botón regenerar automatización (cuando no hay workflow o hay problemas) */}
                  {(!instance.n8nWorkflowId || !instance.webhookUrl) && (
                    <Button
                      onClick={() => handleRegenerateWorkflow(instance.id)}
                      size="sm"
                      variant="outline"
                      loading={regenerateWorkflowMutation.isLoading}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      title="Regenerar automatización de mensajes"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Regenerar Automatización
                    </Button>
                  )}

                  {/* Botón activar automatización (si está desactivada) */}
                  {instance.status === 'disconnected' && (
                    <Button
                      onClick={() => handleActivateWorkflow(instance.id)}
                      size="sm"
                      variant="success"
                      loading={activateWorkflowMutation.isLoading}
                      className="flex-1"
                      title="Activar automatización de mensajes"
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Activar Automatización
                    </Button>
                  )}

                  {/* Botón desactivar automatización (si está activada) */}
                  {instance.status === 'connected' && (
                    <Button
                      onClick={() => handleDeactivateWorkflow(instance.id)}
                      size="sm"
                      variant="warning"
                      loading={deactivateWorkflowMutation.isLoading}
                      className="flex-1"
                      title="Desactivar automatización de mensajes"
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                      Desactivar Automatización
                    </Button>
                  )}

                  {/* Botón eliminar (siempre visible) */}
                  <Button
                    onClick={() => handleDelete(instance.id)}
                    size="sm"
                    variant="danger"
                    loading={deleteInstanceMutation.isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} instancias
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pagination.pages}
              variant="outline"
              size="sm"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modales */}
      <CreateInstanceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch(); // Refrescar la lista de instancias
        }}
      />

      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, instanceId: null, instanceName: '' })}
        instanceId={qrModal.instanceId}
        instanceName={qrModal.instanceName}
      />
    </div>
  );
};

export default Instances; 