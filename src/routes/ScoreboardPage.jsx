import { useScoreboard } from '../hooks/useScoreboard.js';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
import Bracket from '../components/Bracket.jsx';
import Timer from '../components/Timer.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import BrandEmblem from '../components/icons/BrandEmblem.jsx';
import TeamName from '../components/TeamName.jsx';
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
        <WinnerBanner board={board} />
      ) : (
        board.mode === 'duel' && (
          <div className="mb-10 grid grid-cols-2 gap-6 text-center">
            {board.lineup.flat().map((teamId) => (
              <div key={teamId} className={`${teamId} ui-panel border-team/50 p-6`}>
                <TeamName teamId={teamId} teams={board.teams} className="text-4xl font-bold" />
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

// End-of-game banner, lit in the winning team's color (or neutral for a draw).
function WinnerBanner({ board }) {
  if (board.finalResult === 'draw') {
    return (
      <div className="ui-panel mb-10 p-8 text-center">
        <p className="text-4xl font-black text-ink">Final result: Draw</p>
      </div>
    );
  }
  return (
    <div
      className={`${board.winnerTeamId} mb-10 rounded-2xl border border-team/60 bg-team/10 p-8 text-center shadow-[0_0_40px_-8px_rgb(var(--team)/0.6)]`}
    >
      <p className="text-2xl uppercase tracking-widest text-team/90">Winner</p>
      <TeamName teamId={board.winnerTeamId} teams={board.teams} className="mt-2 text-6xl font-black" />
    </div>
  );
}
