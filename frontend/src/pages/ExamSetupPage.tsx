import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { examAPI, documentsAPI } from '../lib/api';
import { ArrowLeft, BrainCircuit, Play, HelpCircle, Loader2, Sparkles } from 'lucide-react';

export default function ExamSetupPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  
  const [docName, setDocName] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!documentId) return;
      try {
        const res = await documentsAPI.get(documentId);
        setDocName(res.data?.original_name || res.original_name);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load document details.');
        navigate('/');
      }
    };
    fetchDoc();
  }, [documentId]);

  const handleStartExam = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      // 1. Generate/verify questions exist first (MCQ API check)
      await examAPI.history(); // small heartbeat

      // 2. Start the exam attempt
      const res = await examAPI.start({
        document_id: documentId,
        question_count: questionCount,
      });

      const attempt = res.data || res;
      toast.success('Exam started! Good luck.');
      
      // Navigate to the distraction-free exam page
      navigate(`/exam/${attempt.attempt_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to initialize exam questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-indigo-400 hover:border-indigo-500/20 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Setup Practice Examination</h2>
          <p className="text-xs text-slate-400">Configure quiz parameters for customized assessments.</p>
        </div>
      </div>

      <div className="glass-card p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 border-b border-slate-800/40 pb-5">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shadow-lg shadow-indigo-500/5">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Selected Document
            </span>
            <h3 className="text-sm font-bold text-slate-200 truncate max-w-md">
              {docName || 'Loading document details...'}
            </h3>
          </div>
        </div>

        {/* Form controls */}
        <div className="flex flex-col gap-5">
          {/* Question Count Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              Question Count
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" title="Select how many questions will be generated for your self-test." />
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 20, 40].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`py-3 rounded-xl border text-xs font-bold transition-all duration-200 ${
                    questionCount === count
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-650/10'
                      : 'border-slate-850 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-350'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Difficulty Grade</label>
            <div className="grid grid-cols-3 gap-3">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-3 rounded-xl border text-xs font-bold capitalize transition-all duration-200 ${
                    difficulty === level
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-650/10'
                      : 'border-slate-850 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-350'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Study instructions */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850/60 text-xs text-slate-400 flex flex-col gap-2 leading-relaxed">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Adaptive Exam Guidelines
          </h4>
          <p>• The exam is fully generated based on the semantic concepts found inside your document.</p>
          <p>• A ticking timer will be active. Leaving/refreshing the page is safe; progress is autosaved locally.</p>
          <p>• Submit answers once completed. Scores will map to your overall Weak Topics dashboard.</p>
        </div>

        {/* Start button */}
        <button
          onClick={handleStartExam}
          disabled={loading || !docName}
          className="btn-primary w-full justify-center py-3.5 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Compiling AI Questions...
            </>
          ) : (
            <>
              Launch Exam
              <Play className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
