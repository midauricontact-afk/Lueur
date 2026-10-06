import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { sfx } from '../../audio/sounds';
import { updateSettings } from '../../state/store';
import { Btn } from '../components/primitives';

/** Première ouverture : trois écrans courts, un prénom, une heure de rappel. */
export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [time, setTime] = useState('21:00');

  const finish = () => {
    updateSettings({ name: name.trim(), notifTime: time, onboarded: true });
    sfx.done();
  };

  const slides = [
    <div key="a" className="onb-slide">
      <motion.div className="onb-moon" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        🌙
      </motion.div>
      <h1>Bienvenue dans Lueur</h1>
      <p>Un petit rendez-vous du soir avec toi : comment tu vas, ce qui t’a fait du bien, ce qui a pesé. Trois à cinq minutes, sans pression.</p>
      <p className="muted small">Tout ce que tu écris reste sur ce téléphone.</p>
    </div>,
    <div key="b" className="onb-slide">
      <div className="onb-moon">👋</div>
      <h1>Comment veux-tu qu’on t’appelle ?</h1>
      <p>Ton prénom servira à personnaliser les messages. Tu peux laisser vide.</p>
      <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" maxLength={30} autoCapitalize="words" />
    </div>,
    <div key="c" className="onb-slide">
      <div className="onb-moon">⏰</div>
      <h1>À quelle heure, le soir ?</h1>
      <p>Une notification douce te rappellera ton rendez-vous. Tu l’activeras dans les réglages (iPhone : après avoir ajouté Lueur à l’écran d’accueil).</p>
      <input className="text-input time" type="time" value={time} onChange={(e) => setTime(e.target.value || '21:00')} />
    </div>,
  ];

  return (
    <div className="onboarding">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className="onb-stage">
          {slides[step]}
        </motion.div>
      </AnimatePresence>
      <div className="onb-dots">
        {slides.map((_, i) => (
          <motion.i key={i} animate={{ width: i === step ? 22 : 8, opacity: i === step ? 1 : 0.4 }} />
        ))}
      </div>
      <div className="onb-actions">
        <Btn size="lg" onClick={() => (step < slides.length - 1 ? setStep(step + 1) : finish())}>
          {step < slides.length - 1 ? 'Continuer' : 'Commencer'}
        </Btn>
        {step > 0 && (
          <Btn variant="ghost" onClick={() => setStep(step - 1)}>
            Retour
          </Btn>
        )}
      </div>
    </div>
  );
}
