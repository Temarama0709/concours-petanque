import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { FORMATS } from "./formats.js";

// Transforme un tableau (Excel, CSV ou copier-coller) en liste de concours.
// Les colonnes sont reconnues d'après leur titre, quel que soit leur ordre.

const sansAccents = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// L'ordre compte : "Type de concours" doit être lu comme un format avant
// que "concours" ne soit pris pour le nom.
const COLONNES = {
  date: ["date", "jour", "le"],
  format: ["format", "categorie", "type de concours", "formule", "genre", "type d'equipe"],
  cp: ["cp", "code postal", "codepostal"],
  ville: ["ville", "commune", "localite"],
  title: ["nom", "concours", "intitule", "titre", "competition", "epreuve", "libelle"],
  club: ["club", "organisateur", "association"],
  lieu: ["lieu", "adresse", "boulodrome", "terrain", "site"],
  prix: ["prix", "tarif", "mise", "engagement", "inscription"],
  heure: ["heure", "horaire", "debut", "jet du but"]
};

// Un mot-clé court doit correspondre à un mot entier ("le" ne doit pas
// reconnaître "ville") ; une expression ou un mot long peut être contenu.
function correspond(entete, motCle) {
  const mots = entete.split(/[^a-z0-9']+/).filter(Boolean);
  if (motCle.includes(" ")) return entete.includes(motCle);
  return mots.includes(motCle) || (motCle.length >= 5 && entete.includes(motCle));
}

function detecterColonnes(entetes) {
  const index = {};
  (entetes || []).forEach((brut, i) => {
    const h = sansAccents(brut);
    if (!h) return;
    for (const [champ, motsCles] of Object.entries(COLONNES)) {
      if (index[champ] !== undefined) continue;
      if (motsCles.some((m) => correspond(h, m))) {
        index[champ] = i;
        return;
      }
    }
  });
  return index;
}

// Découpe un texte CSV / copier-coller (tabulations, points-virgules ou virgules).
export function lireTexte(texte) {
  const lignes = texte.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lignes.length) return [];
  // Le séparateur est choisi sur l'ensemble des lignes : un titre peut précéder le tableau
  const tout = lignes.join("\n");
  const compte = (c) => tout.split(c).length;
  const sep = tout.includes("\t") ? "\t" : compte(";") >= compte(",") ? ";" : ",";
  return lignes.map((ligne) => {
    const cellules = [];
    let cur = "";
    let guillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const ch = ligne[i];
      if (ch === '"') {
        if (guillemets && ligne[i + 1] === '"') {
          cur += '"';
          i++;
        } else guillemets = !guillemets;
      } else if (ch === sep && !guillemets) {
        cellules.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cellules.push(cur.trim());
    return cellules;
  });
}

export function lireDate(valeur) {
  // Les dates lues dans un fichier Excel arrivent à minuit UTC
  if (valeur instanceof Date) {
    return isValid(valeur) ? format(new Date(valeur.getUTCFullYear(), valeur.getUTCMonth(), valeur.getUTCDate()), "yyyy-MM-dd") : "";
  }
  if (typeof valeur === "number") {
    // Numéro de série Excel (jours depuis le 30/12/1899)
    const d = new Date(Math.round((valeur - 25569) * 86400 * 1000));
    return isValid(d) ? format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), "yyyy-MM-dd") : "";
  }
  const s = sansAccents(valeur).replace(/\s+/g, " ").replace(/(\d)er\b/, "$1");
  if (!s) return "";
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const annee = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${annee}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/(\d{1,2}) ([a-z]+) (\d{4})/);
  if (m) {
    const mois = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    const n = mois.findIndex((x) => m[2].startsWith(x.slice(0, 3)));
    if (n >= 0) return `${m[3]}-${String(n + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = parse(String(valeur), "d MMMM yyyy", new Date(), { locale: fr });
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

export function lireFormat(valeur) {
  const s = sansAccents(valeur);
  if (!s) return "";
  const exact = FORMATS.find((f) => sansAccents(f) === s);
  if (exact) return exact;
  let equipe = "";
  if (/tete|t\s*a\s*t|\btat\b|\bt[-\s]?a[-\s]?t\b/.test(s)) equipe = "Tete a tete";
  else if (/doublette|\bd\b|\bdbl\b/.test(s)) equipe = "Doublette";
  else if (/triplette|\bt\b|\btpl\b/.test(s)) equipe = "Triplette";
  if (!equipe) return "Autre";
  let categorie = "Senior";
  if (/fem|\bf\b|dames/.test(s)) categorie = "Feminin";
  else if (/mixte|\bm\b/.test(s)) categorie = "Mixte";
  else if (/vet|\bv\b/.test(s)) categorie = "Veteran";
  else if (/jeune|junior|cadet|minime|benjamin/.test(s)) categorie = "Jeunes";
  const resultat = `${equipe} ${categorie}`;
  return FORMATS.includes(resultat) ? resultat : "Autre";
}

function lirePrix(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  if (typeof valeur === "number") return valeur;
  const m = String(valeur).replace(",", ".").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// rows : tableau de lignes (tableaux de cellules), la première ligne contenant les titres.
// Retourne { concours, erreurs, colonnes }.
export function analyserTableau(rows, { departement = "" } = {}) {
  // La ligne d'en-tête est la première qui contient une colonne "date"
  const debut = rows.findIndex((r) => detecterColonnes(r).date !== undefined);
  if (debut < 0) {
    return { concours: [], erreurs: ["Colonne « Date » introuvable dans le tableau."], colonnes: {} };
  }
  const colonnes = detecterColonnes(rows[debut]);
  const val = (r, champ) => (colonnes[champ] !== undefined ? r[colonnes[champ]] : "");
  const concours = [];
  const erreurs = [];

  rows.slice(debut + 1).forEach((r, i) => {
    if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === "")) return;
    const ligne = debut + i + 2;
    const date = lireDate(val(r, "date"));
    let cp = String(val(r, "cp") ?? "").replace(/\D/g, "");
    let ville = String(val(r, "ville") ?? "").trim();
    // Certains calendriers mettent "74000 Annecy" dans une seule colonne
    const villeAvecCp = ville.match(/^(\d{5})\s+(.+)$/) || String(val(r, "lieu") ?? "").match(/(\d{5})\s+([^,]+)$/);
    if (!cp && villeAvecCp) {
      cp = villeAvecCp[1];
      if (!ville || ville === villeAvecCp[0]) ville = villeAvecCp[2].trim();
    }
    const formatConcours = lireFormat(val(r, "format"));
    const club = String(val(r, "club") ?? "").trim();
    const heure = String(val(r, "heure") ?? "").trim();
    let title = String(val(r, "title") ?? "").trim();
    if (!title) title = [formatConcours !== "Autre" ? formatConcours : "Concours", club || ville].filter(Boolean).join(" – ");
    let lieu = String(val(r, "lieu") ?? "").trim() || club || ville;
    if (heure) lieu = `${lieu} (${heure})`;

    const manque = [];
    if (!date) manque.push("date");
    if (!ville) manque.push("ville");
    if (cp && cp.length !== 5) cp = "";
    if (!cp && departement) cp = `${departement}000`; // affiné ensuite via geo.api.gouv.fr
    if (manque.length) {
      erreurs.push(`Ligne ${ligne} ignorée : ${manque.join(", ")} manquant(e).`);
      return;
    }
    concours.push({
      title: title.slice(0, 120),
      date,
      lieu: lieu.slice(0, 200),
      ville: ville.slice(0, 100),
      cp,
      cpApproximatif: !String(val(r, "cp") ?? "").replace(/\D/g, "") && !villeAvecCp,
      type: "officiel",
      format: formatConcours || "Autre",
      prix: lirePrix(val(r, "prix"))
    });
  });
  return { concours, erreurs, colonnes };
}

// Complète les codes postaux manquants à partir du nom de la commune.
export async function completerCodesPostaux(concours, departement) {
  const cache = {};
  for (const c of concours) {
    if (!c.cpApproximatif) continue;
    const cle = sansAccents(c.ville);
    if (!(cle in cache)) {
      try {
        const params = new URLSearchParams({ nom: c.ville, fields: "nom,codesPostaux", boost: "population", limit: "1" });
        if (departement) params.set("codeDepartement", departement);
        const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
        const data = await res.json();
        cache[cle] = data[0] ? { cp: data[0].codesPostaux?.[0], nom: data[0].nom } : null;
      } catch {
        cache[cle] = null;
      }
    }
    if (cache[cle]?.cp) {
      c.cp = cache[cle].cp;
      c.ville = cache[cle].nom;
      c.cpApproximatif = false;
    }
  }
  return concours;
}

export const cleConcours = (c) => `${c.date}|${sansAccents(c.ville)}|${sansAccents(c.format)}`;
