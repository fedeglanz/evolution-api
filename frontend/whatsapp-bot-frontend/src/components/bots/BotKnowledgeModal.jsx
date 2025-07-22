import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  TagIcon,
  DocumentIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { 
  useAvailableKnowledge,
  useAssignKnowledge,
  useUnassignKnowledge 
} from '../../hooks/useKnowledge';
import { knowledgeService } from '../../services/knowledge';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const BotKnowledgeModal = ({ isOpen, onClose, bot }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(3);
  const [showDropdown, setShowDropdown] = useState(null);

  // Queries y mutations
  const { data: knowledgeData, isLoading, refetch } = useAvailableKnowledge(bot?.id);
  const assignKnowledge = useAssignKnowledge();
  const unassignKnowledge = useUnassignKnowledge();

  const availableItems = knowledgeData?.data?.available || [];
  const assignedItems = knowledgeData?.data?.assigned || [];

  // Filtrar items disponibles por búsqueda
  const filteredAvailable = availableItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssign = async (knowledgeItemId) => {
    try {
      await assignKnowledge.mutateAsync({
        botId: bot.id,
        knowledgeItemId,
        priority: selectedPriority
      });
      refetch();
    } catch (error) {
      console.error('Error assigning knowledge:', error);
    }
  };

  const handleUnassign = async (knowledgeItemId) => {
    if (window.confirm('¿Estás seguro de que quieres quitar este knowledge del bot?')) {
      try {
        await unassignKnowledge.mutateAsync({
          botId: bot.id,
          knowledgeItemId
        });
        refetch();
      } catch (error) {
        console.error('Error unassigning knowledge:', error);
      }
    }
  };

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

  const getPriorityColor = (priority) => {
    const colorMap = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-gray-100 text-gray-800'
    };
    return colorMap[priority] || colorMap[3];
  };

  const getPriorityText = (priority) => {
    const textMap = {
      1: 'Alta',
      2: 'Media-Alta',
      3: 'Media',
      4: 'Media-Baja',
      5: 'Baja'
    };
    return textMap[priority] || 'Media';
  };

  if (!bot) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      🧠
                    </div>
                    Knowledge Base - {bot.name}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Bot Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{bot.name}</h3>
                      <p className="text-sm text-gray-600">{bot.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Instancia: {bot.instance_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {assignedItems.length} Knowledge Items
                      </div>
                      <div className="text-xs text-gray-500">asignados</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Knowledge Asignado */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Knowledge Asignado ({assignedItems.length})
                    </h3>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {assignedItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <DocumentIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay knowledge asignado a este bot</p>
                          <p className="text-sm">Asigna knowledge items para que el bot tenga contexto</p>
                        </div>
                      ) : (
                        assignedItems.map((item) => {
                          const typeInfo = getContentTypeInfo(item.content_type);
                          
                          return (
                            <div key={item.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm">{typeInfo.icon}</span>
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {item.title}
                                    </h4>
                                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(item.priority)}`}>
                                      {getPriorityText(item.priority)}
                                    </span>
                                  </div>
                                  
                                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                    {item.content_summary || item.content?.substring(0, 100) + '...'}
                                  </p>
                                  
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex items-center space-x-1 mb-1">
                                      <TagIcon className="h-3 w-3 text-gray-400" />
                                      <div className="flex flex-wrap gap-1">
                                        {item.tags.slice(0, 3).map((tag, index) => (
                                          <span key={index} className="text-xs bg-gray-200 text-gray-700 px-1 rounded">
                                            {tag}
                                          </span>
                                        ))}
                                        {item.tags.length > 3 && (
                                          <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="text-xs text-gray-500">
                                    Asignado {formatDistanceToNow(new Date(item.assigned_at), { locale: es, addSuffix: true })}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => handleUnassign(item.id)}
                                  disabled={unassignKnowledge.isPending}
                                  className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                  title="Quitar knowledge"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Knowledge Disponible */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Knowledge Disponible ({filteredAvailable.length})
                      </h3>
                    </div>

                    {/* Búsqueda */}
                    <div className="mb-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar knowledge..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Selector de Prioridad */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad para nuevas asignaciones
                      </label>
                      <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={1}>1 - Alta</option>
                        <option value={2}>2 - Media-Alta</option>
                        <option value={3}>3 - Media</option>
                        <option value={4}>4 - Media-Baja</option>
                        <option value={5}>5 - Baja</option>
                      </select>
                    </div>

                    {/* Lista de Knowledge Disponible */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      ) : filteredAvailable.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <DocumentIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay knowledge disponible</p>
                          {searchTerm && (
                            <p className="text-sm">No se encontraron resultados para "{searchTerm}"</p>
                          )}
                        </div>
                      ) : (
                        filteredAvailable.map((item) => {
                          const typeInfo = getContentTypeInfo(item.content_type);
                          
                          return (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-sm">{typeInfo.icon}</span>
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {item.title}
                                    </h4>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                      {typeInfo.label}
                                    </span>
                                  </div>
                                  
                                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                    {item.content_summary || item.content?.substring(0, 100) + '...'}
                                  </p>
                                  
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex items-center space-x-1 mb-1">
                                      <TagIcon className="h-3 w-3 text-gray-400" />
                                      <div className="flex flex-wrap gap-1">
                                        {item.tags.slice(0, 3).map((tag, index) => (
                                          <span key={index} className="text-xs bg-gray-200 text-gray-700 px-1 rounded">
                                            {tag}
                                          </span>
                                        ))}
                                        {item.tags.length > 3 && (
                                          <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {item.assigned_bots_count > 0 && (
                                    <div className="text-xs text-blue-600">
                                      Ya asignado a {item.assigned_bots_count} bot(s)
                                    </div>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => handleAssign(item.id)}
                                  disabled={assignKnowledge.isPending}
                                  className="ml-2 p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
                                  title="Asignar knowledge"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BotKnowledgeModal; 