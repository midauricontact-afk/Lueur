import { addDays, daysBetween, type DateKey } from './dates';
import type { Entry } from './types';

export interface StreakInfo {
  /** Jours consécutifs jusqu'à aujourd'hui (ou jusqu'à hier si ce soir n'est pas encore rempli). */
  current: number;
  best: number;
  /** Aujourd'hui est-il déjà rempli ? */
  doneToday: boolean;
}

export function streakInfo(dates: Iterable<DateKey>, today: DateKey): StreakInfo {
  const set = new Set(dates);
  const doneToday = set.has(today);
  let cursor = doneToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best, doneToday };
}

export interface DayPoint {
  date: DateKey;
  mood?: number;
  energy?: number;
  sleep?: number;
}

/** Une valeur par jour sur les `days` derniers jours (jusqu'à `end` inclus) ; vide si le jour n'est pas rempli. */
export function seriesEndingAt(entries: Entry[], end: DateKey, days: number): DayPoint[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const e = byDate.get(date);
    out.push(e ? { date, mood: e.mood, energy: e.energy, sleep: e.sleep } : { date });
  }
  return out;
}

export function average(values: (number | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function emotionCounts(entries: Entry[]): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const id of new Set(e.emotions)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/** Nombre de jours pour chaque humeur, de 1 à 5. */
export function moodDistribution(entries: Entry[]): [number, number, number, number, number] {
  const d: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const e of entries) d[e.mood - 1]++;
  return d;
}

export function entriesInRange(entries: Entry[], from: DateKey, to: DateKey): Entry[] {
  return entries.filter((e) => e.date >= from && e.date <= to);
}

/** Message d'encouragement pour l'écran de fin, selon la série et l'humeur. */
export function encouragement(streak: number, mood: number): string {
  if (streak >= 30) return 'Un mois de soirées pour toi. Quelle belle constance.';
  if (streak >= 14) return 'Deux semaines de suite : tu t’offres un vrai rendez-vous avec toi-même.';
  if (streak >= 7) return 'Une semaine entière ! Ce petit rituel prend racine.';
  if (streak >= 3) return `${streak} soirées de suite : continue, doucement.`;
  if (mood <= 2) return 'Merci de t’être posé même par une journée difficile. C’est déjà prendre soin de toi.';
  if (mood >= 4) return 'Belle soirée. Garde un peu de cette lumière pour demain.';
  return 'Merci pour ce moment. Ta régularité, même discrète, compte vraiment.';
}
