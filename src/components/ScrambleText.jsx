import { useEffect, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01';
const FRAME_MS = 35;

// Picks a random glyph to stand in for a letter that hasn't decoded yet.
function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

// The text with everything past `revealed` letters swapped for random glyphs (spaces stay spaces).
function scrambled(text, revealed) {
  return [...text].map((char, index) => (index < revealed || char === ' ' ? char : randomGlyph())).join('');
}

// Text that "decrypts" left to right out of random glyphs, like a password being cracked.
export default function ScrambleText({ text, durationMs = 700, delayMs = 0, className = '' }) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduceMotion ? text : scrambled(text, 0));

  useEffect(() => {
    if (reduceMotion) {
      setShown(text);
      return undefined;
    }
    const frames = Math.max(1, Math.round(durationMs / FRAME_MS));
    let frame = 0;
    let interval;
    setShown(scrambled(text, 0));
    // Each frame reveals a few more letters until the whole text is decoded.
    const start = setTimeout(() => {
      interval = setInterval(() => {
        frame += 1;
        setShown(scrambled(text, Math.floor((frame / frames) * text.length)));
        if (frame >= frames) clearInterval(interval);
      }, FRAME_MS);
    }, delayMs);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, durationMs, delayMs, reduceMotion]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
