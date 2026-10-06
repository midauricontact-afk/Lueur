import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { configureSound, sfx } from '../../audio/sounds';
import { createBackup, validateBackup } from '../../core/backup';
import { CATEGORIES, METHOD_LABEL, type Kind } from '../../core/categories';
import { journalDate } from '../../core/dates';
import { ALL_CATEGORY_IDS } from '../../core/selection';
import { ACCENT_CHOICES, FONTS, THEMES, resolveMode, themeVars } from '../../core/themes';
import { QUESTION_BANK } from '../../data/questions';
import { buildPdf } from '../../export/pdf';
import {
  disablePush,
  enablePush,
  currentSubscription,
  loadPushConfig,
  pushIssue,
  pushSupport,
  sendTestPush,
  updatePushTime,
  type PushConfig,
} from '../../push/push';
import { addCustomQuestion, applyImport, getDB, lockNow, removeCustomQuestion, removePin, setPin, store, toast, updateSettings, wipeEverything } from '../../state/store';
import { Btn, Chip, Segmented, Switch } from '../components/primitives';
import { Sheet } from '../components/Sheet';
import { useAppUI } from '../ctx';
import { IconDownload, IconHeart, IconLock, IconTrash, IconUpload } from '../icons';
import { PinPad } from './LockScreen';

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {hint && <p className="muted small">{hint}</p>}
      <div className="card glass">{children}</div>
    </section>
  );
}

const Row = ({ label, children, sub }: { label: ReactNode; children?: ReactNode; sub?: ReactNode }) => (
  <div className="row-setting">
    <div className="row-label">
      <span>{label}</span>
      {sub && <small className="muted">{sub}</small>}
    </div>
    {children}
  </div>
);

/** Enregistre un fichier : feuille de partage iOS si possible (pour l'enregistrer dans Fichiers), sinon téléchargement. */
async function saveFile(blob: Blob, name: string, type: string) {
  const file = new File([blob], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function Notifications() {
  const { settings } = store.use();
  const [cfg, setCfg] = useState<PushConfig | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sup = pushSupport();
  const base = settings.pushUrl || cfg?.url || '';
  const issue = pushIssue(sup, cfg, base);

  useEffect(() => {
    void loadPushConfig().then(setCfg);
    void currentSubscription().then((s) => setSubscribed(!!s));
  }, []);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      toast(ok, 'ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setSubscribed(!!(await currentSubscription()));
    }
  };

  return (
    <>
      <Row label="Heure du rappel" sub="Chaque soir, heure de Paris par défaut">
        <input
          className="text-input time"
          type="time"
          value={settings.notifTime}
          onChange={(e) => updateSettings({ notifTime: e.target.value || '21:00' })}
          onBlur={() => subscribed && base && void updatePushTime(base, store.get().settings.notifTime).then(() => toast('Heure du rappel mise à jour', 'ok')).catch((e) => setError(String(e.message ?? e)))}
        />
      </Row>

      {issue === 'needs-install' && (
        <div className="note warn">
          <strong>Une étape de plus sur iPhone</strong>
          <ol>
            <li>
              Ouvre Lueur dans <b>Safari</b>, touche <b>Partager</b> (le carré avec une flèche).
            </li>
            <li>
              Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.
            </li>
            <li>
              Ouvre Lueur depuis sa <b>nouvelle icône</b>, reviens ici et touche « Activer les notifications ». (iOS 16.4 ou plus récent.)
            </li>
          </ol>
        </div>
      )}
      {issue === 'unsupported' && <div className="note warn">Ce navigateur ne gère pas les notifications push. Utilise le plan B (Raccourcis) ci-dessous.</div>}
      {issue === 'denied' && (
        <div className="note warn">
          Les notifications sont bloquées. Autorise-les dans <b>Réglages de l’iPhone › Notifications › Lueur</b>, puis reviens ici.
        </div>
      )}
      {issue === 'no-service' && (
        <div className="note warn">
          <strong>Le service de rappels n’est pas encore configuré.</strong>
          <p className="small">Suis l’étape « service de notifications » du README, puis colle ici l’adresse obtenue (elle finit par .workers.dev).</p>
          <input className="text-input" value={settings.pushUrl} onChange={(e) => updateSettings({ pushUrl: e.target.value })} placeholder="https://lueur-push.xxx.workers.dev" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </div>
      )}

      {subscribed ? (
        <>
          <p className="ok-line">🔔 Rappel actif : chaque soir à {settings.notifTime}.</p>
          <div className="row-btns">
            <Btn variant="soft" disabled={busy || !base} onClick={() => void run(() => sendTestPush(base), 'Notification envoyée : regarde ton écran verrouillé')}>
              Envoyer un essai
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => disablePush(base), 'Rappel désactivé')}>
              Désactiver
            </Btn>
          </div>
        </>
      ) : (
        <Btn disabled={busy || issue !== null || !cfg} onClick={() => cfg && void run(() => enablePush(cfg, base, settings.notifTime), 'Notifications activées ✨')}>
          Activer les notifications
        </Btn>
      )}
      {error && <p className="error small">{error}</p>}
      <p className="muted small">Le service de rappels ne reçoit jamais tes réponses : seulement l’adresse de ton téléphone, l’heure et le fuseau.</p>

      <details className="disclosure">
        <summary>Plan B : une automatisation de l’app Raccourcis</summary>
        <ol className="steps">
          <li>
            Ouvre l’app <b>Raccourcis</b> › onglet <b>Automatisation</b> › <b>+</b> › <b>Heure de la journée</b>.
          </li>
          <li>
            Choisis <b>{settings.notifTime}</b>, <b>Tous les jours</b>, puis <b>Exécuter immédiatement</b>.
          </li>
          <li>
            Ajoute l’action <b>Ouvrir l’app</b> › choisis <b>Lueur</b>.
          </li>
          <li>Valide. Chaque soir, iOS ouvrira Lueur à cette heure (sans notification).</li>
        </ol>
        <p className="muted small">Variante : ajoute avant l’action « Afficher la notification » avec le texte « Ta lueur du soir t’attend » pour recevoir aussi une bannière.</p>
      </details>
    </>
  );
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

function QuestionSettings() {
  const { settings, custom } = store.use();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('positive');
  const enabled = new Set(settings.enabledCategories);

  const toggle = (id: (typeof ALL_CATEGORY_IDS)[number]) => {
    const next = new Set(enabled);
    if (next.has(id)) {
      if (next.size === 1) return toast('Garde au moins une catégorie.', 'info');
      next.delete(id);
    } else next.add(id);
    updateSettings({ enabledCategories: [...next] });
  };

  return (
    <>
      <Row label="Questions par soirée" sub="Une positive, une difficile, une réflexion, au minimum">
        <div className="stepper">
          <button onClick={() => { sfx.click(); updateSettings({ questionCount: settings.questionCount - 1 }); }} disabled={settings.questionCount <= 2} aria-label="Moins">−</button>
          <b>{settings.questionCount}</b>
          <button onClick={() => { sfx.click(); updateSettings({ questionCount: settings.questionCount + 1 }); }} disabled={settings.questionCount >= 5} aria-label="Plus">+</button>
        </div>
      </Row>
      <p className="muted small">Catégories de questions ({QUESTION_BANK.length} dans la banque)</p>
      <div className="chips-wrap">
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={enabled.has(c.id)} onClick={() => toggle(c.id)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
      </div>

      <h3 className="sub-title">Mes propres questions</h3>
      {custom.length === 0 && <p className="muted small">Ajoute les questions qui te parlent : elles seront tirées avec les autres.</p>}
      <ul className="custom-list">
        {custom.map((q) => (
          <li key={q.id}>
            <span>{q.text}</span>
            <button className="icon-btn" onClick={() => void removeCustomQuestion(q.id)} aria-label="Supprimer cette question">
              <IconTrash width={18} height={18} />
            </button>
          </li>
        ))}
      </ul>
      <textarea className="q-input small" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ma question, par exemple : « Qu’est-ce qui m’a surpris aujourd’hui ? »" maxLength={300} />
      <Segmented
        value={kind}
        options={[
          { id: 'positive' as Kind, label: 'Positive' },
          { id: 'hard' as Kind, label: 'Difficile' },
          { id: 'reflect' as Kind, label: 'Réflexion' },
        ]}
        onChange={setKind}
      />
      <Btn
        variant="soft"
        disabled={!text.trim()}
        onClick={() => {
          void addCustomQuestion(text, kind);
          setText('');
          toast('Question ajoutée', 'ok');
        }}
      >
        Ajouter ma question
      </Btn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Apparence
// ---------------------------------------------------------------------------

function Appearance() {
  const { settings, dark } = store.use();
  const mode = resolveMode(settings.mode, dark);
  return (
    <>
      <p className="muted small">Thème</p>
      <div className="theme-grid">
        {THEMES.map((t) => {
          const v = themeVars(t.id, mode, null);
          const active = settings.themeId === t.id;
          return (
            <motion.button
              key={t.id}
              className={`theme-card${active ? ' active' : ''}`}
              style={{ background: `linear-gradient(145deg, ${v['--bg2']}, ${v['--bg1']})`, color: v['--text'] }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: active ? 1.03 : 1 }}
              onClick={() => {
                sfx.select();
                updateSettings({ themeId: t.id });
              }}
              aria-pressed={active}
            >
              <i className="theme-dot" style={{ background: v['--accent'] }} />
              <strong>{t.name}</strong>
              <small style={{ color: v['--muted'] }}>{t.tagline}</small>
            </motion.button>
          );
        })}
      </div>

      <p className="muted small">Mode</p>
      <Segmented
        value={settings.mode}
        options={[
          { id: 'auto' as const, label: 'Automatique' },
          { id: 'light' as const, label: 'Clair' },
          { id: 'dark' as const, label: 'Sombre' },
        ]}
        onChange={(m) => updateSettings({ mode: m })}
      />

      <p className="muted small">Couleur d’accent</p>
      <div className="swatches">
        <button className={`swatch auto${settings.accent === null ? ' active' : ''}`} onClick={() => { sfx.select(); updateSettings({ accent: null }); }} aria-label="Couleur du thème" title="Couleur du thème">
          ✦
        </button>
        {ACCENT_CHOICES.map((a) => {
          const color = mode === 'dark' ? a.dark : a.light;
          return (
            <motion.button key={a.id} className={`swatch${settings.accent === color ? ' active' : ''}`} style={{ background: color }} whileTap={{ scale: 0.85 }} onClick={() => { sfx.select(); updateSettings({ accent: color }); }} aria-label={a.name} title={a.name} />
          );
        })}
      </div>

      <p className="muted small">Police</p>
      <div className="font-list">
        {FONTS.map((f) => (
          <button key={f.id} className={`font-card${settings.font === f.id ? ' active' : ''}`} style={{ fontFamily: f.stack }} onClick={() => { sfx.select(); updateSettings({ font: f.id }); }} aria-pressed={settings.font === f.id}>
            <strong>{f.name}</strong>
            <span>{f.sample}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sécurité
// ---------------------------------------------------------------------------

function PinSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) {
      setFirst(null);
      setError('');
    }
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Code de verrouillage">
      <PinPad
        key={first === null ? 'new' : 'confirm'}
        title={first === null ? 'Choisis un code à 4 chiffres' : 'Saisis-le encore une fois'}
        subtitle="Il sera demandé à chaque ouverture de Lueur."
        error={error}
        onComplete={async (pin) => {
          if (first === null) {
            setFirst(pin);
            setError('');
            return;
          }
          if (pin !== first) {
            setError('Les deux codes ne correspondent pas');
            setFirst(null);
            return false;
          }
          await setPin(pin);
          toast('Code enregistré 🔒', 'ok');
          onClose();
          return true;
        }}
      />
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Écran
// ---------------------------------------------------------------------------

export function SettingsScreen() {
  const ui = useAppUI();
  const { settings, entries } = store.use();
  const [pinOpen, setPinOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasPin = !!settings.pinHash;

  const exportJson = async () => {
    const d = await getDB();
    const file = createBackup({ entries: await d.allEntries(), customQuestions: await d.customQuestions(), history: await d.getHistory() }, settings);
    await saveFile(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), `lueur-sauvegarde-${journalDate()}.json`, 'application/json');
  };

  const exportPdf = async () => {
    if (!entries.length) return toast('Rien à exporter pour l’instant.', 'info');
    try {
      toast('Création du PDF…', 'info');
      await saveFile(await buildPdf(entries, settings.name || undefined), `lueur-journal-${journalDate()}.pdf`, 'application/pdf');
    } catch {
      toast('Le PDF n’a pas pu être créé.', 'error');
    }
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    try {
      const check = validateBackup(JSON.parse(await file.text()));
      if (!check.ok) return toast(check.error, 'error');
      const n = check.backup.entries.length;
      const ok = await ui.confirm({
        title: `Importer ${n} soirée${n > 1 ? 's' : ''} ?`,
        message: 'Elles seront fusionnées avec ton journal actuel. Pour un même jour, la version la plus récente est gardée : rien n’est perdu.',
        confirmLabel: 'Importer',
      });
      if (!ok) return;
      const r = await applyImport(check.backup, 'merge');
      toast(`Import terminé : ${r.entries} soirées dans ton journal`, 'ok');
    } catch {
      toast('Ce fichier n’est pas lisible.', 'error');
    }
  };

  const wipe = async () => {
    const first = await ui.confirm({ title: 'Tout effacer ?', message: 'Toutes tes soirées, tes questions et tes réglages seront supprimés de ce téléphone.', confirmLabel: 'Continuer', danger: true });
    if (!first) return;
    const second = await ui.confirm({ title: 'Dernière confirmation', message: 'Cette action est définitive. Pense à exporter une sauvegarde avant.', confirmLabel: 'Tout effacer', danger: true });
    if (!second) return;
    await wipeEverything();
    toast('Données effacées', 'ok');
  };

  return (
    <div className="screen">
      <header className="cal-head">
        <h1>Réglages</h1>
      </header>

      <Section title="Profil">
        <Row label="Ton prénom" sub="Pour des messages plus personnels">
          <input className="text-input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Facultatif" maxLength={30} autoCapitalize="words" />
        </Row>
      </Section>

      <Section title="Rappel du soir">
        <Notifications />
      </Section>

      <Section title="Questionnaire">
        <QuestionSettings />
      </Section>

      <Section title="Apparence">
        <Appearance />
      </Section>

      <Section title="Sons">
        <Row label="Effets sonores doux">
          <Switch checked={settings.sound} onChange={(v) => { updateSettings({ sound: v }); if (v) setTimeout(() => sfx.select(), 30); }} label="Effets sonores" />
        </Row>
        {settings.sound && (
          <div className="slider">
            <div className="slider-head">
              <span>Volume</span>
              <strong>{Math.round(settings.volume * 100)} %</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              style={{ ['--pct' as string]: `${settings.volume * 100}%` }}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateSettings({ volume: v });
                configureSound({ enabled: true, volume: v });
              }}
              onPointerUp={() => sfx.next()}
              aria-label="Volume"
            />
          </div>
        )}
        <p className="muted small">Les sons sont créés par l’appareil (aucun fichier). Le commutateur silencieux de l’iPhone peut les couper.</p>
      </Section>

      <Section title="Sécurité et bienveillance">
        <Row label="Code de verrouillage" sub={hasPin ? 'Actif à chaque ouverture' : 'Protège l’accès à l’app'}>
          <Switch checked={hasPin} onChange={(v) => (v ? setPinOpen(true) : void ui.confirm({ title: 'Retirer le code ?', confirmLabel: 'Retirer', danger: true }).then((ok) => ok && removePin()))} label="Code de verrouillage" />
        </Row>
        {hasPin && (
          <div className="row-btns">
            <Btn variant="soft" onClick={() => setPinOpen(true)}>
              Changer le code
            </Btn>
            <Btn variant="ghost" onClick={lockNow}>
              <IconLock width={18} height={18} /> Verrouiller
            </Btn>
          </div>
        )}
        <p className="muted small">Le code verrouille l’écran de l’app ; il ne chiffre pas les données stockées sur le téléphone.</p>
        <Btn variant="soft" onClick={() => ui.openHelp()}>
          <IconHeart width={18} height={18} /> Besoin d’aide ? 3114 · 15
        </Btn>
      </Section>

      <Section title="Mes données" hint="Tout est sur ce téléphone. Exporte régulièrement pour ne rien perdre.">
        <div className="row-btns wrap">
          <Btn variant="soft" onClick={() => void exportJson()}>
            <IconDownload width={18} height={18} /> Sauvegarde (JSON)
          </Btn>
          <Btn variant="soft" onClick={() => void exportPdf()}>
            <IconDownload width={18} height={18} /> Journal en PDF
          </Btn>
          <Btn variant="soft" onClick={() => fileRef.current?.click()}>
            <IconUpload width={18} height={18} /> Importer
          </Btn>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        <Btn variant="danger" onClick={() => void wipe()}>
          <IconTrash width={18} height={18} /> Tout effacer
        </Btn>
      </Section>

      <Section title="À propos">
        <p className="muted small">Lueur n’est pas un dispositif médical et ne remplace pas un professionnel de santé. Elle t’aide à prendre du recul ; si tu en ressens le besoin, parle à quelqu’un.</p>
        <Btn variant="ghost" onClick={() => setAboutOpen(true)}>
          Sources des questions
        </Btn>
      </Section>

      <PinSetup open={pinOpen} onClose={() => setPinOpen(false)} />

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} tall title="D’où viennent les questions ?">
        <p className="muted">
          La banque contient {QUESTION_BANK.length} questions, écrites dans nos propres mots à partir de méthodes publiées en psychologie. Chaque question s’inspire de l’une d’elles :
        </p>
        <ul className="sources">
          {(Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).map((m) => (
            <li key={m}>
              <strong>{METHOD_LABEL[m]}</strong>
              <span className="muted small">{QUESTION_BANK.filter((q) => q.method === m).length} questions</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Références : « Trois bonnes choses » (Seligman et collègues, 2005) ; journal de gratitude (Emmons et McCullough, 2003) ; écriture expressive (Pennebaker) ; auto-compassion (Kristin Neff) ; relevé de pensées de la thérapie cognitive (Aaron Beck) ; pleine conscience (Jon Kabat-Zinn) ; clarification des valeurs (thérapie d’acceptation et d’engagement). Le détail est dans le fichier README du projet.
        </p>
      </Sheet>
    </div>
  );
}
