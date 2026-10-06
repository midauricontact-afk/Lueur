/** Notifications du soir (Web Push). Le service qui les envoie à l'heure choisie ne reçoit jamais le contenu de tes réponses. */

export interface PushConfig {
  publicKey: string;
  url: string;
}

export type PushIssue = 'unsupported' | 'needs-install' | 'denied' | 'no-service' | null;

export interface PushSupport {
  /** Le navigateur sait gérer les notifications push. */
  supported: boolean;
  /** L'app est ouverte depuis l'écran d'accueil (obligatoire sur iPhone). */
  standalone: boolean;
  ios: boolean;
  permission: NotificationPermission | 'unavailable';
}

export function pushSupport(): PushSupport {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { supported, standalone, ios, permission: 'Notification' in window ? Notification.permission : 'unavailable' };
}

/** Sur iPhone, les notifications ne marchent que depuis l'app ajoutée à l'écran d'accueil (iOS 16.4 ou plus). */
export function pushIssue(sup: PushSupport, cfg: PushConfig | null, url: string): PushIssue {
  if (sup.ios && !sup.standalone) return 'needs-install';
  if (!sup.supported) return 'unsupported';
  if (sup.permission === 'denied') return 'denied';
  if (!cfg?.publicKey || !url) return 'no-service';
  return null;
}

export async function loadPushConfig(): Promise<PushConfig | null> {
  try {
    const res = await fetch(new URL('push-config.json', document.baseURI).href, { cache: 'no-store' });
    if (!res.ok) return null;
    const c = (await res.json()) as Partial<PushConfig>;
    return { publicKey: c.publicKey ?? '', url: (c.url ?? '').replace(/\/+$/, '') };
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? (await navigator.serviceWorker.register('./sw.js'));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function call(base: string, path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    let message = `Le service de rappels a répondu une erreur (${res.status}).`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      /* garde le message par défaut */
    }
    throw new Error(message);
  }
  return res;
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';

/** Demande l'autorisation (à appeler depuis un toucher), crée l'abonnement et l'envoie au service avec l'heure choisie. */
export async function enablePush(cfg: PushConfig, base: string, time: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Les notifications ont été refusées. Tu peux les autoriser dans Réglages › Notifications › Lueur.');
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) }));
  await call(base, '/subscribe', { subscription: sub.toJSON(), time, tz: timeZone() });
}

/** Change l'heure du rappel. */
export async function updatePushTime(base: string, time: string): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await call(base, '/subscribe', { subscription: sub.toJSON(), time, tz: timeZone() });
}

export async function disablePush(base: string): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    if (base) await call(base, '/unsubscribe', { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe();
  }
}

/** Demande au service d'envoyer tout de suite une notification de test. */
export async function sendTestPush(base: string): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) throw new Error('Les notifications ne sont pas activées sur cet appareil.');
  const res = await call(base, '/test', { endpoint: sub.endpoint });
  const data = (await res.json()) as { ok?: boolean; status?: number };
  if (!data.ok) throw new Error(`Le service push a refusé l'envoi (code ${data.status ?? '?'}).`);
}
