import { useState } from 'react';
import { getApiInfo } from '../services/api';
import Card from './ui/Card';
import Button from './ui/Button';
import { 
  Globe, 
  Clock, 
  Shield, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

const ApiInfo = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  const apiInfo = getApiInfo();
  
  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${apiInfo.url}/health`);
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsChecking(false);
    }
  };
  
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-error-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'error':
        return 'Error de conexión';
      default:
        return 'Estado desconocido';
    }
  };
  
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-success-700 bg-success-50';
      case 'error':
        return 'text-error-700 bg-error-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };
  
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-whatsapp-50 opacity-50"></div>
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-whatsapp-500 rounded-xl flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Configuración de API
              </h3>
              <p className="text-sm text-gray-600">
                Información de conexión al backend
              </p>
            </div>
          </div>
          
          <Button
            onClick={checkConnection}
            loading={isChecking}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Verificar</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Globe className="h-4 w-4 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">URL de la API</p>
                <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                  {apiInfo.url}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Timeout</p>
                <p className="text-xs text-gray-500">
                  {apiInfo.timeout}ms
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Entorno</p>
                <p className="text-xs text-gray-500 capitalize">
                  {apiInfo.environment}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Info className="h-4 w-4 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Versión</p>
                <p className="text-xs text-gray-500">
                  {apiInfo.version || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {connectionStatus && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${getStatusColor()}`}>
              {getStatusIcon()}
              <div>
                <p className="text-sm font-medium">
                  Estado de conexión: {getStatusText()}
                </p>
                <p className="text-xs opacity-80">
                  {connectionStatus === 'connected' 
                    ? 'La API está respondiendo correctamente' 
                    : 'No se pudo establecer conexión con la API'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ApiInfo; 