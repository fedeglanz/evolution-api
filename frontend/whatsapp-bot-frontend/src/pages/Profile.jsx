import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { authService } from '../services/auth';
import { billingService } from '../services/billing';
import { 
  User, 
  Building, 
  Shield, 
  CreditCard, 
  Crown,
  Edit3,
  Save,
  X
} from 'lucide-react';

const Profile = () => {
  const { user, company } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs
  const [activeTab, setActiveTab] = useState('personal');
  
  // Edit modes
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  
  // Form data
  const [personalData, setPersonalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    country: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Subscription data
  const [subscription, setSubscription] = useState(null);
  const [savedCards, setSavedCards] = useState([]);

  useEffect(() => {
    loadUserData();
    loadSubscriptionData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load current user data
      if (user) {
        setPersonalData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || ''
        });
      }
      
      if (company) {
        setCompanyData({
          name: company.name || '',
          description: company.description || '',
          email: company.email || '',
          phone: company.phone || '',
          country: company.country || 'Argentina'
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      // Load subscription status
      const subResponse = await billingService.getSubscriptionStatus();
      if (subResponse.success) {
        setSubscription(subResponse.data);
      }
      
      // Load saved cards (if endpoint exists)
      // const cardsResponse = await billingService.getSavedCards();
      // if (cardsResponse.success) {
      //   setSavedCards(cardsResponse.data);
      // }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  };

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const savePersonalData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await authService.updateProfile(personalData);
      toast.success('Información personal actualizada');
      setEditingPersonal(false);
      
      // Reload user data to get updated info
      await loadUserData();
    } catch (error) {
      setError('Error actualizando información personal: ' + error.message);
      toast.error('Error actualizando información personal');
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await authService.updateCompany(companyData);
      toast.success('Información de empresa actualizada');
      setEditingCompany(false);
      
      // Reload company data to get updated info
      await loadUserData();
    } catch (error) {
      setError('Error actualizando información de empresa: ' + error.message);
      toast.error('Error actualizando información de empresa');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Contraseña cambiada exitosamente');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError('Error cambiando contraseña: ' + error.message);
      toast.error('Error cambiando contraseña');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Información Personal', icon: User },
    { id: 'company', label: 'Empresa', icon: Building },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'subscription', label: 'Suscripción', icon: Crown },
    { id: 'billing', label: 'Facturación', icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Personal Information */}
          {activeTab === 'personal' && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Información Personal</h2>
                {!editingPersonal ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPersonal(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPersonal(false);
                        loadUserData(); // Reset data
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={savePersonalData}
                      disabled={loading}
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  name="firstName"
                  value={personalData.firstName}
                  onChange={handlePersonalChange}
                  disabled={!editingPersonal}
                />
                <Input
                  label="Apellido"
                  name="lastName"
                  value={personalData.lastName}
                  onChange={handlePersonalChange}
                  disabled={!editingPersonal}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={personalData.email}
                  onChange={handlePersonalChange}
                  disabled={!editingPersonal}
                />
                <Input
                  label="Teléfono"
                  name="phone"
                  value={personalData.phone}
                  onChange={handlePersonalChange}
                  disabled={!editingPersonal}
                  placeholder="+54 11 2345 6789"
                />
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p><strong>Rol:</strong> {user?.role || 'Usuario'}</p>
                <p><strong>Registrado:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </Card>
          )}

          {/* Company Information */}
          {activeTab === 'company' && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Información de la Empresa</h2>
                {user?.role === 'admin' && (
                  !editingCompany ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCompany(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCompany(false);
                          loadUserData();
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveCompanyData}
                        disabled={loading}
                      >
                        {loading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-4">
                <Input
                  label="Nombre de la empresa"
                  name="name"
                  value={companyData.name}
                  onChange={handleCompanyChange}
                  disabled={!editingCompany || user?.role !== 'admin'}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={companyData.description}
                    onChange={handleCompanyChange}
                    disabled={!editingCompany || user?.role !== 'admin'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Descripción de la empresa..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email empresarial"
                    name="email"
                    type="email"
                    value={companyData.email}
                    onChange={handleCompanyChange}
                    disabled={!editingCompany || user?.role !== 'admin'}
                  />
                  <Input
                    label="Teléfono empresarial"
                    name="phone"
                    value={companyData.phone}
                    onChange={handleCompanyChange}
                    disabled={!editingCompany || user?.role !== 'admin'}
                  />
                </div>

                <Input
                  label="País"
                  name="country"
                  value={companyData.country}
                  onChange={handleCompanyChange}
                  disabled={!editingCompany || user?.role !== 'admin'}
                />
              </div>

              {user?.role !== 'admin' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Solo los administradores pueden editar la información de la empresa.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Seguridad</h2>
              
              <div className="space-y-4">
                <Input
                  label="Contraseña actual"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Ingresa tu contraseña actual"
                />
                <Input
                  label="Nueva contraseña"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Mínimo 6 caracteres"
                />
                <Input
                  label="Confirmar nueva contraseña"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Repite la nueva contraseña"
                />
                
                <div className="pt-4">
                  <Button
                    onClick={changePassword}
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Cambiar Contraseña'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Subscription */}
          {activeTab === 'subscription' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Mi Suscripción</h2>
              
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium text-lg">{subscription.plan_name}</h3>
                      <p className="text-gray-600">
                        ${subscription.price_usd}/{subscription.billing_period === 'monthly' ? 'mes' : 'año'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscription.status === 'active' ? 'Activa' : subscription.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{subscription.max_instances}</div>
                      <div className="text-sm text-gray-600">Instancias</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {subscription.max_messages?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Mensajes/mes</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {subscription.max_contacts?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Contactos</div>
                    </div>
                  </div>

                  {subscription.next_billing_date && (
                    <div className="text-sm text-gray-600">
                      <p><strong>Próxima facturación:</strong> {new Date(subscription.next_billing_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No se encontró información de suscripción</p>
                </div>
              )}
            </Card>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Facturación</h2>
              
              <div className="space-y-4">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Información de facturación no disponible</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Esta funcionalidad estará disponible próximamente
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;