import Bracket from '../Bracket.jsx';
import TeamName from '../TeamName.jsx';
import TeamStatusCard from './TeamStatusCard.jsx';
import { api } from '../../lib/api.js';

// What's happening right now: decisions waiting on the admin, the matchups, and every team's progress.
export default function LiveTab({ board, overview, run, busy, onReset }) {
  const teams = board.teams || {};
  const drawnSemis =
    board.stage === 'semis' && board.state === 'round_ended'
      ? board.matches.map((pair, i) => ({ pair, i })).filter(({ i }) => !board.finalists[i])
      : [];
  const finalDrawn = board.mode === 'tournament' && board.stage === 'final' && board.state === 'round_ended';

  return (
    <div className="space-y-6">
      {drawnSemis.map(({ pair, i }) => (
        <Decision key={i} title={`Semifinal ${i + 1} was a draw. Who goes through to the final?`}>
          {pair.map((teamId) => (
            <PickButton
              key={teamId}
              teamId={teamId}
              teams={teams}
              disabled={Boolean(busy)}
              onClick={() =>
                run((token) => api.admin.advance(i, teamId, token), `${teams[teamId]?.name || teamId} advances to the final`)
              }
            />
          ))}
        </Decision>
      ))}

      {finalDrawn && (
        <Decision title="The final was a draw. Who's the champion?">
          {board.matches[0].map((teamId) => (
            <PickButton
              key={teamId}
              teamId={teamId}
              teams={teams}
              disabled={Boolean(busy)}
              onClick={() =>
                run((token) => api.admin.endGame({ result: teamId }, token), `${teams[teamId]?.name || teamId} wins the game`)
              }
            />
          ))}
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run((token) => api.admin.endGame({ result: 'draw' }, token), 'Game ended in a draw')}
            className="btn-neutral py-2"
          >
            Call it a draw
          </button>
        </Decision>
      )}

      {board.mode === 'tournament' && (
        <section>
          <SectionTitle>Bracket</SectionTitle>
          <Bracket semis={board.lineup} finalists={board.finalists} winnerTeamId={board.winnerTeamId} teams={teams} />
        </section>
      )}

      <section>
        <SectionTitle>Teams</SectionTitle>
        {overview ? (
          overview.teams.length > 0 ? (
            <div className={`grid gap-4 sm:grid-cols-2 ${board.mode === 'tournament' ? 'xl:grid-cols-4' : ''}`}>
              {overview.teams.map((team) => (
                <TeamStatusCard key={team.teamId} team={team} state={board.state} teams={teams} />
              ))}
            </div>
          ) : (
            <p className="text-brand-blue/50">No teams saved yet. Add them in the Setup tab.</p>
          )
        ) : (
          <p className="text-brand-blue/50">Loading teams...</p>
        )}
      </section>

      <details className="ui-panel group p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-brand-blue/70 hover:text-brand-blue">
          Manual overrides
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm text-brand-blue/50">End the game now and declare a result.</p>
            <div className="flex flex-wrap gap-2">
              {(board.lineup || []).flat().map((teamId) => (
                <PickButton
                  key={teamId}
                  teamId={teamId}
                  teams={teams}
                  label="wins"
                  disabled={Boolean(busy) || board.state === 'game_ended'}
                  onClick={() =>
                    run((token) => api.admin.endGame({ result: teamId }, token), `${teams[teamId]?.name || teamId} wins the game`)
                  }
                />
              ))}
              <button
                type="button"
                disabled={Boolean(busy) || board.state === 'game_ended'}
                onClick={() => run((token) => api.admin.endGame({ result: 'draw' }, token), 'Game ended in a draw')}
                className="btn-neutral py-2 text-sm"
              >
                Declare draw
              </button>
            </div>
          </div>
          <div className="border-t border-brand-blue/15 pt-4">
            <p className="mb-2 text-sm text-brand-blue/50">Wipe all rounds and sign every player out.</p>
            <button type="button" onClick={onReset} disabled={Boolean(busy)} className="btn-danger py-2 text-sm">
              Reset game
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

function Decision({ title, children }) {
  return (
    <div className="rounded-lg border border-brand-warn/50 bg-brand-warn/10 p-4 motion-safe:animate-fade-in-up">
      <p className="mb-3 font-semibold text-brand-warn">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PickButton({ teamId, teams, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${teamId} ui-btn border border-team/50 bg-panel py-2 text-sm hover:border-team hover:bg-team/10`}
    >
      <TeamName teamId={teamId} teams={teams} />
      {label && <span className="text-ink/70">{label}</span>}
    </button>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-blue/60">{children}</h2>;
}
