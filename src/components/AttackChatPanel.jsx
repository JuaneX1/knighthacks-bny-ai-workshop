import { useState } from 'react';
import { api } from '../lib/api.js';

export default function AttackChatPanel({ chatUsed, chatRemaining, disabled, onChatUsedChange }) {
  const [message, setMessage] = useState('');
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function send(e) {
    e.preventDefault();
    if (!message.trim() || disabled || chatRemaining <= 0) return;
    setSending(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    try {
      const result = await api.attackChat(userMessage);
      setLog((l) => [...l, { role: 'user', text: userMessage }, { role: 'assistant', text: result.reply }]);
      onChatUsedChange(result.chatUsed, result.chatRemaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Attack chat</h3>
        <span className="text-sm text-slate-400">{chatUsed} / 3 attempts used</span>
      </div>
      <div className="mb-3 max-h-72 space-y-2 overflow-y-auto text-sm">
        {log.length === 0 && <p className="text-slate-500">No messages sent yet.</p>}
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
          disabled={disabled || chatRemaining <= 0}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          placeholder={chatRemaining > 0 ? 'Try to extract the password...' : 'No attempts remaining'}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || chatRemaining <= 0 || !message.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
