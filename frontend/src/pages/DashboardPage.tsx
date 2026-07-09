import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { documentsAPI, analyticsAPI } from '../lib/api';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { SkeletonStatsGrid, SkeletonList } from '../components/ui/Skeleton';
import {
  FileText,
  Award,
  BookOpen,
  Trash2,
  MessageSquare,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Doc {
  id: string;
  filename: string;
  original_name: string;
  status: string;
  page_count: number | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface Stats {
  total_documents: number;
  total_exams: number;
  total_questions_answered: number;
  overall_accuracy: number;
  recent_attempts: any[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        documentsAPI.list(),
        analyticsAPI.dashboard(),
      ]);
      setDocs(docsRes.data.documents || docsRes.data || []);
      setStats(statsRes.data || statsRes);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll for document status if any document is currently processing
  useEffect(() => {
    const hasProcessing = docs.some(
      (doc) => doc.status !== 'READY' && doc.status !== 'FAILED'
    );

    if (hasProcessing) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchDashboardData(true);
        }, 5000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [docs]);

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document? All chat histories and vector indexes will be permanently removed.')) {
      return;
    }

    try {
      await documentsAPI.delete(id);
      toast.success('Document deleted successfully.');
      fetchDashboardData(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="badge badge-success flex items-center gap-1.5 py-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Ready
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-danger flex items-center gap-1.5 py-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'UPLOAD_STARTED':
        return (
          <span className="badge badge-info flex items-center gap-1.5 py-1 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Uploading...
          </span>
        );
      default:
        // Processing stages
        return (
          <span className="badge badge-warning flex items-center gap-1.5 py-1 animate-pulse">
            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 85) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (acc >= 65) return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
    return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
  };

  // Format Recharts data
  const chartData = stats?.recent_attempts
    ?.slice()
    .reverse()
    .map((attempt, index) => ({
      name: `Exam ${index + 1}`,
      score: attempt.accuracy,
      date: formatDate(attempt.created_at),
    })) || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Dashboard Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Learning Space Dashboard</h2>
        <p className="text-sm text-slate-400">Track and review study materials, exam feedback, and weak learning concepts.</p>
      </div>

      {loading ? (
        <>
          <SkeletonStatsGrid />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><SkeletonList rows={4} /></div>
            <div><SkeletonList rows={2} /></div>
          </div>
        </>
      ) : (
        <>
          {/* ── Dashboard Stats row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card flex items-center justify-between p-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Uploaded Materials
                </span>
                <h3 className="text-3xl font-extrabold text-slate-100 mt-1">
                  {stats?.total_documents || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-card flex items-center justify-between p-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Practice Exams
                </span>
                <h3 className="text-3xl font-extrabold text-slate-100 mt-1">
                  {stats?.total_exams || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/10">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className={`glass-card flex items-center justify-between p-6 border ${getAccuracyColor(stats?.overall_accuracy || 0)}`}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Overall Accuracy
                </span>
                <h3 className="text-3xl font-extrabold mt-1">
                  {stats?.overall_accuracy ? `${stats.overall_accuracy}%` : '0%'}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/50">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ── Main Dashboard Split View ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Documents List */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="glass-card p-6 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-200">Study Documents</h3>
                  <Link to="/upload" className="btn-primary text-xs py-2 px-4">
                    Upload New
                  </Link>
                </div>

                {docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/10">
                    <FileText className="w-12 h-12 text-slate-600 mb-4" />
                    <h4 className="text-md font-bold text-slate-300 mb-1">No documents uploaded</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-6">
                      Upload educational files to parse concepts, review materials, and generate custom examinations.
                    </p>
                    <Link to="/upload" className="btn-primary py-2 px-5 text-sm">
                      Upload PDF
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4">File Name</th>
                          <th className="py-3.5 px-4">Uploaded</th>
                          <th className="py-3.5 px-4">Pages / Size</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-sm">
                        {docs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-4 px-4 font-medium text-slate-200 truncate max-w-xs">
                              {doc.original_name}
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-xs">
                              {formatDate(doc.created_at)}
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-xs">
                              {doc.page_count ? `${doc.page_count} pages` : 'Calculating...'}
                              <span className="block text-[10px] text-slate-600">
                                {formatBytes(doc.file_size_bytes)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(doc.status)}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {doc.status === 'READY' ? (
                                  <>
                                    <button
                                      onClick={() => navigate(`/chat/${doc.id}`)}
                                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-800/80 transition-colors"
                                      title="Chat with Document"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => navigate(`/exam/setup/${doc.id}`)}
                                      className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                      title="Take Practice Exam"
                                    >
                                      <Play className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-2 rounded-lg bg-slate-800/40 text-slate-500 hover:text-red-400 hover:bg-slate-850/60 transition-colors"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Score Progression Chart */}
            <div className="flex flex-col gap-6">
              <div className="glass-card p-6 flex flex-col gap-5 h-full">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-1">Learning Curve</h3>
                  <p className="text-xs text-slate-400">Score progress across your recent exam evaluations.</p>
                </div>

                <div className="h-64 w-full mt-4">
                  {chartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-800">
                      <TrendingUp className="w-10 h-10 text-slate-600 mb-3" />
                      <p className="text-xs text-slate-500">
                        Take examinations to compile score analytics charts.
                      </p>
                    </div>
                  ) : (
                    <ErrorBoundary>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              background: '#1e293b',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                              borderRadius: '8px',
                              color: '#f1f5f9',
                              fontSize: '12px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ErrorBoundary>
                  )}
                </div>

                {stats?.recent_attempts && stats.recent_attempts.length > 0 && (
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-800/40">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Recent Activity
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      {stats.recent_attempts.slice(0, 3).map((attempt: any) => (
                        <div
                          key={attempt.id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/35 border border-slate-800/20"
                        >
                          <div className="truncate max-w-[140px] font-medium text-slate-300">
                            {docs.find((d) => d.id === attempt.document_id)?.original_name || 'Practice Test'}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{formatDate(attempt.created_at)}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${
                              attempt.accuracy >= 80
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : attempt.accuracy >= 60
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {attempt.accuracy}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Simple loader helper inline
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
