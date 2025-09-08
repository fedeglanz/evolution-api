import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  CreditCardIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import usePlatformAuthStore from '../store/platformAuthStore';

const PlatformAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout, isAuthenticated, loadAdminData, mustChangePassword } = usePlatformAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/platform-admin');
      return;
    }

    if (mustChangePassword && location.pathname !== '/platform-admin/change-password') {
      navigate('/platform-admin/change-password');
      return;
    }

    // Load admin data if not present
    if (isAuthenticated && !admin) {
      loadAdminData();
    }
  }, [isAuthenticated, admin, loadAdminData, navigate, mustChangePassword, location.pathname]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/platform-admin');
  };

  const navigation = [
    { name: 'Dashboard', href: '/platform-admin/dashboard', icon: ChartBarIcon, current: location.pathname === '/platform-admin/dashboard' },
    { name: 'Empresas', href: '/platform-admin/companies', icon: BuildingOfficeIcon, current: location.pathname.startsWith('/platform-admin/companies') },
    { name: 'Usuarios', href: '/platform-admin/users', icon: UsersIcon, current: location.pathname.startsWith('/platform-admin/users') },
    { name: 'Planes', href: '/platform-admin/plans', icon: CreditCardIcon, current: location.pathname.startsWith('/platform-admin/plans') },
    { name: 'Facturación', href: '/platform-admin/billing', icon: BanknotesIcon, current: location.pathname.startsWith('/platform-admin/billing') },
    { name: 'Configuración', href: '/platform-admin/settings', icon: Cog6ToothIcon, current: location.pathname === '/platform-admin/settings' },
  ];

  // Don't render layout if password change is required
  if (mustChangePassword) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-indigo-900 to-purple-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
            <span className="text-white font-bold text-lg">Platform Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Admin Info */}
        <div className="px-4 py-3 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {admin?.firstName} {admin?.lastName}
              </p>
              <p className="text-xs text-white/70 truncate">
                {admin?.role === 'super_admin' ? 'Super Administrador' : 
                 admin?.role === 'platform_staff' ? 'Staff Plataforma' : 
                 'Viewer Plataforma'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex-1 h-full flex flex-col">
          <div className="px-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors duration-200 ${
                    item.current
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="mt-auto p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left text-white/80 hover:bg-red-500/20 hover:text-white transition-colors duration-200"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-1 text-gray-400 hover:text-gray-500">
                <BellIcon className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">3</span>
                </span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2 hover:bg-gray-50"
                >
                  <span className="text-gray-700">
                    {admin?.firstName} {admin?.lastName}
                  </span>
                  <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>

                {/* User menu dropdown */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {admin?.firstName} {admin?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {admin?.role === 'super_admin' ? 'Super Administrador' : 
                             admin?.role === 'platform_staff' ? 'Staff Plataforma' : 
                             'Viewer Plataforma'}
                          </p>
                        </div>
                        
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900"
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlatformAdminLayout;