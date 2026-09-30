// Dependency-free confetti burst using the Web Animations API. No-op under reduced motion.
const COLORS = ['#34d399', '#6ee7b7', '#818cf8', '#fbbf24', '#f472b6'];

export function burstConfetti({ count = 80, originY = 0.35 } = {}) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:50';
  document.body.appendChild(layer);

  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * originY;
  const animations = [];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;left:${startX}px;top:${startY}px;width:${size}px;height:${size * 0.4}px;background:${COLORS[i % COLORS.length]};border-radius:1px`;
    layer.appendChild(piece);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 120 + Math.random() * 260;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 120;
    const spin = (Math.random() - 0.5) * 1080;

    const animation = piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 380}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1200 + Math.random() * 800, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' }
    );
    animations.push(animation.finished.catch(() => {}));
  }

  Promise.all(animations).then(() => layer.remove());
}
