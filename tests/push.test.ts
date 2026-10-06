import { describe, expect, it } from 'vitest';
import { b64uDecode, b64uEncode, deriveContentKeys, encryptPayload, encryptWith, generateVapidKeys, sendPush, vapidAuthorization } from '../worker/src/webpush';
import { isDue, isValidTime, isValidTimeZone, localParts } from '../worker/src/schedule';
import worker, { isAllowedEndpoint, runScheduled } from '../worker/src/index';

const subtle = crypto.subtle;

/** Un « téléphone » de test : une paire de clés ECDH et un secret d'authentification, comme ceux d'un abonnement push. */
async function fakePhone() {
  const pair = (await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const publicRaw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { privateKey: pair.privateKey, publicRaw, auth, keys: { p256dh: b64uEncode(publicRaw), auth: b64uEncode(auth) } };
}

async function decrypt(body: Uint8Array<ArrayBuffer>, phone: Awaited<ReturnType<typeof fakePhone>>): Promise<Uint8Array> {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  const asKey = await subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, phone.privateKey, 256));
  const { cek, nonce } = await deriveContentKeys(phone.auth, ecdh, phone.publicRaw, asPublic, salt);
  const aes = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ciphertext));
  let end = plain.length;
  while (end > 0 && plain[end - 1] === 0) end--;
  if (plain[end - 1] !== 2) throw new Error('délimiteur de fin absent');
  return plain.slice(0, end - 1);
}

describe('chiffrement Web Push (RFC 8291)', () => {
  it('reproduit exactement l’exemple officiel de la norme (annexe A)', async () => {
    const asPrivateD = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
    const asPublic = b64uDecode('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
    const privateKey = await subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', d: asPrivateD, x: b64uEncode(asPublic.slice(1, 33)), y: b64uEncode(asPublic.slice(33, 65)) },
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    );
    const body = await encryptWith(
      {
        p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
        auth: 'BTBZMqHH6r4Tts7J_aSIgg',
      },
      b64uDecode('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'), // « When I grow up, I want to be a watermelon »
      { privateKey, publicRaw: asPublic },
      b64uDecode('DGv6ra1nlYgDCS1FRnbzlw'),
    );
    expect(b64uEncode(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    );
  });

  it('chiffre puis déchiffre un message quelconque, avec des clés différentes à chaque fois', async () => {
    const phone = await fakePhone();
    const msg = new TextEncoder().encode(JSON.stringify({ k: 'evening', d: '2026-10-06', accents: 'é à ô œ 🌙' }));
    const a = await encryptPayload(phone.keys, msg);
    const b = await encryptPayload(phone.keys, msg);
    expect(b64uEncode(a)).not.toBe(b64uEncode(b)); // sel et clé éphémère différents
    expect(new TextDecoder().decode(await decrypt(a, phone))).toBe(new TextDecoder().decode(msg));
    expect(a.length).toBeLessThan(4096); // tient dans un seul bloc
  });

  it('un autre téléphone ne peut pas lire le message', async () => {
    const phone = await fakePhone();
    const other = await fakePhone();
    const body = await encryptPayload(phone.keys, new TextEncoder().encode('secret'));
    await expect(decrypt(body, other)).rejects.toThrow();
  });
});

describe('signature VAPID', () => {
  it('produit un jeton ES256 que la clé publique sait vérifier', async () => {
    const { publicKey, privateJwk } = await generateVapidKeys();
    const header = await vapidAuthorization({ endpoint: 'https://web.push.apple.com/abc123', publicKey, privateJwk, subject: 'mailto:moi@example.com', nowSec: 1_800_000_000 });
    const m = header.match(/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/);
    expect(m).not.toBeNull();
    const [, h, c, s, k] = m!;
    expect(k).toBe(publicKey);
    expect(JSON.parse(new TextDecoder().decode(b64uDecode(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(new TextDecoder().decode(b64uDecode(c)))).toEqual({ aud: 'https://web.push.apple.com', exp: 1_800_000_000 + 12 * 3600, sub: 'mailto:moi@example.com' });
    const pub = await subtle.importKey('raw', b64uDecode(publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64uDecode(s), new TextEncoder().encode(`${h}.${c}`));
    expect(ok).toBe(true);
    expect(b64uDecode(s).length).toBe(64); // signature brute r||s, comme l'exige JWT
  });

  it('envoie la requête avec les bons en-têtes', async () => {
    const phone = await fakePhone();
    const { publicKey, privateJwk } = await generateVapidKeys();
    let seen: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    const r = await sendPush({ endpoint: 'https://web.push.apple.com/xyz', keys: phone.keys }, { k: 'evening' }, { publicKey, privateJwk, subject: 'mailto:a@b.fr' }, fakeFetch);
    expect(r).toEqual({ status: 201, gone: false });
    const h = seen!.init.headers as Record<string, string>;
    expect(h['Content-Encoding']).toBe('aes128gcm');
    expect(h.Authorization).toMatch(/^vapid t=.+, k=.+$/);
    expect(h.TTL).toBe('3600');
    const body = new Uint8Array(seen!.init.body as ArrayBuffer);
    expect(JSON.parse(new TextDecoder().decode(await decrypt(body, phone)))).toEqual({ k: 'evening' });
    const gone = await sendPush({ endpoint: 'https://web.push.apple.com/xyz', keys: phone.keys }, {}, { publicKey, privateJwk, subject: 'mailto:a@b.fr' }, (async () => new Response(null, { status: 410 })) as unknown as typeof fetch);
    expect(gone.gone).toBe(true);
  });
});

describe('planification à l’heure choisie', () => {
  const at = (iso: string) => Date.parse(iso);

  it('lit la date et l’heure dans le fuseau de Paris, été comme hiver', () => {
    expect(localParts('Europe/Paris', at('2026-07-01T19:00:00Z'))).toEqual({ date: '2026-07-01', minutes: 21 * 60 }); // UTC+2
    expect(localParts('Europe/Paris', at('2026-12-01T20:00:00Z'))).toEqual({ date: '2026-12-01', minutes: 21 * 60 }); // UTC+1
    expect(localParts('Europe/Paris', at('2026-07-01T22:30:00Z'))).toEqual({ date: '2026-07-02', minutes: 30 }); // passé minuit à Paris
  });

  it('envoie à 21 h heure de Paris, une seule fois par jour', () => {
    const s = { time: '21:00', tz: 'Europe/Paris', lastSent: null };
    expect(isDue(s, at('2026-07-01T18:55:00Z'))).toBe(false); // 20 h 55
    expect(isDue(s, at('2026-07-01T19:00:00Z'))).toBe(true);
    expect(isDue(s, at('2026-07-01T19:05:00Z'))).toBe(true); // un passage a pu être manqué : on rattrape
    expect(isDue(s, at('2026-07-01T19:10:00Z'))).toBe(false); // fenêtre passée
    expect(isDue({ ...s, lastSent: '2026-07-01' }, at('2026-07-01T19:00:00Z'))).toBe(false);
    expect(isDue({ ...s, lastSent: '2026-06-30' }, at('2026-07-01T19:00:00Z'))).toBe(true);
  });

  it('suit le changement d’heure : toujours 21 h à Paris', () => {
    const s = { time: '21:00', tz: 'Europe/Paris', lastSent: null };
    expect(isDue(s, at('2026-03-28T20:00:00Z'))).toBe(true); // veille du passage à l'heure d'été (UTC+1)
    expect(isDue(s, at('2026-03-29T19:00:00Z'))).toBe(true); // lendemain (UTC+2)
    expect(isDue(s, at('2026-03-29T20:00:00Z'))).toBe(false);
  });

  it('valide l’heure et le fuseau', () => {
    expect(isValidTime('21:00')).toBe(true);
    expect(isValidTime('7:00')).toBe(false);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});

/** Un KV en mémoire, pour tester le service complet sans Cloudflare. */
function memoryKV() {
  const m = new Map<string, string>();
  return {
    m,
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
    list: async ({ prefix = '' }: { prefix?: string }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  };
}

describe('service de rappels (Worker)', () => {
  async function setup() {
    const { publicKey, privateJwk } = await generateVapidKeys();
    const SUBS = memoryKV();
    const env = { SUBS, VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_JWK: JSON.stringify(privateJwk), ALLOWED_ORIGIN: 'https://midauricontact-afk.github.io' };
    const phone = await fakePhone();
    const call = (path: string, body: unknown, origin = 'https://midauricontact-afk.github.io') =>
      worker.fetch(new Request(`https://lueur-push.example.workers.dev${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
    const subscribe = (time = '21:00', endpoint = 'https://web.push.apple.com/token-1') =>
      call('/subscribe', { subscription: { endpoint, keys: phone.keys }, time, tz: 'Europe/Paris' });
    return { env, SUBS, phone, call, subscribe };
  }

  it('n’accepte que les vrais services push (pas d’adresse arbitraire)', () => {
    expect(isAllowedEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isAllowedEndpoint('http://web.push.apple.com/abc')).toBe(false);
    expect(isAllowedEndpoint('https://evil.example.com/abc')).toBe(false);
    expect(isAllowedEndpoint('https://web.push.apple.com.evil.com/abc')).toBe(false);
    expect(isAllowedEndpoint(42)).toBe(false);
  });

  it('enregistre un abonnement avec l’heure choisie, sans rien d’autre', async () => {
    const { subscribe, SUBS } = await setup();
    const res = await subscribe('20:30');
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://midauricontact-afk.github.io');
    const [stored] = [...SUBS.m.values()].map((v) => JSON.parse(v));
    expect(Object.keys(stored).sort()).toEqual(['createdAt', 'endpoint', 'keys', 'lastSent', 'time', 'tz']);
    expect(stored.time).toBe('20:30');
  });

  it('refuse les abonnements ou les heures invalides', async () => {
    const { call, phone } = await setup();
    expect((await call('/subscribe', { subscription: { endpoint: 'https://evil.com/x', keys: phone.keys }, time: '21:00' })).status).toBe(400);
    expect((await call('/subscribe', { subscription: { endpoint: 'https://web.push.apple.com/x', keys: phone.keys }, time: '9pm' })).status).toBe(400);
    expect((await call('/subscribe', { subscription: { endpoint: 'https://web.push.apple.com/x' }, time: '21:00' })).status).toBe(400);
  });

  it('envoie le rappel à l’heure choisie, une seule fois par jour, avec un contenu minimal', async () => {
    const { subscribe, env, phone, SUBS } = await setup();
    await subscribe('21:00');
    const sent: { body: Uint8Array<ArrayBuffer> }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent.push({ body: new Uint8Array(init.body as ArrayBuffer) });
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    try {
      const evening = Date.parse('2026-10-06T19:00:00Z'); // 21 h à Paris (UTC+2)
      await runScheduled(env, Date.parse('2026-10-06T18:00:00Z')); // 20 h : trop tôt
      expect(sent).toHaveLength(0);
      await runScheduled(env, evening);
      expect(sent).toHaveLength(1);
      const payload = JSON.parse(new TextDecoder().decode(await decrypt(sent[0].body, phone)));
      expect(payload).toEqual({ k: 'evening', d: '2026-10-06' }); // aucun contenu personnel
      await runScheduled(env, evening + 5 * 60_000); // 5 minutes plus tard : déjà envoyé
      expect(sent).toHaveLength(1);
      await runScheduled(env, Date.parse('2026-10-07T19:00:00Z')); // le lendemain
      expect(sent).toHaveLength(2);
      expect(JSON.parse([...SUBS.m.values()][0]).lastSent).toBe('2026-10-07');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('oublie un téléphone désinscrit (réponse 410)', async () => {
    const { subscribe, env, SUBS } = await setup();
    await subscribe('21:00');
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(null, { status: 410 })) as unknown as typeof fetch;
    try {
      await runScheduled(env, Date.parse('2026-10-06T19:00:00Z'));
      expect(SUBS.m.size).toBe(0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('se désabonne à la demande, et répond aux requêtes préalables des navigateurs (CORS)', async () => {
    const { subscribe, call, SUBS, env } = await setup();
    await subscribe();
    expect(SUBS.m.size).toBe(1);
    expect((await call('/unsubscribe', { endpoint: 'https://web.push.apple.com/token-1' })).status).toBe(200);
    expect(SUBS.m.size).toBe(0);
    const pre = await worker.fetch(new Request('https://x.workers.dev/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://midauricontact-afk.github.io' } }), env);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
