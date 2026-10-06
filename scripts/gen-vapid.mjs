// Génère les clés VAPID du service de rappels : node scripts/gen-vapid.mjs
//  - la clé PUBLIQUE va dans l'app (public/push-config.json) et dans worker/wrangler.toml ;
//  - la clé PRIVÉE reste dans worker/.vapid-private.json (ignoré par git) puis part chez Cloudflare comme « secret ».
import { webcrypto } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privatePath = join(root, 'worker', '.vapid-private.json');
const configPath = join(root, 'public', 'push-config.json');
const tomlPath = join(root, 'worker', 'wrangler.toml');

const b64u = (bytes) => Buffer.from(bytes).toString('base64url');

let keys;
if (existsSync(privatePath)) {
  keys = JSON.parse(readFileSync(privatePath, 'utf8'));
  console.log('Clés VAPID déjà générées : conservées (supprime worker/.vapid-private.json pour en refaire).');
} else {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  keys = {
    publicKey: b64u(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey))),
    privateJwk: await webcrypto.subtle.exportKey('jwk', pair.privateKey),
  };
  writeFileSync(privatePath, JSON.stringify(keys, null, 2));
  console.log('Nouvelles clés VAPID générées.');
}

let url = '';
if (existsSync(configPath)) url = JSON.parse(readFileSync(configPath, 'utf8')).url ?? '';
writeFileSync(configPath, JSON.stringify({ publicKey: keys.publicKey, url }, null, 2) + '\n');

let toml = readFileSync(tomlPath, 'utf8');
toml = toml.replace(/VAPID_PUBLIC_KEY = ".*"/, `VAPID_PUBLIC_KEY = "${keys.publicKey}"`);
writeFileSync(tomlPath, toml);

console.log('Clé publique :', keys.publicKey);
