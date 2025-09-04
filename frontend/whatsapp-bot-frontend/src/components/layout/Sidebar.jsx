import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Home, 
  Phone, 
  Users, 
  Users2,
  MessageCircle,
  MessageSquare,
  Zap,
  Clock,
  Paperclip,
  Target,
  CreditCard,
  Settings,
  X,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Send
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Instancias', href: '/instances', icon: Phone },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Knowledge Base', href: '/knowledge', icon: Brain },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Contactos', href: '/contacts', icon: Users2 },
  { name: 'Conversaciones', href: '/conversations', icon: MessageCircle },
  { 
    name: 'Mensajería', 
    icon: MessageSquare,
    submenu: [
      { name: 'Templates', href: '/templates', icon: MessageSquare },
      { name: 'Respuestas Rápidas', href: '/quick-replies', icon: Zap },
      { name: 'Mensajes Programados', href: '/scheduled-messages', icon: Clock },
      { name: 'Archivos Multimedia', href: '/attachments', icon: Paperclip },
    ]
  },
  { name: 'Mensajería Masiva', href: '/mass-messaging', icon: Send },
  { name: 'Campañas de Grupos', href: '/campaigns', icon: Target },
  { name: 'Facturación', href: '/billing', icon: CreditCard },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isSubmenuActive = (submenu) => {
    return submenu?.some(subitem => location.pathname === subitem.href);
  };

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center">
          <Bot className="h-8 w-8 text-blue-400" />
          <span className="ml-2 text-white font-bold text-lg">
            WhatsApp Bot
          </span>
        </div>
      </div>
      
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                // Si tiene submenú
                if (item.submenu) {
                  const isExpanded = expandedItems[item.name];
                  const hasActiveSubmenu = isSubmenuActive(item.submenu);
                  
                  return (
                    <li key={item.name}>
                      {/* Item principal con submenú */}
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={clsx(
                          hasActiveSubmenu
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800',
                          'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        <span className="flex-1 text-left">{item.name}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                      
                      {/* Submenú */}
                      {isExpanded && (
                        <ul className="mt-1 ml-6 space-y-1">
                          {item.submenu.map((subitem) => {
                            const isSubActive = location.pathname === subitem.href;
                            
                            return (
                              <li key={subitem.name}>
                                <Link
                                  to={subitem.href}
                                  className={clsx(
                                    isSubActive
                                      ? 'bg-gray-800 text-white'
                                      : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors'
                                  )}
                                  onClick={() => setOpen && setOpen(false)}
                                >
                                  <subitem.icon className="h-5 w-5 shrink-0" />
                                  {subitem.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                } else {
                  // Item normal sin submenú
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={clsx(
                          isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                        )}
                        onClick={() => setOpen && setOpen(false)}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  );
                }
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar; 