import ShieldIcon from './ShieldIcon.jsx';
import SwordIcon from './SwordIcon.jsx';

// Shield-and-crossed-sword mark used beside the "Prompt Wars" title.
export default function BrandEmblem({ className = 'h-10 w-10' }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <ShieldIcon className="absolute inset-0 h-full w-full text-brand-blue/70 drop-shadow-[0_0_8px_rgb(var(--color-blue)/0.5)]" />
      <SwordIcon className="relative h-[68%] w-[68%] rotate-45 text-brand-blue drop-shadow-[0_0_6px_rgb(var(--color-blue)/0.6)]" />
    </span>
  );
}
