import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  Menu as MenuIcon, 
  User,
  LogOut,
  UserCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

const Header = ({ setSidebarOpen }) => {
  const { user, company, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-900/10 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Company info */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" />
          <div className="flex items-center gap-x-2">
            <div className="text-sm font-medium text-gray-900">
              {company?.name || 'Mi Empresa'}
            </div>
            <div className="text-xs text-gray-500">
              Plan: {company?.plan || 'Básico'}
            </div>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" />
          
          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <UserCircle className="h-8 w-8 text-gray-400" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-2 text-sm font-semibold leading-6 text-gray-900">
                  {user?.name || 'Usuario'}
                </span>
              </span>
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name || 'Usuario'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email || 'usuario@ejemplo.com'}
                  </div>
                </div>
                
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="#"
                      className={clsx(
                        active ? 'bg-gray-50' : '',
                        'flex items-center px-3 py-2 text-sm text-gray-700'
                      )}
                    >
                      <User className="mr-3 h-4 w-4" />
                      Mi Perfil
                    </a>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="#"
                      className={clsx(
                        active ? 'bg-gray-50' : '',
                        'flex items-center px-3 py-2 text-sm text-gray-700'
                      )}
                    >
                      <SettingsIcon className="mr-3 h-4 w-4" />
                      Configuración
                    </a>
                  )}
                </Menu.Item>
                
                <div className="border-t border-gray-100">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={clsx(
                          active ? 'bg-gray-50' : '',
                          'flex w-full items-center px-3 py-2 text-sm text-gray-700'
                        )}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Cerrar Sesión
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
};

export default Header; 