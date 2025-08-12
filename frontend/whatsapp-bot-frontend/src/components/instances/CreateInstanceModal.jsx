import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCreateInstance } from '../../hooks/useInstances';
import { X, Smartphone, Phone, Info, CheckCircle, ExternalLink } from 'lucide-react';

const CreateInstanceModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone_number: '' // Campo para número de teléfono
  }); // Removido webhook_url - se genera automáticamente
  const [errors, setErrors] = useState({});
  const [createdInstance, setCreatedInstance] = useState(null); // Para mostrar resultado

  const createInstanceMutation = useCreateInstance({
    onSuccess: (data) => {
      console.log('Instance created successfully:', data);
      setCreatedInstance(data.data.instance);
      onSuccess?.(data);
      // No cerrar inmediatamente, mostrar resultado primero
    },
    onError: (error) => {
      console.error('Error creating instance:', error);
      setCreatedInstance(null);
    }
  });

  const handleClose = () => {
    setFormData({ name: '', description: '', phone_number: '' });
    setErrors({});
    setCreatedInstance(null);
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

    // Validar formato de número de teléfono si se proporciona
    if (formData.phone_number && !isValidPhoneNumber(formData.phone_number)) {
      newErrors.phone_number = 'Formato inválido. Debe incluir código de país (ej: +5491123456789)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      phone_number: formData.phone_number.trim() || undefined
    }; // webhook_url se genera automáticamente en el backend

    createInstanceMutation.mutate(instanceData);
  };

  if (createdInstance) {
    // Mostrar resultado exitoso con información del workflow
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <Dialog.Title className="text-lg font-medium text-gray-900">
                        ¡Instancia Creada Exitosamente!
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Información básica */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-medium text-green-800 mb-2">Instancia Configurada</h3>
                      <div className="space-y-2 text-sm text-green-700">
                        <p><strong>Nombre:</strong> {createdInstance.name}</p>
                        <p><strong>Estado:</strong> {createdInstance.status}</p>
                        {createdInstance.phoneNumber && (
                          <p><strong>Número:</strong> {createdInstance.phoneNumber}</p>
                        )}
                      </div>
                    </div>

                    {/* Información del workflow N8N */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-800 mb-2">Workflow Automático Creado</h3>
                      <div className="space-y-2 text-sm text-blue-700">
                        <p><strong>Webhook URL:</strong></p>
                        <div className="bg-white border rounded p-2 font-mono text-xs break-all">
                          {createdInstance.webhookUrl}
                        </div>
                        
                        {createdInstance.n8nWorkflow && (
                          <>
                            <p><strong>N8N Workflow:</strong> {createdInstance.n8nWorkflow.name}</p>
                            <p><strong>Estado:</strong> {createdInstance.n8nWorkflow.isActive ? 'Activo' : 'Inactivo'}</p>
                            <p className="text-green-600">✓ Creado automáticamente</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* QR Code info */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-800 mb-2">Próximos Pasos</h3>
                      <div className="space-y-2 text-sm text-yellow-700">
                        <p>• Ve a la sección "Instancias" para escanear el código QR</p>
                        <p>• El workflow automático ya está configurado</p>
                        <p>• Una vez conectado, el bot estará listo para usar</p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline" 
                        onClick={handleClose}
                      >
                        Cerrar
                      </Button>
                      <Button
                        onClick={() => {
                          handleClose();
                          // Navegar a instancias si es necesario
                          window.location.href = '/instances';
                        }}
                      >
                        Ver Instancia
                      </Button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Formulario de creación normal
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Crear Nueva Instancia
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Info automática */}
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Configuración Automática</p>
                      <p>El workflow N8N y webhook se crearán automáticamente. No necesitas configurar URLs manualmente.</p>
                    </div>
                  </div>
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
                      label="Número de Teléfono (Opcional)"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="+5491123456789"
                      error={errors.phone_number}
                      icon={<Phone className="h-4 w-4" />}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Para usar código de vinculación en lugar de QR
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={createInstanceMutation.isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={createInstanceMutation.isLoading}
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