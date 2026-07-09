import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { analyticsAPI, documentsAPI } from '../lib/api';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton';
import { BrainCircuit, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface WeakTopic {
  topic: string;
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  recommendation: string;
}

interface AnalyticsData {
  weak_topics: WeakTopic[];
  total_exams: number;
  overall_accuracy: number;
}

export default function WeakTopicsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [res, docsRes] = await Promise.all([
        analyticsAPI.weakTopics(),
        documentsAPI.list(),
      ]);
      setData(res.data || res);
      setDocuments(docsRes.data?.documents || docsRes.documents || docsRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load weak topics analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
    return 'text-amber-405 border-amber-500/20 bg-amber-500/5';
  };

  // Prepare chart data
  const chartData = data?.weak_topics.map((t) => ({
    name: t.topic,
    accuracy: t.score_percent,
  })) || [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-indigo-400 hover:border-indigo-500/20 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Learning Gap Analysis</h2>
          <p className="text-xs text-slate-400">Aggregated weak topics and AI-guided study recommendations.</p>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><SkeletonCard /></div>
          <SkeletonList rows={3} />
        </>
      ) : data ? (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Exams Evaluated
                </span>
                <h3 className="text-3xl font-extrabold text-slate-100 mt-1">
                  {data.total_exams} attempts
                </h3>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Continuous performance tracking active
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40">
                <BrainCircuit className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            <div className={`glass-card p-6 flex items-center justify-between border ${getScoreColor(data.overall_accuracy)}`}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Overall Accuracy
                </span>
                <h3 className="text-3xl font-extrabold mt-1">
                  {data.overall_accuracy}%
                </h3>
                <span className="text-[10px] opacity-70 mt-1 block">
                  Target: 80% competency threshold
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40">
                {data.overall_accuracy >= 80 ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
              </div>
            </div>
          </div>

          {data.weak_topics.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center p-12 text-center border-emerald-500/10 bg-emerald-500/5">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-200 mb-1">Excellent Standing!</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                All subject accuracy scores are above the 60% threshold. Keep up the high score performance!
              </p>
              <Link to="/" className="btn-primary py-2.5 px-6 text-xs">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
              {/* Recharts Bar chart representation */}
              <div className="glass-card p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Gaps Breakdown</h3>
                  <p className="text-[11px] text-slate-400">Topics below the 60% benchmark.</p>
                </div>

                <div className="h-64 w-full mt-4">
                  <ErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.accuracy < 40 ? '#ef4444' : '#f59e0b'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ErrorBoundary>
                </div>
              </div>

              {/* Study Recommendations List */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-350 px-1">
                  AI Study Recommendations
                </h3>

                <div className="flex flex-col gap-5">
                  {data.weak_topics.map((topic, index) => (
                    <div
                      key={index}
                      className="glass-card p-6 border-slate-800/60 bg-slate-900/10 flex flex-col md:flex-row justify-between gap-6"
                    >
                      <div className="flex flex-col gap-3 max-w-xl">
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-200">{topic.topic}</h4>
                            <span className="text-[10px] text-slate-500">
                              Average Accuracy: <span className="font-bold text-amber-500">{topic.score_percent}%</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed pl-1">
                          {topic.recommendation}
                        </p>
                      </div>

                      {/* Action trigger links back to source material */}
                      <div className="flex items-center justify-start md:justify-end flex-shrink-0">
                        {documents.length > 0 ? (
                          <button
                            onClick={() => navigate(`/chat/${documents[0].id}`)}
                            className="btn-primary text-xs py-2 px-5 gap-1.5"
                          >
                            Review Material
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Link to="/upload" className="btn-secondary text-xs py-2 px-4 gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Upload docs
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">No analytics data found.</div>
      )}
    </div>
  );
}
