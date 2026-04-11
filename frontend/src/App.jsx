import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import JournalPage from './pages/JournalPage';
import ProjectsPage from './pages/ProjectsPage';
import PatternPage from './pages/PatternPage';
import AICoachPage from './pages/AICoachPage';
import MyPage from './pages/MyPage';
import LoginPage from './pages/LoginPage';
import { getToken, getUser, clearSession, logout } from './api/auth';

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Validate token on mount
    const token = getToken();
    if (!token) {
      clearSession();
      setUser(null);
    }
    setAuthChecked(true);
  }, []);

  function handleLogin(userData) {
    setUser(userData);
  }

  async function handleLogout() {
    const token = getToken();
    try { await logout(token); } catch {}
    clearSession();
    setUser(null);
  }

  if (!authChecked) return null;

  if (!user || !getToken()) {
    return (
      <div className="bg-bg min-h-screen max-w-[520px] mx-auto">
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen max-w-[520px] mx-auto relative">
      <div
        className="fixed top-0 left-0 right-0 h-32 pointer-events-none max-w-[520px] mx-auto"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(232,168,73,0.06) 0%, transparent 70%)',
        }}
      />

      <main>
        <Routes>
          <Route path="/" element={<JournalPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/pattern" element={<PatternPage />} />
          <Route path="/coach" element={<AICoachPage />} />
          <Route path="/me" element={<MyPage user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
