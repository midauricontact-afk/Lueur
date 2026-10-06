/* Service worker de Lueur : fonctionnement hors ligne + affichage des rappels du soir (Web Push).
   Ce fichier ne voit jamais tes réponses : seul le prénom (facultatif) est lu pour personnaliser le message. */
const CACHE = 'lueur-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'lueur-prefs').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Uniquement nos propres fichiers, en lecture : le service de rappels est toujours appelé en direct.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/push-config.json')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// ---------------------------------------------------------------------------
// Rappels du soir
// ---------------------------------------------------------------------------

// Messages doux et variés, sans accord au masculin ni au féminin. {n} = ton prénom.
const WITH_NAME = [
  '{n}, ta lueur du soir t’attend. Trois petites minutes pour toi ?',
  'Et si tu posais ta journée ici, {n} ? Il n’y a rien à réussir.',
  '{n}, comment s’est passée ta journée, vraiment ?',
  'C’est l’heure douce. Viens déposer ta journée, {n}.',
  '{n}, un moment rien qu’à toi ce soir ?',
  'Quelques mots suffisent, {n}. Ton carnet t’attend.',
  '{n}, qu’est-ce qui t’a fait du bien aujourd’hui ?',
  'Respire. Ton journal du soir est prêt, {n}.',
  '{n}, prends soin de toi ce soir : ouvre ton carnet.',
  'Un petit bilan tout doux, {n} ? Sans pression.',
  '{n}, ta soirée mérite un peu de lumière.',
  'Trois minutes pour te retrouver, {n}.',
  'Qu’est-ce qui a compté pour toi aujourd’hui, {n} ?',
  '{n}, ton carnet du soir t’attend, à ton rythme.',
  'Dépose ce que cette journée t’a fait ressentir, {n}.',
  '{n}, qu’aimerais-tu garder de ta journée ?',
  'Une lueur pour finir la journée, {n} ?',
  'Bonsoir {n}. Prêt pour un moment calme ? Ton journal est là.',
];
const WITHOUT_NAME = [
  'Ta lueur du soir t’attend. Trois petites minutes pour toi ?',
  'Et si tu posais ta journée ici ? Il n’y a rien à réussir.',
  'Comment s’est passée ta journée, vraiment ?',
  'C’est l’heure douce. Viens déposer ta journée.',
  'Un moment rien qu’à toi ce soir ?',
  'Quelques mots suffisent. Ton carnet t’attend.',
  'Qu’est-ce qui t’a fait du bien aujourd’hui ?',
  'Respire. Ton journal du soir est prêt.',
  'Prends soin de toi ce soir : ouvre ton carnet.',
  'Un petit bilan tout doux ? Sans pression.',
  'Ta soirée mérite un peu de lumière.',
  'Trois minutes pour te retrouver.',
  'Qu’est-ce qui a compté pour toi aujourd’hui ?',
  'Ton carnet du soir t’attend, à ton rythme.',
  'Dépose ce que cette journée t’a fait ressentir.',
  'Qu’aimerais-tu garder de ta journée ?',
  'Une lueur pour finir la journée ?',
  'Bonsoir. Un moment calme ? Ton journal est là.',
];

function dayNumber(dateStr) {
  const d = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T12:00:00Z') : new Date();
  return Math.floor(d.getTime() / 86400000);
}

function pickMessage(name, dateStr) {
  const list = name ? WITH_NAME : WITHOUT_NAME;
  const msg = list[dayNumber(dateStr) % list.length];
  return name ? msg.replace(/\{n\}/g, name) : msg;
}

async function readName() {
  try {
    const cache = await caches.open('lueur-prefs');
    const res = await cache.match('prefs');
    if (res) return String((await res.json()).name || '').trim();
  } catch (e) {
    /* pas de prénom : message sans prénom */
  }
  return '';
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch (e) {
        payload = {};
      }
      const name = await readName();
      const body =
        payload.k === 'test'
          ? 'C’est un essai : tout fonctionne ! Ton rappel arrivera à l’heure choisie.'
          : pickMessage(name, payload.d);
      // iOS exige qu'une notification soit affichée à chaque réception.
      await self.registration.showNotification('Lueur', {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: 'lueur-evening',
        data: { url: './' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) return w.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
