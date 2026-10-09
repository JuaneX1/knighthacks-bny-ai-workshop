import { useState } from 'react';

const CONFIRM_WORD = 'RESET';

// Typed confirmation for wiping the game, so it can't happen from a stray click.
export default function ResetDialog({ onConfirm, onCancel, busy }) {
  const [typed, setTyped] = useState('');
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-void/80 px-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onConfirm();
        }}
        className="ui-panel w-full max-w-md border-brand-error/50 bg-panel p-6 motion-safe:animate-fade-in-up"
      >
        <h2 id="reset-title" className="mb-2 text-lg font-bold text-brand-error">
          Reset the game?
        </h2>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-ink/80">
          <li>Every round, chat and guess is deleted.</li>
          <li>Every team's saved bot is deleted, so the next game starts from scratch.</li>
          <li>All players are signed out and need to rejoin with their code.</li>
          <li>Team names, join codes and the game mode are kept.</li>
        </ul>
        <label className="mb-4 block text-sm text-brand-blue/60">
          Type <span className="font-bold text-ink">{CONFIRM_WORD}</span> to confirm
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="ui-input mt-2 w-full uppercase tracking-widest"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-neutral py-2">
            Cancel
          </button>
          <button type="submit" disabled={!ready || busy} className="btn-danger py-2">
            Reset game
          </button>
        </div>
      </form>
    </div>
  );
}
