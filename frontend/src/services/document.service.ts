import { apiClient } from '../api/client';

export const documentService = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async () => {
    const response = await apiClient.get('/api/documents');
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/documents/${id}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/documents/${id}`);
    return response.data;
  },
};
