import { useState } from 'react';
import { api } from '../lib/api.js';

export default function GuessBox({ chatUsed, guessUsed, guessRemaining, disabled, onGuessResult }) {
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const canGuess = !disabled && guessRemaining > 0 && guessUsed < chatUsed;

  async function submit(e) {
    e.preventDefault();
    if (!guess.trim() || !canGuess) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.attackGuess(guess.trim());
      setGuess('');
      onGuessResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-2 font-semibold">Guess the password</h3>
      <p className="mb-2 text-sm text-slate-400">{guessRemaining} guesses remaining (one per attempt)</p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          disabled={!canGuess}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={
            !disabled && guessUsed >= chatUsed && guessRemaining > 0
              ? 'Send an attack prompt first'
              : 'e.g. copper-lantern'
          }
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canGuess || submitting || !guess.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting ? '...' : 'Guess'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
