import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from './audio/sounds';
import type { DateKey } from './core/dates';
import { journalDate } from './core/dates';
import type { Entry } from './core/types';
import { initApp, lockNow, refreshToday, store } from './state/store';
import { Backdrop } from './ui/components/Backdrop';
import { HelpCard } from './ui/components/HelpCard';
import { Btn } from './ui/components/primitives';
import { Sheet } from './ui/components/Sheet';
import { TabBar } from './ui/components/TabBar';
import { UIContext, type AppUI, type TabId } from './ui/ctx';
import { CalendarScreen } from './ui/screens/Calendar';
import { DaySheet } from './ui/screens/DaySheet';
import { Flow } from './ui/screens/Flow';
import { Home } from './ui/screens/Home';
import { LockScreen } from './ui/screens/LockScreen';
import { Onboarding } from './ui/screens/Onboarding';
import { SearchSheet } from './ui/screens/SearchSheet';
import { SettingsScreen } from './ui/screens/Settings';
import { StatsScreen } from './ui/screens/Stats';

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export function App() {
  const s = store.use();
  const [tab, setTab] = useState<TabId>('tonight');
  // `initial` est figé à l'ouverture : une fois la soirée enregistrée, l'écran de fin ne doit pas se croire en mode « modification ».
  const [flow, setFlow] = useState<{ date: DateKey; initial?: Entry } | null>(null);
  const [day, setDay] = useState<DateKey | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    void initApp();
  }, []);

  // Verrouillage automatique après 30 secondes passées hors de l'app ; et le « ce soir » peut changer de jour.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        if (hiddenAt.current && Date.now() - hiddenAt.current > 30_000) lockNow();
        hiddenAt.current = null;
        refreshToday();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const confirm = useCallback(
    (opts: Omit<ConfirmState, 'resolve'>) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    [],
  );

  const ui = useMemo<AppUI>(
    () => ({
      openFlow: (date) => {
        sfx.next();
        const d = date ?? journalDate();
        setFlow({ date: d, initial: store.get().entries.find((e) => e.date === d) });
      },
      openDay: setDay,
      openSearch: () => setSearchOpen(true),
      openHelp: () => setHelpOpen(true),
      goTab: (t) => {
        window.scrollTo({ top: 0 });
        setTab(t);
      },
      confirm,
    }),
    [confirm],
  );

  const settle = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  if (!s.ready) return <div className="splash" aria-busy="true" />;

  return (
    <MotionConfig reducedMotion="user">
      <UIContext.Provider value={ui}>
        <Backdrop themeId={s.settings.themeId} />

        {!s.settings.onboarded ? (
          <Onboarding />
        ) : (
          <div className="app">
            <main className="content">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {tab === 'tonight' && <Home />}
                  {tab === 'calendar' && <CalendarScreen />}
                  {tab === 'stats' && <StatsScreen />}
                  {tab === 'settings' && <SettingsScreen />}
                </motion.div>
              </AnimatePresence>
            </main>
            <TabBar tab={tab} onChange={ui.goTab} />
          </div>
        )}

        <AnimatePresence>{flow && <Flow key={flow.date} date={flow.date} initial={flow.initial} onClose={() => setFlow(null)} />}</AnimatePresence>

        <DaySheet date={day} onClose={() => setDay(null)} />
        <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
        <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Besoin d’aide ?">
          <HelpCard />
        </Sheet>

        <AnimatePresence>
          {confirmState && (
            <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => settle(false)}>
              <motion.div className="dialog" role="alertdialog" aria-modal="true" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
                <h3>{confirmState.title}</h3>
                {confirmState.message && <p className="muted">{confirmState.message}</p>}
                <div className="row-btns">
                  <Btn variant="ghost" onClick={() => settle(false)}>
                    Annuler
                  </Btn>
                  <Btn variant={confirmState.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
                    {confirmState.confirmLabel}
                  </Btn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{s.locked && s.settings.pinHash && <LockScreen />}</AnimatePresence>

        <div className="toasts" aria-live="polite">
          <AnimatePresence>
            {s.toasts.map((t) => (
              <motion.div key={t.id} className={`toast ${t.kind}`} layout initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', damping: 24, stiffness: 320 }}>
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </UIContext.Provider>
    </MotionConfig>
  );
}
