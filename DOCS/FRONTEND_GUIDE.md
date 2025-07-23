# 🎨 Frontend Guide - WhatsApp Bot Platform

## 📋 Descripción General

El **Frontend** es una **Single Page Application (SPA)** construida con **React 18 + Vite** que proporciona una interfaz moderna y responsive para gestionar bots, knowledge base, instancias de WhatsApp y analytics. Utiliza **Zustand** para state management, **React Query** para data fetching, y **Tailwind CSS** para styling.

### 🎯 **Características Principales**
- **⚡ React 18** con Vite para desarrollo ultrarrápido
- **🗄️ Zustand** - State management simple y performante  
- **🔄 React Query** - Data fetching, caching, y sincronización
- **🎨 Tailwind CSS** - Utility-first styling framework
- **📱 Responsive Design** - Mobile-first approach
- **🧩 Headless UI** - Accessible component primitives
- **🔐 JWT Authentication** - Secure token-based auth

---

## 🏗️ Arquitectura Frontend

### **Project Structure**
```
frontend/whatsapp-bot-frontend/
├── 📁 public/
│   ├── favicon.ico
│   └── index.html
│
├── 📁 src/
│   ├── 📁 components/          # Reusable UI components
│   │   ├── 📁 ui/              # Base UI primitives
│   │   ├── 📁 forms/           # Form components
│   │   └── 📁 layout/          # Layout components
│   │
│   ├── 📁 pages/               # Route-level page components
│   │   ├── Dashboard.jsx
│   │   ├── Knowledge.jsx
│   │   ├── Bots.jsx
│   │   └── Instances.jsx
│   │
│   ├── 📁 hooks/               # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useKnowledge.js
│   │   └── useBots.js
│   │
│   ├── 📁 services/            # API client services
│   │   ├── api.js              # Base API client
│   │   ├── authService.js
│   │   ├── knowledgeService.js
│   │   └── botService.js
│   │
│   ├── 📁 store/               # Zustand global stores
│   │   ├── authStore.js
│   │   ├── uiStore.js
│   │   └── appStore.js
│   │
│   ├── 📁 utils/               # Utility functions
│   │   ├── constants.js
│   │   ├── format.js
│   │   └── validation.js
│   │
│   ├── App.jsx                 # Root app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

### **Technology Stack**
```json
{
  "framework": "React 18.2.0",
  "bundler": "Vite 4.4.0", 
  "stateManagement": "Zustand 4.4.0",
  "dataFetching": "React Query 4.32.0",
  "styling": "Tailwind CSS 3.3.0",
  "routing": "React Router DOM 6.14.0",
  "ui": "Headless UI 1.7.0",
  "icons": "Lucide React 0.263.0",
  "forms": "React Hook Form 7.45.0",
  "validation": "Joi 17.9.0"
}
```

---

## 🔐 Authentication System

### **AuthStore (Zustand)**
```javascript
// store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false
          });
          
          // Set token for future API calls
          authService.setAuthToken(response.data.token);
          
          return response;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Login failed',
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        authService.removeAuthToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => set({ error: null }),

      // Update user info
      updateUser: (userData) => set(state => ({
        user: { ...state.user, ...userData }
      }))
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);

export default useAuthStore;
```

### **AuthService**
```javascript
// services/authService.js
import api from './api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth-token');
    if (this.token) {
      this.setAuthToken(this.token);
    }
  }

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    this.setAuthToken(response.data.token);
    return response;
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    this.setAuthToken(response.data.token);
    return response;
  }

  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('auth-token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    this.token = null;
    localStorage.removeItem('auth-token');
    delete api.defaults.headers.common['Authorization'];
  }

  async getCurrentUser() {
    return api.get('/auth/me');
  }
}

export default new AuthService();
```

### **Protected Route Component**
```jsx
// components/layout/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```

---

## 🗂️ Data Management

### **React Query Setup**
```javascript
// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### **Custom Hooks Pattern**
```javascript
// hooks/useKnowledge.js
import { useQuery, useMutation, useQueryClient } from 'react-query';
import knowledgeService from '../services/knowledgeService';
import { toast } from 'react-hot-toast';

// Query Keys
export const KNOWLEDGE_KEYS = {
  all: ['knowledge'],
  lists: () => [...KNOWLEDGE_KEYS.all, 'list'],
  list: (filters) => [...KNOWLEDGE_KEYS.lists(), { filters }],
  details: () => [...KNOWLEDGE_KEYS.all, 'detail'],
  detail: (id) => [...KNOWLEDGE_KEYS.details(), id],
  stats: () => [...KNOWLEDGE_KEYS.all, 'stats']
};

// Get Knowledge List
export function useKnowledge(filters = {}) {
  return useQuery(
    KNOWLEDGE_KEYS.list(filters),
    () => knowledgeService.getKnowledge(filters),
    {
      select: (data) => data.data,
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error loading knowledge');
      }
    }
  );
}

// Get Knowledge Stats
export function useKnowledgeStats() {
  return useQuery(
    KNOWLEDGE_KEYS.stats(),
    () => knowledgeService.getStats(),
    {
      select: (data) => data.data,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );
}

// Create Knowledge Mutation
export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation(
    knowledgeService.createKnowledge,
    {
      onSuccess: (data) => {
        // Invalidate and refetch knowledge list
        queryClient.invalidateQueries(KNOWLEDGE_KEYS.lists());
        queryClient.invalidateQueries(KNOWLEDGE_KEYS.stats());
        
        toast.success('Knowledge created successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error creating knowledge');
      }
    }
  );
}

// Update Knowledge Mutation
export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, ...data }) => knowledgeService.updateKnowledge(id, data),
    {
      onSuccess: (data, variables) => {
        // Update specific item in cache
        queryClient.setQueryData(
          KNOWLEDGE_KEYS.detail(variables.id),
          data
        );
        
        // Invalidate lists
        queryClient.invalidateQueries(KNOWLEDGE_KEYS.lists());
        
        toast.success('Knowledge updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error updating knowledge');
      }
    }
  );
}

// Delete Knowledge Mutation
export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation(
    knowledgeService.deleteKnowledge,
    {
      onSuccess: (data, id) => {
        // Remove from cache
        queryClient.removeQueries(KNOWLEDGE_KEYS.detail(id));
        
        // Update list cache by removing deleted item
        queryClient.setQueriesData(
          KNOWLEDGE_KEYS.lists(),
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              data: {
                ...oldData.data,
                items: oldData.data.items.filter(item => item.id !== id)
              }
            };
          }
        );
        
        queryClient.invalidateQueries(KNOWLEDGE_KEYS.stats());
        toast.success('Knowledge deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error deleting knowledge');
      }
    }
  );
}
```

---

## 🧩 Component Architecture

### **Base UI Components**
```jsx
// components/ui/Button.jsx
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Button = forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'md', 
  disabled = false,
  loading = false,
  children, 
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-blue-500",
    ghost: "hover:bg-gray-100 text-gray-700 focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-md", 
    lg: "px-6 py-3 text-base rounded-lg"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
```

### **Modal Component**
```jsx
// components/ui/Modal.jsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all`}>
                {title && (
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                      {title}
                    </Dialog.Title>
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                )}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
```

### **Form Components**
```jsx
// components/forms/FormField.jsx
import { Controller } from 'react-hook-form';
import { cn } from '../../utils/cn';

export default function FormField({ 
  name, 
  control, 
  label, 
  type = 'text',
  placeholder,
  required = false,
  error,
  disabled = false,
  className,
  ...props 
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            {...field}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
              error && "border-red-300 focus:border-red-500 focus:ring-red-500",
              disabled && "bg-gray-50 text-gray-500",
              className
            )}
            {...props}
          />
        )}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}
```

---

## 📄 Page Components

### **Knowledge Management Page**
```jsx
// pages/Knowledge.jsx
import { useState } from 'react';
import { PlusIcon, DocumentTextIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useKnowledge, useKnowledgeStats, useCreateKnowledge, useDeleteKnowledge } from '../hooks/useKnowledge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import KnowledgeForm from '../components/forms/KnowledgeForm';
import KnowledgeCard from '../components/KnowledgeCard';
import StatsCards from '../components/KnowledgeStatsCards';

export default function Knowledge() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  
  // React Query hooks
  const { data: knowledge, isLoading } = useKnowledge();
  const { data: stats } = useKnowledgeStats();
  const createKnowledge = useCreateKnowledge();
  const deleteKnowledge = useDeleteKnowledge();

  const handleCreate = async (data) => {
    try {
      await createKnowledge.mutateAsync(data);
      setIsCreateModalOpen(false);
      setSelectedType(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este knowledge?')) {
      await deleteKnowledge.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona el conocimiento que utilizarán tus bots para responder consultas.
          </p>
        </div>
        
        {/* Create Button */}
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Crear Knowledge
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Knowledge Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {knowledge?.items?.map((item) => (
          <KnowledgeCard
            key={item.id}
            knowledge={item}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {knowledge?.items?.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay knowledge items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza creando tu primer knowledge item.
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Crear Knowledge
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedType(null);
        }}
        title="Crear Knowledge"
        size="lg"
      >
        {!selectedType ? (
          // Type Selection
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setSelectedType('text')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="flex-shrink-0 h-10 w-10 text-blue-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Texto Manual</p>
                <p className="text-sm text-gray-500">Escribe contenido directamente</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedType('file')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CloudArrowUpIcon className="flex-shrink-0 h-10 w-10 text-green-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Subir Archivo</p>
                <p className="text-sm text-gray-500">PDF, DOCX, TXT</p>
              </div>
            </button>
          </div>
        ) : (
          // Knowledge Form
          <KnowledgeForm
            type={selectedType}
            onSubmit={handleCreate}
            onCancel={() => {
              setIsCreateModalOpen(false);
              setSelectedType(null);
            }}
            isLoading={createKnowledge.isLoading}
          />
        )}
      </Modal>
    </div>
  );
}
```

### **Bot Management Page**
```jsx
// pages/Bots.jsx
import { useState } from 'react';
import { PlusIcon, CogIcon } from '@heroicons/react/24/outline';
import { useBots, useCreateBot, useUpdateBot, useDeleteBot } from '../hooks/useBots';
import { useInstances } from '../hooks/useInstances';
import Button from '../components/ui/Button';
import BotCard from '../components/BotCard';
import BotModal from '../components/BotModal';
import BotKnowledgeModal from '../components/BotKnowledgeModal';

export default function Bots() {
  const [selectedBot, setSelectedBot] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  
  const { data: bots, isLoading } = useBots();
  const { data: instances } = useInstances();
  const createBot = useCreateBot();
  const updateBot = useUpdateBot();
  const deleteBot = useDeleteBot();

  const handleCreate = async (data) => {
    try {
      await createBot.mutateAsync(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateBot.mutateAsync({ id: selectedBot.id, ...data });
      setIsEditModalOpen(false);
      setSelectedBot(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este bot?')) {
      await deleteBot.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bots Inteligentes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configura y gestiona tus bots de WhatsApp con IA.
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Crear Bot
          </Button>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bots?.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            onEdit={(bot) => {
              setSelectedBot(bot);
              setIsEditModalOpen(true);
            }}
            onDelete={() => handleDelete(bot.id)}
            onManageKnowledge={(bot) => {
              setSelectedBot(bot);
              setIsKnowledgeModalOpen(true);
            }}
          />
        ))}
      </div>

      {/* Modals */}
      <BotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        instances={instances}
        title="Crear Bot"
        isLoading={createBot.isLoading}
      />

      <BotModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBot(null);
        }}
        onSubmit={handleUpdate}
        instances={instances}
        initialData={selectedBot}
        title="Editar Bot"
        isLoading={updateBot.isLoading}
      />

      <BotKnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => {
          setIsKnowledgeModalOpen(false);
          setSelectedBot(null);
        }}
        bot={selectedBot}
      />
    </div>
  );
}
```

---

## 🎨 Styling with Tailwind

### **Tailwind Configuration**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6', 
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### **Global Styles**
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
  
  .form-input {
    @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 🚀 Performance Optimization

### **Code Splitting**
```javascript
// App.jsx - Lazy loading routes
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const Bots = lazy(() => import('./pages/Bots'));
const Instances = lazy(() => import('./pages/Instances'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/instances" element={<Instances />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### **Image Optimization**
```jsx
// components/ui/OptimizedImage.jsx
import { useState } from 'react';

export default function OptimizedImage({ src, alt, className, ...props }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
}
```

### **Memoization**
```jsx
// components/KnowledgeCard.jsx
import { memo } from 'react';

const KnowledgeCard = memo(({ knowledge, onDelete, onEdit }) => {
  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Card content */}
    </div>
  );
});

export default KnowledgeCard;
```

---

## 🧪 Testing Setup

### **Test Configuration**
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
```

### **Test Utilities**
```javascript
// src/test/utils.jsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';

export function renderWithProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

---

## 🔧 Build & Deployment

### **Vite Configuration**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['react-query'],
          ui: ['@headlessui/react', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### **Environment Variables**
```bash
# .env.production
VITE_API_URL=https://whatsapp-bot-backend.onrender.com/api
VITE_APP_NAME=WhatsApp Bot Platform
VITE_ENABLE_DEVTOOLS=false
```

---

## 📱 Responsive Design

### **Mobile-First Approach**
```jsx
// Responsive component example
export default function ResponsiveGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

// Mobile navigation
export default function MobileNav({ isOpen, onClose }) {
  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
      <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-5/6 max-w-sm py-6 px-6 bg-white border-r overflow-y-auto">
        {/* Mobile nav content */}
      </nav>
    </div>
  );
}
```

---

## 🛠️ Development Tools

### **ESLint Configuration**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@vitejs/eslint-config-react'
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
```

### **Prettier Configuration**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

---

**📝 Documento actualizado:** Enero 2025  
**🎨 Framework:** React 18 + Vite + Tailwind CSS  
**📱 Deploy URL:** `https://whatsapp-bot-frontend.onrender.com` 