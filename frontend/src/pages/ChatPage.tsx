import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { chatAPI, documentsAPI, summaryAPI } from '../lib/api';
import { useUIStore } from '../store/uiStore';
import { SkeletonList } from '../components/ui/Skeleton';
import {
  Send,
  ArrowLeft,
  Sparkles,
  Bookmark,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: any[];
  summary?: string;
  simplified?: string;
  generatedMcq?: string;
  processingAction?: string | null;
}

interface Doc {
  id: string;
  original_name: string;
  page_count: number;
}

export default function ChatPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { pdfWidth, setPdfWidth } = useUIStore();
  
  const [doc, setDoc] = useState<Doc | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Document contents mapping for the PDF Viewer
  const docContents = [
    {
      page: 1,
      title: '1. Executive Project Summary',
      content: 'StudyAI is an AI-powered educational intelligence platform. It enables students, teachers, and professionals to upload educational PDF documents, extract structured learning guides, chat interactively with the materials via Retrieval-Augmented Generation (RAG), generate multiple-choice evaluations, and review weak learning topics automatically. The goal of the platform is to improve memory retention, highlight core study materials, and automate test design for self-assessment.'
    },
    {
      page: 2,
      title: '2. System Engineering & Tech Stack',
      content: 'The platform is engineered using a decoupled architecture. The frontend is built on React 19, Vite, TypeScript, and Tailwind CSS v4. The backend is powered by FastAPI, SQLAlchemy 2.0 ORM, and asyncpg drivers. Heavy backend tasks (including PDF text extraction, layout chunking, vector embedding creation, and summary compilation) are delegated to Celery workers using Redis as a broker and status results backend. Storage layers utilize PostgreSQL and ChromaDB/Qdrant vector stores.'
    },
    {
      page: 3,
      title: '3. Data Preparation & Extraction Pipeline',
      content: 'When a PDF is uploaded, it is queued for processing. Text extraction utilizes PyMuPDF (fitz) due to its high rendering speed, falling back to pdfplumber for complex table elements. Extracted text is normalized by removing headers, footers, page markers, and double whitespaces. The text is chunked into 1000-character segments with a 200-character overlap using RecursiveCharacterTextSplitter. Metadata tags (document_id, page_number, chunk_index) are attached to each vector embedding.'
    },
    {
      page: 4,
      title: '4. Vector Databases & Embeddings Layer',
      content: 'Embeddings are created using the Google text-embedding-004 model, which converts 1000-character chunks into 768-dimensional float vectors. For local development, ChromaDB persistent client is run within the workspace. In production environments, collections are created inside Qdrant and indexed using HNSW parameters for fast cosine similarity operations. Users are isolated, ensuring they can only retrieve vector collections linked to their user_id.'
    },
    {
      page: 5,
      title: '5. RAG Chat Logic & Prompt Guardrails',
      content: 'The chat interface queries a LangChain orchestration agent. When a user asks a question, the input is embedded, and a cosine similarity search is run against the document collections to fetch the top 5 matching text chunks. These chunks are injected into a prompt template: "You are StudyAI. Answer the question using ONLY the provided context. If the document does not contain the answer, say \'The document does not contain enough information\'". Citations detail source page numbers.'
    },
    {
      page: 6,
      title: '6. Authentication & Endpoint Security',
      content: 'The API secures all endpoints via JWT authentication. Passwords are encrypted using passlib with bcrypt hashes before writing to PostgreSQL. Authentication returns a short-lived access token (30 minutes expiry) and a refresh token (7 days expiry). In production, access tokens reside in React client state memory, while refresh tokens are set via secure, HTTP-only, SameSite cookies to protect against XSS and CSRF token thefts.'
    },
    {
      page: 7,
      title: '7. Adaptive MCQ Exam Generation',
      content: 'MCQ questions are automatically created using Gemini LLM. The generator reads selected document chunks, extracts important educational concepts, and outputs formatted questions containing: question statement, options A, B, C, D, the correct option, and a markdown explanation. Questions are flagged with difficulty levels (easy, medium, hard) and topic tags to evaluate users and populate weak topics dashboards.'
    }
  ];

  // Fetch document details and chat sessions
  useEffect(() => {
    const initPage = async () => {
      if (!documentId) return;
      try {
        const docRes = await documentsAPI.get(documentId);
        setDoc(docRes.data || docRes);

        // Fetch previous sessions
        const sessRes = await chatAPI.sessions(documentId);
        const sessList = sessRes.data?.sessions || sessRes.sessions || [];
        setSessions(sessList);

        // Auto-select latest session or start clean
        if (sessList.length > 0) {
          handleSelectSession(sessList[0].session_id);
        } else {
          setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              text: `Hello! I have fully processed and indexed **${docRes.data?.original_name || docRes.original_name}**. Ask me any question, or select topics on the left to read through!`,
            },
          ]);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load document conversation workspace.');
        navigate('/');
      }
    };
    initPage();
  }, [documentId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle panel resizing drag
  const startResizing = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const newWidth = (e.clientX / containerWidth) * 100;
      setPdfWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPdfWidth]);

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setLoading(true);
    try {
      const historyRes = await chatAPI.history(sessionId);
      const historyList = historyRes.data?.messages || historyRes.messages || [];
      
      const formatted: Message[] = historyList.map((m: any) => ({
        id: m.id,
        sender: 'user', // We will map question -> user, answer -> ai
        text: m.question,
      })).reduce((acc: Message[], _curr: any, idx: number) => {
        const item = historyList[idx];
        acc.push({
          id: `${item.id}-q`,
          sender: 'user',
          text: item.question,
        });
        
        let sources = [];
        if (item.source_chunks) {
          sources = Array.isArray(item.source_chunks) 
            ? item.source_chunks 
            : Object.values(item.source_chunks);
        }

        acc.push({
          id: `${item.id}-a`,
          sender: 'ai',
          text: item.answer,
          sources: sources,
        });
        return acc;
      }, []);

      if (formatted.length === 0) {
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: 'Starting a new conversation. Ask any question about this study material.',
          },
        ]);
      } else {
        setMessages(formatted);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSession = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Starting a new conversation session. Type a question below to begin!',
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !documentId || sending) return;

    const userText = input.trim();
    setInput('');
    setSending(true);

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: userText },
    ]);

    try {
      const res = await chatAPI.ask({
        document_id: documentId,
        question: userText,
        session_id: currentSessionId || undefined,
      });

      const responseData = res.data || res;
      if (!currentSessionId) {
        setCurrentSessionId(responseData.session_id);
        // Refresh session list
        const sessRes = await chatAPI.sessions(documentId);
        setSessions(sessRes.data?.sessions || sessRes.sessions || []);
      }

      // Simulated character streaming effect
      let streamText = '';
      const fullAnswer = responseData.answer;
      
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          sources: responseData.sources || [],
        },
      ]);

      const words = fullAnswer.split(' ');
      let wordIdx = 0;
      
      const streamInterval = setInterval(() => {
        if (wordIdx < words.length) {
          streamText += (wordIdx === 0 ? '' : ' ') + words[wordIdx];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, text: streamText } : msg
            )
          );
          wordIdx++;
        } else {
          clearInterval(streamInterval);
          setSending(false);
        }
      }, 50); // Streams word by word every 50ms
    } catch (err) {
      console.error(err);
      toast.error('Failed to get answer from AI. Please try again.');
      setSending(false);
    }
  };

  // Scroll the PDF panel viewer to target page
  const handleScrollToPage = (pageNum: number) => {
    const element = document.getElementById(`page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast.success(`Scrolled to Page ${pageNum}`, { duration: 1000 });
    }
  };

  // Post-processing: Summarize, Simplify, Generate MCQ
  const handlePostAction = async (msgId: string, actionType: 'summarize' | 'simplify' | 'mcq', text: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, processingAction: actionType } : m));
    try {
      let res: any;
      if (actionType === 'summarize') {
        res = await summaryAPI.summarize(text);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, summary: res.data?.result || res.result } : m));
      } else if (actionType === 'simplify') {
        res = await summaryAPI.simplify(text);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, simplified: res.data?.result || res.result } : m));
      } else if (actionType === 'mcq') {
        res = await summaryAPI.generateMcq(text);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, generatedMcq: res.data?.result || res.result } : m));
      }
      toast.success(`Success! Action "${actionType}" resolved.`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to process ${actionType} action.`);
    } finally {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, processingAction: null } : m));
    }
  };

  // Custom simple Markdown-like compiler to avoid HTML crashes
  const renderFormattedText = (txt: string) => {
    if (!txt) return null;
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-indigo-300 mt-3 mb-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-md font-bold text-indigo-400 mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="list-disc ml-5 text-slate-300 py-0.5">{line.substring(2)}</li>;
      }
      if (line.match(/^[A-D]\)/)) {
        return <div key={idx} className="pl-4 py-1 font-medium text-slate-350">{line}</div>;
      }
      return <p key={idx} className="text-slate-300 mb-2 leading-relaxed text-sm">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-80px)]">
      {/* Upper Navigation Header */}
      <div className="flex items-center gap-4 justify-between border-b border-slate-800/40 pb-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-indigo-400 hover:border-indigo-500/20 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="overflow-hidden">
            <h2 className="text-md font-bold text-slate-200 truncate max-w-sm md:max-w-xl">
              {doc?.original_name || 'Loading study material...'}
            </h2>
            <p className="text-xs text-slate-500">Document study workspace & citation engine</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/exam/setup/${documentId}`)}
          className="btn-primary text-xs py-2 px-5"
        >
          Take Practice Exam
        </button>
      </div>

      {/* Workspace container */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden border border-slate-800/50 rounded-2xl relative bg-slate-900/10">
        
        {/* Sessions toggle panel (Hidden on small screens) */}
        <div className="w-60 bg-slate-900/80 border-r border-slate-800/40 flex flex-col justify-between p-4 flex-shrink-0 hidden lg:flex">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Conversations
              </span>
              <button
                onClick={handleStartNewSession}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase"
              >
                + New
              </button>
            </div>
            
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[400px]">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No previous sessions</p>
              ) : (
                sessions.map((sess) => (
                  <button
                    key={sess.session_id}
                    onClick={() => handleSelectSession(sess.session_id)}
                    className={`text-left p-2.5 rounded-xl text-xs truncate transition-all duration-200 ${
                      currentSessionId === sess.session_id
                        ? 'bg-indigo-600/15 border border-indigo-500/35 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:bg-slate-850/50'
                    }`}
                  >
                    {sess.first_question || 'Active Session'}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 flex gap-1">
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            Sessions cached automatically
          </div>
        </div>

        {/* ── Left Column: Scrollable Document viewer ── */}
        <div
          className="overflow-y-auto p-6 bg-slate-950 flex flex-col gap-6 relative"
          style={{ width: `${pdfWidth}%` }}
        >
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              Document Preview
            </span>
            <span className="text-xs text-slate-500">
              {docContents.length} Pages loaded
            </span>
          </div>

          {docContents.map((pg) => (
            <div
              key={pg.page}
              id={`page-${pg.page}`}
              className="p-5 rounded-2xl bg-slate-900/35 border border-slate-850 scroll-mt-6"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-indigo-300">{pg.title}</h4>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Page {pg.page}
                </span>
              </div>
              <p className="text-slate-350 text-sm leading-relaxed whitespace-pre-line select-text">
                {pg.content}
              </p>
            </div>
          ))}
        </div>

        {/* Draggable panel resizer separator */}
        <div
          onMouseDown={startResizing}
          className={`w-[6px] h-full cursor-col-resize hover:bg-indigo-500/60 transition-colors z-20 flex-shrink-0 relative ${
            isResizing ? 'bg-indigo-500/80' : 'bg-slate-800/40'
          }`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center pointer-events-none text-slate-500">
            ⋮
          </div>
        </div>

        {/* ── Right Column: AI Chat Panel ── */}
        <div className="flex-1 flex flex-col bg-slate-900/45 relative overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/40 bg-slate-900/20 flex-shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              StudyAI Assistant
            </span>
          </div>

          {/* Messages feed */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            {loading ? (
              <SkeletonList rows={3} />
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`p-4 rounded-2xl text-sm ${
                      msg.sender === 'user'
                        ? 'bg-indigo-650 text-white rounded-tr-none shadow-md shadow-indigo-650/15'
                        : 'bg-slate-900 border border-slate-800/60 rounded-tl-none'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="leading-relaxed select-text">{renderFormattedText(msg.text)}</div>

                        {/* Expandable Citations tray */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="border-t border-slate-800/60 pt-2.5 mt-2.5">
                            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block mb-1.5">
                              Sources cited:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, sidx) => (
                                <button
                                  key={sidx}
                                  onClick={() => handleScrollToPage(src.page_number)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 text-[10px] font-semibold text-indigo-400 border border-indigo-500/10 hover:border-indigo-500/30 hover:bg-slate-950/80 transition-all duration-200"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Page {src.page_number}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline post-processing actions */}
                  {msg.sender === 'ai' && msg.id !== 'welcome' && (
                    <div className="flex flex-col gap-3 mt-2 w-full">
                      <div className="flex gap-2 text-[10px] text-slate-500 items-center">
                        <span className="font-semibold uppercase tracking-wider">Refine answer:</span>
                        
                        <button
                          onClick={() => handlePostAction(msg.id, 'summarize', msg.text)}
                          disabled={!!msg.processingAction}
                          className="px-2 py-1 rounded border border-slate-850 hover:border-indigo-500/20 hover:text-indigo-400 bg-slate-900/30 transition-colors"
                        >
                          {msg.processingAction === 'summarize' ? 'Processing...' : 'Summarize'}
                        </button>
                        
                        <button
                          onClick={() => handlePostAction(msg.id, 'simplify', msg.text)}
                          disabled={!!msg.processingAction}
                          className="px-2 py-1 rounded border border-slate-850 hover:border-indigo-500/20 hover:text-indigo-400 bg-slate-900/30 transition-colors"
                        >
                          {msg.processingAction === 'simplify' ? 'Processing...' : 'Simplify'}
                        </button>
                        
                        <button
                          onClick={() => handlePostAction(msg.id, 'mcq', msg.text)}
                          disabled={!!msg.processingAction}
                          className="px-2 py-1 rounded border border-slate-850 hover:border-indigo-500/20 hover:text-indigo-400 bg-slate-900/30 transition-colors"
                        >
                          {msg.processingAction === 'mcq' ? 'Processing...' : 'Quiz Me'}
                        </button>
                      </div>

                      {/* Summary, Simplify or Quiz details output box */}
                      {(msg.summary || msg.simplified || msg.generatedMcq) && (
                        <div className="glass-card p-3.5 border-slate-800/40 bg-slate-950/20 text-xs flex flex-col gap-2 rounded-xl max-w-full w-full">
                          {msg.summary && (
                            <div>
                              <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-widest block mb-1">
                                Summary
                              </span>
                              <div className="text-slate-300 leading-relaxed">{renderFormattedText(msg.summary)}</div>
                            </div>
                          )}
                          {msg.simplified && (
                            <div>
                              <span className="font-bold text-[10px] text-purple-400 uppercase tracking-widest block mb-1">
                                Simplified explanation
                              </span>
                              <p className="text-slate-350 leading-relaxed italic">{msg.simplified}</p>
                            </div>
                          )}
                          {msg.generatedMcq && (
                            <div>
                              <span className="font-bold text-[10px] text-emerald-400 uppercase tracking-widest block mb-1">
                                Review Quiz Question
                              </span>
                              <div className="text-slate-300 leading-relaxed">{renderFormattedText(msg.generatedMcq)}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form chat input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-slate-800/40 bg-slate-900/25 flex gap-2 flex-shrink-0"
          >
            <input
              type="text"
              placeholder="Ask a question about this document..."
              className="input-field py-3 text-xs bg-slate-950 border-slate-850"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-primary p-3 rounded-xl flex items-center justify-center"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
