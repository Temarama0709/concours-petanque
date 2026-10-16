import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { CLUBS_PAR_DEFAUT } from "./clubsParDefaut.js";

// Départements couverts, dans l'ordre d'affichage. Ajouter ici les suivants.
export const DEPARTEMENTS_CLUBS = [
  { code: "74", nom: "Haute-Savoie" },
  { code: "01", nom: "Ain" }
];

export const nomDepartement = (code) => DEPARTEMENTS_CLUBS.find((d) => d.code === code)?.nom || code;

const cleNom = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Clubs intégrés au code (lib/clubsParDefaut.js) : toujours proposés, même si l'admin ne les a pas importés.
// Identifiant stable « defaut-74-3 » (département, position dans la liste).
const CLUBS_INTEGRES = Object.entries(CLUBS_PAR_DEFAUT).flatMap(([departement, noms]) =>
  noms.map((nom, i) => ({ id: `defaut-${departement}-${i + 1}`, nom, ville: "", departement, integre: true }))
);

// Liste des clubs : clubs intégrés + collection "clubs" (gérée par l'admin), sans doublon,
// triée par département puis par nom
export function useClubs() {
  const [clubs, setClubs] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "clubs"),
        (s) => {
          const ordre = (code) => {
            const i = DEPARTEMENTS_CLUBS.findIndex((d) => d.code === code);
            return i < 0 ? 99 : i;
          };
          const enBase = s.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Un club intégré modifié par l'admin est enregistré sous le même identifiant : il remplace la version du code
          const dejaLa = new Set(enBase.map((c) => `${c.departement}|${cleNom(c.nom)}`));
          const ids = new Set(enBase.map((c) => c.id));
          const integres = CLUBS_INTEGRES.filter((c) => !ids.has(c.id) && !dejaLa.has(`${c.departement}|${cleNom(c.nom)}`));
          setClubs(
            [...enBase, ...integres].sort((a, b) => ordre(a.departement) - ordre(b.departement) || a.nom.localeCompare(b.nom, "fr"))
          );
        },
        () => setClubs([...CLUBS_INTEGRES])
      ),
    []
  );
  return clubs;
}

// Affiliation vide : { affilie: false, departement: "74", clubId: "", clubAutre: "" }
export const AFFILIATION_VIDE = { affilie: false, departement: DEPARTEMENTS_CLUBS[0].code, clubId: "", clubAutre: "" };

// Message d'erreur, ou "" si l'affiliation est complète
export function erreurAffiliation(a) {
  if (!a.affilie) return "";
  if (!a.clubId) return "Choisissez votre club.";
  if (a.clubId === "autre" && !a.clubAutre.trim()) return "Indiquez le nom de votre club.";
  return "";
}

// Profil de la personne : utilisateurs/{uid}
export function enregistrerProfil(user, a, clubs) {
  const club = a.affilie && a.clubId !== "autre" ? clubs.find((c) => c.id === a.clubId) : null;
  return setDoc(
    doc(db, "utilisateurs", user.uid),
    {
      email: user.email || "",
      affilie: !!a.affilie,
      departement: a.affilie ? a.departement : "",
      clubId: club ? club.id : "",
      clubNom: a.affilie ? (club ? club.nom : a.clubAutre.trim()) : "",
      clubAVerifier: a.affilie && !club,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
