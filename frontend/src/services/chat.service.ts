import { apiClient } from '../api/client';

export const chatService = {
  ask: async (data: { document_id: string; question: string; session_id?: string }) => {
    const response = await apiClient.post('/api/chat/question', data);
    return response.data;
  },

  sessions: async (documentId: string) => {
    const response = await apiClient.get(`/api/chat/sessions/${documentId}`);
    return response.data;
  },

  history: async (sessionId: string) => {
    const response = await apiClient.get(`/api/chat/history/${sessionId}`);
    return response.data;
  },

  summarize: async (answer: string) => {
    const response = await apiClient.post('/api/summary/summarize', { answer });
    return response.data;
  },

  simplify: async (answer: string) => {
    const response = await apiClient.post('/api/summary/simplify', { answer });
    return response.data;
  },

  generateMcq: async (answer: string) => {
    const response = await apiClient.post('/api/summary/generate-mcq', { answer });
    return response.data;
  },
};
