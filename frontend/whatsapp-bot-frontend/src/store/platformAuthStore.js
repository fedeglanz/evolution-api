import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { platformAuthService } from '../services/platformAdmin';

const usePlatformAuthStore = create(
  persist(
    (set, get) => ({
      // State
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      mustChangePassword: false,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await platformAuthService.login(email, password);
          
          set({
            admin: response.admin,
            token: response.token,
            isAuthenticated: true,
            mustChangePassword: response.admin?.mustChangePassword || false,
            isLoading: false,
            error: null
          });

          return response;
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Error al iniciar sesión';
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            mustChangePassword: false,
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await platformAuthService.changePassword(currentPassword, newPassword);
          
          // Update mustChangePassword status
          set((state) => ({
            ...state,
            mustChangePassword: false,
            isLoading: false,
            error: null
          }));

          return true;
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Error al cambiar contraseña';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      loadAdminData: async () => {
        const { token } = get();
        if (!token) return false;

        set({ isLoading: true });
        try {
          const response = await platformAuthService.verify();
          
          set({
            admin: response.admin,
            isAuthenticated: true,
            mustChangePassword: response.admin?.mustChangePassword || false,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          console.error('Error loading platform admin data:', error);
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            mustChangePassword: false,
            isLoading: false,
            error: null
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await platformAuthService.logout();
        } catch (error) {
          console.error('Error during logout:', error);
        } finally {
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            mustChangePassword: false,
            isLoading: false,
            error: null
          });
        }
      },

      updateAdmin: (adminData) => {
        set((state) => ({
          admin: { ...state.admin, ...adminData }
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      // Initialize from localStorage
      initialize: () => {
        const { loadAdminData } = get();
        loadAdminData();
      }
    }),
    {
      name: 'platform-auth-storage',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword
      })
    }
  )
);

export default usePlatformAuthStore;