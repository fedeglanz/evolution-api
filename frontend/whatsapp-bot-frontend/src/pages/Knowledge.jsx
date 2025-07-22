import React, { useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { 
  useKnowledgeItems, 
  useDeleteKnowledgeItem,
  useKnowledgeStats 
} from '../hooks/useKnowledge';
import { knowledgeService } from '../services/knowledge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import CreateKnowledgeModal from '../components/knowledge/CreateKnowledgeModal';
import EditKnowledgeModal from '../components/knowledge/EditKnowledgeModal';
import UploadFileModal from '../components/knowledge/UploadFileModal';
import KnowledgeItemCard from '../components/knowledge/KnowledgeItemCard';
import KnowledgeStatsCards from '../components/knowledge/KnowledgeStatsCards';

const Knowledge = () => {
  // Estados locales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] = useState(null);
  const [filters, setFilters] = useState({
    active_only: 'true',
    content_type: '',
    search: '',
    limit: 20,
    offset: 0
  });
  const [selectedItems, setSelectedItems] = useState([]);

  // Queries
  const { data: knowledgeData, isLoading, error, refetch } = useKnowledgeItems(filters);
  const { data: statsData, isLoading: statsLoading } = useKnowledgeStats();
  const deleteKnowledgeMutation = useDeleteKnowledgeItem();

  // Handlers
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      offset: 0 // Reset to first page
    }));
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value,
      offset: 0 // Reset to first page
    }));
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este knowledge item?')) {
      try {
        await deleteKnowledgeMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting knowledge item:', error);
      }
    }
  };

  const handleEditItem = (item) => {
    setSelectedItemToEdit(item);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedItemToEdit(null);
    refetch();
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = knowledgeData?.data?.items?.map(item => item.id) || [];
    setSelectedItems(prev => prev.length === allIds.length ? [] : allIds);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedItems.length} knowledge items?`)) {
      try {
        await Promise.all(selectedItems.map(id => deleteKnowledgeMutation.mutateAsync(id)));
        setSelectedItems([]);
      } catch (error) {
        console.error('Error in bulk delete:', error);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage 
          message="Error cargando knowledge base"
          onRetry={refetch}
        />
      </div>
    );
  }

  const knowledgeItems = knowledgeData?.data?.items || [];
  const stats = statsData?.data || {};  // 🔧 FIX: stats están directamente en data
  const totalItems = knowledgeData?.data?.total || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Base de Conocimientos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona el conocimiento de tus bots para respuestas más inteligentes
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Subir Archivo
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Crear Knowledge
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="mb-6">
          <KnowledgeStatsCards stats={stats} />
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en knowledge base..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filters.content_type}
              onChange={(e) => handleFilterChange('content_type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="manual">Manual</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
            </select>

            <select
              value={filters.active_only}
              onChange={(e) => handleFilterChange('active_only', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">Solo activos</option>
              <option value="">Todos</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-md p-3">
            <span className="text-sm text-blue-700">
              {selectedItems.length} knowledge items seleccionados
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={deleteKnowledgeMutation.isPending}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                Eliminar seleccionados
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Knowledge Items ({totalItems})
          </h2>
          
          {knowledgeItems.length > 0 && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.length === knowledgeItems.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Seleccionar todo</span>
            </label>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {filters.search && (
            <span>Filtrando por: "{filters.search}"</span>
          )}
        </div>
      </div>

      {/* Knowledge Items List */}
      <div className="space-y-4">
        {knowledgeItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-400 text-6xl mb-4">🧠</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay knowledge items
            </h3>
            <p className="text-gray-500 mb-4">
              {filters.search 
                ? `No se encontraron resultados para "${filters.search}"`
                : 'Comienza creando tu primer knowledge item o subiendo un archivo'
              }
            </p>
            {!filters.search && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Crear Knowledge
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                  Subir Archivo
                </button>
              </div>
            )}
          </div>
        ) : (
          knowledgeItems.map((item) => (
            <KnowledgeItemCard
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => handleSelectItem(item.id)}
              onDelete={() => handleDeleteItem(item.id)}
              onEdit={() => handleEditItem(item)}
              isDeleting={deleteKnowledgeMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalItems > filters.limit && (
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700">
            Mostrando {filters.offset + 1} - {Math.min(filters.offset + filters.limit, totalItems)} de {totalItems} resultados
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('offset', Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => handleFilterChange('offset', filters.offset + filters.limit)}
              disabled={filters.offset + filters.limit >= totalItems}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateKnowledgeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />

      <EditKnowledgeModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItemToEdit(null);
        }}
        onSuccess={handleEditSuccess}
        knowledgeItem={selectedItemToEdit}
      />

      <UploadFileModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          refetch();
        }}
      />
    </div>
  );
};

export default Knowledge; 