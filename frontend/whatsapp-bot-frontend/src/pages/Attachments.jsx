import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Send, 
  Trash2, 
  Image, 
  FileText, 
  Music, 
  Video,
  File,
  Eye,
  Calendar,
  BarChart3,
  HardDrive
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import api from '../services/api';

const Attachments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: attachmentsData, isLoading } = useQuery({
    queryKey: ['attachments', searchTerm, fileTypeFilter],
    queryFn: () => api.get('/attachments', {
      params: {
        search: searchTerm,
        file_type: fileTypeFilter,
        limit: 50
      }
    }).then(res => res.data)
  });

  const { data: statsData } = useQuery({
    queryKey: ['attachments-stats'],
    queryFn: () => api.get('/attachments/stats').then(res => res.data)
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
  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['attachments']);
      queryClient.invalidateQueries(['attachments-stats']);
      toast.success('Archivo subido exitosamente');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al subir archivo');
    }
  });

  const sendFileMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/attachments/${id}/send`, data),
    onSuccess: () => {
      setShowSendModal(false);
      toast.success('Archivo enviado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al enviar archivo');
    }
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id) => api.delete(`/attachments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['attachments']);
      queryClient.invalidateQueries(['attachments-stats']);
      toast.success('Archivo eliminado exitosamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar archivo');
    }
  });

  const attachments = attachmentsData?.data?.attachments || [];
  const stats = statsData?.stats || {};
  const instances = instancesData?.data || [];
  const contacts = contactsData?.data || [];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadMutation.mutate(formData);
  };

  const handleDownload = (attachment) => {
    const downloadUrl = `/api/attachments/${attachment.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  const handleSendFile = (data) => {
    sendFileMutation.mutate({ id: selectedAttachment.id, ...data });
  };

  const handleDeleteAttachment = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      deleteAttachmentMutation.mutate(id);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return <Image className="h-8 w-8 text-blue-500" />;
      case 'audio': return <Music className="h-8 w-8 text-green-500" />;
      case 'video': return <Video className="h-8 w-8 text-red-500" />;
      case 'document': return <FileText className="h-8 w-8 text-orange-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fileTypes = [
    { value: 'image', label: 'Imágenes', count: stats.by_type?.find(t => t.file_type === 'image')?.count || 0 },
    { value: 'audio', label: 'Audio', count: stats.by_type?.find(t => t.file_type === 'audio')?.count || 0 },
    { value: 'video', label: 'Videos', count: stats.by_type?.find(t => t.file_type === 'video')?.count || 0 },
    { value: 'document', label: 'Documentos', count: stats.by_type?.find(t => t.file_type === 'document')?.count || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Archivos Multimedia</h1>
          <p className="text-gray-600">Gestiona y envía archivos multimedia por WhatsApp</p>
        </div>
        <div className="flex space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isLoading}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{uploadMutation.isLoading ? 'Subiendo...' : 'Subir Archivo'}</span>
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <File className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Archivos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totals?.files || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Almacenamiento</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totals?.storage_mb || 0} MB</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Promedio por Archivo</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totals?.files > 0 ? 
                  Math.round(stats.totals.storage_mb / stats.totals.files * 100) / 100 + ' MB' : 
                  '0 MB'
                }
              </p>
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
                placeholder="Buscar archivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {fileTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de Archivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))
        ) : attachments.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay archivos</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || fileTypeFilter ? 
                'No se encontraron archivos con los filtros aplicados.' :
                'Sube tu primer archivo para comenzar a enviarlo por WhatsApp.'
              }
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Subir Archivo
            </Button>
          </Card>
        ) : (
          attachments.map(attachment => (
            <Card key={attachment.id} className="p-4 hover:shadow-md transition-shadow">
              {/* Header del archivo */}
              <div className="flex items-center space-x-3 mb-4">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {attachment.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(attachment.file_size)} • {attachment.file_type}
                  </p>
                </div>
              </div>

              {/* Preview para imágenes */}
              {attachment.file_type === 'image' && (
                <div className="mb-4">
                  <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Vista previa</span>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mb-4 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full ${
                    attachment.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {attachment.is_public ? 'Público' : 'Privado'}
                  </span>
                </div>
                {attachment.uploaded_by_email && (
                  <p className="mt-1">Subido por: {attachment.uploaded_by_email}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  className="flex-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAttachment(attachment);
                    setShowSendModal(true);
                  }}
                  className="flex-1"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Enviar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Envío */}
      {showSendModal && selectedAttachment && (
        <SendFileModal
          attachment={selectedAttachment}
          instances={instances}
          contacts={contacts}
          onClose={() => {
            setShowSendModal(false);
            setSelectedAttachment(null);
          }}
          onSubmit={handleSendFile}
          isLoading={sendFileMutation.isLoading}
        />
      )}
    </div>
  );
};

// Modal para enviar archivo
const SendFileModal = ({ attachment, instances, contacts, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    instance_id: '',
    contact_id: '',
    phone: '',
    caption: ''
  });

  const [useContact, setUseContact] = useState(false);

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

    const submitData = {
      ...formData,
      contact_id: useContact ? formData.contact_id : null,
      phone: useContact ? null : formData.phone
    };

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            Enviar: {attachment.original_filename}
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

            {/* Caption (solo para imágenes y videos) */}
            {(attachment.file_type === 'image' || attachment.file_type === 'video') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto adicional (opcional)
                </label>
                <textarea
                  value={formData.caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Añade un texto al archivo..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Enviando...' : 'Enviar Archivo'}
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

export default Attachments; 