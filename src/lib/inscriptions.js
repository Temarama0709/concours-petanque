import { useEffect, useState } from "react";
import {
  collection, doc, getDoc, increment, onSnapshot, query, runTransaction, serverTimestamp, where, writeBatch
} from "firebase/firestore";
import { db } from "../utils/firebase.js";

// Inscriptions : statut "en_attente" (inscription par le public), "validee" ou "refusee".
// compteurs/{concoursId} : { inscrites } = équipes inscrites (en attente + validées), public.

export const STATUTS_INSCRIPTION = {
  en_attente: ["En attente de validation", "bg-jaune-clair text-jaune-texte"],
  validee: ["Validée", "bg-navy text-white"],
  refusee: ["Refusée", "bg-red-100 text-red-800"]
};
export const statutDe = (ins) => ins.statut || "validee"; // anciennes inscriptions : validées

// Nombre d'équipes inscrites pour chaque concours : { [concoursId]: n }
export function useCompteurs() {
  const [compteurs, setCompteurs] = useState({});
  useEffect(
    () =>
      onSnapshot(
        collection(db, "compteurs"),
        (s) => setCompteurs(Object.fromEntries(s.docs.map((d) => [d.id, d.data().inscrites || 0]))),
        () => setCompteurs({})
      ),
    []
  );
  return compteurs;
}

export const estComplet = (concours, compteurs) => !!concours.maxEquipes && (compteurs[concours.id] || 0) >= concours.maxEquipes;

export class ConcoursComplet extends Error {}

// Inscription par le public : l'inscription et le compteur sont écrits ensemble (transaction),
// ce qui garantit la limite d'équipes même si plusieurs personnes s'inscrivent en même temps
export async function inscrire(concours, donnees) {
  const refCompteur = doc(db, "compteurs", concours.id);
  const refInscription = doc(collection(db, "inscriptions"));
  await runTransaction(db, async (tx) => {
    const c = await tx.get(refCompteur);
    const n = c.exists() ? c.data().inscrites || 0 : 0;
    if (concours.maxEquipes && n >= concours.maxEquipes) throw new ConcoursComplet();
    tx.set(refInscription, { ...donnees, concoursId: concours.id, statut: "en_attente", createdAt: serverTimestamp() });
    tx.set(refCompteur, { inscrites: n + 1, dernier: refInscription.id });
  });
  return refInscription.id;
}

function notifier(batch, ins, titre, texte) {
  if (!ins.uid) return;
  batch.set(doc(collection(db, "notifications", ins.uid, "items")), {
    titre, texte, concoursId: ins.concoursId, lu: false, createdAt: serverTimestamp()
  });
}

// Validation par l'organisateur (ou l'admin), avec notification à l'inscrit s'il a un compte
export function validerInscription(ins, concours) {
  const batch = writeBatch(db);
  batch.update(doc(db, "inscriptions", ins.id), { statut: "validee" });
  if (statutDe(ins) === "refusee") batch.set(doc(db, "compteurs", ins.concoursId), { inscrites: increment(1) }, { merge: true });
  notifier(batch, ins, "Inscription validée ✅", `Votre inscription au concours « ${concours.title} » a été validée par l'organisateur.`);
  return batch.commit();
}

export function refuserInscription(ins, concours) {
  const batch = writeBatch(db);
  batch.update(doc(db, "inscriptions", ins.id), { statut: "refusee", presente: false });
  if (statutDe(ins) !== "refusee") batch.set(doc(db, "compteurs", ins.concoursId), { inscrites: increment(-1) }, { merge: true });
  notifier(batch, ins, "Inscription refusée", `Votre inscription au concours « ${concours.title} » n'a pas été retenue par l'organisateur.`);
  return batch.commit();
}

export function supprimerInscription(ins) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "inscriptions", ins.id));
  if (statutDe(ins) !== "refusee") batch.set(doc(db, "compteurs", ins.concoursId), { inscrites: increment(-1) }, { merge: true });
  return batch.commit();
}

// Équipe ajoutée par l'organisateur : validée d'office, comptée
export async function ajouterEquipeOrganisateur(concoursId, donnees) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "inscriptions")), { ...donnees, concoursId, surPlace: true, statut: "validee", createdAt: serverTimestamp() });
  batch.set(doc(db, "compteurs", concoursId), { inscrites: increment(1) }, { merge: true });
  await batch.commit();
}

// Remet le compteur d'accord avec la liste réelle (inscriptions d'avant le compteur, corrections)
export function recalerCompteur(concoursId, inscriptions, compteurActuel) {
  const reel = inscriptions.filter((i) => statutDe(i) !== "refusee").length;
  if (reel === compteurActuel) return null;
  const batch = writeBatch(db);
  batch.set(doc(db, "compteurs", concoursId), { inscrites: reel }, { merge: true });
  return batch.commit();
}

// Inscriptions de la personne connectée (pour suivre leur statut)
export function useMesInscriptions(user) {
  const [liste, setListe] = useState([]);
  useEffect(() => {
    if (!user) {
      setListe([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "inscriptions"), where("uid", "==", user.uid)),
      (s) => setListe(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setListe([])
    );
  }, [user]);
  return liste;
}


// L'inscrit annule sa propre inscription ; le compteur public est diminué dans le même envoi
export async function annulerMonInscription(ins) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "inscriptions", ins.id));
  const compteur = await getDoc(doc(db, "compteurs", ins.concoursId));
  if (compteur.exists() && (compteur.data().inscrites || 0) > 0 && statutDe(ins) !== "refusee") {
    batch.update(doc(db, "compteurs", ins.concoursId), { inscrites: increment(-1), retire: ins.id });
  }
  return batch.commit();
}
