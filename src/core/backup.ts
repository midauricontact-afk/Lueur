import { CATEGORIES, type CategoryId, type Kind } from './categories';
import { isDateKey } from './dates';
import type { QuestionHistory } from './selection';
import { exportableSettings, type Settings } from './settings';
import type { Answer, Entry, Mood } from './types';
import type { Question } from '../data/questions';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'lueur';
  version: number;
  exportedAt: string;
  entries: Entry[];
  customQuestions: Question[];
  history: QuestionHistory;
  settings?: Partial<Settings>;
}

export function createBackup(
  data: { entries: Entry[]; customQuestions: Question[]; history: QuestionHistory },
  settings: Settings,
  now = new Date(),
): BackupFile {
  return {
    app: 'lueur',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: [...data.entries].sort((a, b) => a.date.localeCompare(b.date)),
    customQuestions: data.customQuestions,
    history: data.history,
    settings: exportableSettings(settings),
  };
}

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));
const KINDS = new Set<string>(['positive', 'hard', 'reflect']);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function cleanAnswer(a: unknown): Answer | null {
  if (!a || typeof a !== 'object') return null;
  const r = a as Record<string, unknown>;
  if (typeof r.text !== 'string' || typeof r.question !== 'string') return null;
  return {
    questionId: typeof r.questionId === 'string' ? r.questionId : 'inconnue',
    question: r.question,
    category: CATEGORY_IDS.has(String(r.category)) ? (r.category as CategoryId) : 'emotions',
    kind: KINDS.has(String(r.kind)) ? (r.kind as Kind) : 'reflect',
    text: r.text,
  };
}

function cleanEntry(e: unknown): Entry | null {
  if (!e || typeof e !== 'object') return null;
  const r = e as Record<string, unknown>;
  if (!isDateKey(r.date)) return null;
  const mood = Math.round(num(r.mood, 1, 5, 3)) as Mood;
  const now = Date.now();
  return {
    date: r.date,
    mood,
    energy: Math.round(num(r.energy, 0, 100, 50)),
    sleep: Math.round(num(r.sleep, 0, 100, 50)),
    emotions: Array.isArray(r.emotions) ? r.emotions.filter((x): x is string => typeof x === 'string').slice(0, 20) : [],
    answers: Array.isArray(r.answers) ? r.answers.map(cleanAnswer).filter((a): a is Answer => !!a) : [],
    createdAt: num(r.createdAt, 0, Number.MAX_SAFE_INTEGER, now),
    updatedAt: num(r.updatedAt, 0, Number.MAX_SAFE_INTEGER, now),
    ...(r.late === true ? { late: true } : {}),
  };
}

function cleanQuestion(q: unknown): Question | null {
  if (!q || typeof q !== 'object') return null;
  const r = q as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.text !== 'string' || !r.text.trim()) return null;
  return {
    id: r.id,
    text: r.text.slice(0, 300),
    category: CATEGORY_IDS.has(String(r.category)) ? (r.category as CategoryId) : 'emotions',
    kind: KINDS.has(String(r.kind)) ? (r.kind as Kind) : 'reflect',
    intensity: r.intensity === 'deep' ? 'deep' : 'light',
    method: 'positive',
    custom: true,
  };
}

export type BackupCheck = { ok: true; backup: BackupFile } | { ok: false; error: string };

/** Vérifie et nettoie un fichier de sauvegarde : un fichier abîmé ne doit jamais casser l'app ni écraser tes données. */
export function validateBackup(raw: unknown): BackupCheck {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Ce fichier n’est pas une sauvegarde Lueur.' };
  const r = raw as Record<string, unknown>;
  if (r.app !== 'lueur') return { ok: false, error: 'Ce fichier n’est pas une sauvegarde Lueur.' };
  if (typeof r.version !== 'number' || r.version > BACKUP_VERSION) {
    return { ok: false, error: 'Cette sauvegarde vient d’une version plus récente de Lueur. Mets l’application à jour.' };
  }
  if (!Array.isArray(r.entries)) return { ok: false, error: 'La sauvegarde ne contient pas de journal.' };

  const byDate = new Map<string, Entry>();
  for (const e of r.entries) {
    const clean = cleanEntry(e);
    if (clean && (!byDate.has(clean.date) || byDate.get(clean.date)!.updatedAt < clean.updatedAt)) byDate.set(clean.date, clean);
  }
  const history: QuestionHistory = {};
  if (r.history && typeof r.history === 'object') {
    for (const [id, v] of Object.entries(r.history as Record<string, unknown>)) {
      const h = v as { last?: unknown; count?: unknown };
      if (isDateKey(h?.last) && typeof h.count === 'number') history[id] = { last: h.last, count: h.count };
    }
  }
  return {
    ok: true,
    backup: {
      app: 'lueur',
      version: r.version,
      exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : new Date().toISOString(),
      entries: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      customQuestions: Array.isArray(r.customQuestions) ? r.customQuestions.map(cleanQuestion).filter((q): q is Question => !!q) : [],
      history,
      settings: r.settings && typeof r.settings === 'object' ? (r.settings as Partial<Settings>) : undefined,
    },
  };
}

/** Fusion : pour chaque jour, la version la plus récemment modifiée l'emporte. */
export function mergeEntries(existing: Entry[], incoming: Entry[]): Entry[] {
  const map = new Map(existing.map((e) => [e.date, e]));
  for (const e of incoming) {
    const cur = map.get(e.date);
    if (!cur || e.updatedAt > cur.updatedAt) map.set(e.date, e);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeHistory(a: QuestionHistory, b: QuestionHistory): QuestionHistory {
  const out: QuestionHistory = { ...a };
  for (const [id, v] of Object.entries(b)) {
    const cur = out[id];
    out[id] = cur ? { last: cur.last > v.last ? cur.last : v.last, count: Math.max(cur.count, v.count) } : v;
  }
  return out;
}
