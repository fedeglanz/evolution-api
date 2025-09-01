import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { platformCompanyService, platformUserService } from '../services/platformAdmin';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${colorClasses[color]} border`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

const UserRow = ({ user, onResetPassword, onEditUser }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.role === 'admin' ? 'Administrador' : 
           user.role === 'manager' ? 'Manager' : user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => onEditUser(user)}
            className="text-indigo-600 hover:text-indigo-900"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onResetPassword(user)}
            className="text-orange-600 hover:text-orange-900"
            title="Resetear contraseña"
          >
            🔑
          </button>
        </div>
      </td>
    </tr>
  );
};

const PlanChangeModal = ({ isOpen, onClose, company, onSave }) => {
  const [selectedPlan, setSelectedPlan] = useState(company?.plan || '');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  const plans = [
    { value: 'free_trial', label: 'Free Trial', price: 0 },
    { value: 'trial', label: 'Trial', price: 0 },
    { value: 'starter', label: 'Starter', price: 15 },
    { value: 'business', label: 'Business', price: 49 },
    { value: 'pro', label: 'Pro', price: 99 },
    { value: 'enterprise', label: 'Enterprise', price: 299 }
  ];

  useEffect(() => {
    if (company) {
      setSelectedPlan(company.plan);
      if (company.plan_expires_at) {
        setExpiresAt(new Date(company.plan_expires_at).toISOString().split('T')[0]);
      } else {
        // Set default to 1 month from now
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setExpiresAt(nextMonth.toISOString().split('T')[0]);
      }
    }
  }, [company]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedPlan, expiresAt);
      onClose();
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cambiar Plan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {plans.map(plan => (
                <option key={plan.value} value={plan.value}>
                  {plan.label} - ${plan.price}/mes
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Expiración
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlatformCompanyDetails = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const loadCompanyDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await platformCompanyService.getCompanyDetails(companyId);
      setCompany(data);
    } catch (err) {
      console.error('Error loading company details:', err);
      setError(err.response?.data?.error || 'Error cargando detalles de la empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadCompanyDetails();
    }
  }, [companyId]);

  const handlePlanChange = async (newPlan, expiresAt) => {
    try {
      await platformCompanyService.updateCompanyPlan(companyId, newPlan, expiresAt);
      // Reload company details
      await loadCompanyDetails();
    } catch (error) {
      throw error;
    }
  };

  const handleResetPassword = async (user) => {
    try {
      const response = await platformUserService.resetUserPassword(user.id);
      alert(`Contraseña reseteada. Nueva contraseña temporal: ${response.temporaryPassword}`);
    } catch (error) {
      alert('Error al resetear contraseña: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditUser = (user) => {
    // TODO: Open edit user modal
    alert('Función de editar usuario en desarrollo');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/platform-admin/companies')}
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Volver a empresas
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={loadCompanyDetails}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Empresa no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/platform-admin/companies')}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a empresas
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
              <span>{company.company.name}</span>
            </h1>
            <p className="text-gray-600">{company.company.email}</p>
          </div>
        </div>

        <button
          onClick={() => setShowPlanModal(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Cambiar Plan
        </button>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Plan Actual</label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                company.company.plan === 'enterprise' ? 'bg-red-100 text-red-800' :
                company.company.plan === 'pro' ? 'bg-orange-100 text-orange-800' :
                company.company.plan === 'business' ? 'bg-purple-100 text-purple-800' :
                company.company.plan === 'starter' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {company.company.plan}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Estado de Suscripción</label>
            <p className="mt-1 text-sm text-gray-900">{company.company.subscription_status}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Fecha de Registro</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(company.company.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Usuarios"
          value={company.users.length}
          icon={UserGroupIcon}
          color="blue"
        />
        <StatCard
          title="Instancias"
          value={`${company.instances.length}/${company.company.max_instances}`}
          icon={PhoneIcon}
          color="green"
        />
        <StatCard
          title="Mensajes (30d)"
          value={company.stats.messages_30d || 0}
          icon={ChatBubbleLeftRightIcon}
          color="purple"
        />
        <StatCard
          title="Documentos KB"
          value={company.stats.total_documents || 0}
          icon={DocumentTextIcon}
          color="orange"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Usuarios ({company.users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {company.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onResetPassword={handleResetPassword}
                  onEditUser={handleEditUser}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instances Table */}
      {company.instances.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Instancias WhatsApp ({company.instances.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {company.instances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {instance.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {instance.phone_number || 'No asignado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        instance.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {instance.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(instance.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      <PlanChangeModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        company={company.company}
        onSave={handlePlanChange}
      />
    </div>
  );
};

export default PlatformCompanyDetails;