import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isDateKey, journalDate, monthMatrix, toDateKey } from '../src/core/dates';
import { average, emotionCounts, encouragement, entriesInRange, moodDistribution, seriesEndingAt, streakInfo } from '../src/core/stats';
import { searchEntries } from '../src/core/search';
import { DEFAULT_SETTINGS, exportableSettings, sanitizeSettings } from '../src/core/settings';
import { THEMES, themeVars, resolveMode, ACCENT_CHOICES, FONTS } from '../src/core/themes';
import type { Entry, Mood } from '../src/core/types';

function entry(date: string, mood: Mood, extra: Partial<Entry> = {}): Entry {
  return { date, mood, energy: 60, sleep: 50, emotions: [], answers: [], createdAt: 1, updatedAt: 1, ...extra };
}

describe('dates', () => {
  it('compte la veille quand on ouvre l’app juste après minuit', () => {
    expect(journalDate(new Date(2026, 9, 6, 21, 0))).toBe('2026-10-06');
    expect(journalDate(new Date(2026, 9, 7, 0, 30))).toBe('2026-10-06');
    expect(journalDate(new Date(2026, 9, 7, 3, 59))).toBe('2026-10-06');
    expect(journalDate(new Date(2026, 9, 7, 4, 0))).toBe('2026-10-07');
    expect(journalDate(new Date(2026, 0, 1, 1, 0))).toBe('2025-12-31');
  });

  it('calcule les jours sans se tromper au changement d’heure', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('valide les clés de date', () => {
    expect(isDateKey('2026-10-06')).toBe(true);
    expect(isDateKey('2026-13-45')).toBe(false);
    expect(isDateKey('hier')).toBe(false);
    expect(toDateKey(new Date(2026, 1, 5))).toBe('2026-02-05');
  });

  it('construit la grille d’un mois, semaines du lundi au dimanche', () => {
    const weeks = monthMatrix(2026, 9); // octobre 2026 : le 1er est un jeudi
    expect(weeks[0].map((c) => c.day)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(weeks[0].map((c) => c.inMonth)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(monthMatrix(2026, 1)).toHaveLength(5); // février 2026 commence un dimanche : 5 semaines
    expect(monthMatrix(2027, 1)).toHaveLength(4); // février 2027 commence un lundi : 4 semaines
  });
});

describe('statistiques', () => {
  it('calcule la série de jours consécutifs', () => {
    const dates = ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'];
    expect(streakInfo(dates, '2026-10-06')).toEqual({ current: 3, best: 3, doneToday: true });
    // Ce soir pas encore rempli : la série d'hier n'est pas perdue.
    expect(streakInfo(dates.slice(0, 4), '2026-10-06')).toEqual({ current: 2, best: 2, doneToday: false });
    // Un jour manqué : la série repart de zéro.
    expect(streakInfo(['2026-10-01', '2026-10-02'], '2026-10-06').current).toBe(0);
    expect(streakInfo([], '2026-10-06')).toEqual({ current: 0, best: 0, doneToday: false });
  });

  it('retient la meilleure série', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-10', '2026-09-11'];
    expect(streakInfo(dates, '2026-09-11').best).toBe(4);
    expect(streakInfo(dates, '2026-09-11').current).toBe(2);
  });

  it('produit une série quotidienne avec des trous pour les jours non remplis', () => {
    const s = seriesEndingAt([entry('2026-10-05', 4), entry('2026-10-07', 2)], '2026-10-07', 4);
    expect(s.map((p) => [p.date, p.mood])).toEqual([['2026-10-04', undefined], ['2026-10-05', 4], ['2026-10-06', undefined], ['2026-10-07', 2]]);
    expect(average(s.map((p) => p.mood))).toBe(3);
    expect(average([])).toBeNull();
  });

  it('compte les émotions les plus fréquentes et la répartition des humeurs', () => {
    const es = [entry('2026-10-01', 4, { emotions: ['joie', 'calme'] }), entry('2026-10-02', 2, { emotions: ['stress', 'calme'] }), entry('2026-10-03', 4, { emotions: ['calme'] })];
    expect(emotionCounts(es)[0]).toEqual({ id: 'calme', count: 3 });
    expect(moodDistribution(es)).toEqual([0, 1, 0, 2, 0]);
    expect(entriesInRange(es, '2026-10-02', '2026-10-03')).toHaveLength(2);
  });

  it('encourage sans jamais culpabiliser', () => {
    expect(encouragement(7, 3)).toMatch(/semaine/);
    expect(encouragement(1, 1)).toMatch(/difficile/);
    for (const s of [0, 1, 3, 7, 14, 30]) for (const m of [1, 3, 5]) expect(encouragement(s, m)).not.toMatch(/\bfier\b|\bfière\b/);
  });
});

describe('recherche dans le journal', () => {
  const es = [
    entry('2026-10-01', 4, { answers: [{ questionId: 'a', question: 'Qu’est-ce qui t’a fait plaisir ?', category: 'plaisir', kind: 'positive', text: 'Un café en terrasse avec Léa, le soleil était doux' }] }),
    entry('2026-10-03', 2, { answers: [{ questionId: 'b', question: 'Qu’est-ce qui t’inquiète ?', category: 'peurs', kind: 'hard', text: 'L’examen de lundi' }], emotions: ['stress'] }),
  ];
  it('trouve sans tenir compte des accents ni des majuscules, du plus récent au plus ancien', () => {
    expect(searchEntries(es, 'CAFE lea')[0].entry.date).toBe('2026-10-01');
    expect(searchEntries(es, 'examen')[0].snippet).toContain('examen');
    expect(searchEntries(es, 'inquiete')).toHaveLength(1); // trouve aussi dans la question
    expect(searchEntries(es, 'stress')[0].where).toBe('Émotions');
    expect(searchEntries(es, 'zzz')).toEqual([]);
    expect(searchEntries(es, 'a')).toEqual([]); // un seul caractère : trop vague
  });
});

describe('réglages et thèmes', () => {
  it('remet n’importe quelle donnée abîmée dans un état valide', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = sanitizeSettings({ name: 'Léa', themeId: 'inconnu', mode: 'dark', accent: 'rouge', font: 'comic', questionCount: 99, enabledCategories: ['x'], notifTime: '25:99', volume: 7, pushUrl: 'https://a.b/ ' });
    expect(s).toMatchObject({ name: 'Léa', themeId: 'nuit', mode: 'dark', accent: null, font: 'doux', questionCount: 5, notifTime: '21:00', volume: 1, pushUrl: 'https://a.b' });
    expect(s.enabledCategories.length).toBe(12);
    expect(sanitizeSettings({ questionCount: 0 }).questionCount).toBe(2);
    expect(sanitizeSettings({ notifTime: '07:05' }).notifTime).toBe('07:05');
  });

  it('n’exporte jamais le code PIN', () => {
    const e = exportableSettings({ ...DEFAULT_SETTINGS, pinHash: 'secret', pinSalt: 'sel' });
    expect(JSON.stringify(e)).not.toContain('secret');
    expect(e).not.toHaveProperty('pinHash');
  });

  it('propose au moins 6 thèmes, 3 polices et des couleurs d’accent, en clair comme en sombre', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(6);
    expect(FONTS.length).toBeGreaterThanOrEqual(2);
    expect(ACCENT_CHOICES.length).toBeGreaterThanOrEqual(5);
    for (const t of THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        const v = themeVars(t.id, mode, null);
        for (const k of ['--bg1', '--bg2', '--text', '--muted', '--accent', '--surface', '--border', '--on-accent']) expect(v[k], `${t.id} ${mode} ${k}`).toBeTruthy();
      }
    }
    expect(themeVars('nuit', 'dark', '#ff0000')['--accent']).toBe('#ff0000');
    expect(resolveMode('auto', true)).toBe('dark');
    expect(resolveMode('light', true)).toBe('light');
  });
});
