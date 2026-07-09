interface MockMCQ {
  id: string;
  document_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  topic: string;
  difficulty: string;
  created_at: string;
}

interface MockAttempt {
  id: string;
  document_id: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  time_taken_seconds: number;
  created_at: string;
}

const getStoredMCQs = (docId: string): MockMCQ[] => {
  const key = `mock_mcqs_${docId}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    // Generate some mock questions
    const mockQuestions: MockMCQ[] = [
      {
        id: 'q1',
        document_id: docId,
        question: 'Which framework is recommended in the plan for AI orchestration?',
        option_a: 'LlamaIndex',
        option_b: 'LangChain',
        option_c: 'Hugging Face Transformers',
        option_d: 'Semantic Kernel',
        correct_answer: 'B',
        explanation: 'LangChain is highlighted in the orchestration layer of the technology stack for managing chains and prompt context.',
        topic: 'AI Orchestration',
        difficulty: 'medium',
        created_at: new Date().toISOString(),
      },
      {
        id: 'q2',
        document_id: docId,
        question: 'What is the default chunk size used in the PDF chunking strategy?',
        option_a: '500 characters',
        option_b: '1000 characters',
        option_c: '2000 characters',
        option_d: '1500 characters',
        correct_answer: 'B',
        explanation: 'The plan uses RecursiveCharacterTextSplitter with a chunk size of 1000 characters and a 200 character overlap.',
        topic: 'Data Preparation',
        difficulty: 'easy',
        created_at: new Date().toISOString(),
      },
      {
        id: 'q3',
        document_id: docId,
        question: 'Which vector database is configured for production environments?',
        option_a: 'ChromaDB',
        option_b: 'Qdrant',
        option_c: 'Pinecone',
        option_d: 'Milvus',
        correct_answer: 'B',
        explanation: 'ChromaDB is selected for local development, while Qdrant is recommended for the production vector layer.',
        topic: 'Vector Databases',
        difficulty: 'medium',
        created_at: new Date().toISOString(),
      },
      {
        id: 'q4',
        document_id: docId,
        question: 'What type of encryption is used for password hashing in security layers?',
        option_a: 'MD5',
        option_b: 'SHA-256',
        option_c: 'bcrypt',
        option_d: 'AES-256',
        correct_answer: 'C',
        explanation: 'The backend uses passlib with bcrypt hashing to store passwords securely.',
        topic: 'Authentication & Security',
        difficulty: 'medium',
        created_at: new Date().toISOString(),
      },
      {
        id: 'q5',
        document_id: docId,
        question: 'How are Celery workers integrated into the backend architecture?',
        option_a: 'Directly communicating with the client',
        option_b: 'Decoupling heavy tasks via a Redis broker queue',
        option_c: 'Managing state sessions inside PostgreSQL',
        option_d: 'Calling Gemini API streams directly',
        correct_answer: 'B',
        explanation: 'Celery worker queues run tasks asynchronously to process PDFs, indexing and heavy summaries via Redis as broker.',
        topic: 'System Architecture',
        difficulty: 'hard',
        created_at: new Date().toISOString(),
      }
    ];
    localStorage.setItem(key, JSON.stringify(mockQuestions));
    return mockQuestions;
  }
  return JSON.parse(stored);
};

const getStoredAttempts = (): MockAttempt[] => {
  const attempts = localStorage.getItem('mock_attempts');
  if (!attempts) {
    const initial: MockAttempt[] = [
      {
        id: 'attempt-uuid-1',
        document_id: 'doc-uuid-1',
        total_questions: 5,
        correct_answers: 4,
        accuracy: 80.0,
        time_taken_seconds: 120,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'attempt-uuid-2',
        document_id: 'doc-uuid-1',
        total_questions: 5,
        correct_answers: 2,
        accuracy: 40.0,
        time_taken_seconds: 180,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    ];
    localStorage.setItem('mock_attempts', JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(attempts);
};

const saveAttempts = (attempts: MockAttempt[]) => {
  localStorage.setItem('mock_attempts', JSON.stringify(attempts));
};

export const mockExam = {
  create: async (data: { document_id: string; count: number; difficulty: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Simply fetch and trigger mock MCQs
    const questions = getStoredMCQs(data.document_id);
    return {
      questions,
      total: questions.length,
      document_id: data.document_id,
    };
  },

  get: async (documentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const questions = getStoredMCQs(documentId);
    return {
      questions,
      total: questions.length,
      document_id: documentId,
    };
  },

  start: async (data: { document_id: string; question_count: number }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const questions = getStoredMCQs(data.document_id);
    const attemptId = `attempt-uuid-${Math.random().toString(36).substring(2, 9)}`;

    // Strip answers for delivery
    const strippedQuestions = questions.slice(0, data.question_count).map(q => ({
      id: q.id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    return {
      attempt_id: attemptId,
      questions: strippedQuestions,
      total_questions: strippedQuestions.length,
      document_id: data.document_id,
    };
  },

  submit: async (data: {
    attempt_id: string;
    answers: Array<{ question_id: string; selected_answer: string }>;
    time_taken_seconds: number;
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Find the document associated with the attempt (fallback to 'doc-uuid-1')
    const documentId = 'doc-uuid-1'; 
    const questions = getStoredMCQs(documentId);

    let correctCount = 0;
    const answerDetails = data.answers.map(ans => {
      const question = questions.find(q => q.id === ans.question_id);
      const isCorrect = question ? question.correct_answer === ans.selected_answer : false;
      if (isCorrect) correctCount++;

      return {
        question_id: ans.question_id,
        question: question ? question.question : 'Unknown Question',
        selected_answer: ans.selected_answer,
        correct_answer: question ? question.correct_answer : 'A',
        is_correct: isCorrect,
        explanation: question ? question.explanation : 'No explanation available.',
        topic: question ? question.topic : 'General',
      };
    });

    const accuracy = parseFloat(((correctCount / data.answers.length) * 100).toFixed(1));

    // Save attempt
    const attempts = getStoredAttempts();
    const newAttempt: MockAttempt = {
      id: data.attempt_id,
      document_id: documentId,
      total_questions: data.answers.length,
      correct_answers: correctCount,
      accuracy,
      time_taken_seconds: data.time_taken_seconds,
      created_at: new Date().toISOString(),
    };
    attempts.unshift(newAttempt);
    saveAttempts(attempts);

    // Group by topic for topic breakdown
    const topicGroups: Record<string, { total: number; correct: number }> = {};
    answerDetails.forEach(detail => {
      if (!topicGroups[detail.topic]) {
        topicGroups[detail.topic] = { total: 0, correct: 0 };
      }
      topicGroups[detail.topic].total++;
      if (detail.is_correct) {
        topicGroups[detail.topic].correct++;
      }
    });

    const topicBreakdown = Object.entries(topicGroups).map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      score_percent: parseFloat(((stats.correct / stats.total) * 100).toFixed(1)),
    }));

    return {
      attempt_id: data.attempt_id,
      total_questions: data.answers.length,
      correct_answers: correctCount,
      wrong_answers: data.answers.length - correctCount,
      accuracy,
      time_taken_seconds: data.time_taken_seconds,
      answer_details: answerDetails,
      topic_breakdown: topicBreakdown,
      created_at: newAttempt.created_at,
    };
  },

  results: async (attemptId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Simulate submission recovery
    const attempts = getStoredAttempts();
    const attempt = attempts.find(a => a.id === attemptId) || attempts[0];
    const questions = getStoredMCQs(attempt.document_id);

    let correctCount = 0;
    const answerDetails = questions.map(q => {
      const selected = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
      const isCorrect = q.correct_answer === selected;
      if (isCorrect) correctCount++;
      return {
        question_id: q.id,
        question: q.question,
        selected_answer: selected,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
        topic: q.topic,
      };
    });

    const topicBreakdown = [
      { topic: 'AI Orchestration', total: 2, correct: Math.floor(Math.random() * 2) + 1, score_percent: 80 },
      { topic: 'Data Preparation', total: 1, correct: 1, score_percent: 100 },
      { topic: 'Vector Databases', total: 1, correct: 0, score_percent: 0 },
      { topic: 'System Architecture', total: 1, correct: 1, score_percent: 100 },
    ];

    return {
      attempt_id: attemptId,
      total_questions: attempt.total_questions,
      correct_answers: attempt.correct_answers,
      wrong_answers: attempt.total_questions - attempt.correct_answers,
      accuracy: attempt.accuracy,
      time_taken_seconds: attempt.time_taken_seconds,
      answer_details: answerDetails,
      topic_breakdown: topicBreakdown,
      created_at: attempt.created_at,
    };
  },

  history: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const attempts = getStoredAttempts();
    return {
      attempts,
      total: attempts.length,
    };
  },

  weakTopics: async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      weak_topics: [
        {
          topic: 'Vector Databases',
          total_questions: 4,
          correct_answers: 1,
          score_percent: 25.0,
          recommendation: 'Review PyMuPDF embeddings processing logic and chunk sizes configuration in the systems architecture guides.',
        },
        {
          topic: 'AI Orchestration',
          total_questions: 6,
          correct_answers: 3,
          score_percent: 50.0,
          recommendation: 'Check the LangChain prompt template definitions and study the differences between text-embedding-004 and Gemini models.',
        }
      ],
      total_exams: getStoredAttempts().length,
      overall_accuracy: 60.0,
    };
  },

  performance: async (documentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      document_id: documentId,
      total_attempts: 2,
      average_accuracy: 60.0,
      best_accuracy: 80.0,
      topics: [
        { topic: 'AI Orchestration', total: 2, correct: 1, score_percent: 50.0 },
        { topic: 'Data Preparation', total: 1, correct: 1, score_percent: 100.0 },
        { topic: 'Vector Databases', total: 1, correct: 0, score_percent: 0.0 },
        { topic: 'System Architecture', total: 1, correct: 1, score_percent: 100.0 },
      ]
    };
  },

  dashboard: async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const attempts = getStoredAttempts();
    return {
      total_documents: 2,
      total_exams: attempts.length,
      total_questions_answered: attempts.reduce((acc, curr) => acc + curr.total_questions, 0),
      overall_accuracy: parseFloat((attempts.reduce((acc, curr) => acc + curr.accuracy, 0) / attempts.length).toFixed(1)),
      recent_attempts: attempts,
      weak_topics: [
        {
          topic: 'Vector Databases',
          total_questions: 4,
          correct_answers: 1,
          score_percent: 25.0,
          recommendation: 'Review PyMuPDF embeddings processing logic and chunk sizes configuration in the systems architecture guides.',
        },
        {
          topic: 'AI Orchestration',
          total_questions: 6,
          correct_answers: 3,
          score_percent: 50.0,
          recommendation: 'Check the LangChain prompt template definitions and study the differences between text-embedding-004 and Gemini models.',
        }
      ]
    };
  },
};
