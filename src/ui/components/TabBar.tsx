import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sfx } from '../../audio/sounds';
import { IconCalendar, IconChart, IconGear, IconMoon } from '../icons';
import type { TabId } from '../ctx';

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'tonight', label: 'Ce soir', icon: <IconMoon /> },
  { id: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
  { id: 'stats', label: 'Stats', icon: <IconChart /> },
  { id: 'settings', label: 'Réglages', icon: <IconGear /> },
];

/** Barre flottante en bas : la pastille lumineuse glisse d'un onglet à l'autre. */
export function TabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? 'active' : ''}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => {
            if (tab !== t.id) sfx.select();
            onChange(t.id);
          }}
        >
          {tab === t.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <motion.span className="tab-icon" animate={{ y: tab === t.id ? -1 : 0, scale: tab === t.id ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
            {t.icon}
          </motion.span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
