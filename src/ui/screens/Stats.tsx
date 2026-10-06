import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { average, emotionCounts, entriesInRange, moodDistribution, seriesEndingAt, streakInfo } from '../../core/stats';
import { addDays } from '../../core/dates';
import { MOOD_COLORS } from '../../core/themes';
import { MOOD_LABELS, type Mood } from '../../core/types';
import { store } from '../../state/store';
import { DayBars, EmotionBars, MoodDistribution, MoodLine } from '../components/Charts';
import { MoodFace } from '../components/MoodFace';
import { Segmented } from '../components/primitives';
import { IconFlame } from '../icons';

/** Corrélation de Pearson entre deux séries (pour une remarque simple, jamais un diagnostic). */
function correlation(pairs: [number, number][]): number | null {
  if (pairs.length < 7) return null;
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function StatsScreen() {
  const { entries, today } = store.use();
  const [days, setDays] = useState<7 | 30 | 90>(7);

  const from = addDays(today, -(days - 1));
  const range = useMemo(() => entriesInRange(entries, from, today), [entries, from, today]);
  const series = useMemo(() => seriesEndingAt(entries, today, days), [entries, today, days]);
  const avgMood = average(range.map((e) => e.mood));
  const avgEnergy = average(range.map((e) => e.energy));
  const avgSleep = average(range.map((e) => e.sleep));
  const streak = useMemo(() => streakInfo(entries.map((e) => e.date), today), [entries, today]);
  const emotions = useMemo(() => emotionCounts(range).slice(0, 6), [range]);
  const dist = useMemo(() => moodDistribution(range), [range]);

  const insight = useMemo(() => {
    const r = correlation(range.map((e) => [e.sleep, e.mood]));
    if (r !== null && r >= 0.4) return '🌙 Les soirs où tu as mieux dormi, ton humeur a tendance à être plus haute.';
    if (r !== null && r <= -0.4) return '🌙 Curieusement, ton humeur ne suit pas ton sommeil en ce moment.';
    const e = correlation(range.map((x) => [x.energy, x.mood]));
    if (e !== null && e >= 0.4) return '⚡ Ton énergie et ton humeur vont souvent ensemble.';
    return null;
  }, [range]);

  return (
    <div className="screen">
      <header className="cal-head">
        <h1>Statistiques</h1>
      </header>

      <Segmented
        value={days}
        options={[
          { id: 7, label: '7 jours' },
          { id: 30, label: '30 jours' },
          { id: 90, label: '3 mois' },
        ]}
        onChange={setDays}
      />

      {range.length === 0 ? (
        <div className="card glass center empty">
          <p style={{ fontSize: 40, margin: 0 }}>📈</p>
          <p className="muted">Remplis quelques soirées et tes courbes apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <motion.div className="card glass stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MoodFace mood={Math.round(avgMood ?? 3) as Mood} size={46} />
              <strong>{avgMood?.toFixed(1)} / 5</strong>
              <span className="muted small">Humeur moyenne · {MOOD_LABELS[Math.round(avgMood ?? 3) as Mood]}</span>
            </motion.div>
            <motion.div className="card glass stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <span className={`flame${streak.current > 0 ? ' lit' : ''}`}>
                <IconFlame width={36} height={36} />
              </span>
              <strong>{streak.current} jour{streak.current > 1 ? 's' : ''}</strong>
              <span className="muted small">Série en cours · record {streak.best}</span>
            </motion.div>
          </div>

          <section className="card glass">
            <h3>Courbe d’humeur</h3>
            <p className="muted small">
              {range.length} soirée{range.length > 1 ? 's' : ''} remplie{range.length > 1 ? 's' : ''} sur {days} jours
            </p>
            <MoodLine points={series} />
          </section>

          <section className="card glass">
            <h3>Énergie</h3>
            <p className="muted small">Moyenne : {avgEnergy !== null ? `${Math.round(avgEnergy)} %` : '—'}</p>
            <DayBars points={series} field="energy" color={MOOD_COLORS[3]} />
            <h3 style={{ marginTop: 14 }}>Sommeil</h3>
            <p className="muted small">Moyenne : {avgSleep !== null ? `${Math.round(avgSleep)} %` : '—'}</p>
            <DayBars points={series} field="sleep" color={MOOD_COLORS[1]} />
          </section>

          {insight && (
            <motion.p className="card glass insight" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {insight}
            </motion.p>
          )}

          <section className="card glass">
            <h3>Tes humeurs</h3>
            <MoodDistribution counts={dist} />
          </section>

          {emotions.length > 0 && (
            <section className="card glass">
              <h3>Émotions les plus fréquentes</h3>
              <EmotionBars items={emotions} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
