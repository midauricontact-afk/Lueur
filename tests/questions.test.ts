import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/core/categories';
import { QUESTION_BANK } from '../src/data/questions';

describe('banque de questions', () => {
  it('contient au moins 150 questions, toutes distinctes', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(150);
    expect(new Set(QUESTION_BANK.map((q) => q.id)).size).toBe(QUESTION_BANK.length);
    expect(new Set(QUESTION_BANK.map((q) => q.text)).size).toBe(QUESTION_BANK.length);
  });

  it('couvre toutes les catégories avec assez de choix', () => {
    for (const c of CATEGORIES) {
      expect(QUESTION_BANK.filter((q) => q.category === c.id).length, c.label).toBeGreaterThanOrEqual(10);
    }
  });

  it('propose de quoi équilibrer : positif, difficile, réflexion, léger et profond', () => {
    for (const kind of ['positive', 'hard', 'reflect'] as const) {
      expect(QUESTION_BANK.filter((q) => q.kind === kind).length, kind).toBeGreaterThanOrEqual(40);
    }
    for (const intensity of ['light', 'deep'] as const) {
      expect(QUESTION_BANK.filter((q) => q.intensity === intensity).length, intensity).toBeGreaterThanOrEqual(50);
    }
    // Même les questions difficiles existent en version légère (pour les soirées fragiles).
    expect(QUESTION_BANK.filter((q) => q.kind === 'hard' && q.intensity === 'light').length).toBeGreaterThanOrEqual(15);
  });

  it('a des identifiants stables « catégorie-numéro »', () => {
    for (const q of QUESTION_BANK) expect(q.id).toMatch(new RegExp(`^${q.category}-\\d+$`));
  });

  it('est rédigée en tutoyant, sans formule administrative', () => {
    for (const q of QUESTION_BANK) {
      expect(q.text, q.id).not.toMatch(/\b(vous|votre|vos|veuillez)\b/i);
      expect(q.text.length, q.id).toBeGreaterThan(20);
      expect(q.text.length, q.id).toBeLessThan(200);
      expect(q.text, q.id).toMatch(/[?.…)]$/);
    }
  });

  it('ne suppose jamais ton genre : aucun accord au masculin ou au féminin', () => {
    const gendered =
      /\b(fier|fière|heureux|heureuse|content|contente|fatigué|fatiguée|épuisé|épuisée|stressé|stressée|inquiet|prêt|prête|sûr|sûre|soutenu|soutenue|compris|comprise|entouré|entourée|déçu|déçue|reconnaissant|reconnaissante|motivé|motivée|perdu|perdue|touché|touchée)\b|\b(sens|es|étais|restes?|sentir|être) seule?\b/i;
    const participleAfterTe = /\bt['’](a|avait|aurait|ont|avaient) (surpris|touché|aidé|accompagné|énervé|agacé|blessé|rassuré|apaisé|inquiété|frustré|stressé|fatigué|retenu|emmené|poussé|aidée?)\b/i;
    for (const q of QUESTION_BANK) {
      expect(q.text, q.id).not.toMatch(gendered);
      expect(q.text, q.id).not.toMatch(participleAfterTe);
      expect(q.text, q.id).not.toMatch(/\(e\)|\(s\)|·e\b|·s\b/);
    }
  });

  it('n’est jamais culpabilisante', () => {
    const guilt = /(tu aurais dû|tu devrais|c['’]est ta faute|pourquoi n['’]as-tu pas|tu n['’]as pas assez|tu as échoué|honte à toi|tu dois absolument)/i;
    for (const q of QUESTION_BANK) expect(q.text, q.id).not.toMatch(guilt);
  });

  it('cite la méthode dont chaque question s’inspire', () => {
    for (const q of QUESTION_BANK) expect(q.method, q.id).toBeTruthy();
    const methods = new Set(QUESTION_BANK.map((q) => q.method));
    for (const m of ['three-good-things', 'gratitude', 'expressive', 'compassion', 'cbt', 'mindfulness', 'values']) {
      expect(methods.has(m as never), m).toBe(true);
    }
  });

  it('contient la formule « Qu’est-ce qui t’a fait plaisir » et les questions demandées', () => {
    const texts = QUESTION_BANK.map((q) => q.text.toLowerCase());
    expect(texts.some((t) => t.includes('trois bonnes choses'))).toBe(true);
    expect(texts.some((t) => t.includes('besoin d’entendre'))).toBe(true);
    expect(texts.some((t) => t.includes('inquiète'))).toBe(true);
  });
});
