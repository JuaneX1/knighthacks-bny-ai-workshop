import { useEffect, useState } from 'react';
import TeamName from './TeamName.jsx';
import TrophyIcon from './icons/TrophyIcon.jsx';

// How long each line segment takes to draw; segments of one path start one after another.
const DRAW_MS = 300;
const WINNER_GLOW = 'drop-shadow-[0_0_8px_rgb(var(--team)/0.6)]';

// Knockout bracket: the two semifinals, the final, then the champion, joined by bracket lines.
// When a match is decided, the winner's line draws itself onward in their team color.
export default function Bracket({ semis, finalists, winnerTeamId, teams }) {
  const finalTeams = [finalists?.[0] || null, finalists?.[1] || null];
  const finalSet = Boolean(finalTeams[0] && finalTeams[1]);

  // Lines start undrawn and animate in after the first paint, so they also draw on page load.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(id);
  }, []);
  const semi1Drawn = drawn && Boolean(finalTeams[0]);
  const semi2Drawn = drawn && Boolean(finalTeams[1]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)_2.5rem_minmax(0,0.85fr)]">
      <div className="grid md:grid-rows-2">
        {semis.map((pair, i) => (
          // Equal rows with padding instead of a gap, so each card's center sits at exactly 25% / 75%.
          <div key={pair.join('-')} className="flex items-center py-2">
            <MatchCard
              label={`Semifinal ${i + 1}`}
              teamIds={pair}
              winnerTeamId={finalists?.[i] || null}
              teams={teams}
            />
          </div>
        ))}
      </div>

      <div className="relative hidden md:block" aria-hidden="true">
        {/* Semifinal 1: across, then down to the middle. */}
        <Segment drawn={semi1Drawn} teamId={finalTeams[0]} className="left-0 top-[25%] w-1/2" />
        <Segment drawn={semi1Drawn} teamId={finalTeams[0]} vertical delay={DRAW_MS} className="left-1/2 top-[25%] h-1/4" />
        {/* Semifinal 2: across, then up to the middle. */}
        <Segment drawn={semi2Drawn} teamId={finalTeams[1]} className="left-0 top-[75%] w-1/2" />
        <Segment drawn={semi2Drawn} teamId={finalTeams[1]} vertical up delay={DRAW_MS} className="left-1/2 top-1/2 h-1/4" />
        {/* Into the final once both finalists are known. */}
        <Segment drawn={drawn && finalSet} delay={DRAW_MS * 2} className="left-1/2 top-1/2 w-1/2" />
      </div>
      <MobileConnector drawn={drawn && finalSet} />

      <div className="flex items-center py-2">
        <MatchCard label="Final" teamIds={finalTeams} winnerTeamId={winnerTeamId} teams={teams} />
      </div>

      <div className="relative hidden md:block" aria-hidden="true">
        <Segment drawn={drawn && Boolean(winnerTeamId)} teamId={winnerTeamId} className="left-0 top-1/2 w-full" />
      </div>
      <MobileConnector drawn={drawn && Boolean(winnerTeamId)} teamId={winnerTeamId} />

      <div className="flex items-center py-2">
        <ChampionCard winnerTeamId={winnerTeamId} teams={teams} drawn={drawn} />
      </div>
    </div>
  );
}

// One straight piece of bracket line: a dim dashed track, with a solid line that draws over it.
// Colored by the team it carries forward, or neutral when it isn't one team's path.
function Segment({ drawn, teamId, vertical = false, up = false, delay = 0, className }) {
  const fill = teamId ? `${teamId} bg-team shadow-[0_0_10px_rgb(var(--team)/0.75)]` : 'bg-ink/60';
  const origin = vertical ? (up ? 'origin-bottom' : 'origin-top') : 'origin-left';
  const hidden = vertical ? 'scale-y-0' : 'scale-x-0';
  return (
    <div className={`absolute ${vertical ? '-ml-px w-0.5' : '-mt-px h-0.5'} ${className}`}>
      <div className={`absolute inset-0 border-dashed border-brand-blue/25 ${vertical ? 'border-l-2' : 'border-t-2'}`} />
      <div
        className={`absolute inset-0 rounded-full ease-out [transition-property:transform] motion-reduce:transition-none ${fill} ${origin} ${
          drawn ? 'scale-100' : hidden
        }`}
        style={{ transitionDuration: `${DRAW_MS}ms`, transitionDelay: drawn ? `${delay}ms` : '0ms' }}
      />
    </div>
  );
}

// On phones the bracket stacks, so stages are joined by a short vertical line instead.
function MobileConnector({ drawn, teamId }) {
  return (
    <div className="relative mx-auto h-6 w-0.5 md:hidden" aria-hidden="true">
      <Segment drawn={drawn} teamId={teamId} vertical className="left-px top-0 h-full" />
    </div>
  );
}

// One match box; the winner is highlighted in their team color and the loser dimmed once there's a result.
function MatchCard({ label, teamIds, winnerTeamId, teams }) {
  return (
    <div className="ui-panel w-full p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-brand-blue/50">{label}</p>
      {teamIds.map((id, i) => (
        <p key={id || i} className={`text-xl font-bold transition-opacity duration-500 ${teamTone(id, winnerTeamId)}`}>
          {id ? <TeamName teamId={id} teams={teams} className={id === winnerTeamId ? WINNER_GLOW : ''} /> : 'TBD'}
        </p>
      ))}
    </div>
  );
}

// Text treatment for a team line in a match box.
function teamTone(teamId, winnerTeamId) {
  if (!teamId) return 'text-brand-blue/30';
  if (!winnerTeamId || teamId === winnerTeamId) return '';
  return 'opacity-40';
}

// The end of the bracket: empty until the final is won, then lit up in the champion's color.
function ChampionCard({ winnerTeamId, teams, drawn }) {
  const won = drawn && Boolean(winnerTeamId);
  return (
    <div
      className={`${won ? winnerTeamId : ''} ui-panel w-full p-4 text-center transition-all duration-500 ${
        won ? 'border-team/70 shadow-[0_0_28px_-4px_rgb(var(--team)/0.7)]' : ''
      }`}
      style={{ transitionDelay: won ? `${DRAW_MS}ms` : '0ms' }}
    >
      <TrophyIcon className={`mx-auto mb-1 h-8 w-8 ${won ? 'text-team' : 'text-brand-blue/30'}`} />
      <p className="mb-1 text-xs uppercase tracking-widest text-brand-blue/50">Champion</p>
      {won ? (
        // The trophy already marks the slot, so the name goes without its team icon and can wrap cleanly.
        <p className="break-words text-xl font-black text-team motion-safe:animate-fade-in-up">
          {teams?.[winnerTeamId]?.name || winnerTeamId}
        </p>
      ) : (
        <p className="text-xl font-bold text-brand-blue/30">TBD</p>
      )}
    </div>
  );
}
