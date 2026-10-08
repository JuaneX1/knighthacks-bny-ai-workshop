import { useScoreboard } from '../hooks/useScoreboard.js';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
import Bracket from '../components/Bracket.jsx';
import Timer from '../components/Timer.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import BrandEmblem from '../components/icons/BrandEmblem.jsx';
import { PHASE_LABELS, STAGE_LABELS } from '../lib/format.js';

export default function ScoreboardPage() {
  const { data: board, loading } = useScoreboard();

  if (loading || !board) {
    return <LoadingScreen label="Loading scoreboard" large />;
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-2 flex items-center gap-4">
        <BrandEmblem className="h-16 w-16" />
        <div>
          <h1 className="heading-glow text-5xl font-black tracking-tight">Prompt Wars</h1>
          <p className="text-sm uppercase tracking-widest text-brand-blue/60">Attack and Defend AI Chatbots</p>
        </div>
      </div>
      <p className="mb-8 flex items-baseline gap-4 text-3xl font-semibold text-brand-blue">
        {STAGE_LABELS[board.stage] && board.state !== 'game_ended' && <span>{STAGE_LABELS[board.stage]}:</span>}
        {PHASE_LABELS[board.state]}
        {board.phaseEndsAt && <Timer endsAt={board.phaseEndsAt} className="text-3xl" />}
      </p>

      {board.state === 'game_ended' ? (
        <div className="mb-10 rounded-2xl border border-brand-success/50 bg-brand-success/10 p-8 text-center motion-safe:animate-glow-good">
          <p className="text-2xl text-brand-success/90">
            {board.finalResult === 'draw' ? 'Final result: Draw' : 'Winner'}
          </p>
          {board.finalResult !== 'draw' && (
            <p className="mt-2 text-6xl font-black text-brand-success">
              {board.teams?.[board.winnerTeamId]?.name || board.winnerTeamId}
            </p>
          )}
        </div>
      ) : (
        board.mode === 'duel' && (
          <div className="mb-10 grid grid-cols-2 gap-6 text-center">
            {board.lineup.flat().map((teamId) => (
              <div key={teamId} className="ui-panel p-6">
                <p className="text-4xl font-bold text-ink">{board.teams[teamId].name}</p>
              </div>
            ))}
          </div>
        )
      )}

      {board.mode === 'tournament' && (
        <div className="mb-10">
          <Bracket
            semis={board.lineup}
            finalists={board.finalists}
            winnerTeamId={board.winnerTeamId}
            teams={board.teams}
          />
        </div>
      )}

      <RoundHistoryList rounds={board.rounds} teams={board.teams} />
    </div>
  );
}
