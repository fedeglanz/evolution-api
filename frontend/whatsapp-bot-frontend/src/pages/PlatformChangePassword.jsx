import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import usePlatformAuthStore from '../store/platformAuthStore';

const PlatformChangePassword = () => {
  const navigate = useNavigate();
  const { changePassword, admin, isLoading, error, clearError, mustChangePassword, isAuthenticated } = usePlatformAuthStore();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Redirect if not authenticated or password change not required
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/platform-admin');
      return;
    }

    if (!mustChangePassword) {
      navigate('/platform-admin/dashboard');
      return;
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

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Al menos 8 caracteres');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Una letra minúscula');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Una letra mayúscula');
    }
    if (!/\d/.test(password)) {
      errors.push('Un número');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Un carácter especial (@$!%*?&)');
    }

    return errors;
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida';
    }

    if (!formData.newPassword) {
      errors.newPassword = 'La nueva contraseña es requerida';
    } else {
      const passwordErrors = validatePassword(formData.newPassword);
      if (passwordErrors.length > 0) {
        errors.newPassword = `La contraseña debe contener: ${passwordErrors.join(', ')}`;
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (formData.currentPassword === formData.newPassword) {
      errors.newPassword = 'La nueva contraseña debe ser diferente a la actual';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setSuccess(true);
      
      // Redirect after success message
      setTimeout(() => {
        navigate('/platform-admin/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Change password error:', error);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="mx-auto h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-300" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Contraseña actualizada!
            </h1>
            <p className="text-white/70 mb-4">
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white/60 text-sm mt-2">
              Redirigiendo al dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-800 to-pink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Cambiar Contraseña
          </h1>
          <p className="text-white/70 mb-4">
            Hola <strong>{admin?.firstName}</strong>, debes cambiar tu contraseña temporal
          </p>
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3">
            <p className="text-orange-200 text-sm">
              🔒 Por seguridad, debes establecer una nueva contraseña antes de continuar
            </p>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Contraseña actual (temporal)
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-white/60 
                    focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent
                    ${validationErrors.currentPassword ? 'border-red-400' : 'border-white/20'}`}
                  placeholder="Contraseña temporal"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPasswords.current ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-300">{validationErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-white/60 
                    focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent
                    ${validationErrors.newPassword ? 'border-red-400' : 'border-white/20'}`}
                  placeholder="Nueva contraseña segura"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPasswords.new ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.newPassword && (
                <p className="mt-1 text-sm text-red-300">{validationErrors.newPassword}</p>
              )}
              <div className="mt-2 text-xs text-white/60">
                <p>La contraseña debe contener:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Al menos 8 caracteres</li>
                  <li>Una letra minúscula y una mayúscula</li>
                  <li>Un número</li>
                  <li>Un carácter especial (@$!%*?&)</li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-white/60 
                    focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent
                    ${validationErrors.confirmPassword ? 'border-red-400' : 'border-white/20'}`}
                  placeholder="Repite la nueva contraseña"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPasswords.confirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-300">{validationErrors.confirmPassword}</p>
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
              className={`w-full bg-white text-red-800 py-3 px-6 rounded-xl font-semibold
                transition-all duration-200 flex items-center justify-center space-x-2
                ${isLoading 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-white/90 hover:transform hover:scale-105 active:scale-100'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-red-800 border-t-transparent rounded-full"></div>
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Cambiar Contraseña</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlatformChangePassword;