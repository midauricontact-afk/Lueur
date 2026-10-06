import { useMemo } from 'react';
import { THEME_BY_ID, type ThemeId } from '../../core/themes';

/** Petit générateur pseudo-aléatoire : le décor reste identique d'un affichage à l'autre. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

/** Décor animé du fond, propre à chaque thème. Uniquement des transformations CSS : léger pour la batterie. */
export function Backdrop({ themeId }: { themeId: ThemeId }) {
  const decor = THEME_BY_ID[themeId].decor;
  const items = useMemo(() => {
    const r = rng(themeId.length * 97 + 13);
    const n = decor === 'stars' ? 44 : decor === 'leaves' ? 9 : decor === 'bubbles' ? 14 : 0;
    return Array.from({ length: n }, () => ({
      x: r() * 100,
      y: r() * 100,
      s: 0.5 + r() * 1.5,
      d: r() * 8,
      t: 4 + r() * 8,
      rot: r() * 360,
    }));
  }, [decor, themeId]);

  return (
    <div className={`backdrop decor-${decor}`} aria-hidden="true">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      {decor === 'stars' &&
        items.map((s, i) => (
          <i key={i} className="star" style={{ left: `${s.x}%`, top: `${s.y * 0.8}%`, width: s.s * 2.2, height: s.s * 2.2, animationDelay: `${s.d}s`, animationDuration: `${s.t * 0.5 + 2}s` }} />
        ))}
      {decor === 'stars' && <i className="shooting" />}
      {decor === 'sun' && <div className="sun" />}
      {decor === 'leaves' &&
        items.map((l, i) => (
          <svg key={i} className="leaf" viewBox="0 0 24 24" style={{ left: `${l.x}%`, top: `${l.y}%`, width: 22 + l.s * 16, animationDelay: `${-l.d}s`, animationDuration: `${l.t + 10}s`, transform: `rotate(${l.rot}deg)` }}>
            <path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z M5 19L14 10" />
          </svg>
        ))}
      {decor === 'bubbles' &&
        items.map((b, i) => <i key={i} className="bubble" style={{ left: `${b.x}%`, width: 14 + b.s * 34, height: 14 + b.s * 34, animationDelay: `${-b.d * 2}s`, animationDuration: `${b.t + 12}s` }} />)}
      {decor === 'waves' && (
        <>
          <svg className="wave w1" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0 60 Q150 10 300 60 T600 60 T900 60 T1200 60 V120 H0z" />
          </svg>
          <svg className="wave w2" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0 70 Q150 110 300 70 T600 70 T900 70 T1200 70 V120 H0z" />
          </svg>
        </>
      )}
    </div>
  );
}
