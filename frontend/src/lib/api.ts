import { authService } from '../services/auth.service';
import { documentService } from '../services/document.service';
import { chatService } from '../services/chat.service';
import { examService } from '../services/exam.service';

import { mockAuth } from '../mock/mockAuth';
import { mockDocuments } from '../mock/mockDocuments';
import { mockChat } from '../mock/mockChat';
import { mockExam } from '../mock/mockExam';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

// ── Auth API ────────────────────────────────────────────────
export const authAPI = isMock ? mockAuth : authService;

// ── Documents API ───────────────────────────────────────────
export const documentsAPI = isMock ? mockDocuments : documentService;

// ── Chat API ────────────────────────────────────────────────
export const chatAPI = isMock
  ? {
      ask: mockChat.ask,
      sessions: mockChat.sessions,
      history: mockChat.history,
    }
  : {
      ask: chatService.ask,
      sessions: chatService.sessions,
      history: chatService.history,
    };

// ── Summary API ─────────────────────────────────────────────
export const summaryAPI = isMock
  ? {
      summarize: mockChat.summarize,
      simplify: mockChat.simplify,
      generateMcq: mockChat.generateMcq,
    }
  : {
      summarize: chatService.summarize,
      simplify: chatService.simplify,
      generateMcq: chatService.generateMcq,
    };

// ── MCQ API ─────────────────────────────────────────────────
export const mcqAPI = isMock
  ? {
      create: mockExam.create,
      get: mockExam.get,
    }
  : {
      create: examService.createMCQs,
      get: examService.getMCQs,
    };

// ── Exam API ────────────────────────────────────────────────
export const examAPI = isMock
  ? {
      start: mockExam.start,
      submit: mockExam.submit,
      results: mockExam.results,
      history: mockExam.history,
    }
  : {
      start: examService.start,
      submit: examService.submit,
      results: examService.results,
      history: examService.history,
    };

// ── Analytics API ───────────────────────────────────────────
export const analyticsAPI = isMock
  ? {
      weakTopics: mockExam.weakTopics,
      performance: mockExam.performance,
      dashboard: mockExam.dashboard,
    }
  : {
      weakTopics: examService.weakTopics,
      performance: examService.performance,
      dashboard: examService.dashboard,
    };

export default {
  auth: authAPI,
  documents: documentsAPI,
  chat: chatAPI,
  summary: summaryAPI,
  mcq: mcqAPI,
  exam: examAPI,
  analytics: analyticsAPI,
};
