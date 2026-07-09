import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { examAPI, documentsAPI } from '../lib/api';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  HelpCircle as QuestionIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

interface Detail {
  question_id: string;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  topic: string;
}

interface Breakdown {
  topic: string;
  total: number;
  correct: number;
  score_percent: number;
}

interface Results {
  attempt_id: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  time_taken_seconds: number;
  answer_details: Detail[];
  topic_breakdown: Breakdown[];
}

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId) return;
      try {
        const res = await examAPI.results(attemptId);
        setResults(res.data || res);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load exam results.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [attemptId]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
    return 'text-red-400 border-red-500/20 bg-red-500/5';
  };

  // Convert topic breakdown data for Recharts Radar
  const radarData = results?.topic_breakdown.map((t) => ({
    subject: t.topic,
    A: t.score_percent,
    fullMark: 100,
  })) || [];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Assessment Performance</h2>
        <p className="text-sm text-slate-400">Detailed feedback and conceptual review explanations.</p>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><SkeletonCard /></div>
          <SkeletonList rows={3} />
        </>
      ) : results ? (
        <>
          {/* ── Key Metrics row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`glass-card p-6 flex items-center justify-between border ${getScoreColor(results.accuracy)}`}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block opacity-70">
                  Accuracy Score
                </span>
                <h3 className="text-3xl font-extrabold mt-1">{results.accuracy}%</h3>
                <span className="text-[10px] opacity-60 mt-1 block">
                  {results.correct_answers} / {results.total_questions} questions correct
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40">
                <Award className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Time Spent
                </span>
                <h3 className="text-3xl font-extrabold text-slate-100 mt-1">
                  {formatTime(results.time_taken_seconds)}
                </h3>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Average: {(results.time_taken_seconds / results.total_questions).toFixed(1)}s / question
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40">
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Wrong Answers
                </span>
                <h3 className="text-3xl font-extrabold text-slate-100 mt-1">
                  {results.wrong_answers}
                </h3>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Requires focus review
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40">
                <XCircle className="w-6 h-6 text-red-500/70" />
              </div>
            </div>
          </div>

          {/* ── Topic Score Analysis ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Topic Progress Recharts radar */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Topic Analysis</h3>
                <p className="text-[11px] text-slate-400">Score breakdown across educational subjects.</p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {radarData.length === 0 ? (
                  <p className="text-xs text-slate-500">Not enough data to calculate topic breakdowns.</p>
                ) : (
                  <ErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={8} />
                        <Radar
                          name="Subject Accuracy"
                          dataKey="A"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.25}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ErrorBoundary>
                )}
              </div>
            </div>

            {/* List breakdown of Topic percentages */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-4">Topic Breakdown details</h3>
                <div className="flex flex-col gap-3.5">
                  {results.topic_breakdown.map((t, idx) => (
                    <div key={idx} className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center text-slate-350">
                        <span className="font-medium truncate max-w-[200px]">{t.topic}</span>
                        <span className="font-bold text-slate-200">
                          {t.correct}/{t.total} ({t.score_percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className={`h-full rounded-full ${
                            t.score_percent >= 80
                              ? 'bg-emerald-500'
                              : t.score_percent >= 60
                              ? 'bg-indigo-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${t.score_percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/40 flex justify-end">
                <Link to="/weak-topics" className="btn-primary text-xs py-2 px-5 gap-2">
                  View Weak Topics Analytics
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Question-by-Question Explanation Review ── */}
          <div className="glass-card p-6 flex flex-col gap-6">
            <h3 className="text-md font-bold text-slate-200 border-b border-slate-850 pb-3">
              Detailed Questions Review
            </h3>

            <div className="flex flex-col gap-6">
              {results.answer_details.map((detail, idx) => {
                return (
                  <div
                    key={detail.question_id}
                    className="p-5 rounded-2xl bg-slate-950/15 border border-slate-850 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-lg text-xs font-bold border flex items-center justify-center flex-shrink-0 ${
                          detail.is_correct ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-red-500/10 text-red-400 border-red-500/10'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            {detail.topic}
                          </span>
                          <h4 className="text-sm font-bold text-slate-200 leading-relaxed">
                            {detail.question}
                          </h4>
                        </div>
                      </div>

                      {detail.is_correct ? (
                        <span className="badge badge-success shrink-0 text-[10px] font-bold tracking-wider py-1 px-2.5">
                          Correct
                        </span>
                      ) : (
                        <span className="badge badge-danger shrink-0 text-[10px] font-bold tracking-wider py-1 px-2.5">
                          Incorrect
                        </span>
                      )}
                    </div>

                    {/* Choices details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className={`p-2.5 rounded-lg border ${
                        detail.selected_answer === 'A' && detail.is_correct
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-semibold'
                          : detail.selected_answer === 'A' && !detail.is_correct
                          ? 'border-red-500/30 bg-red-500/5 text-red-400 font-semibold'
                          : detail.correct_answer === 'A'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-350'
                          : 'border-slate-900 bg-slate-900/15 text-slate-500'
                      }`}>
                        A) {detail.question.includes('orchestration') ? 'LlamaIndex' : detail.question.includes('chunk') ? '500 characters' : detail.question.includes('vector') ? 'ChromaDB' : 'MD5'}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${
                        detail.selected_answer === 'B' && detail.is_correct
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-semibold'
                          : detail.selected_answer === 'B' && !detail.is_correct
                          ? 'border-red-500/30 bg-red-500/5 text-red-400 font-semibold'
                          : detail.correct_answer === 'B'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-350'
                          : 'border-slate-900 bg-slate-900/15 text-slate-500'
                      }`}>
                        B) {detail.question.includes('orchestration') ? 'LangChain' : detail.question.includes('chunk') ? '1000 characters' : detail.question.includes('vector') ? 'Qdrant' : 'SHA-256'}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${
                        detail.selected_answer === 'C' && detail.is_correct
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-semibold'
                          : detail.selected_answer === 'C' && !detail.is_correct
                          ? 'border-red-500/30 bg-red-500/5 text-red-400 font-semibold'
                          : detail.correct_answer === 'C'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-350'
                          : 'border-slate-900 bg-slate-900/15 text-slate-500'
                      }`}>
                        C) {detail.question.includes('orchestration') ? 'Hugging Face' : detail.question.includes('chunk') ? '2000 characters' : detail.question.includes('vector') ? 'Pinecone' : 'bcrypt'}
                      </div>
                      <div className={`p-2.5 rounded-lg border ${
                        detail.selected_answer === 'D' && detail.is_correct
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-semibold'
                          : detail.selected_answer === 'D' && !detail.is_correct
                          ? 'border-red-500/30 bg-red-500/5 text-red-400 font-semibold'
                          : detail.correct_answer === 'D'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-350'
                          : 'border-slate-900 bg-slate-900/15 text-slate-500'
                      }`}>
                        D) {detail.question.includes('orchestration') ? 'Semantic Kernel' : detail.question.includes('chunk') ? '1500 characters' : detail.question.includes('vector') ? 'Milvus' : 'AES-256'}
                      </div>
                    </div>

                    {/* AI Explanation block */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-850/60 text-xs">
                      <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-widest block mb-1">
                        Concept Explanation
                      </span>
                      <p className="text-slate-400 leading-relaxed">{detail.explanation}</p>
                    </div>
                  </tr>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to render results.</div>
      )}
    </div>
  );
}
