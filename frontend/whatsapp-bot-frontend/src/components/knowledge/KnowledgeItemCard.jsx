import React, { useState } from 'react';
import { 
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  CalendarIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { knowledgeService } from '../../services/knowledge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const KnowledgeItemCard = ({ 
  item, 
  isSelected, 
  onSelect, 
  onDelete, 
  onEdit, 
  isDeleting = false 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Iconos y colores por tipo de contenido
  const getContentTypeInfo = (contentType) => {
    const typeMap = {
      'manual': { icon: '✍️', color: 'blue', label: 'Manual' },
      'pdf': { icon: '📄', color: 'red', label: 'PDF' },
      'docx': { icon: '📝', color: 'blue', label: 'DOCX' },
      'txt': { icon: '📃', color: 'gray', label: 'Texto' },
      'url': { icon: '🔗', color: 'green', label: 'URL' },
      'api': { icon: '🔌', color: 'purple', label: 'API' }
    };
    return typeMap[contentType] || typeMap.manual;
  };

  // Estado de procesamiento
  const getProcessingStatus = (status) => {
    const statusMap = {
      'completed': { icon: CheckCircleIcon, color: 'green', label: 'Completado' },
      'processing': { icon: ClockIcon, color: 'yellow', label: 'Procesando...' },
      'error': { icon: ExclamationTriangleIcon, color: 'red', label: 'Error' },
      'pending': { icon: ClockIcon, color: 'gray', label: 'Pendiente' }
    };
    return statusMap[status] || statusMap.completed;
  };

  const typeInfo = getContentTypeInfo(item.content_type);
  const statusInfo = getProcessingStatus(item.processing_status);
  const StatusIcon = statusInfo.icon;

  const handleEdit = () => {
    setShowDropdown(false);
    if (onEdit) onEdit(item);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    if (onDelete) onDelete(item.id);
  };

  const handleView = () => {
    setShowDropdown(false);
    setShowDetails(!showDetails);
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatFileSize = (bytes) => {
    return knowledgeService.formatFileSize(bytes);
  };

  return (
    <div className={`bg-white rounded-lg shadow border transition-all duration-200 ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Checkbox */}
            <div className="flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {/* Content Type Icon */}
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-${typeInfo.color}-50 border border-${typeInfo.color}-200`}>
                {typeInfo.icon}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {item.title}
                </h3>
                
                {/* Status Badge */}
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </div>

                {/* Type Badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                  {typeInfo.label}
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {item.content_summary || (item.content ? item.content.substring(0, 120) + '...' : 'Sin contenido')}
              </p>

              {/* Metadata Row */}
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                <div className="flex items-center">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {formatDate(item.created_at)}
                </div>
                
                {item.file_size && (
                  <div className="flex items-center">
                    <DocumentDuplicateIcon className="w-3 h-3 mr-1" />
                    {formatFileSize(item.file_size)}
                  </div>
                )}
                
                {item.assigned_bots_count > 0 && (
                  <div className="flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    {item.assigned_bots_count} bot{item.assigned_bots_count !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="flex items-center">
                  📝 {item.content ? Math.round(item.content.length / 4) : 0} palabras
                </div>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center mt-2">
                  <TagIcon className="w-3 h-3 text-gray-400 mr-1" />
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{item.tags.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              disabled={isDeleting}
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-md shadow-lg border z-10">
                <div className="py-1">
                  <button
                    onClick={handleView}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
                  </button>
                  
                  <button
                    onClick={handleEdit}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {item.processing_status === 'error' && item.processing_error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <strong>Error de procesamiento:</strong> {item.processing_error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            {/* Full Content Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Contenido:</h4>
              <div className="bg-white p-3 rounded border text-sm text-gray-700 max-h-40 overflow-y-auto">
                {item.content || 'Sin contenido disponible'}
              </div>
            </div>

            {/* File Info */}
            {item.file_name && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Archivo original:</h4>
                <p className="text-sm text-gray-600">{item.file_name}</p>
              </div>
            )}

            {/* All Tags */}
            {item.tags && item.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags completos:</h4>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Bots */}
            {item.assigned_bots && item.assigned_bots.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Asignado a bots:</h4>
                <div className="space-y-1">
                  {item.assigned_bots.map((bot, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{bot.name}</span>
                      <span className="text-xs text-gray-500">
                        Prioridad {bot.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Info */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">ID:</span> {item.id}
              </div>
              <div>
                <span className="font-medium">Actualizado:</span> {formatDate(item.updated_at)}
              </div>
              <div>
                <span className="font-medium">Embeddings:</span> {item.embeddings_generated ? 'Sí' : 'No'}
              </div>
              <div>
                <span className="font-medium">Estado:</span> {item.is_active ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default KnowledgeItemCard; 