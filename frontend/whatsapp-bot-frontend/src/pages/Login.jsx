import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Bot, MessageCircle, Zap, Shield, Globe, ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.password) newErrors.password = 'Contraseña es requerida';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;

    try {
      await login(formData.email, formData.password);
      toast.success('¡Bienvenido al futuro de WhatsApp Business!');
      navigate('/');
    } catch (err) {
      toast.error(error || 'Error al iniciar sesión');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 relative overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/80 to-primary-600/90"></div>
      
      {/* Elementos decorativos animados */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-whatsapp-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-bounce-subtle"></div>
      
      {/* Patrón de puntos */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Panel izquierdo - Información */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white">
          <div className="animate-fade-in">
            <div className="flex items-center mb-8">
              <div className="relative">
                <Bot className="h-16 w-16 text-whatsapp-400 animate-float" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-whatsapp-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white animate-pulse" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
                  WhatsApp Bot
                </h1>
                <p className="text-xl font-display font-medium text-primary-200">
                  Platform
                </p>
              </div>
            </div>
            
            <h2 className="text-5xl font-display font-bold mb-6 bg-gradient-to-r from-white via-primary-100 to-whatsapp-300 bg-clip-text text-transparent">
              Revoluciona tu
              <span className="block">Comunicación</span>
            </h2>
            
            <p className="text-xl text-primary-100 mb-12 leading-relaxed">
              La plataforma más avanzada para gestionar bots de WhatsApp. 
              Automatiza conversaciones, gestiona contactos y impulsa tu negocio.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4 animate-slide-in">
                <div className="bg-whatsapp-500/20 p-3 rounded-full">
                  <MessageCircle className="h-6 w-6 text-whatsapp-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Automatización Inteligente</h3>
                  <p className="text-primary-200">Respuestas automáticas y flujos conversacionales</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <div className="bg-primary-500/20 p-3 rounded-full">
                  <Zap className="h-6 w-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Rendimiento Ultra-Rápido</h3>
                  <p className="text-primary-200">Procesa miles de mensajes por segundo</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <div className="bg-primary-500/20 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Seguridad Empresarial</h3>
                  <p className="text-primary-200">Encriptación end-to-end y compliance</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <div className="bg-primary-500/20 p-3 rounded-full">
                  <Globe className="h-6 w-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Alcance Global</h3>
                  <p className="text-primary-200">Soporte multi-idioma y multi-región</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Panel derecho - Formulario */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 py-12">
          <div className="w-full max-w-md mx-auto">
            {/* Header móvil */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Bot className="h-12 w-12 text-whatsapp-400 animate-float" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-whatsapp-400 rounded-full flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white animate-pulse" />
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-white mb-2">
                WhatsApp Bot Platform
              </h1>
              <p className="text-primary-200">
                Accede a tu cuenta empresarial
              </p>
            </div>
            
            {/* Formulario */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-fade-in">
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-white mb-2">
                  Iniciar Sesión
                </h2>
                <p className="text-primary-200">
                  Bienvenido de vuelta, ingresa tus credenciales
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <Input
                    label="Email Empresarial"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                    placeholder="tu@empresa.com"
                    className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:border-whatsapp-400 focus:ring-whatsapp-400/20"
                    labelClassName="text-white font-medium"
                  />

                  <Input
                    label="Contraseña"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder-white/60 focus:border-whatsapp-400 focus:ring-whatsapp-400/20"
                    labelClassName="text-white font-medium"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/10 text-whatsapp-500 focus:ring-whatsapp-400 focus:ring-offset-0"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                      Recordarme
                    </label>
                  </div>

                  <button
                    type="button"
                    className="text-sm font-medium text-whatsapp-400 hover:text-whatsapp-300 transition-colors"
                    onClick={() => toast.info('Contacta al administrador para restablecer tu contraseña')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="whatsapp"
                  size="lg"
                  className="w-full"
                  loading={isLoading}
                >
                  {isLoading ? (
                    'Iniciando sesión...'
                  ) : (
                    <>
                      Iniciar Sesión
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-transparent px-4 text-white/80">¿No tienes cuenta?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link to="/register">
                    <Button
                      type="button"
                      variant="glass"
                      size="lg"
                      className="w-full"
                    >
                      Crear Cuenta Empresarial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-primary-200 text-sm">
                © 2024 WhatsApp Bot Platform. Tecnología de vanguardia para empresas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 