import TeamName from './TeamName.jsx';
import { STAGE_LABELS, matchLabel, matchResultLabel } from '../lib/format.js';

export default function MessageLog({ log, teams }) {
  if (!log) return null;

  return (
    <div className="space-y-6">
      {log.rounds.length === 0 && <p className="text-brand-blue/50">No rounds yet.</p>}
      {log.rounds.map((round) => (
        <div key={round.roundNumber} className="ui-panel p-4">
          <h3 className="text-lg font-semibold text-ink">
            Round {round.roundNumber}
            {STAGE_LABELS[round.stage] && ` · ${STAGE_LABELS[round.stage]}`} - {round.state}
          </h3>
          <ul className="mb-3 text-sm text-brand-blue/60">
            {round.results.map((result) => (
              <li key={result.teams.join('-')}>
                {matchLabel(result.teams, teams)}: {matchResultLabel(result, teams)}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(round.teams).map(([teamId, t]) => (
              <div key={teamId} className={`${teamId} rounded border border-l-4 border-brand-blue/20 border-l-team/60 bg-well p-3 text-sm`}>
                <p className="font-medium text-ink">
                  <TeamName teamId={teamId} teams={teams} />
                  's vault
                </p>
                {t.vault && (
                  <>
                    <p className="mt-1 font-mono text-xs text-brand-blue/50">password: {t.vault.password}</p>
                    {t.vault.utilityPassed !== null && (
                      <p className={`mt-1 text-xs ${t.vault.utilityPassed ? 'text-brand-success' : 'text-brand-error'}`}>
                        helpfulness test: {t.vault.utilityPassed ? 'passed' : 'failed'}
                        {t.vault.utilityReason ? ` - ${t.vault.utilityReason}` : ''}
                      </p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-ink/70">{t.vault.systemPrompt}</p>
                  </>
                )}
                <p className="mt-3 font-medium text-ink/90">
                  Messages sent (attacking {teams?.[t.opponentTeamId]?.name || t.opponentTeamId}'s bot):
                </p>
                {(t.attacks || []).length === 0 && <p className="text-brand-blue/40">None</p>}
                {(t.attacks || []).map((m, i) => (
                  <div key={i} className="mt-2 border-t border-brand-blue/20 pt-2">
                    <p className="text-brand-blue/50">
                      Try {m.iteration}
                      {m.promptNumber ? `, msg ${m.promptNumber}` : ''}:{' '}
                      <span className="whitespace-pre-wrap break-words">{m.promptText}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-brand-blue/90">their bot replied: {m.replyText}</p>
                  </div>
                ))}
                <p className="mt-3 font-medium text-ink/90">Password guesses:</p>
                {t.guesses.length === 0 && <p className="text-brand-blue/40">None</p>}
                {t.guesses.map((g, i) => (
                  <p key={i} className={g.correct ? 'text-brand-success' : 'text-brand-blue/50'}>
                    Try {g.iteration}: {g.guess} {g.correct ? '(correct)' : ''}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
