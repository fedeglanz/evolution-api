import React, { useState, useEffect } from 'react';
import { X, CreditCard, User, Mail, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import billingService from '../services/billing';

const CheckoutModal = ({ plan, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    phone_area: '',
    id_type: 'DNI',
    id_number: '',
    company_name: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentRegion, setPaymentRegion] = useState(null);
  const [step, setStep] = useState('form'); // form, processing, success

  useEffect(() => {
    if (isOpen && plan) {
      detectRegion();
    }
  }, [isOpen, plan]);

  const detectRegion = () => {
    // Simple detection based on browser/user preferences
    // In a real app, you might want to use a geolocation API
    const userLang = navigator.language || navigator.userLanguage;
    const isArgentina = userLang.includes('es-AR') || userLang.includes('es');
    
    setPaymentRegion({
      region: isArgentina ? 'argentina' : 'international',
      currency: isArgentina ? 'ARS' : 'USD',
      provider: isArgentina ? 'mercadopago' : 'stripe'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const locale = currency === 'ARS' ? 'es-AR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getEstimatedPrice = () => {
    if (!plan || !paymentRegion) return { amount: 0, currency: 'USD' };
    
    if (paymentRegion.currency === 'ARS') {
      // Convert USD to ARS with approximate rate
      const usdToArs = 1000; // This should come from a real API
      return {
        amount: plan.price_usd * usdToArs,
        currency: 'ARS'
      };
    }
    
    return {
      amount: plan.price_usd,
      currency: 'USD'
    };
  };

  const validateForm = () => {
    const required = ['first_name', 'last_name', 'email', 'phone_number'];
    
    // Add region-specific required fields
    if (paymentRegion?.region === 'argentina') {
      required.push('id_number');
    }

    for (const field of required) {
      if (!formData[field]?.trim()) {
        setError(`El campo ${getFieldLabel(field)} es obligatorio`);
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return false;
    }

    // Phone validation
    const phoneRegex = /^\+?[1-9]\d{8,14}$/;
    if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) {
      setError('Por favor ingresa un teléfono válido');
      return false;
    }

    return true;
  };

  const getFieldLabel = (field) => {
    const labels = {
      first_name: 'Nombre',
      last_name: 'Apellido',
      email: 'Email',
      phone_number: 'Teléfono',
      id_number: 'Número de documento'
    };
    return labels[field] || field;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setStep('processing');

    try {
      // Format phone number
      let phone = formData.phone_number.replace(/\s/g, '');
      if (!phone.startsWith('+')) {
        phone = `+${phone}`;
      }

      const customerData = {
        ...formData,
        phone_number: phone,
        company_name: formData.company_name || `${formData.first_name} ${formData.last_name}`
      };

      const response = await billingService.createSubscription(plan.id, customerData);

      if (response.success) {
        if (paymentRegion.provider === 'mercadopago') {
          // Redirect to MercadoPago checkout
          const checkoutUrl = response.data.sandbox_url || response.data.checkout_url;
          window.location.href = checkoutUrl;
        } else {
          // Handle Stripe checkout (would require Stripe Elements)
          setStep('success');
          setTimeout(() => {
            onSuccess(response.data);
            onClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setError(error.response?.data?.message || 'Error al procesar el pago. Intenta nuevamente.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  const estimatedPrice = getEstimatedPrice();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          
          {step === 'processing' && (
            <div className="bg-white px-6 pt-6 pb-4 sm:p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Procesando pago...
                </h3>
                <p className="text-sm text-gray-600">
                  Te redirigiremos a {paymentRegion?.provider === 'mercadopago' ? 'MercadoPago' : 'Stripe'} en un momento
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="bg-white px-6 pt-6 pb-4 sm:p-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Pago exitoso!
                </h3>
                <p className="text-sm text-gray-600">
                  Tu subscripción ha sido activada correctamente
                </p>
              </div>
            </div>
          )}

          {step === 'form' && (
            <>
              {/* Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Checkout - {plan.name}
                      </h3>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Plan Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Plan: {plan.name}</span>
                        <span className="font-bold">
                          {formatCurrency(estimatedPrice.amount, estimatedPrice.currency)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {plan.billing_period === 'monthly' ? 'Facturación mensual' : 'Facturación anual'}
                      </div>
                      {paymentRegion && (
                        <div className="flex items-center mt-2 text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {paymentRegion.region === 'argentina' ? 'Argentina - MercadoPago' : 'Internacional - Stripe'}
                          </span>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                          <span className="text-sm text-red-700">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Personal Information */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <User className="h-4 w-4 inline mr-1" />
                          Nombre *
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Apellido *
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Mail className="h-4 w-4 inline mr-1" />
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Phone className="h-4 w-4 inline mr-1" />
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          placeholder="+5491123456789"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Argentina specific fields */}
                      {paymentRegion?.region === 'argentina' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de documento
                              </label>
                              <select
                                name="id_type"
                                value={formData.id_type}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="DNI">DNI</option>
                                <option value="CUIL">CUIL</option>
                                <option value="CUIT">CUIT</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número *
                              </label>
                              <input
                                type="text"
                                name="id_number"
                                value={formData.id_number}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre de la empresa (opcional)
                        </label>
                        <input
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {loading ? 'Procesando...' : `Pagar ${formatCurrency(estimatedPrice.amount, estimatedPrice.currency)}`}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;