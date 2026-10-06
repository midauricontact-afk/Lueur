import { motion } from 'framer-motion';
import { useMemo } from 'react';

const SYMBOLS = ['✦', '✧', '•', '❋', '✺'];

/** Célébration légère : des étincelles qui montent et s'estompent. */
export function Confetti({ count = 34 }: { count?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 8 + Math.random() * 84,
        dx: (Math.random() - 0.5) * 140,
        delay: Math.random() * 0.5,
        dur: 1.8 + Math.random() * 1.6,
        size: 12 + Math.random() * 16,
        rot: (Math.random() - 0.5) * 220,
        symbol: SYMBOLS[i % SYMBOLS.length],
        hue: Math.random(),
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {parts.map((p) => (
        <motion.span
          key={p.id}
          className="spark"
          style={{ left: `${p.x}%`, fontSize: p.size, color: p.hue > 0.66 ? 'var(--accent)' : p.hue > 0.33 ? '#ffd98a' : '#ffffff' }}
          initial={{ y: 40, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ y: -260 - Math.random() * 120, x: p.dx, opacity: [0, 1, 1, 0], scale: [0.4, 1.1, 1, 0.7], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
}
