import { motion } from 'framer-motion';
import { CATEGORY_BY_ID } from '../../core/categories';
import { formatLong, type DateKey } from '../../core/dates';
import { MOOD_COLORS } from '../../core/themes';
import { EMOTION_BY_ID, MOOD_LABELS } from '../../core/types';
import { removeEntry, store, toast } from '../../state/store';
import { MoodFace } from '../components/MoodFace';
import { Btn } from '../components/primitives';
import { Sheet } from '../components/Sheet';
import { useAppUI } from '../ctx';
import { IconEdit, IconTrash } from '../icons';

/** La fiche d'un soir : humeur, énergie, sommeil, émotions et toutes les réponses. */
export function DaySheet({ date, onClose }: { date: DateKey | null; onClose: () => void }) {
  const ui = useAppUI();
  const { entries, today } = store.use();
  const entry = date ? entries.find((e) => e.date === date) : undefined;

  const remove = async () => {
    if (!date) return;
    const ok = await ui.confirm({ title: 'Supprimer cette soirée ?', message: 'Ses réponses seront effacées de ce téléphone. Cette action est définitive.', confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    await removeEntry(date);
    toast('Soirée supprimée', 'ok');
    onClose();
  };

  return (
    <Sheet open={!!date} onClose={onClose} tall title={date ? formatLong(date).replace(/^./, (c) => c.toUpperCase()) : ''}>
      {date && !entry && (
        <div className="empty-day">
          <p className="muted">Rien d’écrit pour ce jour-là.</p>
          {date <= today && (
            <Btn
              onClick={() => {
                onClose();
                ui.openFlow(date);
              }}
            >
              Remplir ce jour
            </Btn>
          )}
          <p className="muted small">Il sera marqué « rempli en retard » : pas de souci, c’est ton journal.</p>
        </div>
      )}
      {entry && (
        <div className="day">
          <div className="day-top" style={{ ['--mood' as string]: MOOD_COLORS[entry.mood - 1] }}>
            <motion.div initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <MoodFace mood={entry.mood} size={84} glow />
            </motion.div>
            <div>
              <h3>{MOOD_LABELS[entry.mood]}</h3>
              {entry.late && <span className="badge">Rempli en retard</span>}
            </div>
          </div>

          <div className="meters">
            <div className="meter">
              <span>⚡ Énergie</span>
              <div className="meter-track">
                <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${entry.energy}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
              </div>
              <b>{entry.energy} %</b>
            </div>
            <div className="meter">
              <span>🌙 Sommeil</span>
              <div className="meter-track">
                <motion.div className="meter-fill alt" initial={{ width: 0 }} animate={{ width: `${entry.sleep}%` }} transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }} />
              </div>
              <b>{entry.sleep} %</b>
            </div>
          </div>

          {entry.emotions.length > 0 && (
            <div className="chips-wrap">
              {entry.emotions.map((id) => {
                const e = EMOTION_BY_ID[id];
                return (
                  <span key={id} className={`chip static ${e?.tone ?? ''}`}>
                    {e?.emoji} {e?.label ?? id}
                  </span>
                );
              })}
            </div>
          )}

          {entry.answers.length === 0 ? (
            <p className="muted">Tu n’as pas écrit de réponse ce soir-là, et c’est très bien.</p>
          ) : (
            entry.answers.map((a, i) => {
              const cat = CATEGORY_BY_ID[a.category];
              return (
                <motion.article key={a.questionId + i} className="answer" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                  <span className="q-cat">
                    {cat?.emoji} {cat?.label}
                  </span>
                  <h4>{a.question}</h4>
                  <p>{a.text}</p>
                </motion.article>
              );
            })
          )}

          <div className="row-btns spaced">
            <Btn
              variant="soft"
              onClick={() => {
                onClose();
                ui.openFlow(entry.date);
              }}
            >
              <IconEdit width={18} height={18} /> Modifier
            </Btn>
            <Btn variant="danger" onClick={() => void remove()}>
              <IconTrash width={18} height={18} /> Supprimer
            </Btn>
          </div>
        </div>
      )}
    </Sheet>
  );
}
