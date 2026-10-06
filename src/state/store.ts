import { configureSound } from '../audio/sounds';
import { mergeEntries, type BackupFile } from '../core/backup';
import { journalDate, type DateKey } from '../core/dates';
import { recordAsked, type QuestionHistory } from '../core/selection';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '../core/settings';
import { resolveMode, themeVars, FONTS } from '../core/themes';
import type { Answer, Entry, Mood } from '../core/types';
import type { Question } from '../data/questions';
import { LueurDB } from '../storage/db';
import { createStore } from './createStore';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error' | 'info';
}

export interface AppState {
  ready: boolean;
  settings: Settings;
  entries: Entry[];
  custom: Question[];
  history: QuestionHistory;
  locked: boolean;
  toasts: Toast[];
  /** Clé de la soirée « en cours » (avant 4 h du matin, c'est encore la veille). */
  today: DateKey;
  dark: boolean;
}

const SETTINGS_KEY = 'lueur.settings';

function readSettings(): Settings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export const store = createStore<AppState>({
  ready: false,
  settings: readSettings(),
  entries: [],
  custom: [],
  history: {},
  locked: false,
  toasts: [],
  today: journalDate(),
  dark: media?.matches ?? true,
});

let db: LueurDB | null = null;
export async function getDB(): Promise<LueurDB> {
  db ??= await LueurDB.open();
  return db;
}

// ---------------------------------------------------------------------------
// Apparence
// ---------------------------------------------------------------------------

/** Applique le thème, la police et la couleur d'accent à toute la page. */
export function applyAppearance(s: Settings = store.get().settings) {
  const mode = resolveMode(s.mode, media?.matches ?? true);
  const root = document.documentElement;
  const vars = themeVars(s.themeId, mode, s.accent);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.setProperty('--font', FONTS.find((f) => f.id === s.font)!.stack);
  root.dataset.theme = s.themeId;
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = vars['--bg1']));
  if (store.get().dark !== (mode === 'dark')) store.set({ dark: mode === 'dark' });
}

media?.addEventListener?.('change', () => applyAppearance());

export function updateSettings(patch: Partial<Settings>) {
  const settings = sanitizeSettings({ ...store.get().settings, ...patch });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* stockage plein ou indisponible */
  }
  store.set({ settings });
  configureSound({ enabled: settings.sound, volume: settings.volume });
  applyAppearance(settings);
  void syncPrefsForServiceWorker(settings);
}

/** Le service worker (qui affiche la notification) lit ton prénom ici pour personnaliser le message. */
async function syncPrefsForServiceWorker(s: Settings) {
  try {
    const cache = await caches.open('lueur-prefs');
    await cache.put('prefs', new Response(JSON.stringify({ name: s.name }), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    /* Cache API indisponible : la notification sera simplement moins personnelle */
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

let toastSeq = 0;
export function toast(text: string, kind: Toast['kind'] = 'info') {
  const t: Toast = { id: ++toastSeq, text, kind };
  store.set((s) => ({ toasts: [...s.toasts, t] }));
  setTimeout(() => store.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), kind === 'error' ? 6000 : 3200);
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

export async function initApp() {
  const d = await getDB();
  const [entries, custom, history] = await Promise.all([d.allEntries(), d.customQuestions(), d.getHistory()]);
  const settings = readSettings();
  configureSound({ enabled: settings.sound, volume: settings.volume });
  store.set({ ready: true, entries, custom, history, settings, locked: !!settings.pinHash, today: journalDate() });
  applyAppearance(settings);
  void syncPrefsForServiceWorker(settings);
}

/** À l'ouverture ou au retour dans l'app : le « ce soir » peut avoir changé de jour. */
export function refreshToday() {
  const today = journalDate();
  if (today !== store.get().today) store.set({ today });
}

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export interface EntryInput {
  date: DateKey;
  mood: Mood;
  energy: number;
  sleep: number;
  emotions: string[];
  answers: Answer[];
  /** Toutes les questions affichées ce soir-là (répondues, passées ou remplacées) : on évite de les reposer trop vite. */
  shownIds: string[];
}

export async function saveEntry(input: EntryInput): Promise<Entry> {
  const d = await getDB();
  const existing = store.get().entries.find((e) => e.date === input.date);
  const now = Date.now();
  const entry: Entry = {
    date: input.date,
    mood: input.mood,
    energy: input.energy,
    sleep: input.sleep,
    emotions: input.emotions,
    answers: input.answers,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    // Un jour rempli après coup est marqué « en retard ».
    ...(input.date !== journalDate() ? { late: true } : {}),
  };
  await d.putEntry(entry);
  const history = recordAsked(store.get().history, input.shownIds, input.date);
  await d.setHistory(history);
  store.set((s) => ({ entries: mergeEntries(s.entries, [entry]), history }));
  return entry;
}

export async function removeEntry(date: DateKey) {
  const d = await getDB();
  await d.deleteEntry(date);
  store.set((s) => ({ entries: s.entries.filter((e) => e.date !== date) }));
}

// ---------------------------------------------------------------------------
// Questions personnelles
// ---------------------------------------------------------------------------

export async function addCustomQuestion(text: string, kind: Question['kind']) {
  const clean = text.trim().slice(0, 300);
  if (!clean) return;
  const q: Question = {
    id: `perso-${Date.now().toString(36)}`,
    text: clean,
    category: kind === 'positive' ? 'plaisir' : kind === 'hard' ? 'emotions' : 'demain',
    kind,
    intensity: 'light',
    method: 'positive',
    custom: true,
  };
  await (await getDB()).putCustomQuestion(q);
  store.set((s) => ({ custom: [...s.custom, q] }));
}

export async function removeCustomQuestion(id: string) {
  await (await getDB()).deleteCustomQuestion(id);
  store.set((s) => ({ custom: s.custom.filter((q) => q.id !== id) }));
}

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------

export async function applyImport(backup: BackupFile, mode: 'merge' | 'replace') {
  const d = await getDB();
  const result = await d.importBackup(backup, mode);
  const [entries, custom, history] = await Promise.all([d.allEntries(), d.customQuestions(), d.getHistory()]);
  store.set({ entries, custom, history });
  return result;
}

export async function wipeEverything() {
  await (await getDB()).clearAll();
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem('lueur.draft');
  } catch {
    /* ignoré */
  }
  const settings = { ...DEFAULT_SETTINGS };
  store.set({ entries: [], custom: [], history: {}, settings, locked: false });
  configureSound({ enabled: settings.sound, volume: settings.volume });
  applyAppearance(settings);
}

// ---------------------------------------------------------------------------
// Code PIN (verrouillage de l'écran : un confort, pas un chiffrement des données)
// ---------------------------------------------------------------------------

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return hex(bits);
}

export async function setPin(pin: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  updateSettings({ pinHash: await hashPin(pin, salt), pinSalt: salt });
}

export async function checkPin(pin: string): Promise<boolean> {
  const { pinHash, pinSalt } = store.get().settings;
  return !!pinHash && (await hashPin(pin, pinSalt)) === pinHash;
}

export function removePin() {
  updateSettings({ pinHash: '', pinSalt: '' });
  store.set({ locked: false });
}

export function lockNow() {
  if (store.get().settings.pinHash) store.set({ locked: true });
}
