🎯 Prompt 1: Setup inicial del Frontend React
markdown# 🚀 SETUP INICIAL FRONTEND REACT - WhatsApp Bot Platform

Necesito crear el frontend React completo para la plataforma WhatsApp Bot Platform. Este será un dashboard SaaS para que las empresas gestionen sus bots de WhatsApp.

## 🎯 CONTEXTO DEL PROYECTO

**Backend ya implementado:**
- API REST completa en http://localhost:3000/api
- Sistema de autenticación JWT
- Gestión de instancias WhatsApp
- Configuración de bots ChatGPT
- Gestión de contactos y conversaciones
- Dashboard con métricas

**Objetivo del Frontend:**
- Dashboard empresarial moderno
- Gestión completa de instancias WhatsApp
- Configuración visual de bots
- Lista de contactos y conversaciones
- Métricas y analytics visuales

## 📋 TAREAS A REALIZAR

### 1. **Crear estructura del proyecto React**
```bash
# Crear aplicación con Vite (más rápido que CRA)
npm create vite@latest whatsapp-bot-frontend -- --template react
cd whatsapp-bot-frontend
npm install
2. Instalar dependencias necesarias
bash# UI y Styling
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install lucide-react @headlessui/react
npm install clsx tailwind-merge

# Routing y Estado
npm install react-router-dom
npm install @tanstack/react-query
npm install zustand

# HTTP Client
npm install axios

# Utilidades
npm install react-hot-toast
npm install date-fns
npm install recharts
npm install qrcode.react
npm install @hookform/resolvers yup
npm install react-hook-form
3. Configurar Tailwind CSS
javascript// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
4. Estructura de carpetas del proyecto
src/
├── components/
│   ├── ui/           # Componentes base (Button, Input, etc.)
│   ├── layout/       # Layout principal, sidebar, header
│   ├── auth/         # Componentes de autenticación
│   ├── dashboard/    # Componentes del dashboard
│   ├── instances/    # Gestión de instancias
│   ├── contacts/     # Gestión de contactos
│   ├── conversations/ # Chat y mensajes
│   └── settings/     # Configuración
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Instances.jsx
│   ├── Contacts.jsx
│   ├── Conversations.jsx
│   └── Settings.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useApi.js
│   └── useWebSocket.js
├── services/
│   ├── api.js
│   ├── auth.js
│   └── storage.js
├── store/
│   ├── authStore.js
│   └── appStore.js
├── utils/
│   ├── format.js
│   └── constants.js
└── App.jsx
5. Configurar servicios básicos
src/services/api.js:
javascriptimport axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Configurar axios con interceptores
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor para agregar token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
6. Store de autenticación con Zustand
src/store/authStore.js:
javascriptimport { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      
      login: (userData) => {
        set({
          user: userData.user,
          company: userData.company,
          token: userData.token,
          isAuthenticated: true,
        });
        localStorage.setItem('auth-token', userData.token);
      },
      
      logout: () => {
        set({
          user: null,
          company: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('auth-token');
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);
7. Componentes UI base
src/components/ui/Button.jsx:
javascriptimport { clsx } from 'clsx';
import { forwardRef } from 'react';

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  className = '',
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;
8. Layout principal con sidebar
src/components/layout/Layout.jsx:
javascriptimport { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
9. Routing principal
src/App.jsx:
javascriptimport { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Contacts from './pages/Contacts';
import Conversations from './pages/Conversations';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? <Login /> : <Navigate to="/" replace />
              } 
            />
            
            <Route 
              path="/" 
              element={
                isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="instances" element={<Instances />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
🎯 DELIVERABLES ESPERADOS

Proyecto React configurado con Vite
Tailwind CSS configurado y funcionando
Estructura de carpetas completa
Servicios básicos (API, auth, storage)
Store de autenticación con Zustand
Componentes UI base (Button, Input, etc.)
Layout principal con sidebar responsive
Routing configurado con React Router
Interceptores HTTP para JWT
Página de login básica funcional

🚀 CRITERIOS DE ÉXITO

✅ Proyecto arranca sin errores
✅ Tailwind CSS funcionando
✅ Routing funcional
✅ Store de autenticación operativo
✅ Servicios API configurados
✅ Layout responsive
✅ Componentes UI base listos
✅ Interceptores HTTP funcionando

El proyecto debe estar listo para desarrollar las páginas específicas (Dashboard, Instances, etc.) en los siguientes prompts.
¿Está todo claro? ¿Hay alguna tecnología específica que quieras cambiar?