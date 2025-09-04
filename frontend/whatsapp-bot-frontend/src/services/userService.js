import api from './api';

export const userService = {
  // List users in the company
  async listUsers(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);

    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  // Create a new user
  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Update user information
  async updateUser(userId, updates) {
    const response = await api.patch(`/users/${userId}`, updates);
    return response.data;
  },

  // Reset user password
  async resetPassword(userId, options = {}) {
    const response = await api.post(`/users/${userId}/reset-password`, options);
    return response.data;
  },

  // Toggle user active status
  async toggleStatus(userId, isActive) {
    const response = await api.patch(`/users/${userId}/status`, { isActive });
    return response.data;
  },

  // Get user details
  async getUserDetails(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // Delete user (soft delete)
  async deleteUser(userId) {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};