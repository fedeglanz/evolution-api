import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCreateInstance } from '../../hooks/useInstances';
import { X, Smartphone, Globe, Phone, Info } from 'lucide-react';

const CreateInstanceModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_url: '',
    phone_number: '' // Nuevo campo para número de teléfono
  });
  const [errors, setErrors] = useState({});

  const createInstanceMutation = useCreateInstance({
    onSuccess: (data) => {
      onSuccess?.(data);
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating instance:', error);
      // Manejar errores específicos aquí si es necesario
    }
  });

  const handleClose = () => {
    setFormData({ name: '', description: '', webhook_url: '', phone_number: '' });
    setErrors({});
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (formData.webhook_url && !isValidUrl(formData.webhook_url)) {
      newErrors.webhook_url = 'URL inválida';
    }

    // Validar formato de número de teléfono si se proporciona
    if (formData.phone_number && !isValidPhoneNumber(formData.phone_number)) {
      newErrors.phone_number = 'Formato inválido. Debe incluir código de país (ej: +5491123456789)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidPhoneNumber = (phone) => {
    // Validar que comience con + y tenga entre 10-15 dígitos
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const instanceData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      webhook_url: formData.webhook_url.trim() || undefined,
      phone_number: formData.phone_number.trim() || undefined
    };

    createInstanceMutation.mutate(instanceData);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-whatsapp-500 to-whatsapp-600 rounded-xl flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Nueva Instancia WhatsApp
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      label="Nombre *"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej: Atención al Cliente"
                      error={errors.name}
                      icon={<Smartphone className="h-4 w-4" />}
                    />
                  </div>

                  <div>
                    <Input
                      label="Descripción"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Breve descripción de la instancia"
                    />
                  </div>

                  <div>
                    <Input
                      label="URL Webhook"
                      name="webhook_url"
                      value={formData.webhook_url}
                      onChange={handleInputChange}
                      placeholder="https://tu-webhook.com/whatsapp"
                      error={errors.webhook_url}
                      icon={<Globe className="h-4 w-4" />}
                    />
                  </div>

                  {/* Nuevo campo para número de teléfono */}
                  <div>
                    <div className="mb-2">
                      <div className="flex items-center space-x-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Número de Teléfono
                        </label>
                        <div className="group relative">
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          <div className="invisible group-hover:visible absolute left-6 top-0 z-10 bg-gray-800 text-white text-xs rounded-lg p-2 w-64 shadow-lg">
                            Opcional. Si lo proporcionas, se generará un código numérico además del QR para conectar WhatsApp.
                          </div>
                        </div>
                      </div>
                    </div>
                    <Input
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="+5491123456789"
                      error={errors.phone_number}
                      icon={<Phone className="h-4 w-4" />}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Con código de país. Ejemplo: +54 para Argentina, +1 para EE.UU.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">💡 Funciones de conexión:</p>
                        <ul className="space-y-1">
                          <li>• <strong>Sin número:</strong> Solo código QR disponible</li>
                          <li>• <strong>Con número:</strong> QR + código numérico (8 dígitos)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={createInstanceMutation.isLoading}
                      disabled={createInstanceMutation.isLoading}
                    >
                      Crear Instancia
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateInstanceModal; 