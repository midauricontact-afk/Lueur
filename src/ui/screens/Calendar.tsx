import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { sfx } from '../../audio/sounds';
import { MONTHS, WEEKDAYS_SHORT, monthLabel, monthMatrix } from '../../core/dates';
import { average } from '../../core/stats';
import { MOOD_COLORS } from '../../core/themes';
import { store } from '../../state/store';
import { useAppUI } from '../ctx';
import { IconBack, IconChevron, IconSearch } from '../icons';
import { MoodFace } from '../components/MoodFace';
import type { Mood } from '../../core/types';

/** Calendrier mensuel : chaque jour prend la couleur de ton humeur, un point marque les soirées remplies. */
export function CalendarScreen() {
  const ui = useAppUI();
  const { entries, today } = store.use();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [dir, setDir] = useState(1);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const weeks = useMemo(() => monthMatrix(ym.y, ym.m), [ym]);
  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`)), [entries, ym]);
  const avg = average(monthEntries.map((e) => e.mood));
  const isCurrent = ym.y === Number(today.slice(0, 4)) && ym.m === Number(today.slice(5, 7)) - 1;

  const move = (delta: number) => {
    sfx.select();
    setDir(delta);
    setYm(({ y, m }) => {
      const t = y * 12 + m + delta;
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    });
  };

  return (
    <div className="screen">
      <header className="cal-head">
        <h1>Calendrier</h1>
        <button className="icon-btn" onClick={() => ui.openSearch()} aria-label="Rechercher dans mon journal">
          <IconSearch width={22} height={22} />
        </button>
      </header>

      <div className="month-nav">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Mois précédent">
          <IconBack width={22} height={22} />
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2 key={`${ym.y}-${ym.m}`} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.18 }}>
            {monthLabel(ym.y, ym.m).replace(/^./, (c) => c.toUpperCase())}
          </motion.h2>
        </AnimatePresence>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Mois suivant" disabled={isCurrent}>
          <IconChevron width={22} height={22} />
        </button>
      </div>

      <div className="card glass cal-card">
        <div className="cal-weekdays">
          {WEEKDAYS_SHORT.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={`${ym.y}-${ym.m}`} className="cal-grid" initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
            {weeks.flat().map((c) => {
              const e = byDate.get(c.date);
              const future = c.date > today;
              const color = e ? MOOD_COLORS[e.mood - 1] : undefined;
              return (
                <motion.button
                  key={c.date}
                  className={`cal-cell${c.inMonth ? '' : ' out'}${c.date === today ? ' today' : ''}${future ? ' future' : ''}${e ? ' filled' : ''}`}
                  disabled={future}
                  whileTap={{ scale: 0.86 }}
                  onClick={() => {
                    sfx.select();
                    ui.openDay(c.date);
                  }}
                  aria-label={`${c.day} ${MONTHS[Number(c.date.slice(5, 7)) - 1]}${e ? ', soirée remplie' : ''}`}
                >
                  <span className="cal-bubble" style={e ? { background: color, boxShadow: `0 0 14px ${color}77` } : undefined}>
                    <span className="cal-num" style={e ? { color: '#2b2540' } : undefined}>
                      {c.day}
                    </span>
                  </span>
                  <span className={`cal-dot${e ? ' on' : ''}${e?.late ? ' late' : ''}`} />
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="card glass cal-summary">
        {monthEntries.length > 0 ? (
          <>
            <div className="cal-summary-face">
              <MoodFace mood={Math.round(avg ?? 3) as Mood} size={44} />
            </div>
            <div>
              <strong>
                {monthEntries.length} soirée{monthEntries.length > 1 ? 's' : ''} ce mois-ci
              </strong>
              <span className="muted small block">Humeur moyenne : {avg?.toFixed(1)} / 5</span>
            </div>
          </>
        ) : (
          <p className="muted">Aucune soirée ce mois-ci pour l’instant.</p>
        )}
      </div>

      <div className="legend">
        {MOOD_COLORS.map((c, i) => (
          <span key={c}>
            <i style={{ background: c }} /> {['Très bas', 'Bas', 'Moyen', 'Bien', 'Très bien'][i]}
          </span>
        ))}
        <span>
          <i className="dot-late" /> En retard
        </span>
      </div>
    </div>
  );
}
