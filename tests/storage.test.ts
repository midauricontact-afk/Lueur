import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { LueurDB } from '../src/storage/db';
import { createBackup, mergeEntries, validateBackup } from '../src/core/backup';
import { DEFAULT_SETTINGS } from '../src/core/settings';
import type { Entry } from '../src/core/types';
import type { Question } from '../src/data/questions';

let n = 0;
let db: LueurDB;
beforeEach(async () => {
  db = await LueurDB.open(`test-${++n}`);
});

const entry = (date: string, extra: Partial<Entry> = {}): Entry => ({
  date,
  mood: 4,
  energy: 70,
  sleep: 40,
  emotions: ['calme'],
  answers: [{ questionId: 'gratitude-1', question: 'Quelles sont les trois bonnes choses de ta journée ?', category: 'gratitude', kind: 'positive', text: 'Un café, un message, un coucher de soleil.' }],
  createdAt: 1000,
  updatedAt: 1000,
  ...extra,
});

const mine: Question = { id: 'perso-1', text: 'Qu’est-ce qui t’a fait sourire ?', category: 'plaisir', kind: 'positive', intensity: 'light', method: 'positive', custom: true };

describe('stockage des réponses (IndexedDB)', () => {
  it('enregistre, relit, remplace et supprime une entrée par jour', async () => {
    await db.putEntry(entry('2026-10-06'));
    expect((await db.getEntry('2026-10-06'))?.answers[0].text).toContain('café');
    await db.putEntry(entry('2026-10-06', { mood: 2, updatedAt: 2000 }));
    expect((await db.allEntries()).length).toBe(1);
    expect((await db.getEntry('2026-10-06'))?.mood).toBe(2);
    await db.deleteEntry('2026-10-06');
    expect(await db.getEntry('2026-10-06')).toBeUndefined();
  });

  it('range les entrées par date et filtre par période', async () => {
    for (const d of ['2026-10-03', '2026-09-30', '2026-10-01', '2026-11-02']) await db.putEntry(entry(d));
    expect((await db.allEntries()).map((e) => e.date)).toEqual(['2026-09-30', '2026-10-01', '2026-10-03', '2026-11-02']);
    expect((await db.entriesBetween('2026-10-01', '2026-10-31')).map((e) => e.date)).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('garde tes questions personnelles et l’historique des questions posées', async () => {
    await db.putCustomQuestion(mine);
    expect(await db.customQuestions()).toEqual([mine]);
    await db.deleteCustomQuestion('perso-1');
    expect(await db.customQuestions()).toEqual([]);
    await db.setHistory({ 'gratitude-1': { last: '2026-10-06', count: 2 } });
    expect((await db.getHistory())['gratitude-1'].count).toBe(2);
  });

  it('efface tout à la demande', async () => {
    await db.putEntry(entry('2026-10-06'));
    await db.putCustomQuestion(mine);
    await db.clearAll();
    expect(await db.allEntries()).toEqual([]);
    expect(await db.customQuestions()).toEqual([]);
  });
});

describe('export / import', () => {
  it('survit à un aller-retour complet : rien n’est perdu ni modifié', async () => {
    const entries = [entry('2026-10-04'), entry('2026-10-05', { late: true, emotions: ['joie', 'fierte'] }), entry('2026-10-06', { mood: 1 })];
    for (const e of entries) await db.putEntry(e);
    await db.putCustomQuestion(mine);
    await db.setHistory({ 'gratitude-1': { last: '2026-10-06', count: 3 } });

    const file = createBackup({ entries: await db.allEntries(), customQuestions: await db.customQuestions(), history: await db.getHistory() }, { ...DEFAULT_SETTINGS, name: 'Léa', pinHash: 'x' });
    const json = JSON.stringify(file);
    expect(json).not.toContain('pinHash');

    const checked = validateBackup(JSON.parse(json));
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    const fresh = await LueurDB.open(`test-${++n}`);
    const result = await fresh.importBackup(checked.backup, 'replace');
    expect(result).toEqual({ entries: 3, custom: 1 });
    expect(await fresh.allEntries()).toEqual(entries);
    expect(await fresh.customQuestions()).toEqual([mine]);
    expect(await fresh.getHistory()).toEqual({ 'gratitude-1': { last: '2026-10-06', count: 3 } });
  });

  it('fusionne en gardant la version la plus récente de chaque jour', async () => {
    await db.putEntry(entry('2026-10-05', { mood: 2, updatedAt: 5000 }));
    await db.putEntry(entry('2026-10-06', { mood: 3, updatedAt: 1000 }));
    const incoming = validateBackup({
      app: 'lueur',
      version: 1,
      entries: [entry('2026-10-05', { mood: 5, updatedAt: 4000 }), entry('2026-10-06', { mood: 5, updatedAt: 9000 }), entry('2026-10-07')],
    });
    if (!incoming.ok) throw new Error('invalide');
    await db.importBackup(incoming.backup, 'merge');
    const all = await db.allEntries();
    expect(all.map((e) => [e.date, e.mood])).toEqual([['2026-10-05', 2], ['2026-10-06', 5], ['2026-10-07', 4]]);
  });

  it('« remplacer » repart de zéro', async () => {
    await db.putEntry(entry('2026-01-01'));
    const incoming = validateBackup({ app: 'lueur', version: 1, entries: [entry('2026-10-07')] });
    if (!incoming.ok) throw new Error('invalide');
    await db.importBackup(incoming.backup, 'replace');
    expect((await db.allEntries()).map((e) => e.date)).toEqual(['2026-10-07']);
  });

  it('refuse un fichier qui n’est pas une sauvegarde, ou venu d’une version plus récente', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ app: 'autre', version: 1, entries: [] }).ok).toBe(false);
    expect(validateBackup({ app: 'lueur', version: 99, entries: [] }).ok).toBe(false);
    expect(validateBackup({ app: 'lueur', version: 1 }).ok).toBe(false);
  });

  it('nettoie les entrées abîmées sans casser le reste', () => {
    const r = validateBackup({
      app: 'lueur',
      version: 1,
      entries: [
        entry('2026-10-01'),
        { date: 'pas-une-date', mood: 3 },
        { date: '2026-10-02', mood: 99, energy: -5, sleep: 'x', emotions: 'nope', answers: [{ text: 12 }, { question: 'Q', text: 'ok', category: 'zzz', kind: 'zzz' }] },
        42,
      ],
      customQuestions: [{ id: 'a', text: '  ' }, { id: 'b', text: 'Une vraie question ?' }],
      history: { 'x-1': { last: '2026-10-01', count: 2 }, 'y-1': { last: 'hier', count: 1 } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02']);
    const bad = r.backup.entries[1];
    expect(bad.mood).toBe(5);
    expect(bad.energy).toBe(0);
    expect(bad.sleep).toBe(50);
    expect(bad.emotions).toEqual([]);
    expect(bad.answers).toEqual([{ questionId: 'inconnue', question: 'Q', category: 'emotions', kind: 'reflect', text: 'ok' }]);
    expect(r.backup.customQuestions.map((q) => q.id)).toEqual(['b']);
    expect(Object.keys(r.backup.history)).toEqual(['x-1']);
  });

  it('mergeEntries : la plus récente gagne', () => {
    const a = [entry('2026-10-01', { mood: 1, updatedAt: 10 })];
    const b = [entry('2026-10-01', { mood: 5, updatedAt: 20 }), entry('2026-09-30')];
    expect(mergeEntries(a, b).map((e) => [e.date, e.mood])).toEqual([['2026-09-30', 4], ['2026-10-01', 5]]);
  });
});
