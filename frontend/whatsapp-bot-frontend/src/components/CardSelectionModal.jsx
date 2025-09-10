import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  CreditCardIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { mercadopagoService } from '../services/mercadopago';
import { onboardingPayments } from '../services/onboardingPayments';

export default function CardSelectionModal({ 
  isOpen, 
  onClose, 
  onCardSelected, 
  customerData,
  plan,
  isRegistration = false // Nuevo prop para indicar si es registro
}) {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [error, setError] = useState('');
  
  // Estado para nueva tarjeta
  const [newCard, setNewCard] = useState({
    card_number: '',
    expiration_month: '',
    expiration_year: '',
    security_code: '',
    cardholder: {
      name: '',
      identification: {
        type: 'DNI',
        number: ''
      }
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomerAndCards();
    }
  }, [isOpen]);

  const loadCustomerAndCards = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Crear o obtener customer
      console.log('📋 Creating/getting customer with data:', customerData);
      let customerResponse;
      
      if (isRegistration) {
        // Usar endpoint público para onboarding
        customerResponse = await onboardingPayments.createMercadoPagoCustomer(customerData);
      } else {
        // Usar endpoint autenticado para usuarios logueados
        customerResponse = await mercadopagoService.createOrGetCustomer(customerData);
      }
      
      if (!customerResponse.success) {
        throw new Error(customerResponse.message);
      }

      console.log('✅ Customer result:', customerResponse.data);

      // Obtener tarjetas del customer
      const cardsResponse = await mercadopagoService.getCustomerCards();
      
      if (cardsResponse.success) {
        setCards(cardsResponse.data.cards || []);
        console.log(`📱 Loaded ${cardsResponse.data.cards?.length || 0} cards`);
      } else {
        console.log('⚠️ No cards loaded:', cardsResponse.message);
        setCards([]);
      }
      
    } catch (error) {
      console.error('❌ Error loading customer/cards:', error);
      setError('Error cargando información de tarjetas: ' + error.message);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingCard = async (card) => {
    if (!securityCode) {
      setError('Ingresa el código de seguridad');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Creating card token for existing card:', card.id);
      
      const tokenResponse = await mercadopagoService.createCardToken(card.id, securityCode);
      
      if (!tokenResponse.success) {
        throw new Error(tokenResponse.message);
      }

      console.log('✅ Card token created:', tokenResponse.data.card_token_id);

      // Notificar al componente padre con el token
      onCardSelected({
        card_token_id: tokenResponse.data.card_token_id,
        card_info: {
          ...card,
          last_four: card.last_four_digits,
          payment_method: card.payment_method.name
        },
        source: 'existing'
      });

    } catch (error) {
      console.error('❌ Error creating card token:', error);
      setError('Error procesando tarjeta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCard = async () => {
    setLoading(true);
    setError('');

    try {
      // Validaciones básicas
      if (!newCard.card_number || !newCard.expiration_month || !newCard.expiration_year || !newCard.security_code) {
        throw new Error('Todos los campos de la tarjeta son obligatorios');
      }

      if (!newCard.cardholder.name) {
        throw new Error('Nombre del titular es obligatorio');
      }

      console.log('🆕 Creating card token for new card');
      
      let tokenResponse;
      if (isRegistration) {
        // Usar endpoint público para onboarding
        tokenResponse = await onboardingPayments.createMercadoPagoCardToken(newCard);
      } else {
        // Usar endpoint autenticado para usuarios logueados
        tokenResponse = await mercadopagoService.createCardTokenFromForm(newCard);
      }
      
      if (!tokenResponse.success) {
        throw new Error(tokenResponse.message);
      }

      console.log('✅ New card token created:', tokenResponse.data.card_token_id);

      // Notificar al componente padre
      onCardSelected({
        card_token_id: tokenResponse.data.card_token_id,
        card_info: {
          last_four: newCard.card_number.slice(-4),
          cardholder_name: newCard.cardholder.name,
          payment_method: 'Nueva tarjeta'
        },
        source: 'new'
      });

    } catch (error) {
      console.error('❌ Error creating new card token:', error);
      setError('Error procesando tarjeta nueva: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('¿Estás seguro que deseas eliminar esta tarjeta?')) {
      return;
    }

    setLoading(true);
    
    try {
      await mercadopagoService.deleteCard(cardId);
      
      // Recargar tarjetas
      const cardsResponse = await mercadopagoService.getCustomerCards();
      if (cardsResponse.success) {
        setCards(cardsResponse.data.cards || []);
      }
      
      if (selectedCard?.id === cardId) {
        setSelectedCard(null);
        setSecurityCode('');
      }
      
    } catch (error) {
      console.error('❌ Error deleting card:', error);
      setError('Error eliminando tarjeta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (number) => {
    return number?.replace(/(.{4})/g, '$1 ').trim() || '';
  };

  const getCardIcon = (paymentMethod) => {
    const method = paymentMethod?.toLowerCase();
    if (method?.includes('visa')) return '💳';
    if (method?.includes('master')) return '💳';
    if (method?.includes('amex')) return '💳';
    return '💳';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-6 w-6 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Seleccionar método de pago
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

                {/* Plan info */}
                {plan && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>{plan.name}</strong> - ${plan.price_usd} USD
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 p-3 rounded-lg mb-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <p className="ml-3 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Procesando...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Tarjetas existentes */}
                    {cards.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Tarjetas guardadas</h4>
                        <div className="space-y-2">
                          {cards.map((card) => (
                            <div
                              key={card.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedCard?.id === card.id
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedCard(card)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-lg mr-2">{getCardIcon(card.payment_method.name)}</span>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      **** {card.last_four_digits}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {card.payment_method.name} • {card.expiration_month}/{card.expiration_year}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {selectedCard?.id === card.id && (
                                    <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCard(card.id);
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* CVV input para tarjeta seleccionada */}
                        {selectedCard && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Código de seguridad
                            </label>
                            <input
                              type="password"
                              value={securityCode}
                              onChange={(e) => setSecurityCode(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="CVV"
                              maxLength={4}
                            />
                            <button
                              onClick={() => handleSelectExistingCard(selectedCard)}
                              disabled={!securityCode || loading}
                              className="mt-2 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Usar esta tarjeta
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    {cards.length > 0 && (
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">o</span>
                        </div>
                      </div>
                    )}

                    {/* Agregar nueva tarjeta */}
                    <div>
                      <button
                        onClick={() => setShowAddCard(!showAddCard)}
                        className="flex items-center w-full p-3 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <PlusIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {cards.length > 0 ? 'Agregar nueva tarjeta' : 'Agregar tarjeta'}
                        </span>
                      </button>
                    </div>

                    {/* Formulario de nueva tarjeta */}
                    {showAddCard && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Número de tarjeta</label>
                          <input
                            type="text"
                            value={formatCardNumber(newCard.card_number)}
                            onChange={(e) => setNewCard({...newCard, card_number: e.target.value.replace(/\s/g, '')})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Mes</label>
                            <select
                              value={newCard.expiration_month}
                              onChange={(e) => setNewCard({...newCard, expiration_month: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            >
                              <option value="">MM</option>
                              {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                                <option key={month} value={month.toString().padStart(2, '0')}>
                                  {month.toString().padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Año</label>
                            <select
                              value={newCard.expiration_year}
                              onChange={(e) => setNewCard({...newCard, expiration_year: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            >
                              <option value="">AAAA</option>
                              {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                                <option key={year} value={year.toString()}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">CVV</label>
                            <input
                              type="password"
                              value={newCard.security_code}
                              onChange={(e) => setNewCard({...newCard, security_code: e.target.value})}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                              placeholder="123"
                              maxLength={4}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nombre del titular</label>
                          <input
                            type="text"
                            value={newCard.cardholder.name}
                            onChange={(e) => setNewCard({
                              ...newCard,
                              cardholder: {...newCard.cardholder, name: e.target.value}
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            placeholder="Juan Pérez"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">DNI</label>
                          <input
                            type="text"
                            value={newCard.cardholder.identification.number}
                            onChange={(e) => setNewCard({
                              ...newCard,
                              cardholder: {
                                ...newCard.cardholder,
                                identification: {...newCard.cardholder.identification, number: e.target.value}
                              }
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            placeholder="12345678"
                          />
                        </div>

                        <button
                          onClick={handleAddNewCard}
                          disabled={loading}
                          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          Usar nueva tarjeta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}