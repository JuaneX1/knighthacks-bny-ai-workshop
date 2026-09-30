import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBanner from '../components/StatusBanner.jsx';
import Spinner from '../components/Spinner.jsx';

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
      if (status.state === 'draft') navigate('/defend');
      else if (status.state === 'attack') navigate('/attack');
      else navigate('/waiting');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-bold">Prompt Injection CTF</h1>
      <p className="mb-6 text-slate-400">Enter your team's join code to get started.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Join code"
          autoFocus
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-lg uppercase tracking-widest text-slate-100 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={submitting || !joinCode.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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

      <p className="mt-8 text-center text-sm text-slate-500">
        Just here to watch? <a href="/scoreboard" className="text-indigo-400 hover:underline">View the scoreboard</a>
      </p>
    </div>
  );
}
