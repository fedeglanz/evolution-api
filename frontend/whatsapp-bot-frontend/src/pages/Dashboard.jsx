import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import { 
  Phone, 
  Users, 
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Activity,
  BarChart3,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const { user, company } = useAuthStore();
  const [stats, setStats] = useState({
    instances: { total: 0, active: 0, inactive: 0 },
    messages: { total: 0, sent: 0, received: 0 },
    contacts: { total: 0, active: 0 }
  });

  useEffect(() => {
    setTimeout(() => {
      setStats({
        instances: { total: 3, active: 2, inactive: 1 },
        messages: { total: 1247, sent: 823, received: 424 },
        contacts: { total: 156, active: 134 }
      });
    }, 1000);
  }, []);

  const metrics = [
    {
      name: 'Instancias Activas',
      value: stats.instances.active,
      total: stats.instances.total,
      icon: Phone,
      color: 'text-whatsapp-600',
      bgColor: 'bg-gradient-to-br from-whatsapp-400 to-whatsapp-600',
      iconBg: 'bg-whatsapp-500/20',
      description: 'Bots funcionando',
      trend: 'up',
      trendValue: '+2'
    },
    {
      name: 'Total Contactos',
      value: stats.contacts.total,
      change: '+12%',
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-gradient-to-br from-primary-400 to-primary-600',
      iconBg: 'bg-primary-500/20',
      description: 'Personas alcanzadas',
      trend: 'up',
      trendValue: '+12%'
    },
    {
      name: 'Mensajes Enviados',
      value: stats.messages.sent,
      change: '+5%',
      icon: MessageCircle,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      iconBg: 'bg-purple-500/20',
      description: 'Interacciones automáticas',
      trend: 'up',
      trendValue: '+5%'
    },
    {
      name: 'Mensajes Recibidos',
      value: stats.messages.received,
      change: '+18%',
      icon: MessageCircle,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
      iconBg: 'bg-orange-500/20',
      description: 'Conversaciones iniciadas',
      trend: 'up',
      trendValue: '+18%'
    }
  ];

  const quickActions = [
    {
      name: 'Nueva Instancia',
      description: 'Crear un nuevo bot de WhatsApp',
      icon: Phone,
      color: 'from-whatsapp-500 to-whatsapp-600',
      href: '/instances'
    },
    {
      name: 'Ver Conversaciones',
      description: 'Revisar chats activos',
      icon: MessageCircle,
      color: 'from-primary-500 to-primary-600',
      href: '/conversations'
    },
    {
      name: 'Gestionar Contactos',
      description: 'Administrar base de datos',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      href: '/contacts'
    },
    {
      name: 'Configuración',
      description: 'Ajustar preferencias',
      icon: Shield,
      color: 'from-orange-500 to-orange-600',
      href: '/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-whatsapp-600/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-whatsapp-500 rounded-2xl flex items-center justify-center shadow-xl">
                      <Sparkles className="h-8 w-8 text-white animate-pulse" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-whatsapp-500 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-gray-900 via-primary-800 to-whatsapp-700 bg-clip-text text-transparent">
                      ¡Bienvenido, {user?.name}!
                    </h1>
                    <p className="text-lg text-gray-600 mt-1">
                      Panel de control de {company?.name || 'tu empresa'} - Gestión inteligente de WhatsApp
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    🚀 Sistema Activo
                  </div>
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    ⚡ Rendimiento Óptimo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div 
              key={metric.name} 
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-3 rounded-xl ${metric.iconBg} backdrop-blur-sm`}>
                        <metric.icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                          {metric.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {metric.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {metric.value}
                      </span>
                      {metric.total && (
                        <span className="text-lg text-gray-500">
                          / {metric.total}
                        </span>
                      )}
                    </div>
                    
                    {metric.trendValue && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center space-x-1 px-2 py-1 bg-success-100 text-success-700 rounded-full text-xs font-medium">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>{metric.trendValue}</span>
                        </div>
                        <span className="text-xs text-gray-500">vs. mes anterior</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-whatsapp-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-whatsapp-500 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900">
                  Acciones Rápidas
                </h2>
                <p className="text-gray-600">
                  Herramientas esenciales para gestionar tu plataforma
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <div
                  key={action.name}
                  className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-white transition-colors">
                      {action.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                      {action.description}
                    </p>
                    
                    <div className="mt-4 flex items-center text-sm font-medium text-gray-500 group-hover:text-white/80 transition-colors">
                      <span>Ir a la sección</span>
                      <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-success-600/10 to-primary-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Estado del Sistema
                  </h3>
                  <p className="text-sm text-gray-600">
                    Todos los servicios funcionando correctamente
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-success-700">API Activa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-whatsapp-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-whatsapp-700">WhatsApp Conectado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-primary-700">Base de Datos OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 