import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { examAPI } from '../lib/api';
import { Loader2, Timer, Flag, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic: string;
  difficulty: string;
}

interface SavedState {
  answers: Record<string, string>;
  flagged: string[];
  currentIndex: number;
  timeLeft: number;
}

export default function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> option (A, B, C, D)
  const [flagged, setFlagged] = useState<string[]>([]); // questionId list
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes default
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const timerRef = useRef<any>(null);
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  
  const storageKey = `exam_attempt_${attemptId}`;

  // Load questions and rehydrate local save
  useEffect(() => {
    const initExam = async () => {
      if (!attemptId) return;
      try {
        const res = await examAPI.start({
          document_id: 'doc-uuid-1', // backend maps internally, fallback to mock doc
          question_count: 5,
        });
        const attempt = res.data || res;
        const examQuestions = attempt.questions || [];
        setQuestions(examQuestions);
        
        // Default timer: 2 minutes per question
        const defaultTime = examQuestions.length * 120;
        setTimeLeft(defaultTime);

        // Check for local autosave
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsed: SavedState = JSON.parse(cached);
            setAnswers(parsed.answers || {});
            setFlagged(parsed.flagged || []);
            setCurrentIndex(parsed.currentIndex || 0);
            if (typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
              setTimeLeft(parsed.timeLeft);
            }
            toast.success('Restored previous exam progress!');
          } catch (e) {
            console.error('Failed to parse autosave cache', e);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to retrieve exam questions.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [attemptId]);

  // Autosave when states change
  useEffect(() => {
    if (loading || questions.length === 0 || !attemptId) return;
    const saveState: SavedState = {
      answers,
      flagged,
      currentIndex,
      timeLeft,
    };
    localStorage.setItem(storageKey, JSON.stringify(saveState));
  }, [answers, flagged, currentIndex, timeLeft, loading, questions, attemptId]);

  // Countdown timer clock
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, questions]);

  const handleAutoSubmit = () => {
    toast.error('Time expired! Automatically submitting your answers...', { duration: 4000 });
    submitExamResults();
  };

  const handleSelectOption = (option: string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const toggleFlagQuestion = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setFlagged(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const submitExamResults = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    setShowConfirmModal(false);
    
    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current);

    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      question_id: qId,
      selected_answer: val,
    }));

    // Calculate time taken
    const initialTime = questions.length * 120;
    const timeTaken = Math.max(0, initialTime - timeLeft);

    try {
      await examAPI.submit({
        attempt_id: attemptId,
        answers: formattedAnswers,
        time_taken_seconds: timeTaken,
      });

      // Clear LocalStorage cache
      localStorage.removeItem(storageKey);
      toast.success('Exam submitted successfully!');
      navigate(`/results/${attemptId}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit exam. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="text-sm font-semibold">Initializing exam workspace...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const isTimeCritical = timeLeft < 120; // less than 2 minutes

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-130px)] md:h-[calc(100vh-80px)]">
      {/* Top Banner timer & metrics */}
      <div className="glass-card flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Ongoing Assessment
          </span>
          <h3 className="text-sm font-bold text-slate-200">
            Question {currentIndex + 1} of {totalQuestions}
          </h3>
        </div>

        {/* Timer Box */}
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-300 ${
            isTimeCritical
              ? 'border-red-500/30 text-red-400 bg-red-500/5 animate-pulse'
              : 'border-slate-800 text-indigo-300 bg-slate-900/40'
          }`}
        >
          <Timer className={`w-4 h-4 ${isTimeCritical ? 'text-red-400 animate-spin' : 'text-indigo-400'}`} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Side: Question Navigation Map */}
        <div className="w-64 bg-slate-900/30 border border-slate-800/40 p-5 flex flex-col gap-4 rounded-2xl flex-shrink-0 hidden md:flex">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Assessment Map
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged.includes(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold border flex items-center justify-center transition-all duration-200 relative ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20 pulse-glow'
                        : isFlagged
                        ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                        : isAnswered
                        ? 'bg-slate-800 border-slate-700 text-indigo-300'
                        : 'border-slate-850 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto border-t border-slate-850 pt-4 flex flex-col gap-2.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-500" />
              <span>Current position</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-slate-850 border border-slate-700" />
              <span>Answered items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded border border-amber-500/40 bg-amber-500/5" />
              <span>Flagged for review</span>
            </div>
          </div>
        </div>

        {/* Center/Right: Core Questionnaire card */}
        <div className="flex-1 glass-card p-8 flex flex-col justify-between overflow-y-auto">
          {currentQuestion && (
            <div className="flex flex-col gap-6">
              {/* Question Statement */}
              <div className="flex items-start gap-4">
                <span className="text-xs bg-slate-800 border border-slate-700 text-slate-350 font-extrabold px-3 py-1 rounded-lg">
                  {currentIndex + 1}
                </span>
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {currentQuestion.topic}
                    </span>
                    <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      currentQuestion.difficulty === 'hard'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/10'
                        : currentQuestion.difficulty === 'easy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                  </div>
                  <h2 className="text-md font-bold text-slate-100 leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>
              </div>

              {/* Options Grid */}
              <div className="flex flex-col gap-3.5 mt-2">
                {[
                  { key: 'A', text: currentQuestion.option_a },
                  { key: 'B', text: currentQuestion.option_b },
                  { key: 'C', text: currentQuestion.option_c },
                  { key: 'D', text: currentQuestion.option_d },
                ].map((opt) => {
                  const isSelected = answers[currentQuestion.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all duration-200 flex items-center gap-4 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-650/10'
                          : 'border-slate-850 bg-slate-900/10 text-slate-400 hover:border-slate-700 hover:bg-slate-900/30'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg text-xs font-bold border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'border-slate-800 text-slate-500'
                      }`}>
                        {opt.key}
                      </div>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons footer */}
          <div className="flex items-center justify-between border-t border-slate-800/40 pt-6 mt-8">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary py-2.5 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={toggleFlagQuestion}
                className={`btn-secondary py-2.5 px-4 text-xs ${
                  flagged.includes(currentQuestion?.id)
                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                    : ''
                }`}
              >
                <Flag className="w-4 h-4" />
                {flagged.includes(currentQuestion?.id) ? 'Flagged' : 'Flag review'}
              </button>
            </div>

            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting}
                className="btn-primary py-2.5 px-6 text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="btn-primary py-2.5 px-5 text-xs"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-slate-800/80 animate-scale-in">
            <h3 className="text-md font-bold text-slate-100 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-400" />
              Confirm Submission
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              You are about to submit your exam answers. You have answered **{answeredCount}** out of **{totalQuestions}** questions. Unanswered questions will receive 0 points.
            </p>
            <div className="flex gap-3 justify-end text-xs font-semibold">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={submitExamResults}
                className="btn-primary py-2 px-5"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
