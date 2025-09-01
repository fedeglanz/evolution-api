import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, KeyIcon } from '@heroicons/react/24/outline';
import usePlatformAuthStore from '../store/platformAuthStore';

const PlatformAdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError, mustChangePassword } = usePlatformAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (mustChangePassword) {
        navigate('/platform-admin/change-password');
      } else {
        navigate('/platform-admin/dashboard');
      }
    }
  }, [isAuthenticated, mustChangePassword, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Formato de email inválido';
    }

    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      // Error is handled by the store
      console.error('Login error:', error);
    }
  };

  // If already authenticated, don't render login form
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Platform Admin
          </h1>
          <p className="text-white/70">
            Panel de administración de la plataforma
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email de administrador
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/60 
                  focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent
                  ${validationErrors.email ? 'border-red-400' : 'border-white/20'}`}
                placeholder="admin@tuempresa.com"
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-300">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-white/60 
                    focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent
                    ${validationErrors.password ? 'border-red-400' : 'border-white/20'}`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-300">{validationErrors.password}</p>
              )}
            </div>

            {/* General Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-white text-purple-800 py-3 px-6 rounded-xl font-semibold
                transition-all duration-200 flex items-center justify-center space-x-2
                ${isLoading 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-white/90 hover:transform hover:scale-105 active:scale-100'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-purple-800 border-t-transparent rounded-full"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <KeyIcon className="h-5 w-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              ¿No eres administrador?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-white hover:text-white/80 underline transition-colors"
              >
                Ir al panel normal
              </button>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-white/50 text-xs">
            Acceso restringido solo para administradores de la plataforma
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlatformAdminLogin;