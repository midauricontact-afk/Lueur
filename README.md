# Lueur 🌙

Un petit journal du soir, doux et privé, pour prendre soin de toi. Chaque soir, Lueur te pose quelques questions bienveillantes (une positive, une difficile, une pour demain), te laisse noter ton humeur, ton énergie et ton sommeil, puis t'affiche un calendrier et des statistiques.

**Tout reste sur ton téléphone** (dans la base du navigateur). Aucune réponse n'est envoyée nulle part.

## Ce que fait l'app

- Questionnaire du soir : humeur (1 à 5), énergie, sommeil, mots d'émotion, questions ouvertes (nombre réglable, passer / en tirer une autre).
- 181 questions en français (tutoiement), classées par catégorie et intensité ; catégories activables, questions personnelles ajoutables.
- Détection de détresse : un message doux avec le 3114 et le 15 apparaît (aussi dans les Réglages).
- Calendrier coloré selon l'humeur, remplissage en retard possible, statistiques, recherche.
- Export JSON et PDF, import JSON.
- 6 thèmes, mode clair / sombre / auto, couleur d'accent, 3 polices, sons (volume réglable), code PIN optionnel.
- Rappel chaque soir à l'heure choisie (notification).

## Mise en ligne (une seule fois)

1. Crée un dépôt **public vide** nommé `Lueur` sur GitHub.
2. Pousse le code : `git remote add origin https://github.com/midauricontact-afk/Lueur.git` puis `git push -u origin main`.
3. Sur GitHub : **Settings › Pages › Source : GitHub Actions**. Après ~1 minute, l'app est en ligne sur `https://midauricontact-afk.github.io/Lueur/`.

## Service de rappels (Cloudflare, gratuit)

iPhone n'envoie une notification « poussée » que si un serveur la déclenche. Le petit service du dossier `worker/` s'en charge. Il ne reçoit que : l'adresse push de ton téléphone, l'heure choisie et le fuseau. **Jamais tes réponses.**

1. Crée un compte gratuit sur cloudflare.com.
2. `cd worker && npm install && npx wrangler login` (clique sur « Allow »).
3. `npx wrangler kv namespace create SUBS` puis recopie l'`id` affiché dans `worker/wrangler.toml` (sous `[[kv_namespaces]]`, ligne `id = "..."`).
4. `npx wrangler secret put VAPID_PRIVATE_JWK` et colle le contenu de `privateJwk` du fichier `worker/.vapid-private.json`.
5. `npx wrangler deploy`. L'adresse affichée (`https://lueur-push.<ton-nom>.workers.dev`) va dans `public/push-config.json`, champ `"url"`. Puis `git commit` et `git push`.

Les clés VAPID se génèrent avec `node scripts/gen-vapid.mjs`. **Le fichier `worker/.vapid-private.json` est secret** : il est ignoré par git, ne le partage jamais.

## Sur iPhone

1. Ouvre l'adresse de l'app dans **Safari**.
2. Bouton Partager › **Sur l'écran d'accueil**.
3. Ouvre Lueur depuis l'icône, puis Réglages › **Activer les notifications** et accepte. (iOS 16.4 minimum ; les notifications ne marchent que depuis l'icône de l'écran d'accueil.)

### Plan B : rappel avec Raccourcis

Si les notifications ne te conviennent pas : app **Raccourcis** › Automatisation › **Heure de la journée** › « Ouvrir l'app » ou « Ouvrir l'URL » avec l'adresse de Lueur. L'app l'explique aussi dans Réglages.

## Limites d'iOS

- Pas de notification si l'app n'est pas installée sur l'écran d'accueil.
- Les rappels peuvent avoir quelques minutes de retard (le service vérifie toutes les 5 minutes).
- Safari peut effacer les données d'un site peu utilisé : fais de temps en temps un export JSON.
- Le code PIN verrouille l'écran de l'app, il ne **chiffre pas** les données.

## Sources des questions

Les questions s'inspirent de pratiques reconnues : journal de gratitude et « trois bonnes choses » (psychologie positive), questions de bilan de journée en thérapie cognitivo-comportementale, pleine conscience (check-in émotionnel), journaling d'auto-compassion. Elles sont réécrites en français, sans jugement.

## Pour les curieux

```bash
npm install
npm run dev      # développement
npm test         # 64 tests
npm run build    # production (dossier dist)
```

Technos : Vite, React, TypeScript, Framer Motion, IndexedDB, jsPDF. Web Push écrit à la main (RFC 8291 / 8292, vérifié avec le vecteur de test officiel).

Lueur n'est pas un dispositif médical. En cas de détresse : **3114** (24h/24, gratuit) ou **15**.
