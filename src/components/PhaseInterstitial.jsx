import { useEffect, useState } from 'react';
import ShieldIcon from './icons/ShieldIcon.jsx';
import SwordIcon from './icons/SwordIcon.jsx';
import BrandEmblem from './icons/BrandEmblem.jsx';
import ScrambleText from './ScrambleText.jsx';
import { dismissPhaseAnnouncement, usePhaseAnnouncement } from '../lib/phaseAnnouncer.js';
import { roundTitle } from '../lib/format.js';

const SHOW_MS = 2200;
const FADE_MS = 300;

// Full-screen card announcing a new phase, so nobody misses the switch from Defend to Attack.
export default function PhaseInterstitial() {
  const announcement = usePhaseAnnouncement();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!announcement) return undefined;
    setLeaving(false);
    const fade = setTimeout(() => setLeaving(true), SHOW_MS);
    const done = setTimeout(dismissPhaseAnnouncement, SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [announcement]);

  if (!announcement) return null;
  const { title, Icon } = describe(announcement.status);

  return (
    <div
      role="alert"
      onClick={dismissPhaseAnnouncement}
      className={`fixed inset-0 z-[10001] flex cursor-pointer flex-col items-center justify-center gap-5 bg-void px-6 text-center ${
        leaving ? 'motion-safe:animate-fade-out' : 'motion-safe:animate-reveal-sweep'
      }`}
    >
      <Icon className="h-20 w-20 text-brand-blue drop-shadow-[0_0_18px_rgb(var(--color-blue)/0.7)] motion-safe:animate-slam-in" />
      <p className="text-sm uppercase tracking-[0.3em] text-brand-blue/70 motion-safe:animate-fade-in-up [animation-delay:200ms]">
        {roundTitle(announcement.status)}
      </p>
      <h2
        className="text-5xl font-black uppercase tracking-wide text-ink motion-safe:animate-glitch-in [animation-delay:150ms] sm:text-7xl"
        style={{ textShadow: '0 0 28px rgb(var(--color-blue) / 0.6)' }}
      >
        <ScrambleText text={title} delayMs={150} durationMs={500} />
      </h2>
    </div>
  );
}

function describe(status) {
  switch (status.state) {
    case 'draft':
      return { title: 'Defend', Icon: ShieldIcon };
    case 'attack':
      return { title: 'Attack', Icon: SwordIcon };
    case 'game_ended':
      if (status.finalResult === 'draw') return { title: 'Draw', Icon: BrandEmblem };
      return status.amIWinner
        ? { title: 'Victory', Icon: BrandEmblem }
        : { title: 'Game over', Icon: BrandEmblem };
    default:
      return { title: 'Round over', Icon: BrandEmblem };
  }
}
