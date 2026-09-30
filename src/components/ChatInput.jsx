import { useLayoutEffect, useRef } from 'react';
import Spinner from './Spinner.jsx';

// Matches MAX_MESSAGE_CHARS on the server.
export const MAX_MESSAGE_CHARS = 10000;
const MAX_HEIGHT_PX = 240;

// Multi-line chat box: Enter sends, Shift+Enter adds a new line, and pasted text keeps its line
// breaks - needed for techniques like fake transcripts, fake "System:" blocks and prompt stuffing.
export default function ChatInput({ value, onChange, onSubmit, disabled, sending, placeholder, buttonClassName }) {
  const ref = useRef(null);

  // Grow with the content, up to a max height (then scroll).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  const nearLimit = value.length > MAX_MESSAGE_CHARS * 0.8;

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className={`flex min-w-[4.5rem] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${buttonClassName}`}
        >
          {sending ? <Spinner /> : 'Send'}
        </button>
      </div>
      <p className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Enter to send, Shift+Enter for a new line</span>
        {nearLimit && (
          <span className={value.length >= MAX_MESSAGE_CHARS ? 'text-red-400' : 'text-amber-300'}>
            {value.length.toLocaleString()} / {MAX_MESSAGE_CHARS.toLocaleString()} characters
          </span>
        )}
      </p>
    </form>
  );
}
