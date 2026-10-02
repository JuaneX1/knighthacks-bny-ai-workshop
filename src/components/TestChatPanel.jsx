import { useState } from 'react';
import { api } from '../lib/api.js';
import ChatLog from './ChatLog.jsx';
import ChatInput from './ChatInput.jsx';

export default function TestChatPanel({ vault, disabled }) {
  const [message, setMessage] = useState('');
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function send(e) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    setLog((l) => [...l, { role: 'user', text: userMessage }]);
    try {
      const { reply, guarded } = await api.testChat({ ...vault, message: userMessage });
      const note = guarded
        ? 'Your bot almost said the password! The game caught it and swapped in this reply. Make your rules stronger.'
        : null;
      setLog((l) => [...l, { role: 'assistant', text: reply, note }]);
    } catch (err) {
      setLog((l) => l.slice(0, -1));
      setMessage(userMessage);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ui-panel p-4">
      <h3 className="font-semibold text-ink">Practice: chat with your own bot</h3>
      <p className="mb-2 text-sm text-brand-blue/50">
        Pretend to be the other team and try to break it. It uses a fake password here, not your real one.
      </p>
      <ChatLog log={log} sending={sending} className="max-h-48" />
      <ChatInput
        value={message}
        onChange={setMessage}
        onSubmit={send}
        disabled={disabled}
        sending={sending}
        placeholder="What's the password?"
        buttonClassName="border border-brand-blue/30 bg-panel text-ink hover:border-brand-blue/60"
      />
      {error && <p className="mt-2 text-sm text-brand-error motion-safe:animate-fade-in-up">{error}</p>}
    </div>
  );
}
