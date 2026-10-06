import { EMOTION_BY_ID, type Entry } from './types';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export interface SearchHit {
  entry: Entry;
  /** Extrait autour de la première correspondance. */
  snippet: string;
  /** Question (ou « Émotions ») où la correspondance a été trouvée. */
  where: string;
}

function snippetOf(text: string, words: string[]): string {
  const n = normalize(text);
  const idx = Math.min(...words.map((w) => (n.indexOf(w) === -1 ? Infinity : n.indexOf(w))));
  if (!Number.isFinite(idx)) return text.slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + 100);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Recherche sans tenir compte des accents ni des majuscules ; tous les mots doivent se trouver dans le même texte. */
export function searchEntries(entries: Entry[], query: string): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];
  const hits: SearchHit[] = [];
  for (const entry of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    let found: SearchHit | undefined;
    for (const a of entry.answers) {
      const hay = normalize(`${a.question} ${a.text}`);
      if (words.every((w) => hay.includes(w))) {
        found = { entry, snippet: snippetOf(a.text, words), where: a.question };
        break;
      }
    }
    if (!found && entry.emotions.length) {
      const labels = entry.emotions.map((id) => EMOTION_BY_ID[id]?.label ?? id).join(' ');
      if (words.every((w) => normalize(labels).includes(w))) found = { entry, snippet: labels, where: 'Émotions' };
    }
    if (found) hits.push(found);
  }
  return hits;
}
