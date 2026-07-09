import { apiClient } from '../api/client';

export const authService = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post('/api/auth/login', data);
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};
