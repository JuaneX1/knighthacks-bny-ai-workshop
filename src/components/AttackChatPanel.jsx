import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import ChatLog from './ChatLog.jsx';
import Spinner from './Spinner.jsx';

// Chat for one try. The parent remounts this (via key) when a new try starts, which clears it.
export default function AttackChatPanel({ attack, disabled, onAttackChange }) {
  const [message, setMessage] = useState('');
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const outOfMessages = attack.promptsLeft <= 0;

  // Reload this try's conversation after a page refresh.
  useEffect(() => {
    if (attack.promptsUsed === 0) return undefined;
    let cancelled = false;
    api
      .attackConversation()
      .then(({ messages }) => {
        if (!cancelled) setLog(messages.map((m) => ({ role: m.role, text: m.content })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only on mount - later messages are appended locally.
  }, []);

  async function send(e) {
    e.preventDefault();
    if (!message.trim() || disabled || outOfMessages) return;
    setSending(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    setLog((l) => [...l, { role: 'user', text: userMessage }]);
    try {
      const result = await api.attackChat(userMessage);
      setLog((l) => [...l, { role: 'assistant', text: result.reply }]);
      onAttackChange(result.attack);
    } catch (err) {
      // Roll back the optimistic message so it can be resent.
      setLog((l) => l.slice(0, -1));
      setMessage(userMessage);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Chat with their bot</h3>
        <span className={`text-sm ${outOfMessages ? 'text-amber-300' : 'text-slate-400'}`}>
          {attack.promptsLeft} of {attack.promptsPerAttempt} messages left
        </span>
      </div>
      <ChatLog
        log={log}
        sending={sending}
        emptyText="Say hi! The bot remembers everything you say during this try."
      />
      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          disabled={disabled || outOfMessages}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          placeholder={outOfMessages ? 'No messages left - make a guess below' : 'Try to get the password...'}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || outOfMessages || !message.trim()}
          className="flex min-w-[4.5rem] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {sending ? <Spinner /> : 'Send'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400 motion-safe:animate-fade-in-up">{error}</p>}
    </div>
  );
}
