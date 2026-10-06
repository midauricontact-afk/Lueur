import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { formatLong } from '../../core/dates';
import { seriesEndingAt, streakInfo } from '../../core/stats';
import { MOOD_COLORS } from '../../core/themes';
import { EMOTION_BY_ID, MOOD_LABELS } from '../../core/types';
import { store } from '../../state/store';
import { MoodFace } from '../components/MoodFace';
import { Btn } from '../components/primitives';
import { useAppUI } from '../ctx';
import { IconFlame, IconBell, IconChevron } from '../icons';

function greeting(hour: number): string {
  if (hour < 5) return 'Bonne nuit';
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Écran « Ce soir » : un accueil doux et une seule grande invitation. */
export function Home() {
  const ui = useAppUI();
  const { settings, entries, today } = store.use();
  const todayEntry = entries.find((e) => e.date === today);
  const streak = useMemo(() => streakInfo(entries.map((e) => e.date), today), [entries, today]);
  const week = useMemo(() => seriesEndingAt(entries, today, 7), [entries, today]);
  const hour = new Date().getHours();
  const name = settings.name;
  const pushHint = typeof Notification !== 'undefined' && Notification.permission !== 'granted';

  return (
    <div className="screen">
      <header className="home-head">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {greeting(hour)}
          {name ? `, ${name}` : ''}
        </motion.h1>
        <p className="muted">{formatLong(today)}</p>
      </header>

      <motion.section className="hero card glass" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="orb-wrap">
          <motion.div className="orb" animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="orb-ring" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} />
          <div className="orb-face">{todayEntry ? <MoodFace mood={todayEntry.mood} size={86} glow /> : <span className="orb-moon">🌙</span>}</div>
        </div>
        {todayEntry ? (
          <>
            <h2>Ton journal de ce soir est rempli ✨</h2>
            <p className="muted">
              Humeur : <b>{MOOD_LABELS[todayEntry.mood]}</b>
              {todayEntry.emotions.length > 0 && ` · ${todayEntry.emotions.slice(0, 3).map((id) => EMOTION_BY_ID[id]?.label ?? id).join(', ')}`}
            </p>
            <div className="row-btns">
              <Btn variant="soft" onClick={() => ui.openDay(today)}>
                Relire
              </Btn>
              <Btn variant="ghost" onClick={() => ui.openFlow(today)}>
                Modifier
              </Btn>
            </div>
          </>
        ) : (
          <>
            <h2>Un petit moment pour toi ?</h2>
            <p className="muted">Trois à cinq minutes pour poser ta journée. Il n’y a pas de bonne réponse.</p>
            <Btn size="lg" onClick={() => ui.openFlow()} quiet>
              Commencer ma soirée
            </Btn>
          </>
        )}
      </motion.section>

      <motion.section className="card glass streak-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <div className="streak-main">
          <span className={`flame${streak.current > 0 ? ' lit' : ''}`}>
            <IconFlame width={28} height={28} />
          </span>
          <div>
            <strong>
              {streak.current} soirée{streak.current > 1 ? 's' : ''} de suite
            </strong>
            <span className="muted small block">{streak.best > 0 ? `Record : ${streak.best}` : 'Ta première soirée t’attend'}</span>
          </div>
        </div>
        <div className="week">
          {week.map((p) => {
            const d = new Date(`${p.date}T12:00:00`);
            const isToday = p.date === today;
            return (
              <button key={p.date} className={`week-day${isToday ? ' today' : ''}`} onClick={() => (p.mood ? ui.openDay(p.date) : p.date <= today ? ui.openFlow(p.date) : undefined)} aria-label={p.date}>
                <span className="week-dot" style={p.mood ? { background: MOOD_COLORS[p.mood - 1], boxShadow: `0 0 12px ${MOOD_COLORS[p.mood - 1]}88` } : undefined} />
                <span className="week-label">{WEEKDAY[d.getDay()]}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {pushHint && (
        <motion.button className="card glass banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} onClick={() => ui.goTab('settings')}>
          <IconBell width={22} height={22} />
          <span>
            <strong>Active le rappel du soir</strong>
            <small className="muted block">Une notification douce à l’heure de ton choix.</small>
          </span>
          <IconChevron width={18} height={18} />
        </motion.button>
      )}

      {entries.length === 0 && (
        <p className="muted small center">Tes réponses restent sur ce téléphone. Rien n’est envoyé sur Internet.</p>
      )}
    </div>
  );
}

