import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, DollarSign, Users, BarChart3, CreditCard } from 'lucide-react';
import { platformService } from '../services/platformAdmin';
import PlanModal from '../components/PlanModal';
import PaymentGatewayModal from '../components/PaymentGatewayModal';

const PlatformPlans = () => {
  const [plans, setPlans] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
    fetchStatistics();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await platformService.getPlans();
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Error al cargar los planes');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await platformService.getPlanStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setShowCreateModal(true);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleConfigurePayment = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el plan "${plan.name}"?`)) {
      return;
    }

    try {
      const response = await platformService.deletePlan(plan.id);
      if (response.success) {
        setPlans(plans.filter(p => p.id !== plan.id));
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError(error.response?.data?.message || 'Error al eliminar el plan');
    }
  };

  const handleMovePlan = async (planId, direction) => {
    const planIndex = plans.findIndex(p => p.id === planId);
    const newIndex = direction === 'up' ? planIndex - 1 : planIndex + 1;
    
    if (newIndex < 0 || newIndex >= plans.length) return;

    const reorderedPlans = [...plans];
    [reorderedPlans[planIndex], reorderedPlans[newIndex]] = [reorderedPlans[newIndex], reorderedPlans[planIndex]];
    
    const planOrders = reorderedPlans.map((plan, index) => ({
      id: plan.id,
      sort_order: index
    }));

    try {
      await platformService.reorderPlans(planOrders);
      setPlans(reorderedPlans);
    } catch (error) {
      console.error('Error reordering plans:', error);
      setError('Error al reordenar los planes');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Planes</h1>
              <p className="mt-2 text-sm text-gray-600">
                Configura los planes de subscripción y sus características
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreatePlan}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Plan
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {statistics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.reduce((total, stat) => total + parseFloat(stat.monthly_revenue || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Subscripciones Activas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.reduce((total, stat) => total + parseInt(stat.active_subscriptions || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ingresos Overage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.reduce((total, stat) => total + parseFloat(stat.total_overage_revenue || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Planes Disponibles
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Gestiona los planes de subscripción y sus características
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Límites
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens Incluidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Características
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscripciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan, index) => {
                    const planStats = statistics.find(stat => stat.key === plan.key);
                    return (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleMovePlan(plan.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMovePlan(plan.id, 'down')}
                              disabled={index === plans.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                            <div className="text-sm text-gray-500">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {plan.key}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(plan.price_usd)}
                          </div>
                          <div className="text-sm text-gray-500">{plan.billing_period}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>Instancias: {plan.max_instances === -1 ? '∞' : plan.max_instances}</div>
                            <div>Mensajes: {plan.max_messages === -1 ? '∞' : plan.max_messages.toLocaleString()}</div>
                            <div>Contactos: {plan.max_contacts === -1 ? '∞' : plan.max_contacts.toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {plan.included_tokens.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {plan.allow_overage ? (
                            <div className="text-sm text-gray-900">
                              <div className="text-green-600 font-medium">✓ Permitido</div>
                              <div className="text-xs text-gray-500">${plan.overage_rate_per_token}/token</div>
                              <div className="text-xs text-gray-500">Max: {formatCurrency(plan.max_overage_usd)}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">
                              <div className="font-medium">✗ No permitido</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {plan.embeddings && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                RAG
                              </span>
                            )}
                            {plan.campaigns && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Campañas
                              </span>
                            )}
                            {plan.priority_support && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Soporte VIP
                              </span>
                            )}
                            {plan.custom_api_key && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                API Propia
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {planStats?.active_subscriptions || 0}
                          </div>
                          {planStats?.monthly_revenue > 0 && (
                            <div className="text-sm text-green-600">
                              {formatCurrency(planStats.monthly_revenue)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleConfigurePayment(plan)}
                              className="text-green-600 hover:text-green-900"
                              title="Configurar pasarelas de pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar plan"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan)}
                              className="text-red-600 hover:text-red-900"
                              disabled={planStats?.active_subscriptions > 0}
                              title="Eliminar plan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <PlanModal
          plan={null}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchPlans();
            fetchStatistics();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <PlanModal
          plan={selectedPlan}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchPlans();
            fetchStatistics();
          }}
        />
      )}

      {/* Payment Gateway Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentGatewayModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}
    </div>
  );
};

export default PlatformPlans;