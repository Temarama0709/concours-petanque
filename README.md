# Concours de Pétanque

Application web (PWA) pour consulter et proposer des concours de pétanque :
calendrier, carte, recherche par ville / code postal / département, ajout à
l'agenda et itinéraire.

## Lancer en local

```bash
npm install
npm start
```

## Accès administrateur (Firebase Authentication)

Le mot de passe admin n'est plus écrit dans le code (il était visible par
n'importe qui dans le navigateur). La connexion passe maintenant par Firebase :

1. Console Firebase → **Authentication** → *Sign-in method* → activer **E-mail/Mot de passe**.
2. **Authentication** → *Users* → **Ajouter un utilisateur** (votre email + un mot de passe solide).
   Copier son **UID**.
3. **Firestore Database** → créer une collection `admins` avec un document dont
   l'identifiant est cet **UID** (le contenu peut être vide, par ex. `nom: "Moi"`).
4. Publier les règles de sécurité : copier le contenu de `firestore.rules` dans
   **Firestore → Règles**, ou `firebase deploy --only firestore:rules`.

Seuls les comptes présents dans `admins` peuvent valider ou supprimer des concours.
