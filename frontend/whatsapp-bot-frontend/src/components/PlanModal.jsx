import React, { useState, useEffect } from 'react';
import { X, DollarSign, Users, MessageSquare, Brain, CreditCard, Zap } from 'lucide-react';
import { platformService } from '../services/platformAdmin';

const PlanModal = ({ plan, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    price_usd: 0,
    currency: 'USD',
    billing_period: 'monthly',
    
    // Límites incluidos
    max_instances: 1,
    max_messages: 1000,
    max_contacts: 500,
    included_tokens: 50000,
    
    // Configuración de overage
    allow_overage: false,
    overage_rate_per_token: 0.0001,
    max_overage_usd: 0,
    
    // Features
    embeddings: true,
    campaigns: true,
    priority_support: false,
    analytics: true,
    custom_api_key: false,
    
    // Configuración temporal
    duration_days: -1,
    duration_hours: null,
    
    sort_order: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      // Editar plan existente
      setFormData({
        name: plan.name || '',
        key: plan.key || '',
        description: plan.description || '',
        price_usd: plan.price_usd || 0,
        currency: plan.currency || 'USD',
        billing_period: plan.billing_period || 'monthly',
        
        max_instances: plan.max_instances || 1,
        max_messages: plan.max_messages || 1000,
        max_contacts: plan.max_contacts || 500,
        included_tokens: plan.included_tokens || 50000,
        
        allow_overage: plan.allow_overage || false,
        overage_rate_per_token: plan.overage_rate_per_token || 0.0001,
        max_overage_usd: plan.max_overage_usd || 0,
        
        embeddings: plan.embeddings !== false,
        campaigns: plan.campaigns !== false,
        priority_support: plan.priority_support || false,
        analytics: plan.analytics !== false,
        custom_api_key: plan.custom_api_key || false,
        
        duration_days: plan.duration_days || -1,
        duration_hours: plan.duration_hours || null,
        
        sort_order: plan.sort_order || 0
      });
    }
  }, [plan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones básicas
      if (!formData.name.trim()) {
        throw new Error('El nombre del plan es obligatorio');
      }
      
      if (!formData.key.trim()) {
        throw new Error('La clave del plan es obligatoria');
      }

      // Validar que la clave solo contenga letras, números y guiones bajos
      if (!/^[a-z0-9_]+$/.test(formData.key)) {
        throw new Error('La clave solo puede contener letras minúsculas, números y guiones bajos');
      }

      if (formData.price_usd < 0) {
        throw new Error('El precio no puede ser negativo');
      }

      if (formData.included_tokens < 0) {
        throw new Error('Los tokens incluidos no pueden ser negativos');
      }

      if (formData.allow_overage && formData.max_overage_usd <= 0) {
        throw new Error('Si permite overage, debe especificar un límite máximo mayor a 0');
      }

      const dataToSend = {
        ...formData,
        // Convertir strings a números donde sea necesario
        price_usd: parseFloat(formData.price_usd),
        max_instances: formData.max_instances === -1 ? -1 : parseInt(formData.max_instances),
        max_messages: formData.max_messages === -1 ? -1 : parseInt(formData.max_messages),
        max_contacts: formData.max_contacts === -1 ? -1 : parseInt(formData.max_contacts),
        included_tokens: parseInt(formData.included_tokens),
        overage_rate_per_token: parseFloat(formData.overage_rate_per_token),
        max_overage_usd: parseFloat(formData.max_overage_usd),
        duration_days: parseInt(formData.duration_days),
        sort_order: parseInt(formData.sort_order)
      };

      let response;
      if (plan) {
        // Actualizar plan existente
        response = await platformService.updatePlan(plan.id, dataToSend);
      } else {
        // Crear nuevo plan
        response = await platformService.createPlan(dataToSend);
      }

      if (response.success) {
        onSave();
        onClose();
      } else {
        throw new Error(response.message || 'Error al guardar el plan');
      }

    } catch (error) {
      console.error('Error saving plan:', error);
      setError(error.response?.data?.message || error.message || 'Error al guardar el plan');
    } finally {
      setLoading(false);
    }
  };

  const formatLimitValue = (value) => {
    return value === -1 ? '∞' : value.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {plan ? 'Editar Plan' : 'Crear Nuevo Plan'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: Professional"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clave del Plan *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: professional"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones bajos</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del plan..."
                />
              </div>
            </div>
          </div>

          {/* Precio y billing */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Precio y Facturación
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_usd}
                  onChange={(e) => setFormData({...formData, price_usd: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período de Facturación
                </label>
                <select
                  value={formData.billing_period}
                  onChange={(e) => setFormData({...formData, billing_period: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Límites incluidos */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Límites Incluidos
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instancias WhatsApp
                </label>
                <input
                  type="number"
                  min="-1"
                  value={formData.max_instances}
                  onChange={(e) => setFormData({...formData, max_instances: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">-1 = Ilimitado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensajes/Mes
                </label>
                <input
                  type="number"
                  min="-1"
                  value={formData.max_messages}
                  onChange={(e) => setFormData({...formData, max_messages: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">-1 = Ilimitado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contactos
                </label>
                <input
                  type="number"
                  min="-1"
                  value={formData.max_contacts}
                  onChange={(e) => setFormData({...formData, max_contacts: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">-1 = Ilimitado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tokens IA Incluidos
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.included_tokens}
                  onChange={(e) => setFormData({...formData, included_tokens: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sistema de Overage */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              Sistema de Overage
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow_overage"
                  checked={formData.allow_overage}
                  onChange={(e) => setFormData({...formData, allow_overage: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow_overage" className="ml-2 block text-sm text-gray-900">
                  Permitir uso adicional con costo extra
                </label>
              </div>

              {formData.allow_overage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo por Token Extra (USD)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={formData.overage_rate_per_token}
                      onChange={(e) => setFormData({...formData, overage_rate_per_token: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">ej: 0.0001 = $0.0001 por token</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Límite Máximo Overage (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.max_overage_usd}
                      onChange={(e) => setFormData({...formData, max_overage_usd: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo costo extra permitido</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Características del plan */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Características Incluidas
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'embeddings', label: 'Knowledge Base & RAG' },
                { key: 'campaigns', label: 'Campañas Grupales' },
                { key: 'priority_support', label: 'Soporte Prioritario' },
                { key: 'analytics', label: 'Analytics Avanzados' },
                { key: 'custom_api_key', label: 'API Key Personalizada' }
              ].map((feature) => (
                <div key={feature.key} className="flex items-center">
                  <input
                    type="checkbox"
                    id={feature.key}
                    checked={formData[feature.key]}
                    onChange={(e) => setFormData({...formData, [feature.key]: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={feature.key} className="ml-2 block text-sm text-gray-900">
                    {feature.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración temporal */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Configuración Temporal</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración en Días
                </label>
                <input
                  type="number"
                  min="-1"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">-1 = Ilimitado, 0 = Solo horas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración en Horas (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_hours || ''}
                  onChange={(e) => setFormData({...formData, duration_hours: e.target.value || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 48 para trial de 48 horas"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                plan ? 'Actualizar Plan' : 'Crear Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanModal;