import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, CreditCardIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { platformService } from '../services/platformAdmin';

export default function PaymentGatewayModal({ isOpen, onClose, plan }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gateways, setGateways] = useState(null);
  const [activeTab, setActiveTab] = useState('mercadopago');
  
  // MercadoPago config
  const [mpConfig, setMpConfig] = useState({
    action: 'create', // 'create' or 'associate'
    mercadopago_plan_id: '',
    billing_day: 1,
    billing_day_proportional: false,
    free_trial_frequency: 0,
    free_trial_type: 'days',
    usd_to_ars_rate: 1000,
    payment_types: ['credit_card', 'debit_card'],
    payment_methods: ['visa', 'master', 'amex']
  });

  // Stripe config
  const [stripeConfig, setStripeConfig] = useState({
    trial_period_days: 0
  });

  // Payment config general
  const [paymentConfig, setPaymentConfig] = useState({
    usd_to_ars_rate: 1000,
    currency_conversion: 'manual',
    default_payment_gateway: 'stripe'
  });

  useEffect(() => {
    if (isOpen && plan) {
      loadPaymentGateways();
    }
  }, [isOpen, plan]);

  const loadPaymentGateways = async () => {
    setLoading(true);
    try {
      const response = await platformService.getPaymentGateways(plan.id);
      setGateways(response.data);
      
      // Cargar configuraciones existentes
      if (response.data.mercadopago.config) {
        const hasExistingPlan = response.data.mercadopago.plan_id;
        setMpConfig(prev => ({
          ...prev,
          ...response.data.mercadopago.config,
          action: hasExistingPlan ? 'update' : 'create',
          mercadopago_plan_id: response.data.mercadopago.plan_id || ''
        }));
      }
      
      if (response.data.stripe.config) {
        setStripeConfig(prev => ({
          ...prev,
          ...response.data.stripe.config
        }));
      }
      
      if (response.data.payment_config) {
        setPaymentConfig(response.data.payment_config);
      }
    } catch (error) {
      console.error('Error loading payment gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMercadoPago = async () => {
    setSaving(true);
    try {
      const config = {
        ...mpConfig,
        free_trial: mpConfig.free_trial_frequency > 0 ? {
          frequency: mpConfig.free_trial_frequency,
          frequency_type: mpConfig.free_trial_type
        } : undefined,
        payment_methods_allowed: {
          payment_types: mpConfig.payment_types.map(type => ({ id: type })),
          payment_methods: mpConfig.payment_methods.map(method => ({ id: method }))
        }
      };

      await platformService.configureMercadoPago(plan.id, config);
      
      // Actualizar configuración general de pagos
      await platformService.updatePaymentConfig(plan.id, paymentConfig);
      
      const messages = {
        created: 'Plan creado exitosamente en MercadoPago',
        updated: 'Plan actualizado exitosamente en MercadoPago',
        associated: 'Plan asociado exitosamente con MercadoPago',
        existing: 'Plan ya existía en MercadoPago'
      };
      alert(messages[result.data.action] || 'MercadoPago configurado exitosamente');
      loadPaymentGateways();
    } catch (error) {
      console.error('Error saving MercadoPago config:', error);
      alert('Error al configurar MercadoPago: ' + error.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStripe = async () => {
    setSaving(true);
    try {
      await platformService.configureStripe(plan.id, stripeConfig);
      alert('Stripe configurado exitosamente');
      loadPaymentGateways();
    } catch (error) {
      console.error('Error saving Stripe config:', error);
      alert('Error al configurar Stripe: ' + error.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGateway = async (gateway, enabled) => {
    try {
      await platformService.togglePaymentGateway(plan.id, gateway, enabled);
      loadPaymentGateways();
    } catch (error) {
      console.error('Error toggling gateway:', error);
      alert('Error al cambiar estado: ' + error.response?.data?.message);
    }
  };

  if (!plan) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                <Dialog.Title as="div" className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-6 w-6 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Configurar Pasarelas de Pago - {plan.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Cargando configuración...</p>
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setActiveTab('mercadopago')}
                          className={`${
                            activeTab === 'mercadopago'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        >
                          MercadoPago
                          {gateways?.mercadopago?.enabled && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Activo</span>
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('stripe')}
                          className={`${
                            activeTab === 'stripe'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        >
                          Stripe
                          {gateways?.stripe?.enabled && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Activo</span>
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('general')}
                          className={`${
                            activeTab === 'general'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        >
                          Configuración General
                        </button>
                      </nav>
                    </div>

                    {/* MercadoPago Tab */}
                    {activeTab === 'mercadopago' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex">
                            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                Configura MercadoPago para cobros en Argentina. Precio actual: ${plan.price_usd} USD = ${Math.round(plan.price_usd * mpConfig.usd_to_ars_rate)} ARS
                              </p>
                            </div>
                          </div>
                        </div>

                        {gateways?.mercadopago?.plan_id && (
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-700">
                              Plan ID en MercadoPago: <strong>{gateways.mercadopago.plan_id}</strong>
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Acción</label>
                            <select
                              value={mpConfig.action}
                              onChange={(e) => setMpConfig({...mpConfig, action: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            >
                              <option value="create">Crear nuevo plan en MercadoPago</option>
                              <option value="associate">Asociar plan existente</option>
                              {gateways?.mercadopago?.plan_id && (
                                <option value="update">Actualizar plan existente</option>
                              )}
                            </select>
                          </div>

                          {mpConfig.action === 'associate' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                ID del Plan en MercadoPago
                              </label>
                              <input
                                type="text"
                                value={mpConfig.mercadopago_plan_id}
                                onChange={(e) => setMpConfig({...mpConfig, mercadopago_plan_id: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                placeholder="Ej: 2c9380849485b2a001949146e5330302"
                              />
                            </div>
                          )}

                          {(mpConfig.action === 'create' || mpConfig.action === 'update') && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Día de cobro</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={mpConfig.billing_day}
                                    onChange={(e) => setMpConfig({...mpConfig, billing_day: parseInt(e.target.value)})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                  />
                                </div>

                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={mpConfig.billing_day_proportional}
                                    onChange={(e) => setMpConfig({...mpConfig, billing_day_proportional: e.target.checked})}
                                    className="rounded border-gray-300 text-indigo-600"
                                  />
                                  <label className="ml-2 text-sm text-gray-700">
                                    Cobro proporcional primer mes
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Período de prueba
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={mpConfig.free_trial_frequency}
                                    onChange={(e) => setMpConfig({...mpConfig, free_trial_frequency: parseInt(e.target.value)})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Tipo de período
                                  </label>
                                  <select
                                    value={mpConfig.free_trial_type}
                                    onChange={(e) => setMpConfig({...mpConfig, free_trial_type: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                  >
                                    <option value="days">Días</option>
                                    <option value="months">Meses</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Tasa de conversión USD → ARS
                                </label>
                                <input
                                  type="number"
                                  value={mpConfig.usd_to_ars_rate}
                                  onChange={(e) => setMpConfig({...mpConfig, usd_to_ars_rate: parseFloat(e.target.value)})}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                  Precio en ARS: ${Math.round(plan.price_usd * mpConfig.usd_to_ars_rate)}
                                </p>
                              </div>
                            </>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={gateways?.mercadopago?.enabled || false}
                                onChange={(e) => handleToggleGateway('mercadopago', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600"
                              />
                              <label className="ml-2 text-sm text-gray-700">
                                Habilitar MercadoPago para este plan
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveMercadoPago}
                              disabled={saving}
                              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stripe Tab */}
                    {activeTab === 'stripe' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex">
                            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                Stripe se configura automáticamente con el precio en USD del plan: ${plan.price_usd}
                              </p>
                            </div>
                          </div>
                        </div>

                        {gateways?.stripe?.product_id && (
                          <div className="bg-green-50 p-4 rounded-lg space-y-1">
                            <p className="text-sm text-green-700">
                              Product ID: <strong>{gateways.stripe.product_id}</strong>
                            </p>
                            <p className="text-sm text-green-700">
                              Price ID: <strong>{gateways.stripe.price_id}</strong>
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Días de prueba gratuita
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={stripeConfig.trial_period_days}
                            onChange={(e) => setStripeConfig({...stripeConfig, trial_period_days: parseInt(e.target.value)})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={gateways?.stripe?.enabled || false}
                              onChange={(e) => handleToggleGateway('stripe', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Habilitar Stripe para este plan
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveStripe}
                            disabled={saving}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* General Config Tab */}
                    {activeTab === 'general' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Pasarela de pago por defecto
                          </label>
                          <select
                            value={paymentConfig.default_payment_gateway}
                            onChange={(e) => setPaymentConfig({...paymentConfig, default_payment_gateway: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          >
                            <option value="stripe">Stripe (Internacional)</option>
                            <option value="mercadopago">MercadoPago (Argentina)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Método de conversión de moneda
                          </label>
                          <select
                            value={paymentConfig.currency_conversion}
                            onChange={(e) => setPaymentConfig({...paymentConfig, currency_conversion: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          >
                            <option value="manual">Manual (tasa fija)</option>
                            <option value="api" disabled>API (próximamente)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Tasa de conversión USD → ARS por defecto
                          </label>
                          <input
                            type="number"
                            value={paymentConfig.usd_to_ars_rate}
                            onChange={(e) => setPaymentConfig({...paymentConfig, usd_to_ars_rate: parseFloat(e.target.value)})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await platformService.updatePaymentConfig(plan.id, paymentConfig);
                                alert('Configuración general guardada');
                              } catch (error) {
                                alert('Error: ' + error.response?.data?.message);
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Guardar Configuración General'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}