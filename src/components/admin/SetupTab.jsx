import TeamIcon from '../icons/TeamIcon.jsx';
import { SectionTitle } from './LiveTab.jsx';
import { api } from '../../lib/api.js';
import { TEAM_IDS } from '../../../lib/keys.js';

const MODES = [
  { mode: 'duel', title: 'Duel', detail: '2 teams. Rounds repeat until one team wins.' },
  { mode: 'tournament', title: 'Tournament', detail: '4 teams. Semifinals (1 vs 2, 3 vs 4) at once, then a final.' },
];

// Everything decided before (or between) rounds: mode, teams, and round settings.
export default function SetupTab({
  board,
  run,
  busy,
  setTeamsForm,
  onSaveTeams,
  teamsDirty,
  visibleTeams,
  settings,
  setSettings,
}) {
  const modeLocked = board.state !== 'lobby';

  function updateTeam(i, field, value) {
    setTeamsForm((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Game mode</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map(({ mode, title, detail }) => {
            const active = board.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                disabled={modeLocked || Boolean(busy) || active}
                onClick={() => run((token) => api.admin.setMode(mode, token), `Switched to ${title.toLowerCase()} mode`)}
                className={`ui-panel p-4 text-left transition disabled:cursor-default ${
                  active ? 'border-brand-blue bg-brand-blue/10' : 'enabled:hover:border-brand-blue/60'
                } ${modeLocked && !active ? 'opacity-40' : ''}`}
                aria-pressed={active}
              >
                <p className="font-bold text-ink">
                  {title}
                  {active && <span className="ml-2 text-xs font-semibold uppercase text-brand-blue">Current</span>}
                </p>
                <p className="mt-1 text-sm text-brand-blue/60">{detail}</p>
              </button>
            );
          })}
        </div>
        {modeLocked && (
          <p className="mt-2 text-xs text-brand-warn">The game has started. Reset it to switch modes.</p>
        )}
      </section>

      <section>
        <SectionTitle>Teams</SectionTitle>
        <div className="ui-panel space-y-3 p-4">
          <div className="hidden grid-cols-[2rem_1fr_9rem] gap-3 text-xs uppercase tracking-widest text-brand-blue/40 sm:grid">
            <span />
            <span>Display name</span>
            <span>Join code</span>
          </div>
          {visibleTeams.map((t, i) => (
            <div key={TEAM_IDS[i]} className={`${TEAM_IDS[i]} grid grid-cols-[2rem_1fr] items-center gap-3 sm:grid-cols-[2rem_1fr_9rem]`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-team/15 text-team" title={`Team slot ${i + 1}`}>
                <TeamIcon teamId={TEAM_IDS[i]} className="h-4 w-4" />
              </span>
              <input
                value={t.name}
                onChange={(e) => updateTeam(i, 'name', e.target.value)}
                placeholder="Display name"
                aria-label={`Team ${i + 1} name`}
                className="ui-input py-1.5 text-sm"
              />
              <input
                value={t.joinCode}
                onChange={(e) => updateTeam(i, 'joinCode', e.target.value)}
                placeholder="Join code"
                aria-label={`Team ${i + 1} join code`}
                className="ui-input col-start-2 py-1.5 font-mono text-sm uppercase tracking-widest sm:col-start-auto"
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-blue/15 pt-3">
            <p className="text-xs text-brand-blue/40">
              Each team keeps its color and icon. Renaming or changing a code is safe at any time.
            </p>
            <button
              type="button"
              disabled={!teamsDirty || Boolean(busy)}
              onClick={onSaveTeams}
              className="btn-primary py-2 text-sm"
            >
              {teamsDirty ? 'Save teams' : 'Saved'}
            </button>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Round settings</SectionTitle>
        <div className="ui-panel p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Defend phase"
              unit="min"
              step={0.5}
              min={0.5}
              value={settings.draftMin}
              onChange={(v) => setSettings((s) => ({ ...s, draftMin: v }))}
            />
            <NumberField
              label="Attack phase"
              unit="min"
              step={0.5}
              min={0.5}
              value={settings.attackMin}
              onChange={(v) => setSettings((s) => ({ ...s, attackMin: v }))}
            />
            <NumberField
              label="Messages per try"
              step={1}
              min={1}
              max={20}
              value={settings.promptsPerAttempt}
              onChange={(v) => setSettings((s) => ({ ...s, promptsPerAttempt: v }))}
            />
          </div>
          <p className="mt-3 text-xs text-brand-blue/40">
            Used from the next round you start. Timers are a guide: when one runs out, teams keep playing until you move
            on from the control bar.
          </p>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, unit, value, onChange, ...props }) {
  return (
    <label className="block text-sm text-brand-blue/60">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="ui-input w-full py-1.5 text-sm"
          {...props}
        />
        {unit && <span className="text-brand-blue/40">{unit}</span>}
      </span>
    </label>
  );
}
