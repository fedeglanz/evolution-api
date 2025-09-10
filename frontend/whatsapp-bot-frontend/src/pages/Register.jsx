import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import PlansSelection from '../components/PlansSelection';
import CheckoutModal from '../components/CheckoutModal';
import { authService } from '../services/auth';
import { billingService } from '../services/billing';

const Register = () => {
  const navigate = useNavigate();
  
  // Form states
  const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Plan, 3: Payment
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User data
  const [formData, setFormData] = useState({
    // Company info
    companyName: '',
    companyDescription: '',
    
    // User info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Address (for MercadoPago)
    country: 'Argentina',
    
    // Agreement
    acceptTerms: false
  });
  
  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep1 = () => {
    const { companyName, firstName, lastName, email, phone, password, confirmPassword, acceptTerms } = formData;
    
    if (!companyName || !firstName || !lastName || !email || !phone || !password) {
      setError('Por favor completa todos los campos obligatorios');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      return false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return false;
    }
    
    return true;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setError('');
      setCurrentStep(2);
    }
  };

  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan);
    setCurrentStep(3);
  };

  const handlePaymentStart = () => {
    setShowCheckoutModal(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    setLoading(true);
    try {
      console.log('🔄 Processing registration with payment data:', paymentData);
      
      // Create company and user account after successful payment
      const userData = {
        companyName: formData.companyName,
        companyDescription: formData.companyDescription,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        country: formData.country,
        planId: selectedPlan.id,
        paymentReference: paymentData.subscription_id || paymentData.payment_id,
        // Incluir datos de pago para crear la suscripción real
        paymentProvider: paymentData.provider || 'stripe',
        paymentRegion: paymentData.region || 'international',
        cardTokenId: paymentData.card_token_id || null,
        customerData: paymentData.customer_data || null
      };

      // Register user and company
      const response = await authService.register(userData);
      
      if (response.success) {
        // Auto-login after successful registration
        const loginResponse = await authService.login(formData.email, formData.password);
        
        if (loginResponse.success) {
          // Redirect to dashboard with success message
          navigate('/dashboard?welcome=true', { 
            state: { 
              message: '¡Registro completado! Bienvenido a la plataforma.',
              plan: selectedPlan.name
            }
          });
        } else {
          // Redirect to login if auto-login fails
          navigate('/login?message=Registro completado, por favor inicia sesión');
        }
      } else {
        setError('Error creando la cuenta: ' + response.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Error completando el registro');
    } finally {
      setLoading(false);
      setShowCheckoutModal(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const getCustomerData = () => ({
    email: formData.email,
    first_name: formData.firstName,
    last_name: formData.lastName,
    phone_number: formData.phone.startsWith('+') ? formData.phone : `+54${formData.phone}`,
    identification: {
      type: 'DNI',
      number: '00000000' // Placeholder - could add ID field to form
    },
    company_name: formData.companyName
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crear cuenta
          </h1>
          <p className="text-gray-600">
            Únete a nuestra plataforma de WhatsApp Business
          </p>
          
          {/* Progress indicator */}
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Información</span>
              </div>
              <div className="w-8 h-px bg-gray-200"></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Plan</span>
              </div>
              <div className="w-8 h-px bg-gray-200"></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Pago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Information Form */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto">
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-6">Información de la empresa y usuario</h2>
              
              {error && <ErrorMessage message={error} className="mb-6" />}
              
              <div className="space-y-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la empresa</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      label="Nombre de la empresa *"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Ej: Mi Empresa SRL"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción de la empresa (opcional)
                      </label>
                      <textarea
                        name="companyDescription"
                        value={formData.companyDescription}
                        onChange={handleInputChange}
                        placeholder="Breve descripción de tu empresa..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre *"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Tu nombre"
                      required
                    />
                    <Input
                      label="Apellido *"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Tu apellido"
                      required
                    />
                    <Input
                      label="Email *"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@empresa.com"
                      required
                    />
                    <Input
                      label="Teléfono *"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="1123456789"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contraseña</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Contraseña *"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <Input
                      label="Confirmar contraseña *"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Repetir contraseña"
                      required
                    />
                  </div>
                </div>

                {/* Terms acceptance */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    Acepto los{' '}
                    <Link to="/terms" className="text-blue-600 hover:underline">
                      términos y condiciones
                    </Link>{' '}
                    y la{' '}
                    <Link to="/privacy" className="text-blue-600 hover:underline">
                      política de privacidad
                    </Link>
                    *
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:underline"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </Link>
                <Button
                  onClick={handleStep1Next}
                  className="px-8"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold">Selecciona tu plan</h2>
              <p className="text-gray-600 mt-2">Elige el plan que mejor se adapte a tus necesidades</p>
            </div>
            
            {error && <ErrorMessage message={error} className="mb-6 max-w-2xl mx-auto" />}
            
            <PlansSelection
              onSelectPlan={handlePlanSelection}
              currentPlan={null}
            />

            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={handleBack}
                className="mr-4"
              >
                Volver
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && selectedPlan && (
          <Card className="max-w-2xl mx-auto">
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-6">Confirmar y pagar</h2>
              
              {error && <ErrorMessage message={error} className="mb-6" />}
              
              {/* Plan summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-medium text-lg mb-2">{selectedPlan.name}</h3>
                <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">
                    ${selectedPlan.price_usd}/{selectedPlan.billing_period === 'monthly' ? 'mes' : 'año'}
                  </span>
                  <div className="text-sm text-gray-600">
                    <div>✓ {selectedPlan.max_instances} instancias</div>
                    <div>✓ {selectedPlan.max_messages.toLocaleString()} mensajes/mes</div>
                    <div>✓ {selectedPlan.max_contacts.toLocaleString()} contactos</div>
                  </div>
                </div>
              </div>

              {/* Company summary */}
              <div className="border rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2">Resumen de la cuenta</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Empresa:</strong> {formData.companyName}</div>
                  <div><strong>Usuario:</strong> {formData.firstName} {formData.lastName}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Volver
                </Button>
                <Button
                  onClick={handlePaymentStart}
                  disabled={loading}
                  className="px-8"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Proceder al pago'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Checkout Modal */}
        {showCheckoutModal && selectedPlan && (
          <CheckoutModal
            isOpen={showCheckoutModal}
            onClose={() => setShowCheckoutModal(false)}
            plan={selectedPlan}
            customerData={getCustomerData()}
            onSuccess={handlePaymentSuccess}
            isRegistration={true}
          />
        )}
      </div>
    </div>
  );
};

export default Register;