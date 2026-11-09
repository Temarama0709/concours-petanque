# Application Easygliding — appli uSki

Appli mobile (iOS + Android) d'EasyGliding SAS qui donne accès aux vidéos de la méthode uSki :
une vidéo gratuite de montage/réglage, puis les étapes 1 à 3 débloquées après achat.

Cahier des charges : [`docs/uSki_Appli_Cahier_des_charges_v0.1.docx`](docs/uSki_Appli_Cahier_des_charges_v0.1.docx)

## Technologie (proposition pour Q5)

- **Expo / React Native** (TypeScript) — une seule base de code pour iOS et Android, publiable sur les stores
  (connexion Apple, Face ID, fenêtre de notation native, lecture vidéo native, téléchargement hors ligne).
- **Expo Router** pour la navigation (`src/app/`), **i18next** pour les traductions (`src/i18n/locales/`).
- Le serveur (authentification, droits d'accès, vidéos signées, back-office) n'est pas encore choisi (Q6) :
  l'appli ne dépend que de l'interface `Backend` (`src/services/backend.ts`), aujourd'hui simulée en local.

## Démarrer

```bash
npm install
npx expo start
```

Puis scanner le QR code avec l'appli **Expo Go**. La connexion Apple et Face ID nécessitent un
*development build* (`npx expo run:ios` ou `npx eas-cli@latest build --profile development`).

Vérifications :

```bash
npm run typecheck
```

Codes d'activation de démo : `USKI-DEMO` (étapes 1 à 3), `USKI-STEP1` (étape 1).

## Structure

```
src/
  app/                       écrans (Expo Router)
    index.tsx                aiguillage du premier lancement
    onboarding/language.tsx  F01 langue
    onboarding/legal.tsx     F02 consignes + CGU + confidentialité (écran bloquant)
    auth/index.tsx           F03 compte (Apple, Google, e-mail)
    home.tsx                 F05 accueil (carrousel + 4 cartes)
    step/[id].tsx            F07 page vidéo (chapitres, reprise, vitesse)
    purchase/[id].tsx        F06 déverrouillage (code d'activation)
    settings/                F09 paramètres, compte, documents
  components/                carrousel, carte d'étape, boutons, écran de verrouillage
  config/app.ts              version des textes légaux, URLs, couleurs
  i18n/                      F01 traductions FR/EN (DE/IT prévus)
  services/                  backend (simulé), auth, notation (F08), mesure d'audience (F11)
  state/AppContext.tsx       état global persistant
```

## Avancement par fonctionnalité

| ID  | Fonctionnalité | État |
|-----|----------------|------|
| F01 | Langue : détection + changement sans redémarrage | ✅ FR/EN ; ajouter DE/IT = un fichier JSON |
| F02 | Consignes + CGU + confidentialité | ✅ 3 cases, défilement obligatoire, réaffichage si `LEGAL_VERSION` change ; enregistrement serveur à brancher |
| F03 | Compte Apple / Google / e-mail + Face ID | 🟡 écrans et Face ID faits ; Apple appelé en natif ; Google et serveur à brancher (Q6) |
| F04 | Localisation | ⏸ en attente de Q2 (rien n'est demandé pour l'instant) |
| F05 | Accueil | ✅ carrousel auto 4 s + manuel, cartes avec état et progression |
| F06 | Achat / déverrouillage | 🟡 saisie de code + « Restaurer mes achats » ; paiement intégré selon Q1 |
| F07 | Page vidéo | ✅ chapitres cliquables, reprise, vitesse, plein écran paysage, étape suivante ; liens signés côté serveur |
| F08 | Demande de notation | ✅ fenêtre native, après étape payante finie, ≥ 3 jours après installation |
| F09 | Paramètres et support | ✅ |
| F10 | Lecture hors ligne | ⏳ à faire |
| F11 | Mesure d'audience | 🟡 consentement + événements ; outil RGPD à choisir |

## Questions ouvertes (cf. §7 du cahier des charges)

Q1 modèle de vente · Q2 usage de la localisation · Q3 prix · Q4 téléphone · Q6 auth + hébergeur vidéo ·
Q7 rédaction des textes légaux · Q8 calendrier (saison 2026/27).

Avant publication : comptes développeur Apple et Google au nom d'EasyGliding SAS ; identifiant d'appli
provisoire `fr.uski.app` (dans `app.json`).
