import { useEffect, useState } from 'react';
import ShieldIcon from './icons/ShieldIcon.jsx';
import SwordIcon from './icons/SwordIcon.jsx';
import BrandEmblem from './icons/BrandEmblem.jsx';
import { dismissPhaseAnnouncement, usePhaseAnnouncement } from '../lib/phaseAnnouncer.js';
import { roundTitle } from '../lib/format.js';

const SHOW_MS = 1800;
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
  const { title, subtitle, Icon } = describe(announcement.status);

  return (
    <div
      role="alert"
      onClick={dismissPhaseAnnouncement}
      className={`fixed inset-0 z-[10001] flex cursor-pointer flex-col items-center justify-center gap-5 bg-void/95 px-6 text-center backdrop-blur-sm ${
        leaving ? 'motion-safe:animate-fade-out' : 'motion-safe:animate-fade-in-up'
      }`}
    >
      <Icon className="h-20 w-20 text-brand-blue drop-shadow-[0_0_18px_rgb(var(--color-blue)/0.7)] motion-safe:animate-slam-in" />
      <p className="text-sm uppercase tracking-[0.3em] text-brand-blue/70">{roundTitle(announcement.status)}</p>
      <h2
        className="text-5xl font-black uppercase tracking-wide text-ink motion-safe:animate-slam-in sm:text-7xl"
        style={{ textShadow: '0 0 28px rgb(var(--color-blue) / 0.6)' }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-lg text-brand-blue">{subtitle}</p>}
    </div>
  );
}

function describe(status) {
  switch (status.state) {
    case 'draft':
      return { title: 'Defend', subtitle: 'Build your bot', Icon: ShieldIcon };
    case 'attack':
      return { title: 'Attack', subtitle: 'Break their bot', Icon: SwordIcon };
    case 'game_ended':
      if (status.finalResult === 'draw') return { title: 'Draw', subtitle: 'The game ended level', Icon: BrandEmblem };
      return status.amIWinner
        ? { title: 'Victory', subtitle: 'Your team won the game', Icon: BrandEmblem }
        : { title: 'Game over', subtitle: 'Thanks for playing', Icon: BrandEmblem };
    default:
      return { title: 'Round over', subtitle: 'The results are in', Icon: BrandEmblem };
  }
}
