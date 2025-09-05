import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Globe, MapPin, Zap, Shield, Users, Bot } from 'lucide-react';
import billingService from '../services/billing';

const PlansSelection = ({ onSelectPlan, currentPlan = null }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await billingService.getAvailablePlans();
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Error al cargar los planes disponibles');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPlanIcon = (planKey) => {
    const iconMap = {
      starter: <Bot className="h-8 w-8" />,
      business: <Users className="h-8 w-8" />,
      enterprise: <Shield className="h-8 w-8" />,
      unlimited: <Zap className="h-8 w-8" />
    };
    return iconMap[planKey] || <Bot className="h-8 w-8" />;
  };

  const getPlanColor = (planKey) => {
    const colorMap = {
      starter: 'blue',
      business: 'green', 
      enterprise: 'purple',
      unlimited: 'yellow'
    };
    return colorMap[planKey] || 'gray';
  };

  const isCurrentPlan = (plan) => {
    // Use backend's is_current flag if available, fallback to prop comparison
    return plan.is_current || (currentPlan && currentPlan.key === plan.key);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchPlans}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Elige tu Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Selecciona el plan que mejor se adapte a tus necesidades
          </p>
          <div className="mt-6 flex justify-center items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              Argentina: MercadoPago
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Globe className="h-4 w-4 mr-1" />
              Internacional: Stripe
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const color = getPlanColor(plan.key);
            const isPopular = plan.key === 'business';
            const isCurrent = isCurrentPlan(plan);
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl shadow-xl ${
                  isPopular ? 'ring-2 ring-green-500 scale-105' : ''
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </div>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Plan Actual
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-${color}-100 text-${color}-600 rounded-full mb-4`}>
                      {getPlanIcon(plan.key)}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 mt-2">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-extrabold text-gray-900">
                        {formatCurrency(plan.price_usd)}
                      </span>
                      <span className="text-xl text-gray-500 ml-1">
                        /{plan.billing_period === 'monthly' ? 'mes' : 'año'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {plan.max_instances === -1 ? 'Instancias ilimitadas' : `${plan.max_instances} instancia${plan.max_instances > 1 ? 's' : ''}`}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {plan.max_messages === -1 ? 'Mensajes ilimitados' : `${plan.max_messages.toLocaleString()} mensajes/mes`}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {plan.max_contacts === -1 ? 'Contactos ilimitados' : `${plan.max_contacts.toLocaleString()} contactos`}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {plan.included_tokens.toLocaleString()} tokens AI incluidos
                      </span>
                    </li>
                    
                    {plan.allow_overage && (
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">
                          Tokens adicionales: ${plan.overage_rate_per_token}/token
                        </span>
                      </li>
                    )}

                    {plan.embeddings && (
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">
                          Base de conocimiento (RAG)
                        </span>
                      </li>
                    )}

                    {plan.campaigns && (
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">
                          Campañas de marketing
                        </span>
                      </li>
                    )}

                    {plan.priority_support && (
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">
                          Soporte prioritario
                        </span>
                      </li>
                    )}

                    {plan.custom_api_key && (
                      <li className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">
                          API Key personalizada
                        </span>
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => onSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isPopular
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : `bg-${color}-600 text-white hover:bg-${color}-700`
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      {isCurrent ? 'Plan Actual' : 'Seleccionar Plan'}
                    </div>
                  </button>

                  {/* Overage Info */}
                  {plan.allow_overage && (
                    <div className="mt-4 text-center text-xs text-gray-500">
                      Máximo adicional: {formatCurrency(plan.max_overage_usd)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Todos los precios están en USD. La facturación se adapta según tu región.</p>
          <p className="mt-2">¿Preguntas? <a href="mailto:support@whatsappbot.com" className="text-blue-600 hover:text-blue-800">Contacta nuestro soporte</a></p>
        </div>
      </div>
    </div>
  );
};

export default PlansSelection;