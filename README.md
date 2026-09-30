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
