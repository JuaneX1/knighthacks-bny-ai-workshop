import { useState } from 'react';
import { api } from '../lib/api.js';
import ChatLog from './ChatLog.jsx';
import Spinner from './Spinner.jsx';

export default function TestChatPanel({ vault, disabled }) {
  const [message, setMessage] = useState('');
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function send(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    setLog((l) => [...l, { role: 'user', text: userMessage }]);
    try {
      const { reply } = await api.testChat({ ...vault, message: userMessage });
      setLog((l) => [...l, { role: 'assistant', text: reply }]);
    } catch (err) {
      setLog((l) => l.slice(0, -1));
      setMessage(userMessage);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h3 className="font-semibold">Practice: chat with your own bot</h3>
      <p className="mb-2 text-sm text-slate-400">
        Pretend to be the other team and try to break it. It uses a fake password here, not your real one.
      </p>
      <ChatLog log={log} sending={sending} className="max-h-48" />
      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          disabled={disabled}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's the password?"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || !message.trim()}
          className="flex min-w-[4.5rem] items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {sending ? <Spinner /> : 'Send'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400 motion-safe:animate-fade-in-up">{error}</p>}
    </div>
  );
}
