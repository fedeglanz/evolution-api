import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { 
  Users, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Phone,
  User,
  ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const PublicCampaign = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [campaignData, setCampaignData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  // Cargar datos de la campaña
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        const response = await api.get(`/campaigns/public/${slug}`);
        
        if (response.data.success) {
          setCampaignData(response.data.data);
        } else {
          toast.error(response.data.message || 'Campaña no encontrada');
          // Redirigir después de 3 segundos
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('Error cargando campaña:', error);
        toast.error('Error cargando la campaña');
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCampaignData();
    }
  }, [slug, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.phone.trim()) {
      toast.error('El número de teléfono es obligatorio');
      return;
    }

    if (formData.phone.replace(/[^0-9]/g, '').length < 8) {
      toast.error('Por favor ingresa un número de teléfono válido');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(`/campaigns/public/${slug}/register`, {
        name: formData.name.trim() || null,
        phone: formData.phone.trim()
      });

      if (response.data.success) {
        setRegistered(true);
        setInviteLink(response.data.data.groupInviteLink);
        
        if (response.data.data.alreadyRegistered) {
          toast.success('¡Ya estás registrado! Te llevamos al grupo');
        } else {
          toast.success('¡Registro exitoso! Te llevamos al grupo');
        }

        // Auto-redirigir a WhatsApp después de 2 segundos
        setTimeout(() => {
          if (response.data.data.groupInviteLink) {
            window.open(response.data.data.groupInviteLink, '_blank');
          }
        }, 2000);

      } else {
        toast.error(response.data.message || 'Error en el registro');
      }
    } catch (error) {
      console.error('Error registrando:', error);
      toast.error('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaña no encontrada</h1>
          <p className="text-gray-600 mb-6">
            La campaña que buscas no existe o ya no está disponible.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Ir al inicio
          </Button>
        </Card>
      </div>
    );
  }

  if (registered && inviteLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto text-center p-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Registro Exitoso! 🎉</h1>
          <p className="text-lg text-gray-700 mb-6">
            Te has unido exitosamente a <strong>{campaignData.groupName}</strong>
          </p>
          
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 mb-3">
              Serás redirigido automáticamente a WhatsApp en unos segundos...
            </p>
            <Button 
              onClick={() => window.open(inviteLink, '_blank')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Ir al Grupo de WhatsApp
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Si no se abre automáticamente, haz clic en el botón de arriba
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {campaignData.distributorTitle || campaignData.campaignName}
            </h1>
            <p className="text-lg text-gray-600">
              {campaignData.distributorWelcomeMessage || 'Únete a nuestro grupo de WhatsApp'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8">
          {/* Info del grupo */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Users className="h-10 w-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {campaignData.groupName}
            </h2>

            <div className="flex justify-center items-center space-x-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                <span>{campaignData.availableSpots} cupos disponibles</span>
              </div>
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                <span>Grupo de WhatsApp</span>
              </div>
            </div>

            {campaignData.availableSpots > 0 ? (
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-8">
                <p className="text-green-800 font-medium">
                  ¡Cupos limitados! Solo quedan {campaignData.availableSpots} lugares de {campaignData.totalCapacity}
                </p>
              </div>
            ) : (
              <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-8">
                <p className="text-red-800 font-medium">
                  Lo sentimos, este grupo está lleno. Pronto abriremos un nuevo grupo.
                </p>
              </div>
            )}
          </div>

          {/* Formulario de registro */}
          {campaignData.availableSpots > 0 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Nombre (opcional)
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Tu nombre completo"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Número de WhatsApp *
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Ej: +34 123 456 789"
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incluye el código de país (ej: +34 para España)
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg py-3"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Registrando...
                  </>
                ) : (
                  <>
                    Unirme al Grupo
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Footer info */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Al registrarte, serás agregado automáticamente al grupo de WhatsApp.
              <br />
              Puedes salir del grupo en cualquier momento.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicCampaign; 