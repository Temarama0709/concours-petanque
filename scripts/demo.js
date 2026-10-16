// Mode démo : lance les émulateurs Firebase (fausse base, rien n'est envoyé en ligne),
// les remplit avec un concours de test, puis ouvre l'application.
// Utilisation : npm run demo   (Java doit être installé pour l'émulateur Firestore)
const { spawn, spawnSync } = require("child_process");

const PROJET = "petanque-concours";
const FS = "127.0.0.1:8080";
const AUTH = "127.0.0.1:9099";
const MOT_DE_PASSE = "petanque";
const enfants = [];

function lancer(commande, args, env = {}) {
  const p = spawn(commande, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  enfants.push(p);
  return p;
}
function arreter() {
  for (const p of enfants) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"]);
    else p.kill("SIGINT");
  }
  process.exit(0);
}
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);

async function attendre(url, nom) {
  for (let i = 0; i < 300; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`${nom} n'a pas démarré`);
}

// --- Écriture dans la fausse base (en contournant les règles, comme un administrateur) ---
function valeur(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valeur) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "object") return { mapValue: { fields: champs(v) } };
  return { stringValue: String(v) };
}
const champs = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valeur(v)]));

async function ecrire(chemin, donnees) {
  const res = await fetch(`http://${FS}/v1/projects/${PROJET}/databases/(default)/documents/${chemin}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: champs(donnees) })
  });
  if (!res.ok) throw new Error(`Écriture ${chemin} : ${await res.text()}`);
}

async function creerCompte(email, admin = false) {
  const res = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: MOT_DE_PASSE, returnSecureToken: true })
  });
  const { localId } = await res.json();
  if (admin) {
    await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJET}/accounts:update`, {
      method: "POST",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: JSON.stringify({ localId, customAttributes: JSON.stringify({ admin: true }) })
    });
  }
  return localId;
}

async function remplir() {
  await creerCompte("admin@test.fr", true);
  const orga = await creerCompte("orga@test.fr");
  const joueurs = [];
  for (let i = 1; i <= 4; i++) joueurs.push(await creerCompte(`joueur${i}@test.fr`));
  await creerCompte("nouveau@test.fr");

  await ecrire(`contributeurs/${orga}`, { email: "orga@test.fr", nom: "Club de démo", club: "Pétanque Démo", telephone: "", credits: 5, illimite: false, createdAt: new Date(), updatedAt: new Date() });

  const dans = (jours) => {
    const d = new Date();
    d.setDate(d.getDate() + jours);
    return d.toISOString().slice(0, 10);
  };
  const concours = [
    ["demo1", "Concours de démo (à gérer)", 0, "Boulodrome des Fins", "Annecy", "74000", "ouvert", "Doublette Senior", 10, orga],
    ["demo2", "Grand prix d'automne", 7, "Parc des sports", "Cluses", "74300", "officiel", "Triplette Senior", 15, null],
    ["demo3", "Concours des vétérans", 14, "Place Avet", "Thônes", "74230", "ouvert", "Doublette Veteran", 8, null]
  ];
  for (const [id, title, j, lieu, ville, cp, type, format, prix, auteur] of concours) {
    await ecrire(`concours/${id}`, {
      title, date: dans(j), lieu, ville, cp, type, format, prix, valide: true, inscriptions: true,
      source: auteur ? "contributeur" : "admin", ...(auteur ? { auteur } : {}), createdAt: new Date()
    });
    await ecrire(`contacts/${id}`, { email: "orga@test.fr", createdAt: new Date() });
  }

  // Clubs de Haute-Savoie (même liste que le bouton d'import du panneau admin)
  const source = require("fs").readFileSync(require("path").join(__dirname, "../src/lib/clubsParDefaut.js"), "utf8");
  const clubs74 = [...source.slice(source.indexOf("74: ["), source.indexOf("]")).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (let i = 0; i < clubs74.length; i++) {
    await ecrire(`clubs/demo-club-${i + 1}`, { nom: clubs74[i], ville: "", departement: "74", createdAt: new Date() });
  }

  const equipes = [
    [["Jean Dupont", "Marc Petit"], "Annecy"], [["Ali Benali", "Luc Girard"], "Annecy"],
    [["Paul Morel", "René Faure"], "Cluses"], [["Hugo Roux", "Tom Blanc"], "Cluses"],
    [["Éric Garnier", "Yves Chevalier"], "Thônes"], [["Noé Lambert", "Gil Bonnet"], ""],
    [["Léo Fontaine", "Max Rousseau"], ""], [["Sam Vincent", "Jo Muller"], ""]
  ];
  for (let i = 0; i < equipes.length; i++) {
    const [noms, club] = equipes[i];
    await ecrire(`inscriptions/demo-ins${i + 1}`, {
      concoursId: "demo1", joueurs: noms, club, telephone: "06 00 00 00 0" + i, email: "",
      uid: i < 4 ? joueurs[i] : null, createdAt: new Date(Date.now() + i)
    });
  }
}

(async () => {
  const java = spawnSync("java", ["-version"], { shell: true });
  if (java.status !== 0) {
    console.error("\n❌ Java n'est pas installé : il est nécessaire pour la fausse base de données.");
    console.error("   Installez-le depuis https://adoptium.net (bouton « Download », version LTS), puis relancez « npm run demo ».\n");
    process.exit(1);
  }
  console.log("\n▶ Démarrage de la fausse base de données…");
  lancer("npx", ["firebase", "emulators:start", "--only", "firestore,auth", "--project", PROJET]);
  await attendre(`http://${FS}`, "L'émulateur Firestore");
  await attendre(`http://${AUTH}`, "L'émulateur d'authentification");
  console.log("▶ Remplissage avec les données de démo…");
  await remplir();
  console.log(`
✅ Mode démo prêt. Comptes de test (mot de passe pour tous : ${MOT_DE_PASSE}) :
   orga@test.fr         organisateur du « Concours de démo », 5 crédits
   joueur1@test.fr … joueur4@test.fr   joueurs inscrits au concours de démo
   nouveau@test.fr      compte sans droits (pour tester la demande de contributeur)
   admin@test.fr        administrateur
   Pour jouer à plusieurs : ouvrez une fenêtre de navigation privée par compte.
   Arrêter : Ctrl + C (les données de démo sont effacées).
`);
  lancer("npx", ["react-scripts", "start"], {
    REACT_APP_FIRESTORE_EMULATOR: FS,
    REACT_APP_AUTH_EMULATOR: AUTH
  });
})().catch((e) => {
  console.error("❌", e.message);
  arreter();
});
