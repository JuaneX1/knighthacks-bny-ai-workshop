import { useState } from 'react';
import { api } from '../lib/api.js';
import ChatLog from './ChatLog.jsx';
import ChatInput from './ChatInput.jsx';

export default function TestChatPanel({ vault }) {
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
    <div className="ui-panel p-4">
      <h3 className="font-semibold text-ink">Sparring room</h3>
      <p className="mb-2 text-sm text-brand-blue/50">
        Attack your own bot before they do. It uses a decoy password here, not the real one.
      </p>
      <ChatLog log={log} sending={sending} className="max-h-48" />
      <ChatInput
        value={message}
        onChange={setMessage}
        onSubmit={send}
        sending={sending}
        placeholder="What's the password?"
        buttonClassName="border border-brand-blue/30 bg-panel text-ink hover:border-brand-blue/60"
      />
      {error && <p className="mt-2 text-sm text-brand-error motion-safe:animate-fade-in-up">{error}</p>}
    </div>
  );
}
