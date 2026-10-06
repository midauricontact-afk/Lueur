export type ThemeId = 'nuit' | 'coucher' | 'foret' | 'ocean' | 'pastel' | 'minimal';
export type Mode = 'auto' | 'light' | 'dark';
export type FontId = 'doux' | 'elegant' | 'net';

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Teintes (0–360) des deux couleurs du fond et saturation de base. */
  h1: number;
  h2: number;
  sat: number;
  /** Couleur d'accent par défaut, par mode. */
  accent: { dark: string; light: string };
  /** Décor animé du fond. */
  decor: 'stars' | 'sun' | 'leaves' | 'waves' | 'bubbles' | 'none';
}

export const THEMES: Theme[] = [
  { id: 'nuit', name: 'Nuit étoilée', tagline: 'Bleu profond et étoiles', h1: 245, h2: 268, sat: 55, accent: { dark: '#a7a5ff', light: '#5b57d6' }, decor: 'stars' },
  { id: 'coucher', name: 'Coucher de soleil', tagline: 'Orange doux et rose', h1: 18, h2: 335, sat: 60, accent: { dark: '#ffa07a', light: '#d9532b' }, decor: 'sun' },
  { id: 'foret', name: 'Forêt', tagline: 'Vert mousse apaisant', h1: 155, h2: 175, sat: 40, accent: { dark: '#8fd8a8', light: '#2f7d55' }, decor: 'leaves' },
  { id: 'ocean', name: 'Océan', tagline: 'Bleus et turquoises', h1: 200, h2: 188, sat: 55, accent: { dark: '#6cd3e8', light: '#0b7a96' }, decor: 'waves' },
  { id: 'pastel', name: 'Pastel', tagline: 'Rose, lilas et douceur', h1: 320, h2: 270, sat: 50, accent: { dark: '#f0a6d6', light: '#b6459a' }, decor: 'bubbles' },
  { id: 'minimal', name: 'Minimal', tagline: 'Sobre, sans décor', h1: 220, h2: 220, sat: 8, accent: { dark: '#d4d4d8', light: '#3f3f46' }, decor: 'none' },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, Theme>;

export const ACCENT_CHOICES: { id: string; name: string; dark: string; light: string }[] = [
  { id: 'lavande', name: 'Lavande', dark: '#a7a5ff', light: '#5b57d6' },
  { id: 'corail', name: 'Corail', dark: '#ff9a8b', light: '#d6452f' },
  { id: 'menthe', name: 'Menthe', dark: '#7fe0b5', light: '#1f8a5b' },
  { id: 'ciel', name: 'Ciel', dark: '#7cc8ff', light: '#1b74c4' },
  { id: 'rose', name: 'Rose', dark: '#f5a3cf', light: '#c0407f' },
  { id: 'ambre', name: 'Ambre', dark: '#ffcb6b', light: '#b87500' },
];

export const FONTS: { id: FontId; name: string; stack: string; sample: string }[] = [
  { id: 'doux', name: 'Doux', stack: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, sans-serif', sample: 'Arrondie et chaleureuse' },
  { id: 'elegant', name: 'Élégante', stack: 'ui-serif, "New York", "Iowan Old Style", Georgia, serif', sample: 'Classique, comme un carnet' },
  { id: 'net', name: 'Nette', stack: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif', sample: 'Simple et lisible' },
];

export const MOOD_COLORS = ['#8b8fd9', '#6fa8dc', '#8fd1b0', '#f4c36a', '#f58f7c'] as const;

export function resolveMode(mode: Mode, prefersDark: boolean): 'light' | 'dark' {
  return mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode;
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsl(${h} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;

/** Variables CSS d'un thème : tout le style de l'app en découle. */
export function themeVars(themeId: ThemeId, mode: 'light' | 'dark', accent: string | null): Record<string, string> {
  const t = THEME_BY_ID[themeId];
  const a = accent ?? t.accent[mode];
  const dark = mode === 'dark';
  const s = t.sat;
  return {
    '--bg1': dark ? hsl(t.h1, s * 0.75, 9) : hsl(t.h1, s * 0.9, 96),
    '--bg2': dark ? hsl(t.h2, s * 0.7, 16) : hsl(t.h2, s * 0.9, 90),
    '--bg3': dark ? hsl((t.h1 + t.h2) / 2, s * 0.6, 12) : hsl((t.h1 + t.h2) / 2, s * 0.8, 93),
    '--surface': dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
    '--surface-strong': dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.92)',
    '--border': dark ? 'rgba(255,255,255,0.12)' : 'rgba(40,30,70,0.1)',
    '--text': dark ? hsl(t.h1, 25, 94) : hsl(t.h1, 35, 15),
    '--muted': dark ? hsl(t.h1, 12, 72) : hsl(t.h1, 14, 38),
    '--accent': a,
    '--accent-soft': `color-mix(in srgb, ${a} 18%, transparent)`,
    '--on-accent': dark ? '#10101c' : '#ffffff',
    '--shadow': dark ? '0 10px 40px rgba(0,0,0,0.45)' : '0 10px 40px rgba(60,40,110,0.14)',
    '--glow': `color-mix(in srgb, ${a} 38%, transparent)`,
    '--danger': dark ? '#ff8a8a' : '#c53030',
    '--ok': dark ? '#8fe3b0' : '#238a52',
  };
}
