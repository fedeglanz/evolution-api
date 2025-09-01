import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  KeyIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { platformUserService, platformCompanyService } from '../services/platformAdmin';

const CreateUserModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyId: '',
    role: 'admin',
    generatePassword: true,
    tempPassword: ''
  });
  const [companies, setCompanies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // New company inline creation
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    email: '',
    plan: 'starter'
  });

  useEffect(() => {
    if (isOpen) {
      // Load companies for selection
      const loadCompanies = async () => {
        try {
          const data = await platformCompanyService.listCompanies({ limit: 100 });
          setCompanies(data.companies || []);
        } catch (err) {
          console.error('Error loading companies:', err);
        }
      };
      loadCompanies();
    }
  }, [isOpen]);

  const handleCreateNewCompany = async () => {
    try {
      const response = await platformCompanyService.createCompany(newCompanyData);
      const newCompany = response.company;
      
      // Add the new company to the list and select it
      setCompanies(prev => [...prev, newCompany]);
      setFormData(prev => ({ ...prev, companyId: newCompany.id }));
      
      // Reset and hide the form
      setNewCompanyData({ name: '', email: '', plan: 'starter' });
      setShowNewCompanyForm(false);
    } catch (err) {
      setError('Error creando empresa: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await onSave(formData);
      alert(`Usuario creado exitosamente.\nContraseña temporal: ${response.user.temporaryPassword}`);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        companyId: '',
        role: 'admin',
        generatePassword: true,
        tempPassword: ''
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creando usuario');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <div className="space-y-2">
              <select
                required
                value={formData.companyId}
                onChange={(e) => {
                  if (e.target.value === 'CREATE_NEW') {
                    setShowNewCompanyForm(true);
                    setFormData({...formData, companyId: ''});
                  } else {
                    setFormData({...formData, companyId: e.target.value});
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Seleccionar empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.email})
                  </option>
                ))}
                <option value="CREATE_NEW" className="text-indigo-600 font-medium">
                  ➕ Crear Nueva Empresa
                </option>
              </select>

              {/* New Company Form */}
              {showNewCompanyForm && (
                <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <BuildingOfficeIcon className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-sm font-medium text-indigo-900">Nueva Empresa</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCompanyForm(false);
                        setNewCompanyData({ name: '', email: '', plan: 'starter' });
                      }}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        type="text"
                        value={newCompanyData.name}
                        onChange={(e) => setNewCompanyData({...newCompanyData, name: e.target.value})}
                        className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Ej. Mi Empresa SAS"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-indigo-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newCompanyData.email}
                        onChange={(e) => setNewCompanyData({...newCompanyData, email: e.target.value})}
                        className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-indigo-700 mb-1">
                      Plan
                    </label>
                    <select
                      value={newCompanyData.plan}
                      onChange={(e) => setNewCompanyData({...newCompanyData, plan: e.target.value})}
                      className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="starter">Starter - $15</option>
                      <option value="business">Business - $49</option>
                      <option value="pro">Pro - $99</option>
                      <option value="enterprise">Enterprise - $299</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={handleCreateNewCompany}
                      disabled={!newCompanyData.name || !newCompanyData.email}
                      className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      Crear y Seleccionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">Usuario</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.generatePassword}
                onChange={(e) => setFormData({...formData, generatePassword: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Generar contraseña automáticamente</span>
            </label>
          </div>

          {!formData.generatePassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña temporal
              </label>
              <input
                type="password"
                value={formData.tempPassword}
                onChange={(e) => setFormData({...formData, tempPassword: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          )}

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
                  Crear Usuario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlatformUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filters and modals
  const [filters, setFilters] = useState({
    search: '',
    companyId: '',
    role: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };

      const data = await platformUserService.listUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.error || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [filters]);

  const handleCreateUser = async (userData) => {
    const response = await platformUserService.createUser(userData);
    await loadUsers(pagination.page);
    return response;
  };

  const handleResetPassword = async (user) => {
    try {
      const response = await platformUserService.resetUserPassword(user.id);
      alert(`Contraseña reseteada para ${user.first_name} ${user.last_name}.\nNueva contraseña temporal: ${response.temporaryPassword}`);
    } catch (error) {
      alert('Error al resetear contraseña: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewCompany = (companyId) => {
    navigate(`/platform-admin/companies/${companyId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600">Gestiona todos los usuarios de la plataforma</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Crear Usuario
        </button>
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
              onChange={(e) => setFilters({...filters, search: e.target.value})}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({...filters, role: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos los roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">Usuario</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Mostrando {users.length} de {pagination.total} usuarios
          {filters.search && ` para "${filters.search}"`}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="animate-pulse p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={() => loadUsers(pagination.page)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
          <p className="text-gray-600">
            {filters.search || filters.role
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no hay usuarios registrados en la plataforma'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
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
                      <button
                        onClick={() => handleViewCompany(user.company_id)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {user.company_name}
                      </button>
                      <div className="text-xs text-gray-500">{user.company_plan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.company_plan === 'enterprise' ? 'bg-red-100 text-red-800' :
                        user.company_plan === 'pro' ? 'bg-orange-100 text-orange-800' :
                        user.company_plan === 'business' ? 'bg-purple-100 text-purple-800' :
                        user.company_plan === 'starter' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.company_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Resetear contraseña"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  Anterior
                </button>
                <button
                  onClick={() => loadUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateUser}
      />
    </div>
  );
};

export default PlatformUsers;