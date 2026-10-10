import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBanner from '../components/StatusBanner.jsx';
import Spinner from '../components/Spinner.jsx';
import BrandEmblem from '../components/icons/BrandEmblem.jsx';
import ShieldIcon from '../components/icons/ShieldIcon.jsx';
import SwordIcon from '../components/icons/SwordIcon.jsx';
import TrophyIcon from '../components/icons/TrophyIcon.jsx';
import TeamReveal from '../components/TeamReveal.jsx';
import { rememberTeam } from '../lib/teamTheme.js';
import { resetPhaseBaseline } from '../lib/phaseAnnouncer.js';

// How long the "You're on Team X" reveal plays before moving on to the game.
const REVEAL_MS = 4200;

const RULES = [
  {
    title: 'Draft · 5 min',
    body: 'Write the rules for your bot. It guards a secret password but still has a day job, so hit "Save & test" until it passes the helpfulness check. A bot that refuses everyone counts as broken.',
  },
  {
    title: 'Attack · 10 min',
    body: "Sweet-talk, trick or confuse the other team's bot into leaking its password. Each try is a chat of up to 8 messages that ends in one guess. Tries are unlimited.",
  },
  {
    title: 'Winning',
    body: "Crack their bot while yours holds and the match is yours. A bot that failed the helpfulness check counts as cracked. Anything else is a draw.",
  },
  {
    title: 'One device per team',
    body: "Logging in somewhere new kicks your old device out. Pick one and stick with it.",
  },
];

// Large tappable row in the home menu, rendered as a button or a link.
function MenuItem({ icon, title, subtitle, onClick, href }) {
  const className =
    'ui-panel group flex w-full items-center gap-4 px-4 py-4 text-left transition hover:border-brand-blue/60 hover:bg-panel active:scale-[0.99]';
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-blue/30 bg-well text-brand-blue">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-sm text-brand-blue/50">{subtitle}</span>
      </span>
      <span className="text-brand-blue/40 transition group-hover:translate-x-1 group-hover:text-brand-blue">&rsaquo;</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// Back link shown above a sub-view of the home menu.
function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-4 text-sm text-brand-blue/60 hover:text-brand-blue">
      &lsaquo; Back to menu
    </button>
  );
}

// Home menu with options to join a team, read the rules, watch the scoreboard or open the slides.
export default function JoinPage() {
  const [view, setView] = useState('menu');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(null);
  const navigate = useNavigate();

  // Joins the team for the entered code, plays the reveal, then routes to the current phase.
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const team = await api.join(joinCode.trim());
      rememberTeam(team.teamId);
      resetPhaseBaseline();
      setJoined(team);
      const [status] = await Promise.all([api.status(), new Promise((r) => setTimeout(r, REVEAL_MS))]);
      if (status.role === 'player' && status.state === 'draft') navigate('/defend');
      else if (status.role === 'player' && status.state === 'attack') navigate('/attack');
      else navigate('/waiting');
    } catch (err) {
      setJoined(null);
      setError(err.message);
      setSubmitting(false);
    }
  }

  // Returns to the menu and clears any join error.
  function showMenu() {
    setError(null);
    setView('menu');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      {joined && <TeamReveal teamId={joined.teamId} teamName={joined.teamName} />}
      <div className="mb-2 flex items-center gap-3">
        <BrandEmblem className="h-10 w-10" />
        <h1 className="heading-glow text-3xl font-bold">Prompt Wars</h1>
      </div>
      <p className="mb-8 text-sm uppercase tracking-widest text-brand-blue/60">Lock yours down. Talk theirs open.</p>

      {view === 'menu' && (
        <nav className="space-y-3 motion-safe:animate-fade-in-up">
          <MenuItem
            icon={<SwordIcon className="h-6 w-6" />}
            title="Join the game"
            subtitle="Got a team code? Get in here"
            onClick={() => setView('join')}
          />
          <MenuItem
            icon={<ShieldIcon className="h-6 w-6" />}
            title="How to play"
            subtitle="Rules of engagement"
            onClick={() => setView('rules')}
          />
          <MenuItem
            icon={<TrophyIcon className="h-6 w-6" />}
            title="Scoreboard"
            subtitle="Live leaderboard"
            href="/scoreboard"
          />
          <MenuItem
            icon={<span className="font-mono text-sm font-bold">&lt;/&gt;</span>}
            title="Workshop slides"
            subtitle="Follow along with the talk"
            href="/slides"
          />
        </nav>
      )}

      {view === 'join' && (
        <div className="motion-safe:animate-fade-in-up">
          <BackButton onClick={showMenu} />
          <p className="mb-4 text-brand-blue/50">Punch in the code your team was handed.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Team code"
              autoFocus
              className="ui-input w-full px-4 py-3 text-lg uppercase tracking-widest"
            />
            <button type="submit" disabled={submitting || !joinCode.trim()} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Spinner /> Connecting
                </>
              ) : (
                'Join'
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4">
              <StatusBanner tone="bad">{error}</StatusBanner>
            </div>
          )}
        </div>
      )}

      {view === 'rules' && (
        <div className="motion-safe:animate-fade-in-up">
          <BackButton onClick={showMenu} />
          <ol className="space-y-3">
            {RULES.map((rule, index) => (
              <li key={rule.title} className="ui-panel flex gap-4 px-4 py-4">
                <span className="font-mono text-lg font-bold text-brand-blue">{index + 1}</span>
                <div>
                  <h2 className="font-semibold text-ink">{rule.title}</h2>
                  <p className="mt-1 text-sm text-brand-blue/60">{rule.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setView('join')} className="btn-primary mt-6 w-full">
            I'm ready. Let me in
          </button>
        </div>
      )}
    </div>
  );
}
