import { describe, expect, it } from 'vitest';
import { ALL_CATEGORY_IDS, pickQuestions, planKinds, recencyWeight, recordAsked, redraw, seededRng, type QuestionHistory } from '../src/core/selection';
import { addDays } from '../src/core/dates';
import { QUESTION_BANK, type Question } from '../src/data/questions';

const base = { bank: QUESTION_BANK, enabled: ALL_CATEGORY_IDS, history: {} as QuestionHistory, today: '2026-10-06' };

describe('tirage des questions', () => {
  it('prévoit au moins une positive, une difficile et une tournée vers l’introspection ou demain', () => {
    expect(planKinds(3)).toEqual(['positive', 'hard', 'reflect']);
    expect(planKinds(2)).toEqual(['positive', 'hard']);
    expect(planKinds(5)).toEqual(['positive', 'hard', 'reflect', 'positive', 'reflect']);
    expect(planKinds(99)).toHaveLength(6);
  });

  it('respecte le nombre demandé et le mélange de types, sur 200 soirées', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const count of [2, 3, 4, 5]) {
        const q = pickQuestions({ ...base, count, rng: seededRng(seed * 7 + count), mood: (seed % 5) + 1 });
        expect(q).toHaveLength(count);
        expect(new Set(q.map((x) => x.id)).size).toBe(count);
        expect(q.some((x) => x.kind === 'positive')).toBe(true);
        expect(q.some((x) => x.kind === 'hard')).toBe(true);
        if (count >= 3) expect(q.some((x) => x.kind === 'reflect')).toBe(true);
      }
    }
  });

  it('évite de poser plusieurs fois la même catégorie dans une soirée', () => {
    let doubles = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const q = pickQuestions({ ...base, count: 3, rng: seededRng(seed) });
      if (new Set(q.map((x) => x.category)).size < 3) doubles++;
    }
    expect(doubles).toBeLessThan(10);
  });

  it('ne repose presque jamais une question récente (45 soirées, 3 questions par soir)', () => {
    let history: QuestionHistory = {};
    const rng = seededRng(42);
    const lastSeen = new Map<string, number>();
    let tooSoon = 0;
    let repeats = 0;
    for (let day = 0; day < 45; day++) {
      const today = addDays('2026-01-01', day);
      const picked = pickQuestions({ ...base, count: 3, history, today, rng, mood: 3 });
      for (const q of picked) {
        const prev = lastSeen.get(q.id);
        if (prev !== undefined) {
          repeats++;
          if (day - prev < 14) tooSoon++;
        }
        lastSeen.set(q.id, day);
      }
      history = recordAsked(history, picked.map((q) => q.id), today);
    }
    expect(tooSoon).toBeLessThanOrEqual(1); // moins de 14 jours : exceptionnel (jamais dans la même semaine)
    expect(repeats).toBeLessThanOrEqual(12); // un retour après plus de 14 jours reste possible, et rare
    expect(lastSeen.size).toBeGreaterThanOrEqual(120); // sur 135 tirages, au moins 120 questions différentes
  });

  it('pondère par ancienneté : jamais posée > posée il y a longtemps > posée récemment', () => {
    const h: QuestionHistory = { a: { last: '2026-10-05', count: 1 }, b: { last: '2026-09-01', count: 1 }, c: { last: '2026-05-01', count: 3 } };
    const w = (id: string) => recencyWeight(h, id, '2026-10-06');
    expect(w('zzz')).toBeGreaterThan(w('c'));
    expect(w('c')).toBeGreaterThan(w('b'));
    expect(w('b')).toBeGreaterThan(w('a'));
  });

  it('respecte les catégories activées', () => {
    const enabled = ['gratitude', 'demain', 'emotions', 'plaisir'] as const;
    for (let seed = 1; seed <= 100; seed++) {
      for (const q of pickQuestions({ ...base, enabled: [...enabled], count: 3, rng: seededRng(seed) })) expect(enabled).toContain(q.category);
    }
  });

  it('reste doux quand l’humeur est basse : moins de questions difficiles et profondes', () => {
    const deepHard = (mood: number) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) {
        n += pickQuestions({ ...base, count: 3, mood, rng: seededRng(seed) }).filter((q) => q.kind === 'hard' && q.intensity === 'deep').length;
      }
      return n;
    };
    expect(deepHard(1)).toBeLessThan(deepHard(4) * 0.7);
  });

  it('inclut tes questions personnelles, même dans une catégorie désactivée', () => {
    const mine: Question = { id: 'perso-1', text: 'Qu’est-ce qui t’a fait sourire aujourd’hui ?', category: 'gratitude', kind: 'positive', intensity: 'light', method: 'positive', custom: true };
    let seen = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const q = pickQuestions({ ...base, bank: [...QUESTION_BANK, mine], enabled: ['demain', 'emotions'], count: 3, rng: seededRng(seed) });
      if (q.some((x) => x.id === 'perso-1')) seen++;
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('propose une autre question du même type, différente de celles déjà affichées', () => {
    const shown = pickQuestions({ ...base, count: 3, rng: seededRng(5) });
    for (const q of shown) {
      const other = redraw(q, { ...base, count: 3, shown: shown.map((s) => s.id), rng: seededRng(9) })!;
      expect(other.kind).toBe(q.kind);
      expect(shown.map((s) => s.id)).not.toContain(other.id);
    }
  });

  it('met à jour l’historique', () => {
    const h = recordAsked({}, ['a', 'b'], '2026-10-01');
    expect(recordAsked(h, ['a'], '2026-10-06')).toEqual({ a: { last: '2026-10-06', count: 2 }, b: { last: '2026-10-01', count: 1 } });
  });
});
