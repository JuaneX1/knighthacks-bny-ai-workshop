import { useState } from 'react';
import TeamName from '../TeamName.jsx';

const VAULT_LABELS = {
  empty: { text: 'Nothing written yet', tone: 'text-brand-blue/50' },
  untested: { text: 'Saved, not tested', tone: 'text-brand-warn' },
  passed: { text: 'Passed the helpfulness test', tone: 'text-brand-success' },
  failed: { text: 'Failed the helpfulness test', tone: 'text-brand-error' },
};

// One team at a glance: join code, whether a device has joined, and how their round is going.
export default function TeamStatusCard({ team, state, teams }) {
  const { teamId, joinCode, joined, playing, round } = team;
  const inRound = state === 'draft' || state === 'attack';

  return (
    <div className={`${teamId} ui-panel border-l-4 border-l-team p-4`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <TeamName teamId={teamId} teams={teams} name={team.name} className="text-lg font-bold" />
        <JoinedDot joined={joined} />
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-brand-blue/50">Code</span>
        <span className="font-mono font-semibold tracking-widest text-ink">{joinCode}</span>
        <CopyButton text={joinCode} />
      </div>

      {inRound && !playing && <p className="text-sm text-brand-blue/50">Knocked out, watching</p>}
      {inRound && round && (
        <div className="space-y-2 border-t border-brand-blue/15 pt-3 text-sm">
          <p className="text-brand-blue/50">
            vs <TeamName teamId={round.opponentTeamId} teams={teams} />
          </p>
          <Row label="Bot">
            {round.vaultCracked ? (
              <span className="font-semibold text-brand-error">Cracked by the opponent</span>
            ) : (
              <span className={VAULT_LABELS[round.vault].tone}>{VAULT_LABELS[round.vault].text}</span>
            )}
          </Row>
          {state === 'attack' && (
            <Row label="Attack">
              <AttackProgress round={round} teams={teams} />
            </Row>
          )}
        </div>
      )}
    </div>
  );
}

function AttackProgress({ round, teams }) {
  const { attack, crackedOpponent } = round;
  if (crackedOpponent) {
    return (
      <span className="font-semibold text-brand-success">
        Cracked {teams?.[round.opponentTeamId]?.name || 'the opponent'}
      </span>
    );
  }
  // Tries are unlimited, so there's no "out of tries" state - just where they are in the current one.
  return (
    <span className="whitespace-nowrap text-ink/80">
      Try {attack.attempt} · {attack.promptsUsed}/{attack.promptsPerAttempt} msgs
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-brand-blue/50">{label}</span>
      {children}
    </div>
  );
}

function JoinedDot({ joined }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-xs ${joined ? 'text-brand-success' : 'text-brand-blue/40'}`}>
      <span className="relative flex h-2 w-2">
        {joined && <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${joined ? 'bg-current' : 'border border-current'}`} />
      </span>
      {joined ? 'Joined' : 'Not joined'}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // clipboard blocked; the code is on screen anyway
        }
      }}
      className="rounded px-1.5 py-0.5 text-xs text-brand-blue/60 transition hover:bg-brand-blue/10 hover:text-brand-blue"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
