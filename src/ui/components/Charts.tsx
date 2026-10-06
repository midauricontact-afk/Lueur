import { motion } from 'framer-motion';
import { MOOD_COLORS } from '../../core/themes';
import { EMOTION_BY_ID } from '../../core/types';
import type { DayPoint } from '../../core/stats';
import { formatShort } from '../../core/dates';
import { MoodFace } from './MoodFace';
import type { Mood } from '../../core/types';

const W = 340;
const H = 150;
const PAD = { l: 26, r: 10, t: 12, b: 22 };

/** Courbe d'humeur : une courbe douce qui s'écrit à l'écran, un point coloré par jour rempli. */
export function MoodLine({ points }: { points: DayPoint[] }) {
  const n = points.length;
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const y = (v: number) => PAD.t + ((5 - v) * (H - PAD.t - PAD.b)) / 4;
  const dots = points.map((p, i) => (p.mood ? { i, x: x(i), y: y(p.mood), mood: p.mood as Mood, date: p.date } : null)).filter((d): d is NonNullable<typeof d> => !!d);

  // Courbe lissée (Catmull-Rom → Bézier) entre les jours remplis consécutifs.
  const segments: string[] = [];
  let run: typeof dots = [];
  const flush = () => {
    if (run.length > 1) {
      let d = `M ${run[0].x} ${run[0].y}`;
      for (let k = 0; k < run.length - 1; k++) {
        const p0 = run[k - 1] ?? run[k];
        const p1 = run[k];
        const p2 = run[k + 1];
        const p3 = run[k + 2] ?? p2;
        d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
      }
      segments.push(d);
    }
    run = [];
  };
  dots.forEach((d, k) => {
    if (run.length && d.i - run[run.length - 1].i > 1) flush();
    run.push(d);
    if (k === dots.length - 1) flush();
  });

  const labelEvery = n > 40 ? 14 : n > 14 ? 7 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Courbe d’humeur">
      <defs>
        <linearGradient id="moodStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MOOD_COLORS[4]} />
          <stop offset="0.5" stopColor={MOOD_COLORS[2]} />
          <stop offset="1" stopColor={MOOD_COLORS[0]} />
        </linearGradient>
      </defs>
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid-line" />
          <text x={PAD.l - 8} y={y(v) + 4} className="axis" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {segments.map((d, i) => (
        <motion.path key={d} d={d} fill="none" stroke="url(#moodStroke)" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.9, delay: i * 0.1, ease: 'easeOut' }} />
      ))}
      {dots.map((d, i) => (
        <motion.circle key={d.date} cx={d.x} cy={d.y} r={n > 40 ? 3 : 5} fill={MOOD_COLORS[d.mood - 1]} stroke="var(--bg1)" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.02, type: 'spring', stiffness: 400, damping: 18 }} style={{ transformOrigin: `${d.x}px ${d.y}px` }}>
          <title>{`${formatShort(d.date)} : ${d.mood}/5`}</title>
        </motion.circle>
      ))}
      {points.map((p, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={p.date} x={x(i)} y={H - 5} className="axis" textAnchor="middle">
            {Number(p.date.slice(8))}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Barres quotidiennes (énergie ou sommeil). */
export function DayBars({ points, field, color }: { points: DayPoint[]; field: 'energy' | 'sleep'; color: string }) {
  const n = points.length;
  const bw = Math.max(2, Math.min(18, (W - 10) / n - 3));
  return (
    <svg viewBox={`0 0 ${W} 70`} className="chart small" role="img" aria-label={field === 'energy' ? 'Énergie' : 'Sommeil'}>
      <line x1="0" x2={W} y1="62" y2="62" className="grid-line" />
      {points.map((p, i) => {
        const v = p[field];
        const cx = 5 + (i * (W - 10)) / Math.max(1, n - 1);
        const h = v === undefined ? 0 : Math.max(3, (v / 100) * 54);
        return (
          <motion.rect key={p.date} x={cx - bw / 2} width={bw} rx={Math.min(5, bw / 2)} fill={color} opacity={v === undefined ? 0 : 0.85} initial={{ y: 62, height: 0 }} animate={{ y: 62 - h, height: h }} transition={{ delay: i * 0.012, type: 'spring', stiffness: 160, damping: 20 }} />
        );
      })}
    </svg>
  );
}

/** Barres horizontales pour les émotions les plus fréquentes. */
export function EmotionBars({ items }: { items: { id: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="hbars">
      {items.map((it, i) => {
        const e = EMOTION_BY_ID[it.id];
        return (
          <div key={it.id} className="hbar">
            <span className="hbar-label">
              {e?.emoji} {e?.label ?? it.id}
            </span>
            <div className="hbar-track">
              <motion.div className={`hbar-fill ${e?.tone ?? 'neutral'}`} initial={{ width: 0 }} animate={{ width: `${(it.count / max) * 100}%` }} transition={{ delay: i * 0.06, duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="hbar-count">{it.count}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Répartition des humeurs sur la période. */
export function MoodDistribution({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="mood-dist">
      {counts.map((c, i) => (
        <div key={i} className="mood-dist-col">
          <span className="mood-dist-count">{c || ''}</span>
          <div className="mood-dist-track">
            <motion.div style={{ background: MOOD_COLORS[i] }} initial={{ height: 0 }} animate={{ height: `${(c / max) * 100}%` }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 140, damping: 18 }} />
          </div>
          <MoodFace mood={(i + 1) as Mood} size={26} />
        </div>
      ))}
    </div>
  );
}
