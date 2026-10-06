/** Les dates sont des chaînes « AAAA-MM-JJ » dans le fuseau du téléphone : pas d'ambiguïté, triables, faciles à stocker. */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // midi : à l'abri des changements d'heure
}

export function isDateKey(s: unknown): s is DateKey {
  // Aller-retour : « 2026-13-45 » deviendrait une autre date au passage par Date, donc il est refusé.
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateKey(parseDateKey(s)) === s;
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);
}

/**
 * Le « jour » d'un journal du soir : si tu l'ouvres juste après minuit, il s'agit encore de ta soirée d'hier.
 * Avant 4 h du matin, on compte donc la veille.
 */
export function journalDate(now = new Date()): DateKey {
  const d = new Date(now);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

export interface MonthCell {
  date: DateKey;
  day: number;
  inMonth: boolean;
}

/** Grille d'un mois, semaines du lundi au dimanche. `month` va de 0 (janvier) à 11. */
export function monthMatrix(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const start = new Date(year, month, 1 - offset, 12);
  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      row.push({ date: toDateKey(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (w >= 4 && !row.some((c) => c.inMonth)) break;
    weeks.push(row);
  }
  return weeks;
}

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function formatLong(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatShort(key: DateKey): string {
  return parseDateKey(key).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}
