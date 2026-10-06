import { MOOD_COLORS } from '../../core/themes';
import type { Mood } from '../../core/types';

/** Un petit visage dessiné en SVG (le même sur tous les téléphones), de la tristesse à la joie. */
export function MoodFace({ mood, size = 56, glow = false }: { mood: Mood; size?: number; glow?: boolean }) {
  const color = MOOD_COLORS[mood - 1];
  const id = `mf${mood}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={['Très bas', 'Bas', 'Moyen', 'Bien', 'Très bien'][mood - 1]}
      style={glow ? { filter: `drop-shadow(0 0 14px ${color}99)` } : undefined}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill={`url(#${id})`} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      <g fill="#2b2540" stroke="#2b2540" strokeLinecap="round" strokeLinejoin="round">
        {mood === 5 ? (
          <>
            <path d="M30 42 Q36 34 42 42" fill="none" strokeWidth="4" />
            <path d="M58 42 Q64 34 70 42" fill="none" strokeWidth="4" />
          </>
        ) : (
          <>
            <circle cx="36" cy="42" r={mood === 1 ? 4.2 : 4.6} stroke="none" />
            <circle cx="64" cy="42" r={mood === 1 ? 4.2 : 4.6} stroke="none" />
          </>
        )}
        {mood === 1 && (
          <>
            <path d="M27 38 L43 33" fill="none" strokeWidth="3.5" />
            <path d="M73 38 L57 33" fill="none" strokeWidth="3.5" />
            <path d="M33 70 Q50 52 67 70" fill="none" strokeWidth="4.5" />
          </>
        )}
        {mood === 2 && <path d="M35 66 Q50 57 65 66" fill="none" strokeWidth="4.5" />}
        {mood === 3 && <path d="M36 63 L64 63" fill="none" strokeWidth="4.5" />}
        {mood === 4 && <path d="M34 58 Q50 73 66 58" fill="none" strokeWidth="4.5" />}
        {mood === 5 && <path d="M31 55 Q50 82 69 55 Z" fill="#fff" strokeWidth="3.5" />}
      </g>
      {mood >= 4 && (
        <>
          <circle cx="26" cy="56" r="6" fill="#ff8aa8" opacity="0.4" />
          <circle cx="74" cy="56" r="6" fill="#ff8aa8" opacity="0.4" />
        </>
      )}
    </svg>
  );
}
