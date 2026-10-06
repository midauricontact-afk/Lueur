import type { CategoryId, Kind } from './categories';
import type { DateKey } from './dates';

export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOOD_LABELS: Record<Mood, string> = {
  1: 'Très bas',
  2: 'Bas',
  3: 'Moyen',
  4: 'Bien',
  5: 'Très bien',
};

export interface Answer {
  questionId: string;
  /** Texte de la question tel qu'il t'a été posé (conservé même si la banque évolue). */
  question: string;
  category: CategoryId;
  kind: Kind;
  text: string;
}

export interface Entry {
  date: DateKey;
  mood: Mood;
  /** Énergie et sommeil, de 0 à 100. */
  energy: number;
  sleep: number;
  emotions: string[];
  answers: Answer[];
  createdAt: number;
  updatedAt: number;
  /** Rempli après coup, un autre jour que celui concerné. */
  late?: boolean;
}

export interface Emotion {
  id: string;
  label: string;
  emoji: string;
  tone: 'positive' | 'neutral' | 'hard';
}

export const EMOTIONS: Emotion[] = [
  { id: 'joie', label: 'Joie', emoji: '😊', tone: 'positive' },
  { id: 'calme', label: 'Calme', emoji: '😌', tone: 'positive' },
  { id: 'fierte', label: 'Fierté', emoji: '🌟', tone: 'positive' },
  { id: 'gratitude', label: 'Gratitude', emoji: '🙏', tone: 'positive' },
  { id: 'espoir', label: 'Espoir', emoji: '🌱', tone: 'positive' },
  { id: 'amour', label: 'Tendresse', emoji: '🥰', tone: 'positive' },
  { id: 'surprise', label: 'Surprise', emoji: '😮', tone: 'neutral' },
  { id: 'confusion', label: 'Confusion', emoji: '😵‍💫', tone: 'neutral' },
  { id: 'ennui', label: 'Ennui', emoji: '🥱', tone: 'neutral' },
  { id: 'stress', label: 'Stress', emoji: '😬', tone: 'hard' },
  { id: 'tristesse', label: 'Tristesse', emoji: '😢', tone: 'hard' },
  { id: 'colere', label: 'Colère', emoji: '😠', tone: 'hard' },
  { id: 'peur', label: 'Peur', emoji: '😨', tone: 'hard' },
  { id: 'fatigue', label: 'Fatigue', emoji: '😴', tone: 'hard' },
  { id: 'solitude', label: 'Solitude', emoji: '🫥', tone: 'hard' },
  { id: 'culpabilite', label: 'Culpabilité', emoji: '😔', tone: 'hard' },
];

export const EMOTION_BY_ID = Object.fromEntries(EMOTIONS.map((e) => [e.id, e])) as Record<string, Emotion>;

/** Texte de l'entrée utilisable pour la détection de détresse et la recherche. */
export function entryTexts(e: Entry): string[] {
  return e.answers.map((a) => a.text);
}
