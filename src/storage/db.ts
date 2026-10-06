import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { mergeEntries, mergeHistory, type BackupFile } from '../core/backup';
import type { DateKey } from '../core/dates';
import type { QuestionHistory } from '../core/selection';
import type { Entry } from '../core/types';
import type { Question } from '../data/questions';

interface LueurSchema extends DBSchema {
  entries: { key: string; value: Entry };
  custom: { key: string; value: Question };
  kv: { key: string; value: unknown };
}

/** Tout reste sur le téléphone (IndexedDB) : une entrée par jour, tes questions personnelles, l'historique des questions posées. */
export class LueurDB {
  private constructor(private readonly db: IDBPDatabase<LueurSchema>) {}

  static async open(name = 'lueur'): Promise<LueurDB> {
    const db = await openDB<LueurSchema>(name, 1, {
      upgrade(db) {
        db.createObjectStore('entries', { keyPath: 'date' });
        db.createObjectStore('custom', { keyPath: 'id' });
        db.createObjectStore('kv');
      },
    });
    return new LueurDB(db);
  }

  close() {
    this.db.close();
  }

  async allEntries(): Promise<Entry[]> {
    return (await this.db.getAll('entries')).sort((a, b) => a.date.localeCompare(b.date));
  }

  getEntry(date: DateKey) {
    return this.db.get('entries', date);
  }

  putEntry(entry: Entry) {
    return this.db.put('entries', entry);
  }

  deleteEntry(date: DateKey) {
    return this.db.delete('entries', date);
  }

  async entriesBetween(from: DateKey, to: DateKey): Promise<Entry[]> {
    return this.db.getAll('entries', IDBKeyRange.bound(from, to));
  }

  customQuestions(): Promise<Question[]> {
    return this.db.getAll('custom');
  }

  putCustomQuestion(q: Question) {
    return this.db.put('custom', q);
  }

  deleteCustomQuestion(id: string) {
    return this.db.delete('custom', id);
  }

  async getHistory(): Promise<QuestionHistory> {
    return ((await this.db.get('kv', 'history')) as QuestionHistory | undefined) ?? {};
  }

  setHistory(h: QuestionHistory) {
    return this.db.put('kv', h, 'history');
  }

  async clearAll() {
    const tx = this.db.transaction(['entries', 'custom', 'kv'], 'readwrite');
    await Promise.all([tx.objectStore('entries').clear(), tx.objectStore('custom').clear(), tx.objectStore('kv').clear(), tx.done]);
  }

  /** Importe une sauvegarde déjà validée. « fusionner » garde le plus récent de chaque jour ; « remplacer » repart de zéro. */
  async importBackup(backup: BackupFile, mode: 'merge' | 'replace'): Promise<{ entries: number; custom: number }> {
    const existing = mode === 'merge' ? await this.allEntries() : [];
    const merged = mergeEntries(existing, backup.entries);
    const customById = new Map<string, Question>();
    if (mode === 'merge') for (const q of await this.customQuestions()) customById.set(q.id, q);
    for (const q of backup.customQuestions) customById.set(q.id, q);
    const history = mode === 'merge' ? mergeHistory(await this.getHistory(), backup.history) : backup.history;

    const tx = this.db.transaction(['entries', 'custom', 'kv'], 'readwrite');
    if (mode === 'replace') await Promise.all([tx.objectStore('entries').clear(), tx.objectStore('custom').clear()]);
    await Promise.all([
      ...merged.map((e) => tx.objectStore('entries').put(e)),
      ...[...customById.values()].map((q) => tx.objectStore('custom').put(q)),
      tx.objectStore('kv').put(history, 'history'),
      tx.done,
    ]);
    return { entries: merged.length, custom: customById.size };
  }
}
