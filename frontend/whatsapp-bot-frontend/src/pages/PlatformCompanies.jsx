import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  UserGroupIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { platformCompanyService } from '../services/platformAdmin';

const PlanBadge = ({ plan }) => {
  const planConfig = {
    free_trial: { label: 'Free Trial', color: 'gray', price: '$0' },
    trial: { label: 'Trial', color: 'blue', price: '$0' },
    starter: { label: 'Starter', color: 'green', price: '$15' },
    business: { label: 'Business', color: 'purple', price: '$49' },
    pro: { label: 'Pro', color: 'orange', price: '$99' },
    enterprise: { label: 'Enterprise', color: 'red', price: '$299' }
  };

  const config = planConfig[plan] || { label: plan, color: 'gray', price: '$0' };
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses[config.color]}`}>
      <span>{config.label}</span>
      <span className="ml-1 font-semibold">{config.price}</span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'Activa', color: 'green' },
    inactive: { label: 'Inactiva', color: 'red' },
    trial: { label: 'Prueba', color: 'blue' },
    suspended: { label: 'Suspendida', color: 'yellow' }
  };

  const config = statusConfig[status] || { label: status, color: 'gray' };
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[config.color]}`}>
      {config.label}
    </span>
  );
};

const CompanyCard = ({ company, onViewDetails }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.name}</h3>
            <p className="text-sm text-gray-600">{company.email}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <PlanBadge plan={company.plan} />
          <StatusBadge status={company.subscription_status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{company.user_count} usuarios</span>
        </div>
        <div className="flex items-center space-x-2">
          <PhoneIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{company.instance_count} instancias</span>
        </div>
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{company.messages_last_30d} mensajes/30d</span>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {new Date(company.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          Límites: {company.max_instances} inst. / {company.max_messages} msg
        </div>
        <button
          onClick={() => onViewDetails(company)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          Ver detalles
        </button>
      </div>
    </div>
  );
};

const CreateCompanyModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plan: 'starter',
    maxInstances: '',
    maxMessages: '',
    maxContacts: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    { value: 'free_trial', label: 'Free Trial', instances: 1, messages: 50, contacts: 25 },
    { value: 'trial', label: 'Trial', instances: 1, messages: 200, contacts: 100 },
    { value: 'starter', label: 'Starter', instances: 1, messages: 1000, contacts: 500 },
    { value: 'business', label: 'Business', instances: 5, messages: 5000, contacts: 2500 },
    { value: 'pro', label: 'Pro', instances: 15, messages: 15000, contacts: 7500 },
    { value: 'enterprise', label: 'Enterprise', instances: 999, messages: 999999, contacts: 999999 }
  ];

  const selectedPlan = plans.find(p => p.value === formData.plan);

  const handlePlanChange = (planValue) => {
    const plan = plans.find(p => p.value === planValue);
    setFormData(prev => ({
      ...prev,
      plan: planValue,
      maxInstances: plan.instances.toString(),
      maxMessages: plan.messages.toString(),
      maxContacts: plan.contacts.toString()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave({
        name: formData.name,
        email: formData.email,
        plan: formData.plan,
        maxInstances: parseInt(formData.maxInstances) || selectedPlan.instances,
        maxMessages: parseInt(formData.maxMessages) || selectedPlan.messages,
        maxContacts: parseInt(formData.maxContacts) || selectedPlan.contacts
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        plan: 'starter',
        maxInstances: '',
        maxMessages: '',
        maxContacts: ''
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creando empresa');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Crear Nueva Empresa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Ej. Mi Empresa SAS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de la Empresa
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="contacto@miempresa.com"
              />
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan de Suscripción
            </label>
            <select
              value={formData.plan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {plans.map(plan => (
                <option key={plan.value} value={plan.value}>
                  {plan.label} ({plan.instances} inst., {plan.messages} msg, {plan.contacts} contactos)
                </option>
              ))}
            </select>
          </div>

          {/* Custom Limits */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Límites Personalizados (opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo Instancias
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxInstances}
                  onChange={(e) => setFormData({...formData, maxInstances: e.target.value})}
                  placeholder={selectedPlan?.instances.toString()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo Mensajes
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxMessages}
                  onChange={(e) => setFormData({...formData, maxMessages: e.target.value})}
                  placeholder={selectedPlan?.messages.toString()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo Contactos
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxContacts}
                  onChange={(e) => setFormData({...formData, maxContacts: e.target.value})}
                  placeholder={selectedPlan?.contacts.toString()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Deja vacío para usar los límites por defecto del plan seleccionado
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Crear Empresa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlatformCompanies = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCompanies = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };

      const data = await platformCompanyService.listCompanies(params);
      setCompanies(data.companies || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(err.response?.data?.error || 'Error cargando empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies(1);
  }, [filters]);

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage) => {
    loadCompanies(newPage);
  };

  const handleViewDetails = (company) => {
    navigate(`/platform-admin/companies/${company.id}`);
  };

  const handleCreateCompany = async (companyData) => {
    await platformCompanyService.createCompany(companyData);
    // Reload companies list
    await loadCompanies(pagination.page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Gestiona todas las empresas de la plataforma</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">Ingresos estimados:</span>
              <span className="font-semibold text-green-600">
                ${companies.reduce((sum, company) => {
                  const prices = { starter: 15, business: 49, pro: 99, enterprise: 299 };
                  return sum + (prices[company.plan] || 0);
                }, 0).toLocaleString()}/mes
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Crear Empresa
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors ${
              showFilters ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filtros
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={filters.plan}
                onChange={(e) => handleFilterChange('plan', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los planes</option>
                <option value="free_trial">Free Trial</option>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="trial">Prueba</option>
                <option value="suspended">Suspendida</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Mostrando {companies.length} de {pagination.total} empresas
          {filters.search && ` para "${filters.search}"`}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={() => loadCompanies(pagination.page)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron empresas</h3>
          <p className="text-gray-600">
            {filters.search || filters.plan || filters.status
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no hay empresas registradas en la plataforma'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Anterior
              </button>

              <span className="text-sm text-gray-700">
                Página {pagination.page} de {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateCompany}
      />
    </div>
  );
};

export default PlatformCompanies;