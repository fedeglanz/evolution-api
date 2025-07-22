import React from 'react';
import { 
  DocumentIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const KnowledgeStatsCards = ({ stats }) => {
  const statsConfig = [
    {
      key: 'total_items',
      title: 'Total Items',
      value: stats.total_items || 0,
      icon: DocumentIcon,
      color: 'blue',
      description: 'Knowledge items totales'
    },
    {
      key: 'active_items', 
      title: 'Items Activos',
      value: stats.active_items || 0,
      icon: CheckCircleIcon,
      color: 'green',
      description: 'Items disponibles para uso'
    },
    {
      key: 'file_items',
      title: 'Archivos',
      value: stats.file_items || 0,
      icon: DocumentIcon,
      color: 'purple',
      description: 'PDF, DOCX, TXT procesados'
    },
    {
      key: 'manual_items',
      title: 'Manuales',
      value: stats.manual_items || 0,
      icon: DocumentIcon,
      color: 'orange',
      description: 'Contenido creado manualmente'
    },
    {
      key: 'items_with_embeddings',
      title: 'Con Embeddings',
      value: stats.items_with_embeddings || 0,
      icon: ChartBarIcon,
      color: 'indigo',
      description: 'Preparados para RAG'
    },
    {
      key: 'total_assignments',
      title: 'Asignaciones',
      value: stats.total_assignments || 0,
      icon: LinkIcon,
      color: 'cyan',
      description: 'Asignados a bots activos'
    }
  ];

  // Filtrar stats con error y procesando para mostrar si existen
  const processingItems = stats.processing_items || 0;
  const errorItems = stats.error_items || 0;

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconBgClasses = (color) => {
    const bgMap = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      purple: 'bg-purple-100',
      orange: 'bg-orange-100',
      indigo: 'bg-indigo-100',
      cyan: 'bg-cyan-100',
      red: 'bg-red-100',
      yellow: 'bg-yellow-100'
    };
    return bgMap[color] || bgMap.blue;
  };

  // Calcular porcentaje de progreso si hay items totales
  const totalItems = stats.total_items || 0;
  const activePercentage = totalItems > 0 ? Math.round((stats.active_items || 0) / totalItems * 100) : 0;
  const embeddingsPercentage = totalItems > 0 ? Math.round((stats.items_with_embeddings || 0) / totalItems * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;
          
          return (
            <div
              key={stat.key}
              className={`relative overflow-hidden rounded-lg bg-white p-6 shadow border ${getColorClasses(stat.color)}`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${getIconBgClasses(stat.color)}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.value.toLocaleString()}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  {stat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Progreso General</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Activos</span>
                <span className="font-medium">{activePercentage}%</span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Con Embeddings</span>
                <span className="font-medium">{embeddingsPercentage}%</span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${embeddingsPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {(processingItems > 0 || errorItems > 0) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Estado de Procesamiento</h3>
            
            <div className="space-y-3">
              {processingItems > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm text-gray-600">Procesando</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-600">
                    {processingItems}
                  </span>
                </div>
              )}
              
              {errorItems > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-gray-600">Con errores</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {errorItems}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Average Content Length */}
        {stats.avg_content_length && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Estadísticas de Contenido</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Longitud promedio</span>
                <span className="text-sm font-medium">
                  {Math.round(stats.avg_content_length).toLocaleString()} chars
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estimado por item</span>
                <span className="text-sm font-medium">
                  {Math.round(stats.avg_content_length / 4)} palabras
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeStatsCards; 