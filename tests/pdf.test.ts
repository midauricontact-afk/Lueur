import { describe, expect, it } from 'vitest';
import { buildPdfModel, pdfSafe, stripEmoji } from '../src/export/pdfModel';
import { buildPdf } from '../src/export/pdf';
import type { Entry } from '../src/core/types';

const e = (date: string, text: string, extra: Partial<Entry> = {}): Entry => ({
  date,
  mood: 4,
  energy: 70,
  sleep: 55,
  emotions: ['joie', 'calme'],
  answers: [{ questionId: 'gratitude-1', question: 'Qu’est-ce qui t’a fait du bien ? 🌿', category: 'gratitude', kind: 'positive', text }],
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

describe('export PDF', () => {
  const entries = [e('2026-10-06', 'Un thé chaud 😊 et un appel de Léa…'), e('2026-10-05', 'Rien de spécial', { late: true, emotions: [] })];

  it('range les soirées dans l’ordre chronologique avec le détail de chacune', () => {
    const blocks = buildPdfModel(entries, { name: 'Léa', generatedAt: new Date(2026, 9, 7) });
    expect(blocks[0]).toEqual({ t: 'title', text: 'Le journal de Léa' });
    const days = blocks.filter((b) => b.t === 'day').map((b) => (b as { text: string }).text);
    expect(days[0]).toMatch(/5 octobre 2026.*en retard/);
    expect(days[1]).toMatch(/6 octobre 2026/);
    const meta = blocks.find((b) => b.t === 'meta') as { text: string };
    expect(meta.text).toMatch(/Humeur : Bien \(4\/5\)/);
    expect(blocks.some((b) => b.t === 'meta' && b.text.includes('Joie, Calme'))).toBe(true);
  });

  it('retire les emojis et les caractères que les polices PDF standard ne savent pas écrire', () => {
    expect(stripEmoji('Merci 🌿 ça va 😊')).toBe('Merci ça va');
    expect(pdfSafe('L’été… « bien » – oui')).toBe("L'ete... « bien » - oui".replace('ete', 'été'));
    expect(pdfSafe('Café 😊')).toBe('Café');
  });

  it('génère un vrai fichier PDF', async () => {
    const many = Array.from({ length: 40 }, (_, i) => e(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, 'Un long texte. '.repeat(60)));
    const blob = await buildPdf(many, 'Léa');
    expect(blob.size).toBeGreaterThan(5000);
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe('%PDF-');
  });
});
