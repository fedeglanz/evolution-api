import Card from '../components/ui/Card';
import ApiInfo from '../components/ApiInfo';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Palette, 
  Database,
  Globe,
  Sparkles
} from 'lucide-react';

const Settings = () => {
  const settingSections = [
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configura alertas y notificaciones',
      icon: Bell,
      color: 'from-primary-500 to-primary-600',
      available: false
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Gestión de accesos y permisos',
      icon: Shield,
      color: 'from-error-500 to-error-600',
      available: false
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Personaliza la interfaz',
      icon: Palette,
      color: 'from-purple-500 to-purple-600',
      available: false
    },
    {
      id: 'database',
      title: 'Base de Datos',
      description: 'Configuración de almacenamiento',
      icon: Database,
      color: 'from-orange-500 to-orange-600',
      available: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-whatsapp-600/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-whatsapp-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <SettingsIcon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-whatsapp-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-gray-900 via-primary-800 to-whatsapp-700 bg-clip-text text-transparent">
                  Configuración
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Personaliza y configura tu plataforma WhatsApp Bot
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información de la API */}
        <div className="animate-fade-in">
          <ApiInfo />
        </div>

        {/* Secciones de configuración */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-whatsapp-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-whatsapp-500 rounded-xl flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900">
                  Configuraciones Avanzadas
                </h2>
                <p className="text-gray-600">
                  Próximamente disponibles para personalizar tu experiencia
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {settingSections.map((section, index) => (
                <div
                  key={section.id}
                  className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${section.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                      <section.icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {section.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      {section.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        section.available 
                          ? 'bg-success-100 text-success-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {section.available ? 'Disponible' : 'Próximamente'}
                      </span>
                      
                      {!section.available && (
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-success-600/10 to-primary-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
                Configuración Segura
              </h3>
              
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                Todas las configuraciones se almacenan de forma segura y se aplican 
                automáticamente en toda tu plataforma. Los cambios se sincronizan 
                instantáneamente con todos tus bots de WhatsApp.
              </p>
              
              <div className="flex items-center justify-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-success-700">Encriptación End-to-End</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-primary-700">Sincronización Automática</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-whatsapp-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-whatsapp-700">Respaldo en la Nube</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 