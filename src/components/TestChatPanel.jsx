import { useState } from 'react';
import { api } from '../lib/api.js';

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
    try {
      const { reply } = await api.testChat({ ...vault, message: userMessage });
      setLog((l) => [...l, { role: 'user', text: userMessage }, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-2 font-semibold">Test chat (uses a sample password, not the real one)</h3>
      <div className="mb-3 max-h-48 space-y-2 overflow-y-auto text-sm">
        {log.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-slate-300' : 'text-indigo-300'}>
            <span className="font-medium">{m.role === 'user' ? 'You: ' : 'Bot: '}</span>
            {m.text}
          </p>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          disabled={disabled}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Try a message against your own vault..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || !message.trim()}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
