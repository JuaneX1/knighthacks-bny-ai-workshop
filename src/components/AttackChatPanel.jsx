import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import ChatLog from './ChatLog.jsx';
import ChatInput from './ChatInput.jsx';

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
    if (!message.trim() || disabled || outOfMessages || sending) return;
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
    <div className="ui-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Chat with their bot</h3>
        <span className={`text-sm ${outOfMessages ? 'text-amber-300' : 'text-brand-blue/50'}`}>
          {attack.promptsLeft} of {attack.promptsPerAttempt} messages left
        </span>
      </div>
      <ChatLog
        log={log}
        sending={sending}
        emptyText="Say hi! The bot remembers everything you say during this try."
      />
      <ChatInput
        value={message}
        onChange={setMessage}
        onSubmit={send}
        disabled={disabled || outOfMessages}
        sending={sending}
        placeholder={outOfMessages ? 'No messages left - make a guess below' : 'Try to get the password...'}
        buttonClassName="bg-brand-blue/90 text-btn-ink hover:bg-brand-blue hover:shadow-[0_0_14px_rgb(var(--color-blue)/0.55)]"
      />
      {error && <p className="mt-2 text-sm text-brand-error motion-safe:animate-fade-in-up">{error}</p>}
    </div>
  );
}
