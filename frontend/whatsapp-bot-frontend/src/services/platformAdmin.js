import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create a separate axios instance for platform admin
const platformApi = axios.create({
  baseURL: `${API_BASE_URL}/platform-admin`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
platformApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('platform_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
platformApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('platform_admin_token');
      window.location.href = '/platform-admin';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const platformAuthService = {
  async login(email, password) {
    const response = await platformApi.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('platform_admin_token', response.data.token);
    }
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await platformApi.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  async verify() {
    const response = await platformApi.get('/auth/verify');
    return response.data;
  },

  async logout() {
    await platformApi.post('/auth/logout');
    localStorage.removeItem('platform_admin_token');
  },

  async getMe() {
    const response = await platformApi.get('/auth/me');
    return response.data;
  }
};

// Statistics endpoints
export const platformStatsService = {
  async getStatistics() {
    const response = await platformApi.get('/statistics');
    return response.data;
  }
};

// Company management endpoints
export const platformCompanyService = {
  async listCompanies(params = {}) {
    const response = await platformApi.get('/companies', { params });
    return response.data;
  },

  async getCompanyDetails(companyId) {
    const response = await platformApi.get(`/companies/${companyId}`);
    return response.data;
  },

  async updateCompanyPlan(companyId, plan, expiresAt) {
    const response = await platformApi.patch(`/companies/${companyId}/plan`, {
      plan,
      expiresAt
    });
    return response.data;
  },

  async createCompany(companyData) {
    const response = await platformApi.post('/companies', companyData);
    return response.data;
  },

  async updateCompany(companyId, updates) {
    const response = await platformApi.patch(`/companies/${companyId}`, updates);
    return response.data;
  }
};

// User management endpoints
export const platformUserService = {
  async listUsers(params = {}) {
    const response = await platformApi.get('/users', { params });
    return response.data;
  },

  async createUser(userData) {
    const response = await platformApi.post('/users', userData);
    return response.data;
  },

  async updateUser(userId, updates) {
    const response = await platformApi.patch(`/users/${userId}`, updates);
    return response.data;
  },

  async toggleUserStatus(userId, isActive) {
    const response = await platformApi.patch(`/users/${userId}/status`, { isActive });
    return response.data;
  },

  async resetUserPassword(userId, options = {}) {
    const response = await platformApi.post(`/users/${userId}/reset-password`, options);
    return response.data;
  }
};

export default platformApi;