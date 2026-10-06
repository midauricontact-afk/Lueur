import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { formatShort } from '../../core/dates';
import { searchEntries } from '../../core/search';
import { MoodFace } from '../components/MoodFace';
import { Sheet } from '../components/Sheet';
import { store } from '../../state/store';
import { useAppUI } from '../ctx';
import { IconSearch } from '../icons';

/** Recherche dans tout le journal (sans tenir compte des accents ni des majuscules). */
export function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useAppUI();
  const { entries } = store.use();
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchEntries(entries, q), [entries, q]);

  return (
    <Sheet open={open} onClose={onClose} tall title="Rechercher">
      <label className="searchbar">
        <IconSearch width={20} height={20} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Un mot, une personne, un lieu…" enterKeyHint="search" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      {q.trim().length >= 2 && hits.length === 0 && <p className="muted center">Aucun résultat pour « {q} ».</p>}
      {q.trim().length < 2 && <p className="muted center small">Cherche dans toutes tes réponses et tes émotions.</p>}
      <div className="results">
        {hits.slice(0, 60).map((h, i) => (
          <motion.button
            key={h.entry.date}
            className="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.03 }}
            onClick={() => {
              onClose();
              ui.openDay(h.entry.date);
            }}
          >
            <MoodFace mood={h.entry.mood} size={38} />
            <span className="result-main">
              <strong>{formatShort(h.entry.date)}</strong>
              <small className="muted block clamp">{h.where}</small>
              <span className="snippet">{h.snippet}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
