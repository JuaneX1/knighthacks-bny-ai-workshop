import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBanner from '../components/StatusBanner.jsx';
import Spinner from '../components/Spinner.jsx';
import BrandEmblem from '../components/icons/BrandEmblem.jsx';

export default function JoinPage() {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.join(joinCode.trim());
      const status = await api.status();
      if (status.role === 'player' && status.state === 'draft') navigate('/defend');
      else if (status.role === 'player' && status.state === 'attack') navigate('/attack');
      else navigate('/waiting');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-2 flex items-center gap-3">
        <BrandEmblem className="h-10 w-10" />
        <h1 className="heading-glow text-3xl font-bold">Prompt Wars</h1>
      </div>
      <p className="mb-1 text-sm uppercase tracking-widest text-brand-blue/60">Attack and Defend AI Chatbots</p>
      <p className="mb-6 text-brand-blue/50">Enter your team's join code to get started.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join code"
          autoFocus
          className="ui-input w-full px-4 py-3 text-lg uppercase tracking-widest"
        />
        <button
          type="submit"
          disabled={submitting || !joinCode.trim()}
          className="btn-primary w-full"
        >
          {submitting ? (
            <>
              <Spinner /> Joining
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

      <p className="mt-8 text-center text-sm text-brand-blue/40">
        Just here to watch? <a href="/scoreboard" className="text-brand-blue hover:underline">View the scoreboard</a>
      </p>
    </div>
  );
}
