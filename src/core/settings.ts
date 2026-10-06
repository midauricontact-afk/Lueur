import { ALL_CATEGORY_IDS } from './selection';
import type { CategoryId } from './categories';
import type { FontId, Mode, ThemeId } from './themes';
import { THEME_BY_ID, FONTS } from './themes';

export interface Settings {
  name: string;
  themeId: ThemeId;
  mode: Mode;
  /** Couleur d'accent choisie (null = celle du thème). */
  accent: string | null;
  font: FontId;
  questionCount: number;
  enabledCategories: CategoryId[];
  /** Heure du rappel, « HH:MM ». */
  notifTime: string;
  /** Adresse du service de notifications (Cloudflare Worker), si elle diffère de celle fournie avec l'app. */
  pushUrl: string;
  sound: boolean;
  volume: number;
  onboarded: boolean;
  /** Empreinte du code PIN (jamais le code lui-même). */
  pinHash: string;
  pinSalt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  themeId: 'nuit',
  mode: 'auto',
  accent: null,
  font: 'doux',
  questionCount: 3,
  enabledCategories: ALL_CATEGORY_IDS,
  notifTime: '21:00',
  pushUrl: '',
  sound: true,
  volume: 0.5,
  onboarded: false,
  pinHash: '',
  pinSalt: '',
};

const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Remet n'importe quel objet (ancienne version, import, stockage abîmé) dans un état valide. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const cats = Array.isArray(r.enabledCategories) ? r.enabledCategories.filter((c): c is CategoryId => ALL_CATEGORY_IDS.includes(c as CategoryId)) : d.enabledCategories;
  return {
    name: typeof r.name === 'string' ? r.name.slice(0, 40) : d.name,
    themeId: typeof r.themeId === 'string' && r.themeId in THEME_BY_ID ? (r.themeId as ThemeId) : d.themeId,
    mode: r.mode === 'light' || r.mode === 'dark' || r.mode === 'auto' ? r.mode : d.mode,
    accent: typeof r.accent === 'string' && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent : null,
    font: FONTS.some((f) => f.id === r.font) ? (r.font as FontId) : d.font,
    questionCount: typeof r.questionCount === 'number' ? Math.min(5, Math.max(2, Math.round(r.questionCount))) : d.questionCount,
    enabledCategories: cats.length ? cats : d.enabledCategories,
    notifTime: isTime(r.notifTime) ? r.notifTime : d.notifTime,
    pushUrl: typeof r.pushUrl === 'string' ? r.pushUrl.trim().replace(/\/+$/, '') : d.pushUrl,
    sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
    volume: typeof r.volume === 'number' ? Math.min(1, Math.max(0, r.volume)) : d.volume,
    onboarded: r.onboarded === true,
    pinHash: typeof r.pinHash === 'string' ? r.pinHash : '',
    pinSalt: typeof r.pinSalt === 'string' ? r.pinSalt : '',
  };
}

/** Réglages à inclure dans une sauvegarde : tout sauf le code PIN et l'adresse du service. */
export function exportableSettings(s: Settings): Partial<Settings> {
  const { pinHash: _h, pinSalt: _s, pushUrl: _u, onboarded: _o, ...rest } = s;
  return rest;
}
