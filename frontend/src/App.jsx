import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import JournalPage from './pages/JournalPage';
import ProjectsPage from './pages/ProjectsPage';
import PatternPage from './pages/PatternPage';
import AICoachPage from './pages/AICoachPage';
import MyPage from './pages/MyPage';

export default function App() {
  return (
    <div className="bg-bg min-h-screen max-w-[520px] mx-auto relative">
      {/* Subtle ambient glow at top */}
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
          <Route path="/me" element={<MyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
