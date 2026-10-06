import { createContext, useContext } from 'react';
import type { DateKey } from '../core/dates';

export type TabId = 'tonight' | 'calendar' | 'stats' | 'settings';

/** Ce que n'importe quel écran peut demander à l'application : ouvrir le questionnaire, une fiche, la recherche… */
export interface AppUI {
  /** Ouvre le questionnaire (pour ce soir, ou pour un jour oublié si `date` est donnée). */
  openFlow(date?: DateKey): void;
  openDay(date: DateKey): void;
  openSearch(): void;
  openHelp(): void;
  goTab(tab: TabId): void;
  /** Boîte de confirmation. Renvoie true si l'utilisateur confirme. */
  confirm(opts: { title: string; message?: string; confirmLabel: string; danger?: boolean }): Promise<boolean>;
}

export const UIContext = createContext<AppUI | null>(null);

export function useAppUI(): AppUI {
  const ui = useContext(UIContext);
  if (!ui) throw new Error('UIContext manquant');
  return ui;
}
