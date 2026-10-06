/**
 * Repérage de signes de grande détresse dans ce que tu écris, pour proposer de l'aide avec douceur.
 * Tout se passe sur le téléphone. Ce n'est PAS un outil de diagnostic : mieux vaut proposer une carte
 * de trop que de passer à côté, c'est pourquoi la carte reste sobre et jamais alarmiste.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ');

/** Expressions du quotidien qui contiennent « mourir » ou « mort » sans rapport avec la détresse. */
const HARMLESS =
  /\b(mort|morte|morts|mourir|mourais|meurs|crever|creve|creves)\s+(de|d')\s*(rire|honte|faim|fatigue|peur|chaud|froid|sommeil|ennui|soif|envie|jalousie)|\bdisparaitre (sous|dans|derriere|un moment|un instant|quelques)/g;

const PATTERNS: RegExp[] = [
  /\bsuicid(e|er|es|aire|aires)\b/,
  /\bme suicid/,
  /\b(envie|idee|idees|pensee|pensees|besoin|decide|decidee|veux|voudrais|aimerais|vais|pense a|penser a|songe a|souhaite)\s+(de |d')?(mourir|disparaitre|me tuer|me faire du mal|me blesser|me scarifier|me pendre|me jeter)\b/,
  // « en finir » seul est préoccupant ; « en finir avec ce rapport » ne l'est pas (« avec la vie » est traité juste en dessous).
  /\b(envie|idee|idees|pensee|pensees|besoin|decide|decidee|veux|voudrais|aimerais|vais|pense a|penser a|songe a|souhaite)\s+(de |d')?en finir(?!\s+avec\b)/,
  /\ben finir avec (la vie|tout|moi|ma vie)\b/,
  /\bmettre fin a (mes jours|ma vie|mon existence)\b/,
  /\b(je )?(veux|voudrais|aimerais|prefererais|souhaite)\s+(ne plus exister|ne plus etre la|ne plus me reveiller|tout arreter)\b/,
  /\b(plus|pas) (envie|la force|le courage|le gout) de vivre\b/,
  /\bplus envie d'etre la\b/,
  /\b(la )?vie n'a (plus )?(aucun|pas de) sens\b/,
  /\bidees? (noires|suicidaires)\b/,
  /\bpensees? (noires|suicidaires|de mort)\b/,
  /\b(mieux|plus heureux|plus heureuse) (mort|morte|sans moi)\b/,
  /\bserait? mieux sans moi\b/,
  /\bseraient mieux sans moi\b/,
  /\bje vais me (tuer|faire du mal)\b/,
  /\bme faire (du mal|disparaitre)\b/,
  /\bpersonne ne (me )?(regretterait|remarquerait mon absence)\b/,
];

export interface DistressResult {
  detected: boolean;
  /** Extraits qui ont déclenché la carte (jamais affichés tels quels, utiles pour les tests). */
  matches: string[];
}

export function detectDistress(text: string): DistressResult {
  const cleaned = normalize(text).replace(HARMLESS, ' ');
  const matches: string[] = [];
  for (const re of PATTERNS) {
    const m = cleaned.match(re);
    if (m) matches.push(m[0]);
  }
  return { detected: matches.length > 0, matches };
}

export function detectDistressIn(texts: string[]): boolean {
  return texts.some((t) => detectDistress(t).detected);
}

export const HELP_NUMBERS = [
  {
    number: '3114',
    label: 'Numéro national de prévention du suicide',
    detail: 'Gratuit, confidentiel, 24 h sur 24 et 7 jours sur 7. Pour toi, ou pour quelqu’un que tu aimes.',
  },
  {
    number: '15',
    label: 'SAMU — en cas d’urgence',
    detail: 'Si tu es en danger immédiat ou si tu as déjà commencé à te faire du mal.',
  },
] as const;
