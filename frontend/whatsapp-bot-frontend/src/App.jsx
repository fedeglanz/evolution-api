import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Bots from './pages/Bots';
import Knowledge from './pages/Knowledge';
import Contacts from './pages/Contacts';
import Conversations from './pages/Conversations';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function App() {
  const { isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    // Inicializar autenticación al cargar la app
    initialize();
  }, [initialize]);

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
              <Route path="bots" element={<Bots />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#065f46',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: '#991b1b',
                  color: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
