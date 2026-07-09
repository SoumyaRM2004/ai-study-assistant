import { apiClient } from '../api/client';

export const examService = {
  start: async (data: { document_id: string; question_count: number }) => {
    const response = await apiClient.post('/api/exam/start', data);
    return response.data;
  },

  submit: async (data: {
    attempt_id: string;
    answers: Array<{ question_id: string; selected_answer: string }>;
    time_taken_seconds: number;
  }) => {
    const response = await apiClient.post('/api/exam/submit', data);
    return response.data;
  },

  results: async (attemptId: string) => {
    const response = await apiClient.get(`/api/exam/results/${attemptId}`);
    return response.data;
  },

  history: async () => {
    const response = await apiClient.get('/api/exam/history');
    return response.data;
  },

  weakTopics: async () => {
    const response = await apiClient.get('/api/analytics/weak-topics');
    return response.data;
  },

  performance: async (documentId: string) => {
    const response = await apiClient.get(`/api/analytics/performance/${documentId}`);
    return response.data;
  },

  dashboard: async () => {
    const response = await apiClient.get('/api/analytics/dashboard');
    return response.data;
  },

  // MCQ creation trigger
  createMCQs: async (data: { document_id: string; count: number; difficulty: string }) => {
    const response = await apiClient.post('/api/mcq/create', data);
    return response.data;
  },

  getMCQs: async (documentId: string) => {
    const response = await apiClient.get(`/api/mcq/${documentId}`);
    return response.data;
  },
};
