import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles, Headphones, TrendingUp, Copy, Info } from 'lucide-react';
import Button from '../ui/Button';
import { useInstances } from '../../hooks/useInstances';
import { useBotTemplates, useCreateBot, useUpdateBot } from '../../hooks/useBots';

const CreateBotModal = ({ isOpen, onClose, bot = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    instance_id: '',
    name: '',
    description: '',
    system_prompt: '',
    openai_model: 'gpt-4',
    openai_temperature: 0.7,
    max_tokens: 1000,
    welcome_message: '¡Hola! ¿En qué puedo ayudarte?',
    fallback_message: 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
    context_memory_turns: 5,
    response_delay_ms: 1000,
    typing_simulation: true,
    daily_message_limit: '',
    monthly_token_limit: ''
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: instancesData } = useInstances();
  const { data: templatesData } = useBotTemplates();
  const createBotMutation = useCreateBot({
    onSuccess: (data) => {
      onClose();
      onSuccess?.(data);
    }
  });
  const updateBotMutation = useUpdateBot({
    onSuccess: (data) => {
      onClose();
      onSuccess?.(data);
    }
  });

  const isEditing = !!bot;
  const instances = instancesData?.data || [];
  const templates = templatesData?.data?.templates || {};
  const isLoading = createBotMutation.isLoading || updateBotMutation.isLoading;

  // Cargar datos del bot al editar
  useEffect(() => {
    if (bot) {
      setFormData({
        instance_id: bot.instance_id || '',
        name: bot.name || '',
        description: bot.description || '',
        system_prompt: bot.system_prompt || '',
        openai_model: bot.openai_model || 'gpt-4',
        openai_temperature: bot.openai_temperature || 0.7,
        max_tokens: bot.max_tokens || 1000,
        welcome_message: bot.welcome_message || '¡Hola! ¿En qué puedo ayudarte?',
        fallback_message: bot.fallback_message || 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
        context_memory_turns: bot.context_memory_turns || 5,
        response_delay_ms: bot.response_delay_ms || 1000,
        typing_simulation: bot.typing_simulation ?? true,
        daily_message_limit: bot.daily_message_limit || '',
        monthly_token_limit: bot.monthly_token_limit || ''
      });
    }
  }, [bot]);

  // Reset form cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        instance_id: '',
        name: '',
        description: '',
        system_prompt: '',
        openai_model: 'gpt-4',
        openai_temperature: 0.7,
        max_tokens: 1000,
        welcome_message: '¡Hola! ¿En qué puedo ayudarte?',
        fallback_message: 'Lo siento, no pude entender tu mensaje. ¿Puedes reformularlo?',
        context_memory_turns: 5,
        response_delay_ms: 1000,
        typing_simulation: true,
        daily_message_limit: '',
        monthly_token_limit: ''
      });
      setSelectedTemplate(null);
      setShowAdvanced(false);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateSelect = (templateKey) => {
    const template = templates[templateKey];
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        system_prompt: template.system_prompt,
        welcome_message: template.welcome_message,
        fallback_message: template.fallback_message,
        openai_model: template.openai_model,
        openai_temperature: template.openai_temperature,
        max_tokens: template.max_tokens
      }));
      setSelectedTemplate(templateKey);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.name.trim()) {
      return;
    }
    if (!formData.system_prompt.trim()) {
      return;
    }
    if (!formData.instance_id) {
      return;
    }

    // Preparar datos para enviar
    const submitData = {
      ...formData,
      openai_temperature: parseFloat(formData.openai_temperature),
      max_tokens: parseInt(formData.max_tokens),
      context_memory_turns: parseInt(formData.context_memory_turns),
      response_delay_ms: parseInt(formData.response_delay_ms),
      daily_message_limit: formData.daily_message_limit ? parseInt(formData.daily_message_limit) : undefined,
      monthly_token_limit: formData.monthly_token_limit ? parseInt(formData.monthly_token_limit) : undefined
    };

    if (isEditing) {
      updateBotMutation.mutate({ id: bot.id, data: submitData });
    } else {
      createBotMutation.mutate(submitData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Editar Bot' : 'Crear Nuevo Bot'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Modifica la configuración de tu bot' : 'Configura tu asistente de WhatsApp con IA'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Templates (solo al crear) */}
        {!isEditing && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Plantillas Predefinidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(templates).map(([key, template]) => {
                const icons = {
                  assistant: Sparkles,
                  support: Headphones,
                  sales: TrendingUp
                };
                const colors = {
                  assistant: 'blue',
                  support: 'green',
                  sales: 'purple'
                };
                const Icon = icons[key] || Bot;
                const color = colors[key] || 'gray';
                
                return (
                  <div
                    key={key}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === key
                        ? `border-${color}-500 bg-${color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(key)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`h-5 w-5 text-${color}-600`} />
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Configuración Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Configuración Básica</h3>
            
            {/* Instancia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instancia de WhatsApp *
              </label>
              <select
                name="instance_id"
                value={formData.instance_id}
                onChange={handleInputChange}
                required
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              >
                <option value="">
                  {instances.length === 0 ? 'No hay instancias disponibles' : 'Seleccionar instancia...'}
                </option>
                {instances.map((instance) => (
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

            {/* Nombre y Descripción */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Bot *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Mi Asistente Virtual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Bot para atención al cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Prompt del Sistema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt del Sistema *
              </label>
              <textarea
                name="system_prompt"
                value={formData.system_prompt}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Eres un asistente virtual útil y amigable..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              />
              <p className="text-xs text-gray-500 mt-1">
                Define la personalidad y comportamiento de tu bot
              </p>
            </div>

            {/* Mensajes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje de Bienvenida
                </label>
                <textarea
                  name="welcome_message"
                  value={formData.welcome_message}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje de Fallback
                </label>
                <textarea
                  name="fallback_message"
                  value={formData.fallback_message}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
              </div>
            </div>
          </div>

          {/* Configuración Avanzada */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configuración Avanzada</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Ocultar' : 'Mostrar'} avanzada
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4">
                {/* Modelo y Parámetros OpenAI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo GPT
                    </label>
                    <select
                      name="openai_model"
                      value={formData.openai_model}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4O</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperatura ({formData.openai_temperature})
                    </label>
                    <input
                      type="range"
                      name="openai_temperature"
                      value={formData.openai_temperature}
                      onChange={handleInputChange}
                      min="0"
                      max="2"
                      step="0.1"
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Preciso</span>
                      <span>Creativo</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tokens Máximos
                    </label>
                    <input
                      type="number"
                      name="max_tokens"
                      value={formData.max_tokens}
                      onChange={handleInputChange}
                      min="50"
                      max="4096"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Comportamiento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Memoria Contextual (turnos)
                    </label>
                    <input
                      type="number"
                      name="context_memory_turns"
                      value={formData.context_memory_turns}
                      onChange={handleInputChange}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay de Respuesta (ms)
                    </label>
                    <input
                      type="number"
                      name="response_delay_ms"
                      value={formData.response_delay_ms}
                      onChange={handleInputChange}
                      min="0"
                      max="10000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="typing_simulation"
                        checked={formData.typing_simulation}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Simular escritura</span>
                    </label>
                  </div>
                </div>

                {/* Límites */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Límite Diario de Mensajes
                    </label>
                    <input
                      type="number"
                      name="daily_message_limit"
                      value={formData.daily_message_limit}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="Sin límite"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Límite Mensual de Tokens
                    </label>
                    <input
                      type="number"
                      name="monthly_token_limit"
                      value={formData.monthly_token_limit}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="Sin límite"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditing ? 'Actualizar Bot' : 'Crear Bot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBotModal; 