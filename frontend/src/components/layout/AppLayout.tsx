import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  UploadCloud,
  BrainCircuit,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Upload PDF', path: '/upload', icon: UploadCloud },
    { label: 'Weak Topics', path: '/weak-topics', icon: BrainCircuit },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-height-100vh flex bg-slate-950 text-slate-100">
      {/* ── Sidebar Desktop & Mobile ── */}
      <aside
        className={`sidebar fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800/40 p-6 flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">
                StudyAI
              </h1>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Intelligence Platform
              </span>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="flex flex-col gap-4 border-t border-slate-800/60 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'User'}</h4>
              <p className="text-[11px] text-slate-500 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/5 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content Container ── */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800/40 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-md text-slate-100">StudyAI</span>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Inner Content Outlet */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
