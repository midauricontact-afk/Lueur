export interface Schedule {
  /** Heure choisie, « HH:MM », dans le fuseau `tz`. */
  time: string;
  tz: string;
  /** Dernier jour (« AAAA-MM-JJ », fuseau `tz`) où le rappel a été envoyé. */
  lastSent?: string | null;
}

/** Date et minutes écoulées depuis minuit dans un fuseau donné (gère l'heure d'été sans calcul à la main). */
export function localParts(tz: string, nowMs: number): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(nowMs));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Faut-il envoyer le rappel maintenant ? Oui si l'heure choisie est passée depuis moins de `windowMin` minutes
 * (le serveur se réveille toutes les 5 minutes) et que le rappel du jour n'est pas encore parti.
 */
export function isDue(s: Schedule, nowMs: number, windowMin = 10): boolean {
  const [h, m] = s.time.split(':').map(Number);
  const target = h * 60 + m;
  const { date, minutes } = localParts(s.tz, nowMs);
  if (s.lastSent === date) return false;
  return minutes >= target && minutes < target + windowMin;
}
