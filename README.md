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

Pour activer l'envoi (une seule fois) :
1. Passer le projet Firebase à l'offre Blaze (nécessaire pour les Cloud Functions).
2. Créer un compte chez un service d'envoi d'e-mails (ex. Brevo, gratuit jusqu'à 300 e-mails/jour)
   et récupérer ses identifiants SMTP.
3. `npx firebase-tools functions:secrets:set SMTP_URL` puis coller
   `smtps://IDENTIFIANT:CLE@smtp-relay.brevo.com:465`
4. `npm run deploy:functions` (l'adresse d'expédition est demandée au premier déploiement).
