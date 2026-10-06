/**
 * Web Push sans bibliothèque : chiffrement du message (RFC 8188 / 8291, « aes128gcm ») et signature VAPID (RFC 8292),
 * uniquement avec WebCrypto. Fonctionne à l'identique dans un Cloudflare Worker et dans Node (tests).
 */

const enc = new TextEncoder();

export function b64uEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const buf = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', buf(ikm), 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) }, key, length * 8));
}

/** Clés de contenu d'un message : communes au chiffrement (serveur) et au déchiffrement (téléphone, ou tests). */
export async function deriveContentKeys(authSecret: Uint8Array, ecdhSecret: Uint8Array, uaPublic: Uint8Array, asPublic: Uint8Array, salt: Uint8Array) {
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  return {
    cek: await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16),
    nonce: await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12),
  };
}

export interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

/** Chiffre `payload` pour l'abonnement d'un téléphone. Renvoie le corps de la requête à envoyer au service push. */
export async function encryptPayload(keys: SubscriptionKeys, payload: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return encryptWith(keys, payload, { privateKey: pair.privateKey, publicRaw }, crypto.getRandomValues(new Uint8Array(16)));
}

/** Même chose avec une clé et un sel imposés (sert à vérifier l'implémentation avec l'exemple officiel de la norme). */
export async function encryptWith(
  keys: SubscriptionKeys,
  payload: Uint8Array,
  asKeys: { privateKey: CryptoKey; publicRaw: Uint8Array },
  salt: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64uDecode(keys.p256dh);
  const authSecret = b64uDecode(keys.auth);
  const asPublic = asKeys.publicRaw;
  const uaKey = await crypto.subtle.importKey('raw', buf(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));
  const { cek, nonce } = await deriveContentKeys(authSecret, ecdh, uaPublic, asPublic, salt);

  const aes = await crypto.subtle.importKey('raw', buf(cek), 'AES-GCM', false, ['encrypt']);
  // Dernier (et seul) bloc : le message suivi de l'octet 0x02 qui marque la fin.
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(nonce) }, aes, buf(concat(payload, new Uint8Array([2])))));
  const recordSize = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export interface VapidOptions {
  endpoint: string;
  /** Clé publique VAPID : point non compressé de 65 octets, en base64url. */
  publicKey: string;
  privateJwk: JsonWebKey;
  /** « mailto:… » ou adresse https du responsable du service. */
  subject: string;
  /** Instant courant en secondes (injectable pour les tests). */
  nowSec?: number;
}

/** En-tête Authorization « vapid t=<jwt>, k=<clé> » : prouve au service push que le message vient bien de notre serveur. */
export async function vapidAuthorization(o: VapidOptions): Promise<string> {
  const now = o.nowSec ?? Math.floor(Date.now() / 1000);
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64uEncode(enc.encode(JSON.stringify({ aud: new URL(o.endpoint).origin, exp: now + 12 * 3600, sub: o.subject })));
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('jwk', o.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput)));
  return `vapid t=${signingInput}.${b64uEncode(sig)}, k=${o.publicKey}`;
}

export interface PushTarget {
  endpoint: string;
  keys: SubscriptionKeys;
}

export interface PushResult {
  status: number;
  /** L'abonnement n'existe plus (téléphone désinscrit) : on peut l'oublier. */
  gone: boolean;
}

/** Envoie un message chiffré. Le contenu ne contient jamais tes réponses : seulement de quoi choisir un message doux. */
export async function sendPush(target: PushTarget, payload: object, vapid: Omit<VapidOptions, 'endpoint'>, fetchImpl: typeof fetch = fetch): Promise<PushResult> {
  const body = await encryptPayload(target.keys, enc.encode(JSON.stringify(payload)));
  const res = await fetchImpl(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization({ ...vapid, endpoint: target.endpoint }),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'normal',
    },
    body: buf(body),
  });
  return { status: res.status, gone: res.status === 404 || res.status === 410 };
}

/** Génère une paire de clés VAPID : la clé publique (pour le navigateur) et la clé privée (secrète, pour le serveur). */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKey = b64uEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey, privateJwk };
}
