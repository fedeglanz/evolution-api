import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Button from '../ui/Button';
import { useQRCode } from '../../hooks/useInstances';
import { X, QrCode, RefreshCw, Smartphone, CheckCircle, AlertCircle, Key, ToggleLeft, ToggleRight } from 'lucide-react';

const QRCodeModal = ({ isOpen, onClose, instanceId, instanceName }) => {
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutos
  const [connectionMethod, setConnectionMethod] = useState('qr'); // 'qr' o 'code'
  const { data: qrData, isLoading, error, refetch } = useQRCode(instanceId);

  // Debug: Log de los datos que llegan
  console.log('🔍 QR Debug:', {
    isOpen,
    instanceId,
    instanceName,
    qrData,
    isLoading,
    error
  });

  // Extraer los datos correctamente de la respuesta de la API
  const actualData = qrData?.data || qrData; // Manejar ambas estructuras
  const qrCode = actualData?.qrCode;
  const pairingCode = actualData?.pairingCode || actualData?.code;
  const status = actualData?.status;

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          refetch(); // Refrescar QR cuando expire
          return 120; // Reiniciar timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, refetch]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setTimeRemaining(120);
    onClose();
  };

  const handleRefresh = () => {
    console.log('🔄 Refrescando QR...');
    refetch();
    setTimeRemaining(120);
  };

  const toggleConnectionMethod = () => {
    setConnectionMethod(prev => prev === 'qr' ? 'code' : 'qr');
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
                      {connectionMethod === 'qr' ? (
                        <QrCode className="h-5 w-5 text-white" />
                      ) : (
                        <Key className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Conectar WhatsApp
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        {instanceName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Toggle para método de conexión */}
                <div className="mb-6 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <QrCode className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Código QR</span>
                    </div>
                    
                    <button
                      onClick={toggleConnectionMethod}
                      className="flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors hover:bg-gray-200"
                    >
                      {connectionMethod === 'qr' ? (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ToggleRight className="h-6 w-6 text-whatsapp-500" />
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Código Numérico</span>
                      <Key className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-100 p-3 rounded mb-4 text-xs text-left">
                      <div><strong>Debug Info:</strong></div>
                      <div>isLoading: {isLoading ? 'true' : 'false'}</div>
                      <div>error: {error ? 'true' : 'false'}</div>
                      <div>qrData: {qrData ? 'exists' : 'null'}</div>
                      <div>actualData: {actualData ? 'exists' : 'null'}</div>
                      <div>qrCode: {qrCode ? 'exists' : 'null'}</div>
                      <div>pairingCode: {pairingCode ? 'exists' : 'null'}</div>
                      <div>status: {status || 'undefined'}</div>
                      <div>method: {connectionMethod}</div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex flex-col items-center space-y-4 p-8">
                      <div className="animate-spin w-8 h-8 border-3 border-whatsapp-500 border-t-transparent rounded-full"></div>
                      <p className="text-gray-600">
                        {connectionMethod === 'qr' ? 'Generando código QR...' : 'Generando código de enlace...'}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex flex-col items-center space-y-4 p-8">
                      <AlertCircle className="h-12 w-12 text-error-500" />
                      <div className="text-center">
                        <p className="text-error-600 font-medium">Error al obtener código</p>
                        <p className="text-sm text-gray-500">{error.message}</p>
                      </div>
                      <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reintentar
                      </Button>
                    </div>
                  )}

                  {/* Modo QR */}
                  {connectionMethod === 'qr' && qrCode && !isLoading && !error && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <img 
                          src={qrCode} 
                          alt="Código QR WhatsApp"
                          className="w-48 h-48 mx-auto"
                          onError={() => console.error('❌ Error cargando imagen QR')}
                          onLoad={() => console.log('✅ Imagen QR cargada exitosamente')}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-2 h-2 bg-whatsapp-500 rounded-full animate-pulse"></div>
                          <p className="text-sm text-gray-600">
                            Expira en: <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                          </p>
                        </div>
                        
                        <Button
                          onClick={handleRefresh}
                          variant="outline"
                          size="sm"
                          className="mx-auto"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Actualizar QR
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Modo Código Numérico */}
                  {connectionMethod === 'code' && actualData && !isLoading && !error && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-whatsapp-50 to-whatsapp-100 p-6 rounded-xl border border-whatsapp-200">
                        <div className="flex items-center justify-center mb-4">
                          <Key className="h-8 w-8 text-whatsapp-600" />
                        </div>
                        
                        {pairingCode ? (
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">Código de enlace:</p>
                            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-whatsapp-300">
                              <span className="text-2xl font-mono font-bold text-whatsapp-700 tracking-wider">
                                {pairingCode.length === 8 ? 
                                  `${pairingCode.substring(0, 4)}-${pairingCode.substring(4, 8)}` : 
                                  pairingCode
                                }
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Ingresa este código en WhatsApp → Dispositivos vinculados → Vincular con número
                            </p>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center justify-center mb-2">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                              </div>
                              <p className="text-yellow-800 font-medium mb-2">Pairing Code no disponible</p>
                              <p className="text-sm text-yellow-700">
                                Para generar un código numérico, la instancia debe crearse con un número de teléfono específico.
                              </p>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-blue-800 font-medium mb-2">💡 ¿Cómo habilitarlo?</p>
                              <ol className="text-sm text-blue-700 text-left space-y-1">
                                <li>1. Al crear una nueva instancia, especifica el número de teléfono</li>
                                <li>2. El pairing code se generará automáticamente</li>
                                <li>3. Podrás usar código QR o código numérico</li>
                              </ol>
                            </div>
                            
                            <div className="pt-2">
                              <p className="text-sm text-gray-600">
                                <strong>Por ahora:</strong> Usa el código QR para conectar esta instancia
                              </p>
                              <Button
                                onClick={() => setConnectionMethod('qr')}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                Usar Código QR
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {pairingCode && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-2 h-2 bg-whatsapp-500 rounded-full animate-pulse"></div>
                            <p className="text-sm text-gray-600">
                              Expira en: <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                            </p>
                          </div>
                          
                          <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            className="mx-auto"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualizar Código
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'connected' && (
                    <div className="flex flex-col items-center space-y-4 p-8">
                      <CheckCircle className="h-12 w-12 text-success-500" />
                      <div className="text-center">
                        <p className="text-success-600 font-medium">¡WhatsApp Conectado!</p>
                        <p className="text-sm text-gray-500">La instancia se ha conectado exitosamente</p>
                      </div>
                    </div>
                  )}

                  {/* Mostrar mensaje si no hay datos disponibles */}
                  {!isLoading && !error && (!actualData || (!qrCode && !pairingCode)) && (
                    <div className="flex flex-col items-center space-y-4 p-8">
                      <QrCode className="h-12 w-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-gray-600 font-medium">No hay código disponible</p>
                        <p className="text-sm text-gray-500">Presiona "Actualizar" para generar uno nuevo</p>
                      </div>
                      <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generar Código
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Instrucciones:</p>
                      {connectionMethod === 'qr' ? (
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Abre WhatsApp en tu teléfono</li>
                          <li>Ve a Configuración → Dispositivos vinculados</li>
                          <li>Toca "Vincular un dispositivo"</li>
                          <li>Escanea este código QR</li>
                        </ol>
                      ) : (
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Abre WhatsApp en tu teléfono</li>
                          <li>Ve a Configuración → Dispositivos vinculados</li>
                          <li>Toca "Vincular un dispositivo"</li>
                          <li>Selecciona "Vincular con número de teléfono"</li>
                          <li>Ingresa el código mostrado arriba</li>
                        </ol>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                  >
                    Cerrar
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default QRCodeModal; 