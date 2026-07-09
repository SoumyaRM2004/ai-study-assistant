interface MockDoc {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  status: string;
  page_count: number;
  chunk_count: number;
  file_size_bytes: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const getStoredDocs = (): MockDoc[] => {
  const docs = localStorage.getItem('mock_documents');
  if (!docs) {
    const initialDocs: MockDoc[] = [
      {
        id: 'doc-uuid-1',
        user_id: 'mock-user-uuid',
        filename: 'AI_Study_Intelligence_Platform.pdf',
        original_name: 'AI Study Intelligence Platform.pdf',
        status: 'READY',
        page_count: 14,
        chunk_count: 42,
        file_size_bytes: 50218,
        error_message: null,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'doc-uuid-2',
        user_id: 'mock-user-uuid',
        filename: 'Quantum_Physics_Notes.pdf',
        original_name: 'Quantum Physics Notes.pdf',
        status: 'READY',
        page_count: 8,
        chunk_count: 24,
        file_size_bytes: 120488,
        error_message: null,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      }
    ];
    localStorage.setItem('mock_documents', JSON.stringify(initialDocs));
    return initialDocs;
  }
  return JSON.parse(docs);
};

const saveStoredDocs = (docs: MockDoc[]) => {
  localStorage.setItem('mock_documents', JSON.stringify(docs));
};

export const mockDocuments = {
  upload: async (file: File) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const newDoc: MockDoc = {
      id: `doc-uuid-${Math.random().toString(36).substring(2, 9)}`,
      user_id: 'mock-user-uuid',
      filename: file.name.replace(/\s+/g, '_'),
      original_name: file.name,
      status: 'UPLOAD_STARTED',
      page_count: Math.floor(Math.random() * 15) + 5,
      chunk_count: 0,
      file_size_bytes: file.size,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currentDocs = getStoredDocs();
    currentDocs.unshift(newDoc);
    saveStoredDocs(currentDocs);

    // Trigger state transition sequence in background
    let stageIndex = 0;
    const stages = [
      'TEXT_EXTRACTION',
      'CHUNKING',
      'EMBEDDING_GENERATION',
      'VECTOR_INDEXING',
      'SUMMARY_GENERATION',
      'READY'
    ];

    const interval = setInterval(() => {
      const docs = getStoredDocs();
      const doc = docs.find((d) => d.id === newDoc.id);
      if (doc) {
        if (stageIndex < stages.length) {
          doc.status = stages[stageIndex];
          if (doc.status === 'READY') {
            doc.chunk_count = doc.page_count * 3 + Math.floor(Math.random() * 5);
          }
          doc.updated_at = new Date().toISOString();
          saveStoredDocs(docs);
          stageIndex++;
        } else {
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 3000); // Transitions stage every 3 seconds

    return {
      message: 'Document uploaded successfully. Processing will begin shortly.',
      document: newDoc,
    };
  },

  list: async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const documents = getStoredDocs();
    return {
      documents,
      total: documents.length,
    };
  },

  get: async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const documents = getStoredDocs();
    const document = documents.find((d) => d.id === id);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  },

  delete: async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const documents = getStoredDocs();
    const filtered = documents.filter((d) => d.id !== id);
    saveStoredDocs(filtered);
    return {
      message: 'Document deleted successfully',
      document_id: id,
    };
  },
};
