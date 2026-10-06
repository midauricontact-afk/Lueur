import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../audio/sounds';
import { CATEGORY_BY_ID, KIND_LABEL } from '../../core/categories';
import { formatLong, type DateKey } from '../../core/dates';
import { detectDistress, detectDistressIn } from '../../core/safety';
import { pickQuestions, redraw } from '../../core/selection';
import { encouragement, streakInfo } from '../../core/stats';
import { MOOD_LABELS, EMOTIONS, type Answer, type Entry, type Mood } from '../../core/types';
import { QUESTION_BANK, type Question } from '../../data/questions';
import { saveEntry, store, toast } from '../../state/store';
import { Confetti } from '../components/Confetti';
import { HelpCard } from '../components/HelpCard';
import { MoodFace } from '../components/MoodFace';
import { Btn, Chip, Slider } from '../components/primitives';
import { IconBack, IconClose, IconDice, IconFlame, IconSkip } from '../icons';
import { useAppUI } from '../ctx';

const DRAFT_KEY = 'lueur.draft';

interface Draft {
  date: DateKey;
  step: number;
  mood: Mood | null;
  energy: number;
  sleep: number;
  emotions: string[];
  questions: Question[];
  answers: Record<string, string>;
  shown: string[];
}

function readDraft(date: DateKey): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null;
    return d && d.date === date ? d : null;
  } catch {
    return null;
  }
}

const questionFromAnswer = (a: Answer): Question => ({ id: a.questionId, text: a.question, category: a.category, kind: a.kind, intensity: 'light', method: 'positive' });

const variants = {
  enter: (dir: number) => ({ x: dir * 70, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir * -70, opacity: 0, scale: 0.98 }),
};

/** Le questionnaire du soir : humeur → énergie et sommeil → émotions → questions → fin. */
export function Flow({ date, initial, onClose }: { date: DateKey; initial?: Entry; onClose: () => void }) {
  const ui = useAppUI();
  const { settings, custom, history, entries } = store.use();
  const editing = !!initial;
  const draft = useMemo(() => (editing ? null : readDraft(date)), [editing, date]);

  const [step, setStep] = useState(draft?.step ?? 0);
  const [dir, setDir] = useState(1);
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? draft?.mood ?? null);
  const [energy, setEnergy] = useState(initial?.energy ?? draft?.energy ?? 60);
  const [sleep, setSleep] = useState(initial?.sleep ?? draft?.sleep ?? 60);
  const [emotions, setEmotions] = useState<string[]>(initial?.emotions ?? draft?.emotions ?? []);
  const [questions, setQuestions] = useState<Question[]>(initial ? initial.answers.map(questionFromAnswer) : (draft?.questions ?? []));
  const [answers, setAnswers] = useState<Record<string, string>>(initial ? Object.fromEntries(initial.answers.map((a) => [a.questionId, a.text])) : (draft?.answers ?? {}));
  const [shown, setShown] = useState<string[]>(draft?.shown ?? []);
  const [saved, setSaved] = useState<Entry | null>(null);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [liveHelp, setLiveHelp] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const bank = useMemo(() => [...QUESTION_BANK, ...custom], [custom]);
  const total = 3 + Math.max(questions.length, settings.questionCount);
  const doneStep = 3 + questions.length;
  const isQuestion = step >= 3 && step < doneStep;
  const qIndex = step - 3;

  useEffect(() => {
    if (draft) toast('Brouillon retrouvé : tu reprends où tu t’étais arrêté.', 'info');
  }, []);

  // Brouillon : si tu fermes l'app en cours de route, rien n'est perdu.
  useEffect(() => {
    if (editing || saved) return;
    const d: Draft = { date, step, mood, energy, sleep, emotions, questions, answers, shown };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* stockage plein : tant pis pour le brouillon */
    }
  }, [editing, saved, date, step, mood, energy, sleep, emotions, questions, answers, shown]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const options = (m: Mood) => ({ bank, count: settings.questionCount, enabled: settings.enabledCategories, history, today: date, mood: m });

  const next = () => {
    if (step === 2 && !editing && questions.length === 0 && mood) {
      // On tire les questions seulement maintenant : on connaît ton humeur, donc on peut rester doux si la journée a été dure.
      const picked = pickQuestions(options(mood));
      setQuestions(picked);
      setShown((s) => [...new Set([...s, ...picked.map((q) => q.id)])]);
      sfx.next();
      setDir(1);
      setStep(3);
      return;
    }
    if (isQuestion && qIndex === questions.length - 1) {
      void finish();
      return;
    }
    sfx.next();
    go(step + 1);
  };

  const back = () => {
    sfx.back();
    go(Math.max(0, step - 1));
  };

  const another = () => {
    if (!mood || !isQuestion) return;
    const cur = questions[qIndex];
    const replacement = redraw(cur, { ...options(mood), shown: [...shown, ...questions.map((q) => q.id)] });
    if (!replacement) {
      toast('Plus d’autre question disponible dans tes catégories.', 'info');
      return;
    }
    sfx.select();
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? replacement : q)));
    setShown((s) => [...new Set([...s, replacement.id])]);
    setAnswers((a) => {
      const { [cur.id]: _dropped, ...rest } = a;
      return rest;
    });
  };

  const skip = () => {
    const cur = questions[qIndex];
    setAnswers((a) => ({ ...a, [cur.id]: '' }));
    next();
  };

  const finish = async () => {
    if (!mood) return;
    const list: Answer[] = questions
      .map((q) => ({ questionId: q.id, question: q.text, category: q.category, kind: q.kind, text: (answers[q.id] ?? '').trim() }))
      .filter((a) => a.text);
    const entry = await saveEntry({ date, mood, energy, sleep, emotions, answers: list, shownIds: [...new Set([...shown, ...questions.map((q) => q.id)])] });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignoré */
    }
    setSaved(entry);
    sfx.done();
    setDir(1);
    setStep(doneStep);
  };

  const close = () => {
    sfx.back();
    if (!saved && !editing && (mood || Object.values(answers).some(Boolean))) toast('Brouillon gardé : tu pourras reprendre ce soir.', 'info');
    onClose();
  };

  const streak = useMemo(() => streakInfo(entries.map((e) => e.date), store.get().today), [entries]);
  const distress = saved ? detectDistressIn(saved.answers.map((a) => a.text)) : false;
  const q = isQuestion ? questions[qIndex] : null;
  const cat = q ? CATEGORY_BY_ID[q.category] : null;
  const text = q ? (answers[q.id] ?? '') : '';
  const canNext = step === 0 ? mood !== null : true;
  const isLast = isQuestion && qIndex === questions.length - 1;
  const late = date !== store.get().today;

  const pct = saved ? 100 : (Math.min(step, total) / total) * 100;

  return (
    <motion.div className="flow" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}>
      <div ref={topRef} />
      <header className="flow-head">
        {step > 0 && !saved ? (
          <button className="icon-btn" onClick={back} aria-label="Retour">
            <IconBack width={22} height={22} />
          </button>
        ) : (
          <span className="icon-btn ghost-slot" />
        )}
        <div className="flow-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ type: 'spring', damping: 26, stiffness: 180 }} />
        </div>
        <button className="icon-btn" onClick={close} aria-label="Fermer">
          <IconClose width={22} height={22} />
        </button>
      </header>
      <p className="flow-date">
        {late ? '🕰️ ' : ''}
        {formatLong(date)}
        {late && ' · rempli en retard'}
        {editing && ' · modification'}
      </p>

      <div className="flow-stage">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} className="flow-step" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
            {step === 0 && (
              <>
                <h1 className="flow-title">{settings.name ? `${settings.name}, comment` : 'Comment'} te sens-tu ce soir ?</h1>
                <p className="flow-sub">Choisis le visage qui te ressemble le plus.</p>
                <div className="mood-row" role="radiogroup" aria-label="Humeur du jour">
                  {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
                    <motion.button
                      key={m}
                      role="radio"
                      aria-checked={mood === m}
                      className={`mood-btn${mood === m ? ' active' : ''}`}
                      onClick={() => {
                        sfx.select();
                        setMood(m);
                      }}
                      whileTap={{ scale: 0.88 }}
                      animate={{ scale: mood === m ? 1.22 : mood ? 0.88 : 1, y: mood === m ? -6 : 0, opacity: mood && mood !== m ? 0.55 : 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                    >
                      <MoodFace mood={m} size={58} glow={mood === m} />
                    </motion.button>
                  ))}
                </div>
                <div className="mood-label" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {mood && (
                      <motion.span key={mood} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        {MOOD_LABELS[mood]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="flow-title">Et ton corps ?</h1>
                <p className="flow-sub">Deux curseurs, sans réfléchir trop longtemps.</p>
                <div className="card glass">
                  <Slider label="Énergie" emoji="⚡" value={energy} onChange={setEnergy} left="À plat" right="En pleine forme" />
                  <Slider label="Sommeil de la nuit dernière" emoji="🌙" value={sleep} onChange={setSleep} left="Très mauvais" right="Excellent" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="flow-title">Quels mots te correspondent ?</h1>
                <p className="flow-sub">Facultatif : tu peux en choisir plusieurs, ou aucun.</p>
                <div className="chips-wrap">
                  {EMOTIONS.map((e) => (
                    <Chip key={e.id} tone={e.tone} active={emotions.includes(e.id)} onClick={() => setEmotions((cur) => (cur.includes(e.id) ? cur.filter((x) => x !== e.id) : [...cur, e.id]))}>
                      <span aria-hidden="true">{e.emoji}</span> {e.label}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {q && cat && (
              <>
                <div className="q-meta">
                  <span className="q-cat">
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="q-count">
                    {qIndex + 1} / {questions.length}
                  </span>
                </div>
                <h1 className="flow-title q-text">{q.text}</h1>
                <p className="flow-sub">{KIND_LABEL[q.kind]} · quelques mots suffisent</p>
                <textarea
                  className="q-input"
                  value={text}
                  placeholder="Écris ici, librement…"
                  rows={6}
                  autoFocus={false}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAnswers((a) => ({ ...a, [q.id]: v }));
                    setLiveHelp(detectDistress(v).detected);
                  }}
                />
                <AnimatePresence>{liveHelp && detectDistress(text).detected && <HelpCard compact />}</AnimatePresence>
                <div className="q-tools">
                  <button className="tool" onClick={another}>
                    <IconDice width={18} height={18} /> Une autre question
                  </button>
                  <button className="tool" onClick={skip}>
                    <IconSkip width={18} height={18} /> Passer
                  </button>
                </div>
              </>
            )}

            {saved && step === doneStep && (
              <div className="flow-done">
                <Confetti />
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}>
                  <MoodFace mood={saved.mood} size={110} glow />
                </motion.div>
                <motion.h1 className="flow-title" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  {settings.name ? `Merci, ${settings.name}.` : 'Merci pour ce moment.'}
                </motion.h1>
                <motion.p className="flow-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {encouragement(streak.current, saved.mood)}
                </motion.p>
                {streak.current > 0 && (
                  <motion.div className="streak-pill" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}>
                    <IconFlame width={20} height={20} /> {streak.current} soirée{streak.current > 1 ? 's' : ''} de suite
                  </motion.div>
                )}
                {late && <p className="muted small">Ce jour est marqué « rempli en retard » dans ton calendrier.</p>}
                <AnimatePresence>{distress && !helpDismissed && <HelpCard onDismiss={() => setHelpDismissed(true)} />}</AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="flow-foot">
        {saved && step === doneStep ? (
          <>
            <Btn
              size="lg"
              onClick={() => {
                onClose();
                ui.goTab('calendar');
              }}
            >
              Voir mon calendrier
            </Btn>
            <Btn variant="ghost" onClick={onClose}>
              Terminer
            </Btn>
          </>
        ) : (
          <Btn size="lg" onClick={next} disabled={!canNext} quiet>
            {isLast ? 'Terminer ✓' : step === 2 && emotions.length === 0 ? 'Passer' : 'Continuer'}
          </Btn>
        )}
      </footer>
    </motion.div>
  );
}
