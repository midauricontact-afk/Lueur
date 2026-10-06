export type Kind = 'positive' | 'hard' | 'reflect';
export type Intensity = 'light' | 'deep';

/** Méthode dont la question s'inspire (voir le README pour les sources). */
export type Method =
  | 'three-good-things'
  | 'gratitude'
  | 'positive'
  | 'expressive'
  | 'compassion'
  | 'cbt'
  | 'mindfulness'
  | 'values';

export type CategoryId =
  | 'gratitude'
  | 'fierte'
  | 'plaisir'
  | 'relations'
  | 'emotions'
  | 'peurs'
  | 'compassion'
  | 'pensees'
  | 'corps'
  | 'valeurs'
  | 'presence'
  | 'demain';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  emoji: string;
  hint: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'gratitude', label: 'Gratitude', emoji: '🌿', hint: 'Remarquer ce qui va bien' },
  { id: 'fierte', label: 'Fierté', emoji: '🌟', hint: 'Reconnaître tes efforts' },
  { id: 'plaisir', label: 'Petits bonheurs', emoji: '☕', hint: 'Les moments agréables' },
  { id: 'relations', label: 'Relations', emoji: '💬', hint: 'Les liens avec les autres' },
  { id: 'emotions', label: 'Émotions difficiles', emoji: '🌧️', hint: 'Accueillir ce qui pèse' },
  { id: 'peurs', label: 'Peurs et inquiétudes', emoji: '🌫️', hint: 'Apprivoiser ce qui inquiète' },
  { id: 'compassion', label: 'Auto-compassion', emoji: '🤍', hint: 'Te parler avec douceur' },
  { id: 'pensees', label: 'Pensées', emoji: '💭', hint: 'Prendre du recul' },
  { id: 'corps', label: 'Corps et énergie', emoji: '🫧', hint: 'Écouter ton corps' },
  { id: 'valeurs', label: 'Valeurs', emoji: '🧭', hint: 'Ce qui compte pour toi' },
  { id: 'presence', label: 'Présence', emoji: '🕯️', hint: 'Être là, maintenant' },
  { id: 'demain', label: 'Demain', emoji: '🌅', hint: 'Se tourner vers la suite' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryInfo>;

export const KIND_LABEL: Record<Kind, string> = {
  positive: 'Un moment positif',
  hard: 'Ce qui est difficile',
  reflect: 'Une pensée pour toi',
};

export const METHOD_LABEL: Record<Method, string> = {
  'three-good-things': 'Trois bonnes choses (psychologie positive)',
  gratitude: 'Journal de gratitude',
  positive: 'Psychologie positive',
  expressive: 'Écriture expressive',
  compassion: 'Auto-compassion',
  cbt: 'Thérapie cognitivo-comportementale',
  mindfulness: 'Pleine conscience',
  values: 'Valeurs (thérapie d’acceptation et d’engagement)',
};
