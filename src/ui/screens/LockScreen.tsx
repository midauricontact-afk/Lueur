import { motion, useAnimationControls } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '../../audio/sounds';
import { checkPin, store } from '../../state/store';
import { IconLock } from '../icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** Pavé numérique réutilisé pour verrouiller l'app et pour choisir un code. */
export function PinPad({ title, subtitle, onComplete, length = 4, error }: { title: string; subtitle?: string; onComplete: (pin: string) => Promise<boolean | void> | boolean | void; length?: number; error?: string }) {
  const [pin, setPin] = useState('');
  const shake = useAnimationControls();

  const press = async (k: string) => {
    if (k === '⌫') {
      sfx.back();
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!k || pin.length >= length) return;
    sfx.click();
    const next = pin + k;
    setPin(next);
    if (next.length === length) {
      const ok = await onComplete(next);
      if (ok === false) {
        sfx.back();
        await shake.start({ x: [0, -14, 14, -10, 10, -4, 4, 0], transition: { duration: 0.45 } });
        setPin('');
      } else if (ok === true) {
        sfx.done();
      } else {
        setPin('');
      }
    }
  };

  return (
    <div className="pinpad">
      <div className="pin-lock">
        <IconLock width={30} height={30} />
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
      <motion.div className="pin-dots" animate={shake}>
        {Array.from({ length }, (_, i) => (
          <motion.span key={i} className={i < pin.length ? 'on' : ''} animate={{ scale: i < pin.length ? 1.25 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} />
        ))}
      </motion.div>
      <p className="pin-error" aria-live="polite">
        {error}
      </p>
      <div className="pin-keys">
        {KEYS.map((k, i) => (
          <motion.button key={i} className={`pin-key${k === '' ? ' blank' : ''}`} whileTap={{ scale: 0.88 }} onClick={() => void press(k)} disabled={k === ''} aria-label={k === '⌫' ? 'Effacer' : k || undefined}>
            {k}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Écran de verrouillage affiché à l'ouverture quand un code PIN est défini. */
export function LockScreen() {
  const [error, setError] = useState('');
  return (
    <motion.div className="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <PinPad
        title="Lueur"
        subtitle="Saisis ton code pour entrer"
        error={error}
        onComplete={async (pin) => {
          const ok = await checkPin(pin);
          if (ok) store.set({ locked: false });
          else setError('Code incorrect');
          return ok;
        }}
      />
    </motion.div>
  );
}
