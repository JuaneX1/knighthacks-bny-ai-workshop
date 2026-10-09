import { useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import JoinPage from './routes/JoinPage.jsx';
import DefendPage from './routes/DefendPage.jsx';
import AttackPage from './routes/AttackPage.jsx';
import WaitingPage from './routes/WaitingPage.jsx';
import ScoreboardPage from './routes/ScoreboardPage.jsx';
import AdminPage from './routes/AdminPage.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import PhaseInterstitial from './components/PhaseInterstitial.jsx';
import { PLAYER_ROUTES, applyTeamTheme, rememberedTeam } from './lib/teamTheme.js';

export default function App() {
  const { pathname } = useLocation();

  // Player screens wear the team's colors; join, scoreboard and admin stay neutral.
  useLayoutEffect(() => {
    applyTeamTheme(PLAYER_ROUTES.includes(pathname) ? rememberedTeam() : null);
  }, [pathname]);

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/defend" element={<DefendPage />} />
        <Route path="/attack" element={<AttackPage />} />
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {PLAYER_ROUTES.includes(pathname) && <PhaseInterstitial />}
    </>
  );
}
