import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { authAPI } from './lib/api';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';
import ExamSetupPage from './pages/ExamSetupPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import WeakTopicsPage from './pages/WeakTopicsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          logout();
        });
    } else {
      setLoading(false);
    }
  }, [setUser, setLoading, logout]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/chat/:documentId" element={<ChatPage />} />
                  <Route path="/exam/setup/:documentId" element={<ExamSetupPage />} />
                  <Route path="/exam/:attemptId" element={<ExamPage />} />
                  <Route path="/results/:attemptId" element={<ResultsPage />} />
                  <Route path="/weak-topics" element={<WeakTopicsPage />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
