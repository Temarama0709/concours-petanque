# Concours de Pétanque

Application web (PWA) pour consulter et proposer des concours de pétanque :
calendrier, carte, recherche par ville / code postal / département, ajout à
l'agenda et itinéraire.

## Lancer en local

```bash
npm install
npm start
```

## Mettre en ligne (Firebase Hosting)

Prérequis : [Node.js](https://nodejs.org) (version LTS) installé sur l'ordinateur.

```bash
npm install
npx firebase-tools login   # une seule fois : connexion avec le compte Google du projet
npm run deploy             # construit l'app et publie le site + les règles Firestore
```

L'application est ensuite disponible sur https://petanque-concours.web.app

## Accès administrateur (Firebase Authentication)

Le mot de passe admin n'est plus écrit dans le code (il était visible par
n'importe qui dans le navigateur). La connexion passe maintenant par Firebase :

1. Console Firebase → **Authentication** → *Sign-in method* → activer **E-mail/Mot de passe**.
2. **Authentication** → *Users* → **Ajouter un utilisateur** (votre email + un mot de passe solide).
3. Publier les règles de sécurité : copier le contenu de `firestore.rules` dans
   **Firestore → Règles** puis **Publier** (ou `firebase deploy --only firestore:rules`).

Seuls les comptes dont l'UID figure dans `firestore.rules` (et dans `src/admins.js`),
ou qui ont reçu le droit `admin` via la fonction `setAdmin` (`functions/index.js`),
peuvent valider ou supprimer des concours. Pour ajouter un admin, ajoutez son UID
aux deux endroits puis relancez `npm run deploy`.

## Importer un calendrier officiel (admin)

Connecté en admin, le panneau du bas propose **Importer un calendrier officiel** :
fichier Excel (.xlsx), CSV ou tableau copié-collé. La première ligne doit contenir
les titres des colonnes, dont au moins **Date** et **Ville** (ou Commune). Colonnes
reconnues en plus : Nom, Club, Lieu, CP, Catégorie/Format, Tarif/Mise, Heure.
Voir `exemple-calendrier.xlsx`. Un aperçu est affiché avant l'import ; les concours
déjà présents sont ignorés et les concours importés sont publiés directement.

## Partager une affiche depuis le téléphone (Android)

Une fois l'application installée sur l'écran d'accueil (Chrome → menu ⋮ →
« Installer l'application »), elle apparaît dans le menu « Partager » d'Android.
Partager une image (affiche enregistrée depuis Facebook, photo…) ouvre le
formulaire et le pré-remplit par OCR. Fonctionnement : `share_target` dans
`public/manifest.json` + service worker `public/sw.js`. Non disponible sur iPhone.

## Inscriptions et e-mails à l'organisateur

Quand un concours est proposé avec l'e-mail de l'organisateur, un bouton « S'inscrire »
apparaît dans sa fiche. Chaque inscription est enregistrée (collection `inscriptions`,
lisible seulement par les admins) et la fonction `notifierInscription`
(`functions/index.js`) envoie un e-mail à l'organisateur, plus une confirmation à
l'équipe si elle a donné son e-mail. L'e-mail de l'organisateur est rangé à part
(collection `contacts`) et n'est jamais lisible par le public.

**Validation et limite d'équipes.** Une inscription du public arrive « en attente de
validation » : l'organisateur (ou un admin) la valide ou la refuse dans la fiche du
concours (« À valider ») ou dans « Gérer le concours ». L'inscrit reçoit une notification
dans l'application (la cloche) et, si les e-mails sont activés, un e-mail
(`notifierValidation`). Seules les équipes validées peuvent être pointées pour le tirage.
L'organisateur peut fixer un nombre maximum d'équipes (ex. 64) : la collection publique
`compteurs` tient le nombre d'équipes inscrites, et les règles Firestore refusent toute
inscription au-delà de la limite.

**Organisateurs.** À la publication, la case « Je suis l'organisateur de ce concours »
peut être décochée : le concours est alors publié pour information, sans inscriptions en
ligne. Un admin peut ajouter des co-organisateurs à n'importe quel concours (fiche du
concours, partie « Organisation », par l'e-mail de leur compte) : ils gèrent alors les
inscriptions, la validation et le tirage.

Pour activer l'envoi (une seule fois) :
1. Passer le projet Firebase à l'offre Blaze (nécessaire pour les Cloud Functions).
2. Créer un compte chez un service d'envoi d'e-mails (ex. Brevo, gratuit jusqu'à 300 e-mails/jour)
   et récupérer ses identifiants SMTP.
3. `npx firebase-tools functions:secrets:set SMTP_URL` puis coller
   `smtps://IDENTIFIANT:CLE@smtp-relay.brevo.com:465`
4. `npm run deploy:functions` (l'adresse d'expédition est demandée au premier déploiement).

## Comptes contributeurs et crédits

Seuls les admins et les **contributeurs** peuvent publier un concours ; il n'y a plus de
proposition anonyme. Un concours publié par un contributeur est en ligne immédiatement
et utilise **1 crédit** (sauf accès illimité). Les règles Firestore l'imposent : un
contributeur ne peut ni se donner des crédits, ni publier sans en utiliser un.

- Une personne crée un compte, puis fait une **demande** depuis « Publier un concours ».
- Dans le panneau admin, l'admin **accepte** la demande avec N crédits ou un **accès illimité**
  (clubs partenaires), ajoute ou retire des crédits, ou retire le compte.
- Le contributeur voit ses crédits restants, la liste des inscrits à ses concours,
  et peut supprimer ses propres concours.
- Collections : `contributeurs/{uid}` (crédits, illimite), `demandes/{uid}`.

## Paiement des crédits (Stripe)

Offres (prix fixés côté serveur dans `functions/index.js`, affichés via `src/lib/offres.js`) :
**2 € le concours** ou **pack de 10 concours à 16 €**. Toute personne connectée peut
acheter des crédits ; au premier achat, son compte devient contributeur automatiquement.

Mise en place (une seule fois, projet en offre Blaze) :
1. Créer un compte sur https://stripe.com et récupérer la **clé secrète** (`sk_test_…` pour
   essayer, `sk_live_…` pour de vrais paiements).
2. `npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY`
3. `npm run deploy:functions`, puis dans Stripe → Développeurs → Webhooks, ajouter l'adresse
   de la fonction `webhookStripe` (affichée après le déploiement) avec l'événement
   `checkout.session.completed`, et copier son **secret de signature** (`whsec_…`).
4. `npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET` puis `npm run deploy:functions`.

Chaque paiement est enregistré dans la collection `paiements` ; un même paiement
n'est jamais crédité deux fois.

## Gestion du concours (poules, tirage, terrains, scores)

Depuis la fiche d'un concours :
- **Gérer le concours** (auteur ou admin) : pointage des équipes présentes, inscription
  sur place, choix de la formule (poules de 4 avec gagnants / perdants / barrage, poules
  de 3 si nécessaire, ou élimination directe), nombre de terrains, parties en 13 ou 11,
  puis **tirage** (clubs séparés autant que possible). Tant que cet écran est ouvert, les
  tours suivants sont créés et les terrains libres attribués automatiquement. Phase finale :
  2 qualifiés par poule, exempts pour compléter le tableau, jusqu'au vainqueur.
- **Suivre le concours** (tout le monde) : classements des poules, parties, terrains, tableau final.
  Une équipe inscrite en étant connectée voit « Votre équipe » et saisit ses scores ;
  si l'équipe adverse a aussi un compte, elle doit confirmer. L'organisateur peut toujours corriger.

Moteur : `src/lib/tournoi.js` (testé dans `src/lib/__tests__/tournoi.test.js`).
Données : `tournois/{concoursId}` et `tournois/{concoursId}/parties/{id}`.

Tests en local avec les émulateurs (sans toucher la vraie base) :
`REACT_APP_FIRESTORE_EMULATOR=127.0.0.1:8080 REACT_APP_AUTH_EMULATOR=127.0.0.1:9099 npm start`
avec `npx firebase-tools emulators:start --only firestore,auth` lancé à côté.

## Mode démo (tester sans toucher au vrai site)

```
npm install
npm run demo
```
Lance une fausse base de données sur l'ordinateur (émulateurs Firebase, Java requis :
https://adoptium.net), la remplit avec 3 concours et 8 équipes inscrites, puis ouvre
l'application sur http://localhost:3000. Comptes (mot de passe `petanque`) :
`orga@test.fr` (organisateur, 5 crédits), `joueur1@test.fr` à `joueur4@test.fr`
(joueurs inscrits), `nouveau@test.fr`, `admin@test.fr`. Ctrl + C pour arrêter ;
les données de démo sont effacées.
