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
import Templates from './pages/Templates';
import QuickReplies from './pages/QuickReplies';
import ScheduledMessages from './pages/ScheduledMessages';
import Attachments from './pages/Attachments';
import Campaigns from './pages/Campaigns';
import PublicCampaign from './pages/PublicCampaign';
import MassMessaging from './pages/MassMessaging';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Billing from './pages/Billing';

// Platform Admin imports
import PlatformAdminLogin from './pages/PlatformAdminLogin';
import PlatformChangePassword from './pages/PlatformChangePassword';
import PlatformAdminLayout from './components/PlatformAdminLayout';
import PlatformDashboard from './pages/PlatformDashboard';
import PlatformCompanies from './pages/PlatformCompanies';
import PlatformCompanyDetails from './pages/PlatformCompanyDetails';
import PlatformUsers from './pages/PlatformUsers';
import PlatformPlans from './pages/PlatformPlans';
import PlatformBilling from './pages/PlatformBilling';

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
            {/* Ruta pública (sin autenticación) */}
            <Route 
              path="/campaigns/public/:slug" 
              element={<PublicCampaign />} 
            />
            
            {/* Platform Admin Routes */}
            <Route 
              path="/platform-admin" 
              element={<PlatformAdminLogin />} 
            />
            <Route 
              path="/platform-admin/change-password" 
              element={<PlatformChangePassword />} 
            />
            <Route 
              path="/platform-admin/*" 
              element={<PlatformAdminLayout />}
            >
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="companies" element={<PlatformCompanies />} />
              <Route path="companies/:companyId" element={<PlatformCompanyDetails />} />
              <Route path="users" element={<PlatformUsers />} />
              <Route path="plans" element={<PlatformPlans />} />
              <Route path="billing" element={<PlatformBilling />} />
              {/* TODO: Add settings route */}
            </Route>
            
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
              <Route path="users" element={<Users />} />
              <Route path="templates" element={<Templates />} />
              <Route path="quick-replies" element={<QuickReplies />} />
              <Route path="scheduled-messages" element={<ScheduledMessages />} />
              <Route path="attachments" element={<Attachments />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="mass-messaging" element={<MassMessaging />} />
              <Route path="billing" element={<Billing />} />
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
