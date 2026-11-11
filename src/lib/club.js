import { useEffect, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch
} from "firebase/firestore";
import { db } from "../utils/firebase.js";

// Gestion d'un club (privée) :
// clubsGestion/{clubId}             { clubNom, gestionnaires: [uid…] }  — désignés par l'admin
// clubsGestion/{clubId}/licencies/  fiches des licenciés, avec commentaires et paiements

export const CATEGORIES_LICENCIE = ["Senior", "Vétéran", "Féminine", "Junior", "Cadet", "Minime", "Benjamin", "Loisir"];

export const LICENCIE_VIDE = {
  nom: "", prenom: "", licence: "", categorie: "", telephone: "", email: "", adresse: "", naissance: "",
  uid: null, actif: true, commentaires: [], paiements: []
};

const nouvelId = () => Math.random().toString(36).slice(2, 10);

// Clubs que la personne gère (tous ceux déjà configurés pour un admin)
export function useClubsGeres(user, isAdmin) {
  const [clubs, setClubs] = useState([]);
  useEffect(() => {
    if (!user) {
      setClubs([]);
      return;
    }
    const q = isAdmin
      ? collection(db, "clubsGestion")
      : query(collection(db, "clubsGestion"), where("gestionnaires", "array-contains", user.uid));
    return onSnapshot(
      q,
      (s) => setClubs(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.clubNom.localeCompare(b.clubNom, "fr"))),
      () => setClubs([])
    );
  }, [user, isAdmin]);
  return clubs;
}

export function useLicencies(clubId) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    setListe(null);
    return onSnapshot(
      collection(db, "clubsGestion", clubId, "licencies"),
      (s) =>
        setListe(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"))
        ),
      () => setListe([])
    );
  }, [clubId]);
  return liste;
}

// Comptes de l'application qui ont indiqué ce club
export function useComptesDuClub(clubId) {
  const [comptes, setComptes] = useState([]);
  useEffect(() => {
    if (!clubId) return;
    return onSnapshot(
      query(collection(db, "utilisateurs"), where("clubId", "==", clubId)),
      (s) => setComptes(s.docs.map((d) => ({ uid: d.id, ...d.data() }))),
      () => setComptes([])
    );
  }, [clubId]);
  return comptes;
}

// --- Admin : configuration du club et gestionnaires ---
export const configurerClub = (club) =>
  setDoc(doc(db, "clubsGestion", club.id), { clubNom: club.nom, gestionnaires: [], updatedAt: serverTimestamp() }, { merge: true });

export async function ajouterGestionnaire(clubId, gestion, email) {
  const trouves = await getDocs(query(collection(db, "utilisateurs"), where("email", "==", email.trim().toLowerCase())));
  if (trouves.empty) throw new Error(`Aucun compte avec l'e-mail ${email}. La personne doit d'abord créer son compte et se connecter une fois.`);
  const uid = trouves.docs[0].id;
  const gestionnaires = [...new Set([...(gestion.gestionnaires || []), uid])];
  await updateDoc(doc(db, "clubsGestion", clubId), { gestionnaires, updatedAt: serverTimestamp() });
}

export const retirerGestionnaire = (clubId, gestion, uid) =>
  updateDoc(doc(db, "clubsGestion", clubId), {
    gestionnaires: (gestion.gestionnaires || []).filter((u) => u !== uid),
    updatedAt: serverTimestamp()
  });

// --- Licenciés ---
const propre = (l) => {
  const { id, ...reste } = l;
  return { ...LICENCIE_VIDE, ...reste, updatedAt: serverTimestamp() };
};

export const ajouterLicencie = (clubId, licencie) =>
  addDoc(collection(db, "clubsGestion", clubId, "licencies"), { ...propre(licencie), createdAt: serverTimestamp() });

export const enregistrerLicencie = (clubId, licencie) =>
  setDoc(doc(db, "clubsGestion", clubId, "licencies", licencie.id), propre(licencie));

export const supprimerLicencie = (clubId, id) => deleteDoc(doc(db, "clubsGestion", clubId, "licencies", id));

export const nouveauCommentaire = (texte, auteur) => ({ id: nouvelId(), texte: texte.trim(), date: new Date().toISOString(), auteur });

export const nouveauPaiement = ({ libelle, montant, echeance }) => ({
  id: nouvelId(),
  libelle: libelle.trim(),
  montant: Math.round(parseFloat(String(montant).replace(",", ".")) * 100) / 100,
  echeance: echeance || "",
  paye: false,
  payeLe: ""
});

// Somme restant due d'un licencié (paiements non réglés)
export const resteDu = (l) => (l.paiements || []).filter((p) => !p.paye).reduce((s, p) => s + (p.montant || 0), 0);

export const euros = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// --- Import / export ---
const sansAccents = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const COLONNES = {
  nom: /^nom( de famille)?$/,
  prenom: /^prenom/,
  licence: /licence/,
  categorie: /categorie/,
  telephone: /tel|portable|mobile/,
  email: /mail/,
  adresse: /adresse/,
  naissance: /naissance|ne le|date de n/
};

// Date "12/03/1965" ou "1965-03-12" → "1965-03-12"
const lireNaissance = (v) => {
  const m = String(v).match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : "";
};

// Tableau (lignes de cellules, 1re ligne = titres) → licenciés. Colonne « Nom » obligatoire.
export function analyserLicencies(rows) {
  const iTitres = rows.findIndex((r) => r.some((c) => COLONNES.nom.test(sansAccents(String(c ?? "")))));
  if (iTitres < 0) return { licencies: [], erreur: "Colonne « Nom » introuvable dans la première ligne." };
  const titres = rows[iTitres].map((c) => sansAccents(String(c ?? "")));
  const index = {};
  Object.entries(COLONNES).forEach(([champ, re]) => {
    const i = titres.findIndex((t, k) => re.test(t) && !Object.values(index).includes(k));
    if (i >= 0) index[champ] = i;
  });
  const licencies = rows
    .slice(iTitres + 1)
    .map((r) => {
      const val = (champ) => (index[champ] != null ? String(r[index[champ]] ?? "").trim() : "");
      return {
        ...LICENCIE_VIDE,
        nom: val("nom").slice(0, 80),
        prenom: val("prenom").slice(0, 80),
        licence: val("licence").slice(0, 20),
        categorie: val("categorie").slice(0, 30),
        telephone: val("telephone").slice(0, 20),
        email: val("email").toLowerCase().slice(0, 200),
        adresse: val("adresse").slice(0, 200),
        naissance: index.naissance != null ? lireNaissance(r[index.naissance] instanceof Date ? r[index.naissance].toISOString() : val("naissance")) : ""
      };
    })
    .filter((l) => l.nom);
  return { licencies, erreur: "" };
}

export const cleLicencie = (l) => (l.licence ? `L${l.licence}` : `N${sansAccents(`${l.nom} ${l.prenom}`)}`);

export async function importerLicencies(clubId, licencies) {
  for (let i = 0; i < licencies.length; i += 400) {
    const batch = writeBatch(db);
    licencies.slice(i, i + 400).forEach((l) => {
      batch.set(doc(collection(db, "clubsGestion", clubId, "licencies")), { ...propre(l), createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

// Export pour Excel (CSV ; séparateur point-virgule, BOM pour les accents)
export function exporterCSV(licencies, clubNom) {
  const cellule = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [
    ["Nom", "Prénom", "Licence", "Catégorie", "Téléphone", "E-mail", "Adresse", "Naissance", "Actif", "Reste dû (€)", "Paiements en attente", "Commentaires"],
    ...licencies.map((l) => [
      l.nom, l.prenom, l.licence, l.categorie, l.telephone, l.email, l.adresse, l.naissance,
      l.actif === false ? "non" : "oui",
      resteDu(l).toFixed(2).replace(".", ","),
      (l.paiements || []).filter((p) => !p.paye).map((p) => `${p.libelle} ${p.montant} €`).join(" | "),
      (l.commentaires || []).map((c) => c.texte).join(" | ")
    ])
  ];
  const blob = new Blob(["﻿" + lignes.map((r) => r.map(cellule).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `licencies-${clubNom.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
