interface MockMessage {
  id: string;
  question: string;
  answer: string;
  source_chunks: {
    page_number: number;
    snippet: string;
    relevance_score: number;
  }[];
  created_at: string;
}

interface MockSession {
  session_id: string;
  document_id: string;
  message_count: number;
  first_question: string;
  last_active: string;
}

const getStoredChats = (): Record<string, MockMessage[]> => {
  const chats = localStorage.getItem('mock_chats');
  if (!chats) {
    const initialChats: Record<string, MockMessage[]> = {
      'session-uuid-1': [
        {
          id: 'msg-uuid-1',
          question: 'What is this study platform about?',
          answer: 'This platform is an AI Study Intelligence Platform designed to help users upload educational PDFs, run semantic vector searches, chat with documents, take adaptive exams, and review weak learning topics.',
          source_chunks: [
            {
              page_number: 1,
              snippet: 'AI Study Intelligence Platform — Goal: Build a production-ready AI-powered learning platform where users upload educational PDFs, chat with documents using RAG, generate MCQ exams, and track performance.',
              relevance_score: 0.95,
            }
          ],
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ]
    };
    localStorage.setItem('mock_chats', JSON.stringify(initialChats));
    return initialChats;
  }
  return JSON.parse(chats);
};

const getStoredSessions = (): MockSession[] => {
  const sessions = localStorage.getItem('mock_sessions');
  if (!sessions) {
    const initialSessions: MockSession[] = [
      {
        session_id: 'session-uuid-1',
        document_id: 'doc-uuid-1',
        message_count: 1,
        first_question: 'What is this study platform about?',
        last_active: new Date(Date.now() - 3600000).toISOString(),
      }
    ];
    localStorage.setItem('mock_sessions', JSON.stringify(initialSessions));
    return initialSessions;
  }
  return JSON.parse(sessions);
};

const saveChatsAndSessions = (chats: Record<string, MockMessage[]>, sessions: MockSession[]) => {
  localStorage.setItem('mock_chats', JSON.stringify(chats));
  localStorage.setItem('mock_sessions', JSON.stringify(sessions));
};

export const mockChat = {
  ask: async (data: { document_id: string; question: string; session_id?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const sessionId = data.session_id || `session-uuid-${Math.random().toString(36).substring(2, 9)}`;

    const responseTemplate = [
      {
        keywords: ['architecture', 'structure', 'components'],
        answer: 'The system architecture consists of a React frontend, a FastAPI backend, background workers using Celery and Redis, and storage layers with PostgreSQL and ChromaDB/Qdrant vector databases. AI orchestration is driven by Google Gemini LLM and Embeddings.',
        sources: [
          { page_number: 2, snippet: 'The platform integrates React 19 + Vite with FastAPI, PostgreSQL, Redis for Celery tasks, and ChromaDB vector store.', relevance_score: 0.89 }
        ]
      },
      {
        keywords: ['upload', 'limit', 'file', 'size'],
        answer: 'You can upload PDF files up to 500MB. Uploaded files are sent to the backend directory, parsed, chunked with an overlap of 200 characters, and embedded before vector storage.',
        sources: [
          { page_number: 4, snippet: 'MAX_UPLOAD_SIZE_MB is configured to 500MB. Text chunking uses RecursiveCharacterTextSplitter with chunk_size=1000 and overlap=200.', relevance_score: 0.92 }
        ]
      },
      {
        keywords: ['exam', 'mcq', 'adaptive', 'questions'],
        answer: 'The platform generates multiple-choice questions (20, 40, or 60 items) with selectable difficulty (easy, medium, hard). Once you submit, it records the scores, performs a topic breakdown, and updates weak topics analytics.',
        sources: [
          { page_number: 7, snippet: 'MCQ questions are saved with difficulty levels and associated topics. User attempts produce topic score analysis mappings.', relevance_score: 0.94 }
        ]
      }
    ];

    // Find custom answer or default generic answer
    const query = data.question.toLowerCase();
    const matched = responseTemplate.find(t => t.keywords.some(k => query.includes(k)));
    const answer = matched ? matched.answer : `I searched the document and found that "${data.question}" relates to the core study guide details. The document highlights various key concepts, including data schemas, system components, and exam configurations.`;
    const sources = matched ? matched.sources : [
      { page_number: 1, snippet: `Based on the introductory chunks, the system supports user requests like: ${data.question}.`, relevance_score: 0.75 }
    ];

    const messages = getStoredChats();
    const sessions = getStoredSessions();

    const newMessage: MockMessage = {
      id: `msg-uuid-${Math.random().toString(36).substring(2, 9)}`,
      question: data.question,
      answer,
      source_chunks: sources,
      created_at: new Date().toISOString(),
    };

    if (!messages[sessionId]) {
      messages[sessionId] = [];
    }
    messages[sessionId].push(newMessage);

    // Update sessions
    const sessionIdx = sessions.findIndex((s) => s.session_id === sessionId);
    if (sessionIdx > -1) {
      sessions[sessionIdx].message_count = messages[sessionId].length;
      sessions[sessionIdx].last_active = new Date().toISOString();
    } else {
      sessions.unshift({
        session_id: sessionId,
        document_id: data.document_id,
        message_count: 1,
        first_question: data.question.substring(0, 50) + (data.question.length > 50 ? '...' : ''),
        last_active: new Date().toISOString(),
      });
    }

    saveChatsAndSessions(messages, sessions);

    return {
      answer,
      sources,
      session_id: sessionId,
      chunks_used: sources.length,
      message_id: newMessage.id,
    };
  },

  sessions: async (documentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const sessions = getStoredSessions().filter((s) => s.document_id === documentId);
    return {
      sessions,
      total: sessions.length,
    };
  },

  history: async (sessionId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const messages = getStoredChats()[sessionId] || [];
    return {
      session_id: sessionId,
      messages,
      total: messages.length,
    };
  },

  summarize: async (_answer: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      result: `### Key Points Summary:\n- Main concept: Educational content optimization\n- System function: Processes text extraction and embedding vector mapping\n- Benefit: Pinpoints specific learning items and tracks weak subjects`,
      operation: 'summarize',
    };
  },

  simplify: async (_answer: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      result: `Here is a simpler explanation: This study app lets you upload books as PDFs. An AI reads it, helps you search it, and makes practice quizzes to show you what topics you need to study more.`,
      operation: 'simplify',
    };
  },

  generateMcq: async (_answer: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      result: `**Practice Question**:\nWhat is the main goal of the AI Study Platform?\n\nA) To create PDF documents\nB) To help users study documents through chat, exams, and analytics (Correct)\nC) To replace classroom lectures\nD) To design graphics files\n\n*Explanation: The system focuses on helping students read PDFs, chat with them using RAG, take MCQs, and understand study weaknesses.*`,
      operation: 'generate-mcq',
    };
  },
};
