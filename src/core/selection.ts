import type { CategoryId, Kind } from './categories';
import { CATEGORIES } from './categories';
import { daysBetween, type DateKey } from './dates';
import type { Question } from '../data/questions';

/** Quand et combien de fois chaque question a déjà été proposée. */
export type QuestionHistory = Record<string, { last: DateKey; count: number }>;

export interface PickOptions {
  /** Toutes les questions disponibles (banque + questions personnelles). */
  bank: Question[];
  count: number;
  enabled: CategoryId[];
  history: QuestionHistory;
  today: DateKey;
  /** Humeur du jour (1 à 5) : si elle est basse, on privilégie des questions plus douces. */
  mood?: number;
  /** Aléa injectable (tests). */
  rng?: () => number;
  /** Questions à ne pas proposer (déjà à l'écran). */
  exclude?: string[];
}

/** Aléa déterministe pour les tests. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plus une question a été posée récemment, moins elle a de chances de revenir. */
export function recencyWeight(history: QuestionHistory, id: string, today: DateKey): number {
  const h = history[id];
  if (!h) return 3;
  const age = daysBetween(h.last, today);
  if (age < 7) return 0.0001; // jamais dans la même semaine, sauf s'il n'y a vraiment pas le choix
  if (age < 14) return 0.03;
  if (age < 30) return 0.4;
  if (age < 60) return 1.2;
  return 2;
}

function weightOf(q: Question, o: PickOptions, usedCategories: Set<CategoryId>): number {
  let w = recencyWeight(o.history, q.id, o.today);
  // Les questions que tu as écrites toi-même ont un petit coup de pouce : tu les as voulues.
  if (q.custom) w *= 1.5;
  if (o.mood !== undefined && o.mood <= 2) {
    // Journée difficile : on reste doux, avec un peu plus d'auto-compassion.
    if (q.kind === 'hard' && q.intensity === 'deep') w *= 0.35;
    if (q.category === 'compassion' || q.category === 'corps') w *= 1.8;
  } else if (o.mood !== undefined && o.mood >= 4 && q.intensity === 'deep') {
    w *= 1.3;
  }
  // Une même catégorie deux fois dans la même soirée : à éviter.
  if (usedCategories.has(q.category)) w *= 0.15;
  return Math.max(w, 0.0001);
}

function weightedPick(pool: Question[], weight: (q: Question) => number, rng: () => number): Question | undefined {
  if (!pool.length) return undefined;
  const weights = pool.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Les types de questions de la soirée : au moins une positive, une difficile, une tournée vers l'introspection ou demain. */
export function planKinds(count: number): Kind[] {
  const n = Math.max(1, Math.min(6, Math.round(count)));
  const base: Kind[] = n === 1 ? ['positive'] : n === 2 ? ['positive', 'hard'] : ['positive', 'hard', 'reflect'];
  const extras: Kind[] = ['positive', 'reflect', 'hard'];
  while (base.length < n) base.push(extras[(base.length - 3) % extras.length]);
  return base;
}

/**
 * Tire les questions de la soirée.
 * - respecte les catégories activées ;
 * - équilibre : positive + difficile + réflexion (ou demain) ;
 * - évite de reposer les mêmes questions trop souvent ;
 * - privilégie la douceur quand l'humeur est basse.
 */
export function pickQuestions(o: PickOptions): Question[] {
  const rng = o.rng ?? Math.random;
  const exclude = new Set(o.exclude ?? []);
  const allowed = o.bank.filter((q) => (q.custom || o.enabled.includes(q.category)) && !exclude.has(q.id));
  const result: Question[] = [];
  const used = new Set<CategoryId>();

  for (const kind of planKinds(o.count)) {
    const left = allowed.filter((q) => !result.some((r) => r.id === q.id));
    let pool = left.filter((q) => q.kind === kind);
    // Si une catégorie est désactivée, on prend une autre sorte de question plutôt que de laisser un trou.
    if (!pool.length) pool = left;
    const picked = weightedPick(pool, (q) => weightOf(q, o, used), rng);
    if (picked) {
      result.push(picked);
      used.add(picked.category);
    }
  }
  return result;
}

/** Remplace une question par une autre du même type (bouton « Une autre question »). */
export function redraw(current: Question, o: PickOptions & { shown: string[] }): Question | undefined {
  const rng = o.rng ?? Math.random;
  const blocked = new Set([...(o.exclude ?? []), ...o.shown, current.id]);
  const allowed = o.bank.filter((q) => (q.custom || o.enabled.includes(q.category)) && !blocked.has(q.id));
  const sameKind = allowed.filter((q) => q.kind === current.kind);
  const pool = sameKind.length ? sameKind : allowed;
  return weightedPick(pool, (q) => weightOf(q, o, new Set()), rng);
}

/** Met à jour l'historique après une soirée : ces questions viennent d'être posées. */
export function recordAsked(history: QuestionHistory, ids: string[], date: DateKey): QuestionHistory {
  const next: QuestionHistory = { ...history };
  for (const id of ids) next[id] = { last: date, count: (next[id]?.count ?? 0) + 1 };
  return next;
}

export const ALL_CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);
