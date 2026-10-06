import { isDue, isValidTime, isValidTimeZone, localParts } from './schedule';
import { sendPush, type SubscriptionKeys } from './webpush';

/**
 * Service de rappels de Lueur (Cloudflare Worker, offre gratuite).
 *
 * Il ne connaît QUE : l'adresse d'abonnement push de ton téléphone, l'heure et le fuseau choisis.
 * Jamais tes réponses, ton humeur ni ton prénom. Le message envoyé ne contient qu'un signal « c'est l'heure » ;
 * c'est ton téléphone qui choisit le texte de la notification.
 */

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix?: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

interface Env {
  SUBS: KV;
  VAPID_PUBLIC_KEY: string;
  /** Clé privée VAPID au format JWK (secret : `wrangler secret put VAPID_PRIVATE_JWK`). */
  VAPID_PRIVATE_JWK: string;
  VAPID_SUBJECT?: string;
  /** Origines autorisées à appeler le service, séparées par des virgules. */
  ALLOWED_ORIGIN?: string;
}

interface Stored {
  endpoint: string;
  keys: SubscriptionKeys;
  time: string;
  tz: string;
  lastSent: string | null;
  createdAt: number;
}

/** Seuls les vrais services push des navigateurs sont acceptés : le service ne peut pas servir à écrire à n'importe quelle adresse. */
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.microsoft\.com)$/;
const MAX_SUBSCRIPTIONS = 20;

export function isAllowedEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

async function keyFor(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return `sub:${[...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGIN ?? '*').split(',').map((s) => s.trim());
  const origin = req.headers.get('Origin') ?? '';
  const ok = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (data: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function vapidFor(env: Env) {
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey,
    subject: env.VAPID_SUBJECT ?? 'mailto:lueur@example.com',
  };
}

async function handle(req: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);

  if (req.method === 'GET') return json({ ok: true, service: 'lueur-push' }, 200, cors);
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405, cors);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Requête illisible' }, 400, cors);
  }

  if (url.pathname === '/subscribe') {
    const sub = body.subscription as { endpoint?: unknown; keys?: Partial<SubscriptionKeys> } | undefined;
    if (!isAllowedEndpoint(sub?.endpoint) || !sub?.keys?.p256dh || !sub.keys.auth) return json({ error: 'Abonnement invalide' }, 400, cors);
    if (!isValidTime(body.time)) return json({ error: 'Heure invalide' }, 400, cors);
    const tz = isValidTimeZone(body.tz) ? body.tz : 'Europe/Paris';
    const key = await keyFor(sub.endpoint);
    const existing = await env.SUBS.get(key);
    if (!existing) {
      const all = await env.SUBS.list({ prefix: 'sub:' });
      if (all.keys.length >= MAX_SUBSCRIPTIONS) return json({ error: 'Service complet' }, 429, cors);
    }
    const previous = existing ? (JSON.parse(existing) as Stored) : null;
    const value: Stored = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      time: body.time,
      tz,
      lastSent: previous?.lastSent ?? null,
      createdAt: previous?.createdAt ?? Date.now(),
    };
    await env.SUBS.put(key, JSON.stringify(value));
    return json({ ok: true }, 200, cors);
  }

  if (url.pathname === '/unsubscribe') {
    if (!isAllowedEndpoint(body.endpoint)) return json({ error: 'Abonnement invalide' }, 400, cors);
    await env.SUBS.delete(await keyFor(body.endpoint));
    return json({ ok: true }, 200, cors);
  }

  if (url.pathname === '/test') {
    if (!isAllowedEndpoint(body.endpoint)) return json({ error: 'Abonnement invalide' }, 400, cors);
    const raw = await env.SUBS.get(await keyFor(body.endpoint));
    if (!raw) return json({ error: 'Abonnement inconnu : réactive les notifications.' }, 404, cors);
    const s = JSON.parse(raw) as Stored;
    const r = await sendPush({ endpoint: s.endpoint, keys: s.keys }, { k: 'test', d: localParts(s.tz, Date.now()).date }, vapidFor(env));
    if (r.gone) await env.SUBS.delete(await keyFor(s.endpoint));
    return json({ ok: r.status >= 200 && r.status < 300, status: r.status }, 200, cors);
  }

  return json({ error: 'Introuvable' }, 404, cors);
}

/** Toutes les 5 minutes : envoie le rappel à ceux dont l'heure est venue. */
async function scheduled(env: Env, nowMs = Date.now()): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const k of page.keys) {
      const raw = await env.SUBS.get(k.name);
      if (!raw) continue;
      const s = JSON.parse(raw) as Stored;
      if (!isDue(s, nowMs)) continue;
      const today = localParts(s.tz, nowMs).date;
      try {
        const r = await sendPush({ endpoint: s.endpoint, keys: s.keys }, { k: 'evening', d: today }, vapidFor(env));
        if (r.gone) await env.SUBS.delete(k.name);
        else if (r.status >= 200 && r.status < 300) await env.SUBS.put(k.name, JSON.stringify({ ...s, lastSent: today }));
      } catch {
        /* nouvel essai au prochain passage, tant que la fenêtre de 10 minutes n'est pas passée */
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export default {
  fetch: handle,
  scheduled: (_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => ctx.waitUntil(scheduled(env)),
};

export { scheduled as runScheduled };
