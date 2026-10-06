import { formatLong } from '../core/dates';
import { EMOTION_BY_ID, MOOD_LABELS, type Entry } from '../core/types';

export type PdfBlock =
  | { t: 'title'; text: string }
  | { t: 'subtitle'; text: string }
  | { t: 'day'; text: string }
  | { t: 'meta'; text: string }
  | { t: 'q'; text: string }
  | { t: 'a'; text: string }
  | { t: 'gap' };

/** Les polices standard d'un PDF ne contiennent pas les emojis : on les retire proprement. */
export function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Remplace les caractères hors de portée des polices PDF standard par leur équivalent simple. */
export function pdfSafe(s: string): string {
  return stripEmoji(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/ | /g, ' ');
}

/** Le contenu du PDF, indépendamment de la façon de le dessiner (donc testable). */
export function buildPdfModel(entries: Entry[], opts: { name?: string; generatedAt: Date }): PdfBlock[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const blocks: PdfBlock[] = [
    { t: 'title', text: opts.name ? `Le journal de ${opts.name}` : 'Mon journal du soir' },
    { t: 'subtitle', text: `Lueur · exporté le ${opts.generatedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` },
    { t: 'subtitle', text: `${sorted.length} soirée${sorted.length > 1 ? 's' : ''}` },
    { t: 'gap' },
  ];
  for (const e of sorted) {
    blocks.push({ t: 'day', text: `${formatLong(e.date)}${e.late ? ' (rempli en retard)' : ''}` });
    const emotions = e.emotions.map((id) => EMOTION_BY_ID[id]?.label ?? id);
    blocks.push({
      t: 'meta',
      text:
        `Humeur : ${MOOD_LABELS[e.mood]} (${e.mood}/5)  ·  Énergie : ${e.energy} %  ·  Sommeil : ${e.sleep} %` +
        (emotions.length ? `  ·  Émotions : ${emotions.join(', ')}` : ''),
    });
    for (const a of e.answers) {
      blocks.push({ t: 'q', text: a.question });
      blocks.push({ t: 'a', text: a.text.trim() || '—' });
    }
    blocks.push({ t: 'gap' });
  }
  return blocks;
}
