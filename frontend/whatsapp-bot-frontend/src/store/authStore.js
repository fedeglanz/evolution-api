import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Acciones
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const userData = await authService.login(email, password);
          
          set({
            user: userData.user,
            company: userData.company,
            token: userData.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return userData;
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Error al iniciar sesión',
          });
          throw error;
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await authService.register(userData);
          
          set({
            user: result.user,
            company: result.company,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return result;
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Error al registrarse',
          });
          throw error;
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await authService.logout();
        } catch (error) {
          console.error('Error during logout:', error);
        } finally {
          set({
            user: null,
            company: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },
      
      loadUserData: async () => {
        if (!authService.hasValidToken()) {
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const userData = await authService.getCurrentUser();
          
          set({
            user: userData.user,
            company: userData.company,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error loading user data:', error);
          // Token inválido, limpiar estado
          set({
            user: null,
            company: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },
      
      updateCompany: (companyData) => {
        set((state) => ({
          company: { ...state.company, ...companyData }
        }));
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      // Inicializar autenticación al cargar la app
      initialize: () => {
        const token = authService.getToken();
        if (token) {
          set({ token, isAuthenticated: true });
          get().loadUserData();
        }
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
      // Solo persistir datos necesarios
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 