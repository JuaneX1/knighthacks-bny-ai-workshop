export default function FilterEditor({ filterMode, filterRegexList, onChange, disabled }) {
  function setMode(mode) {
    onChange({ filterMode: mode, filterRegexList });
  }

  function setPatterns(text) {
    const list = text.split('\n').map((s) => s.trim()).filter(Boolean);
    onChange({ filterMode, filterRegexList: list });
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">Output filter (optional)</label>
      <div className="flex gap-2">
        {['none', 'regex', 'llm'].map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => setMode(mode)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              filterMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {mode === 'none' ? 'None' : mode === 'regex' ? 'Regex list' : 'LLM filter'}
          </button>
        ))}
      </div>

      {filterMode === 'regex' && (
        <textarea
          disabled={disabled}
          value={filterRegexList.join('\n')}
          onChange={(e) => setPatterns(e.target.value)}
          placeholder="One regex pattern per line, e.g. password|secret"
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
        />
      )}

      {filterMode === 'llm' && (
        <p className="text-sm text-slate-400">
          A second AI call will check each reply and block it if it reveals the password.
        </p>
      )}
    </div>
  );
}
