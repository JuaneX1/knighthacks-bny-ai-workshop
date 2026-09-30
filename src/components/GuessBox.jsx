import { useState } from 'react';
import { api } from '../lib/api.js';
import { burstConfetti } from '../lib/confetti.js';
import Spinner from './Spinner.jsx';

export default function GuessBox({ attack, disabled, cracked, onGuessResult }) {
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [shaking, setShaking] = useState(false);
  const canGuess = !disabled && attack.canGuess;
  const isLastTry = attack.attemptsLeft === 1;

  async function submit(e) {
    e.preventDefault();
    if (!guess.trim() || !canGuess) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const submitted = guess.trim();
    try {
      const result = await api.attackGuess(submitted);
      setGuess('');
      if (result.correct) {
        burstConfetti();
      } else {
        setNotice({
          id: Date.now(),
          text: result.attack.done
            ? `"${submitted}" is wrong. That was your last try.`
            : `"${submitted}" is wrong. Starting try ${result.attack.attempt} with a fresh chat.`,
        });
        setShaking(true);
      }
      onGuessResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function giveUp() {
    if (!canGuess || submitting) return;
    if (!confirm('Start a fresh chat? This uses up this try without guessing.')) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.attackGiveUp();
      setNotice({ id: Date.now(), text: result.attack.done ? 'That was your last try.' : 'Fresh chat started.' });
      onGuessResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`rounded-lg border bg-slate-900 p-4 transition-colors duration-500 ${
        cracked ? 'border-emerald-500 motion-safe:animate-glow-good' : 'border-slate-700'
      }`}
    >
      <h3 className="mb-1 font-semibold">{cracked ? 'You cracked it!' : 'Guess the password'}</h3>
      {!cracked && (
        <p className="mb-2 text-sm text-slate-400">
          {isLastTry ? 'This is your last try.' : 'Guessing ends this try. Right or wrong, your next try starts with a fresh chat.'}
        </p>
      )}
      <form
        onSubmit={submit}
        onAnimationEnd={() => setShaking(false)}
        className={`flex gap-2 ${shaking ? 'motion-safe:animate-shake' : ''}`}
      >
        <input
          type="text"
          disabled={!canGuess}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={!disabled && !attack.done && !attack.canGuess ? 'Send the bot a message first' : 'e.g. copper-lantern'}
          className={`flex-1 rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500 disabled:opacity-50 ${
            shaking ? 'border-red-500' : 'border-slate-700'
          }`}
        />
        <button
          type="submit"
          disabled={!canGuess || submitting || !guess.trim()}
          className="flex min-w-[4.5rem] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {submitting ? <Spinner /> : 'Guess'}
        </button>
      </form>
      {notice && (
        <p key={notice.id} className="mt-2 text-sm text-amber-300 motion-safe:animate-fade-in-up">
          {notice.text}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400 motion-safe:animate-fade-in-up">{error}</p>}
      {canGuess && !isLastTry && (
        <button
          type="button"
          onClick={giveUp}
          disabled={submitting}
          className="mt-3 text-xs text-slate-500 underline hover:text-slate-300 disabled:opacity-50"
        >
          Stuck? Start a fresh chat without guessing (uses this try)
        </button>
      )}
    </div>
  );
}
