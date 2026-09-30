export default function MessageLog({ log, teams }) {
  if (!log) return null;

  return (
    <div className="space-y-6">
      {log.rounds.length === 0 && <p className="text-slate-400">No rounds yet.</p>}
      {log.rounds.map((round) => (
        <div key={round.roundNumber} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">
            Round {round.roundNumber} - {round.state}
            {round.outcome && ` (${round.outcome}${round.winnerTeamId ? `: ${teams?.[round.winnerTeamId]?.name}` : ''})`}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(round.teams).map(([teamId, t]) => (
              <div key={teamId} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
                <p className="font-medium">{teams?.[teamId]?.name || teamId}'s vault</p>
                {t.vault && (
                  <>
                    <p className="mt-1 font-mono text-xs text-slate-400">password: {t.vault.password}</p>
                    {t.vault.utilityPassed !== null && (
                      <p className={`mt-1 text-xs ${t.vault.utilityPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                        helpfulness test: {t.vault.utilityPassed ? 'passed' : 'failed'}
                        {t.vault.utilityReason ? ` - ${t.vault.utilityReason}` : ''}
                      </p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{t.vault.systemPrompt}</p>
                  </>
                )}
                <p className="mt-3 font-medium text-slate-200">Messages received (attacked by opponent):</p>
                {t.messages.length === 0 && <p className="text-slate-500">None</p>}
                {t.messages.map((m, i) => (
                  <div key={i} className="mt-2 border-t border-slate-800 pt-2">
                    <p className="text-slate-400">
                      Try {m.iteration}
                      {m.promptNumber ? `, msg ${m.promptNumber}` : ''}: {m.promptText}
                    </p>
                    <p className="text-indigo-300">reply: {m.replyText}</p>
                  </div>
                ))}
                <p className="mt-3 font-medium text-slate-200">Guesses made (by this team):</p>
                {t.guesses.length === 0 && <p className="text-slate-500">None</p>}
                {t.guesses.map((g, i) => (
                  <p key={i} className={g.correct ? 'text-emerald-400' : 'text-slate-400'}>
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
