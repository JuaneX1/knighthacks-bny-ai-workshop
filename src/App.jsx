import { Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './routes/JoinPage.jsx';
import DefendPage from './routes/DefendPage.jsx';
import AttackPage from './routes/AttackPage.jsx';
import WaitingPage from './routes/WaitingPage.jsx';
import ScoreboardPage from './routes/ScoreboardPage.jsx';
import AdminPage from './routes/AdminPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/defend" element={<DefendPage />} />
      <Route path="/attack" element={<AttackPage />} />
      <Route path="/waiting" element={<WaitingPage />} />
      <Route path="/scoreboard" element={<ScoreboardPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
