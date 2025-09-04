import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import PlansSelection from '../components/PlansSelection';
import CheckoutModal from '../components/CheckoutModal';
import billingService from '../services/billing';

const Billing = () => {
  const [activeTab, setActiveTab] = useState('subscription'); // subscription, plans, history
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchSubscriptionStatus();
    if (activeTab === 'history') {
      fetchBillingHistory();
    }
  }, [activeTab]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await billingService.getSubscriptionStatus();
      if (response.success) {
        setSubscription(response.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // If no subscription found, that's okay - user might not have one yet
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const response = await billingService.getBillingHistory();
      if (response.success) {
        setBillingHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowCheckoutModal(true);
  };

  const handleCheckoutSuccess = (subscriptionData) => {
    console.log('Subscription created:', subscriptionData);
    fetchSubscriptionStatus(); // Refresh subscription status
    setActiveTab('subscription'); // Switch back to subscription tab
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      pending_payment: 'yellow',
      past_due: 'red',
      cancelled: 'gray',
      expired: 'red'
    };
    return colors[status] || 'gray';
  };

  const getStatusText = (status) => {
    const texts = {
      active: 'Activa',
      pending_payment: 'Pago Pendiente',
      past_due: 'Vencida',
      cancelled: 'Cancelada',
      expired: 'Expirada'
    };
    return texts[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="mt-2 text-gray-600">Gestiona tu subscripción y método de pago</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'subscription', label: 'Subscripción', icon: CreditCard },
                { id: 'plans', label: 'Cambiar Plan', icon: DollarSign },
                { id: 'history', label: 'Historial', icon: Calendar }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Current Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : subscription ? (
              <>
                {/* Subscription Status Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Subscripción Actual</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${getStatusColor(subscription.status)}-100 text-${getStatusColor(subscription.status)}-800`}>
                      {getStatusText(subscription.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{subscription.plan_name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(subscription.price_usd)}
                      </p>
                      <p className="text-gray-500">por mes</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Próximo pago</h4>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}
                      </p>
                      {subscription.days_remaining && (
                        <p className="text-sm text-gray-500">
                          {subscription.days_remaining} días restantes
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Método de pago</h4>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {subscription.payment_provider === 'stripe' ? 'Tarjeta (Stripe)' : 'MercadoPago'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Uso del Mes Actual</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tokens Usage */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-500">Tokens de AI</h4>
                        <span className="text-sm text-gray-900">
                          {subscription.current_month_tokens?.toLocaleString() || 0} / {subscription.included_tokens?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (subscription.usage_percentage || 0) > 80 ? 'bg-red-500' : 
                            (subscription.usage_percentage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(subscription.usage_percentage || 0, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {subscription.usage_percentage?.toFixed(1) || 0}% utilizado
                      </p>
                    </div>

                    {/* Overage */}
                    {subscription.allow_overage && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-500">Costo adicional</h4>
                          <span className="text-sm text-gray-900">
                            {formatCurrency(subscription.current_month_overage_cost || 0)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {subscription.current_month_overage_cost > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          )}
                          <span className="text-xs text-gray-500">
                            Límite: {formatCurrency(subscription.max_overage_usd)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* No subscription - Show plans */
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes una subscripción activa
                </h3>
                <p className="text-gray-600 mb-6">
                  Selecciona un plan para comenzar a usar todas las funcionalidades
                </p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ver Planes Disponibles
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <PlansSelection 
            onSelectPlan={handleSelectPlan}
            currentPlan={subscription}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Historial de Pagos</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingHistory.length > 0 ? billingHistory.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.amount_usd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.payment_status === 'paid' ? 'Pagado' : 'Fallido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.payment_method === 'stripe' ? 'Stripe' : 'MercadoPago'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No hay transacciones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        plan={selectedPlan}
        isOpen={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setSelectedPlan(null);
        }}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default Billing;