import React, { useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  DocumentArrowUpIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useFileUploadWithProgress } from '../../hooks/useKnowledge';
import { knowledgeService } from '../../services/knowledge';
import LoadingSpinner from '../common/LoadingSpinner';

const UploadFileModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error

  const fileInputRef = useRef(null);
  const { uploadWithProgress, uploadProgress, isUploading } = useFileUploadWithProgress();

  const resetForm = () => {
    setSelectedFile(null);
    setMetadata({
      title: '',
      tags: []
    });
    setNewTag('');
    setErrors({});
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateFile = (file) => {
    const validation = knowledgeService.validateFile(file);
    
    if (!validation.valid) {
      setErrors({
        file: validation.errors
      });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      
      // Auto-generar título del nombre del archivo
      if (!metadata.title) {
        const fileName = file.name;
        const fileTitle = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        setMetadata(prev => ({
          ...prev,
          title: fileTitle
        }));
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const trimmedTag = newTag.trim().toLowerCase();
    
    if (metadata.tags.includes(trimmedTag)) {
      setNewTag('');
      return;
    }

    if (metadata.tags.length >= 20) {
      return;
    }

    setMetadata(prev => ({
      ...prev,
      tags: [...prev.tags, trimmedTag]
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setMetadata(prev => ({
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

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');

    try {
      await uploadWithProgress(selectedFile, metadata);
      setUploadStatus('success');
      
      // Cerrar modal después de 1.5 segundos para mostrar éxito
      setTimeout(() => {
        resetForm();
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('error');
    }
  };

  const getFileIcon = (file) => {
    if (!file) return '📄';
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const iconMap = {
      'pdf': '📄',
      'docx': '📝',
      'doc': '📝',
      'txt': '📃'
    };
    
    return iconMap[extension] || '📄';
  };

  const getFileTypeLabel = (file) => {
    if (!file) return '';
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const typeMap = {
      'pdf': 'PDF',
      'docx': 'Word Document',
      'doc': 'Word Document',
      'txt': 'Text File'
    };
    
    return typeMap[extension] || 'Archivo';
  };

  const formatFileSize = (bytes) => {
    return knowledgeService.formatFileSize(bytes);
  };

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
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      📁
                    </div>
                    Subir Archivo a Knowledge Base
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    disabled={isUploading}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* File Upload Area */}
                {!selectedFile && uploadStatus === 'idle' && (
                  <div className="mb-6">
                    <div
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer hover:border-blue-400 ${
                        isDragOver 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 bg-gray-50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      
                      <div className="text-center">
                        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <p className="text-lg font-medium text-gray-900">
                            {isDragOver ? 'Suelta el archivo aquí' : 'Subir archivo'}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Arrastra y suelta un archivo o <span className="text-blue-600">click para buscar</span>
                          </p>
                        </div>
                        
                        <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-1">📄</span>
                            PDF
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">📝</span>
                            DOCX
                          </div>
                          <div className="flex items-center">
                            <span className="mr-1">📃</span>
                            TXT
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Máximo 10MB por archivo
                        </p>
                      </div>
                    </div>

                    {/* File Errors */}
                    {errors.file && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="text-sm text-red-700">
                            <ul className="list-disc list-inside space-y-1">
                              {errors.file.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected File Display */}
                {selectedFile && uploadStatus === 'idle' && (
                  <div className="mb-6">
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {getFileIcon(selectedFile)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedFile.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getFileTypeLabel(selectedFile)} • {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadStatus === 'uploading' && (
                  <div className="mb-6">
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner size="sm" color="blue" />
                          <span className="text-sm font-medium text-blue-900">
                            Procesando archivo...
                          </span>
                        </div>
                        <span className="text-sm text-blue-700">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Extrayendo texto y generando resumen...
                      </p>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {uploadStatus === 'success' && (
                  <div className="mb-6">
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            ¡Archivo procesado exitosamente!
                          </p>
                          <p className="text-sm text-green-700">
                            El knowledge item ha sido creado y está disponible para asignar a bots.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {uploadStatus === 'error' && (
                  <div className="mb-6">
                    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            Error al procesar archivo
                          </p>
                          <p className="text-sm text-red-700">
                            No se pudo procesar el archivo. Verifica el formato y vuelve a intentar.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata Form */}
                {selectedFile && uploadStatus === 'idle' && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-medium text-gray-900">
                      Información adicional (opcional)
                    </h3>

                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Título personalizado
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={metadata.title}
                        onChange={handleMetadataChange}
                        placeholder="Se usará el nombre del archivo si se deja vacío"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={200}
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="Agregar tag..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          maxLength={50}
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          disabled={!newTag.trim() || metadata.tags.length >= 20}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {metadata.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {metadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info Box */}
                {selectedFile && uploadStatus === 'idle' && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          ⚡ Procesamiento automático:
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li>Se extraerá automáticamente el texto del archivo</li>
                            <li>Se generará un resumen para vista previa</li>
                            <li>El contenido estará listo para asignar a bots</li>
                            <li>Tiempo estimado: 10-30 segundos según el tamaño</li>
                          </ul>
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    disabled={isUploading}
                  >
                    {uploadStatus === 'success' ? 'Cerrar' : 'Cancelar'}
                  </button>
                  
                  {selectedFile && uploadStatus === 'idle' && (
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                      Procesar Archivo
                    </button>
                  )}

                  {uploadStatus === 'error' && (
                    <button
                      onClick={() => {
                        setUploadStatus('idle');
                        setSelectedFile(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Intentar otro archivo
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UploadFileModal; 