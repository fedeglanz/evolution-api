import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, PencilIcon, TagIcon } from '@heroicons/react/24/outline';
import { useUpdateKnowledgeItem } from '../../hooks/useKnowledge';
import LoadingSpinner from '../common/LoadingSpinner';

const EditKnowledgeModal = ({ isOpen, onClose, onSuccess, knowledgeItem }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    is_active: true
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState({});

  const updateKnowledgeMutation = useUpdateKnowledgeItem();

  // Cargar datos del knowledge item cuando se abre el modal
  useEffect(() => {
    if (knowledgeItem && isOpen) {
      setFormData({
        title: knowledgeItem.title || '',
        content: knowledgeItem.content || '',
        tags: Array.isArray(knowledgeItem.tags) ? [...knowledgeItem.tags] : [],
        is_active: knowledgeItem.is_active !== false
      });
    }
  }, [knowledgeItem, isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      tags: [],
      is_active: true
    });
    setNewTag('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    } else if (formData.title.length > 200) {
      newErrors.title = 'El título no puede exceder 200 caracteres';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'El contenido es requerido';
    } else if (formData.content.length < 10) {
      newErrors.content = 'El contenido debe tener al menos 10 caracteres';
    }

    if (formData.tags.length > 20) {
      newErrors.tags = 'Máximo 20 tags permitidos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const trimmedTag = newTag.trim().toLowerCase();
    
    if (formData.tags.includes(trimmedTag)) {
      setNewTag('');
      return;
    }

    if (formData.tags.length >= 20) {
      setErrors(prev => ({
        ...prev,
        tags: 'Máximo 20 tags permitidos'
      }));
      return;
    }

    if (trimmedTag.length > 50) {
      setErrors(prev => ({
        ...prev,
        tags: 'Los tags no pueden exceder 50 caracteres'
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, trimmedTag]
    }));
    setNewTag('');
    
    // Clear tag errors
    if (errors.tags) {
      setErrors(prev => ({
        ...prev,
        tags: null
      }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await updateKnowledgeMutation.mutateAsync({
        id: knowledgeItem.id,
        data: formData
      });
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating knowledge item:', error);
    }
  };

  const isLoading = updateKnowledgeMutation.isPending;
  const wordCount = formData.content ? Math.round(formData.content.length / 4) : 0;
  const charCount = formData.content.length;

  if (!knowledgeItem) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <PencilIcon className="h-4 w-4 text-orange-600" />
                    </div>
                    Editar Knowledge Item
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    disabled={isLoading}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Knowledge Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Editando:</span>
                    <span>{knowledgeItem.title}</span>
                    <span>•</span>
                    <span>Tipo: {knowledgeItem.content_type}</span>
                    {knowledgeItem.assigned_bots_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{knowledgeItem.assigned_bots_count} bot(s) asignado(s)</span>
                      </>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Active Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                      Knowledge item activo
                    </label>
                  </div>

                  {/* Title Field */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Ej: Información sobre horarios de atención"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                      maxLength={200}
                    />
                    <div className="flex justify-between mt-1">
                      <div>
                        {errors.title && (
                          <p className="text-sm text-red-600">{errors.title}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formData.title.length}/200
                      </div>
                    </div>
                  </div>

                  {/* Content Field */}
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                      Contenido *
                    </label>
                    <textarea
                      id="content"
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      placeholder="Edita aquí el conocimiento..."
                      rows={8}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical ${
                        errors.content ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                    />
                    <div className="flex justify-between mt-1">
                      <div>
                        {errors.content && (
                          <p className="text-sm text-red-600">{errors.content}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {charCount} caracteres • ~{wordCount} palabras
                      </div>
                    </div>
                  </div>

                  {/* Tags Field */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (opcional)
                    </label>
                    
                    {/* Tag Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Agregar tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        disabled={isLoading}
                        maxLength={50}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={isLoading || !newTag.trim() || formData.tags.length >= 20}
                        className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Current Tags */}
                    {formData.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-2 text-orange-600 hover:text-orange-800 focus:outline-none"
                              disabled={isLoading}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between mt-1">
                      <div>
                        {errors.tags && (
                          <p className="text-sm text-red-600">{errors.tags}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formData.tags.length}/20 tags
                      </div>
                    </div>
                  </div>

                  {/* Warning for file-based items */}
                  {knowledgeItem.content_type !== 'manual' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            ⚠️ Knowledge basado en archivo:
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              Este knowledge proviene de un archivo ({knowledgeItem.content_type.toUpperCase()}). 
                              Los cambios en el contenido solo afectarán la base de datos, no el archivo original.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !formData.title.trim() || !formData.content.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" color="white" className="mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditKnowledgeModal; 