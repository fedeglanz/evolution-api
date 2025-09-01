import React, { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { platformStatsService } from '../services/platformAdmin';

const StatCard = ({ title, value, icon: Icon, change, changeType, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${colorClasses[color]} border`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value || '0'}
            </p>
            {change && (
              <div className={`ml-2 flex items-center text-sm ${
                changeType === 'increase' ? 'text-green-600' : 
                changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {changeType === 'increase' && <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />}
                {changeType === 'decrease' && <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
                {change}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanCard = ({ plan, count, revenue }) => {
  const planInfo = {
    free_trial: { name: 'Free Trial', color: 'gray', price: 0 },
    trial: { name: 'Trial', color: 'blue', price: 0 },
    starter: { name: 'Starter', color: 'green', price: 15 },
    business: { name: 'Business', color: 'purple', price: 49 },
    pro: { name: 'Pro', color: 'orange', price: 99 },
    enterprise: { name: 'Enterprise', color: 'red', price: 299 }
  };

  const info = planInfo[plan] || { name: plan, color: 'gray', price: 0 };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
          <p className="text-sm text-gray-600">{count} empresas</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">${info.price}/mes</p>
          <p className="text-lg font-semibold text-gray-900">
            ${((count || 0) * info.price).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const PlatformDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await platformStatsService.getStatistics();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err.response?.data?.error || 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={loadStats}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Reintentar</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const totalRevenue = [
    stats?.starter_companies * 15,
    stats?.business_companies * 49,
    stats?.pro_companies * 99,
    stats?.enterprise_companies * 299
  ].reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Vista general de la plataforma</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Actualizado: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={loadStats}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Empresas"
          value={stats?.total_companies}
          icon={BuildingOfficeIcon}
          color="blue"
        />
        <StatCard
          title="Empresas Activas"
          value={stats?.active_companies}
          icon={BuildingOfficeIcon}
          color="green"
        />
        <StatCard
          title="Total Usuarios"
          value={stats?.total_users}
          icon={UsersIcon}
          color="purple"
        />
        <StatCard
          title="Instancias Conectadas"
          value={stats?.active_instances}
          icon={PhoneIcon}
          color="orange"
        />
      </div>

      {/* Message Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Mensajes (24h)"
          value={stats?.messages_last_24h}
          icon={ChatBubbleLeftRightIcon}
          color="green"
        />
        <StatCard
          title="Mensajes (7 días)"
          value={stats?.messages_last_7d}
          icon={ChatBubbleLeftRightIcon}
          color="blue"
        />
        <StatCard
          title="Mensajes (30 días)"
          value={stats?.messages_last_30d}
          icon={ChatBubbleLeftRightIcon}
          color="purple"
        />
      </div>

      {/* Plans Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Distribución de Planes</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">Ingresos mensuales estimados</p>
            <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlanCard plan="free_trial" count={stats?.free_trial_companies} />
          <PlanCard plan="trial" count={stats?.trial_companies} />
          <PlanCard plan="starter" count={stats?.starter_companies} />
          <PlanCard plan="business" count={stats?.business_companies} />
          <PlanCard plan="pro" count={stats?.pro_companies} />
          <PlanCard plan="enterprise" count={stats?.enterprise_companies} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Bots Activos"
          value={stats?.active_bots}
          icon={ChatBubbleLeftRightIcon}
          color="green"
        />
        <StatCard
          title="Documentos Knowledge Base"
          value={stats?.total_documents}
          icon={DocumentTextIcon}
          color="blue"
        />
      </div>
    </div>
  );
};

export default PlatformDashboard;