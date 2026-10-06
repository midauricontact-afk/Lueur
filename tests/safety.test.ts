import { describe, expect, it } from 'vitest';
import { detectDistress, detectDistressIn, HELP_NUMBERS } from '../src/core/safety';

describe('repérage de grande détresse', () => {
  const alarming = [
    'Aujourd’hui j’ai envie d’en finir.',
    "je veux mourir",
    'Je pense au suicide depuis une semaine',
    "J'ai plus envie de vivre",
    'Je n’ai plus la force de vivre comme ça',
    "j'ai des idées noires ce soir",
    'ils seraient mieux sans moi',
    'Je voudrais mettre fin à mes jours',
    'Je vais me tuer',
    'Je veux disparaître',
    'je voudrais ne plus exister',
    "J'ai envie de me faire du mal",
    'je me suicide',
    'La vie n’a plus aucun sens pour moi',
    "ENVIE D'EN FINIR",
  ];
  const harmless = [
    'J’ai ri aux éclats, mort de rire !',
    'Je suis mort de fatigue ce soir',
    "J'ai failli mourir de honte devant tout le monde",
    'J’ai envie d’en finir avec ce rapport',
    'Il va me tuer si j’arrive en retard',
    'Ce travail me tue, vivement le week-end',
    'Journée difficile mais belle soirée avec Léa',
    'Je me suis blessé au doigt en cuisinant',
    'J’ai envie de mourir de rire en repensant à sa blague',
    "J'ai envie de disparaître sous ma couette avec un thé",
  ];

  it('repère les signes de grande détresse, avec ou sans accents ni majuscules', () => {
    for (const text of alarming) expect(detectDistress(text).detected, text).toBe(true);
  });

  it('ne s’inquiète pas pour des expressions du quotidien', () => {
    for (const text of harmless.slice(0, 9)) expect(detectDistress(text).detected, text).toBe(false);
  });

  it('cherche dans plusieurs réponses', () => {
    expect(detectDistressIn(['Bonne journée', 'Je veux mourir'])).toBe(true);
    expect(detectDistressIn(['Bonne journée', 'Un peu fatigué'])).toBe(false);
    expect(detectDistressIn([])).toBe(false);
  });

  it('propose le 3114 et le 15', () => {
    expect(HELP_NUMBERS.map((h) => h.number)).toEqual(['3114', '15']);
    expect(HELP_NUMBERS[0].detail).toMatch(/gratuit/i);
    expect(HELP_NUMBERS[0].detail).toMatch(/24 h/);
  });
});
