import { collection, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { STATUTS } from "./tournoi.js";

// tournois/{concoursId} : { statut, format, nbTerrains, pointsGagnants, equipes: [...], poules: [...] }
// tournois/{concoursId}/parties/{id} : une partie (voir lib/tournoi.js) + uidA / uidB / saisiePar

export const refTournoi = (concoursId) => doc(db, "tournois", concoursId);
const refPartie = (concoursId, id) => doc(db, "tournois", concoursId, "parties", id);

// Identifiant stable : recréer une partie déjà créée ne la duplique pas
export const idPartie = (p) => `${p.phase}-${p.poule || "F"}-${p.tour}-${p.ordre}`;

export function ecouterTournoi(concoursId, surChangement) {
  let tournoi;
  let parties;
  const envoyer = () => tournoi !== undefined && parties !== undefined && surChangement({ tournoi, parties });
  const stop1 = onSnapshot(refTournoi(concoursId), (s) => {
    tournoi = s.exists() ? s.data() : null;
    envoyer();
  }, () => { tournoi = null; envoyer(); });
  const stop2 = onSnapshot(collection(db, "tournois", concoursId, "parties"), (s) => {
    parties = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    envoyer();
  }, () => { parties = []; envoyer(); });
  return () => { stop1(); stop2(); };
}

function ajouterParties(batch, concoursId, parties, equipesParId) {
  for (const p of parties) {
    batch.set(refPartie(concoursId, idPartie(p)), {
      ...p,
      uidA: equipesParId[p.equipeA]?.uid || null,
      uidB: p.equipeB ? equipesParId[p.equipeB]?.uid || null : null,
      saisiePar: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

// Tirage : enregistre les équipes (numérotées), les poules et les premières parties
export async function enregistrerTirage(concoursId, { format, nbTerrains, pointsGagnants, equipes, poules, parties }) {
  const batch = writeBatch(db);
  batch.set(refTournoi(concoursId), {
    statut: format === "poules" ? "poules" : "finale",
    format,
    nbTerrains,
    pointsGagnants,
    equipes,
    poules: poules || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  ajouterParties(batch, concoursId, parties, Object.fromEntries(equipes.map((e) => [e.id, e])));
  await batch.commit();
}

export async function creerParties(concoursId, tournoi, parties, champsTournoi = null) {
  if (!parties.length && !champsTournoi) return;
  const batch = writeBatch(db);
  ajouterParties(batch, concoursId, parties, Object.fromEntries(tournoi.equipes.map((e) => [e.id, e])));
  if (champsTournoi) batch.update(refTournoi(concoursId), { ...champsTournoi, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function attribuerTerrains(concoursId, attributions) {
  if (!attributions.length) return;
  const batch = writeBatch(db);
  for (const { id, terrain } of attributions) batch.update(refPartie(concoursId, id), { terrain, updatedAt: serverTimestamp() });
  await batch.commit();
}

export const changerTerrain = (concoursId, id, terrain) =>
  updateDoc(refPartie(concoursId, id), { terrain, updatedAt: serverTimestamp() });

// L'organisateur saisit ou corrige un score : validé directement
export const scoreOrganisateur = (concoursId, id, scoreA, scoreB) =>
  updateDoc(refPartie(concoursId, id), { scoreA, scoreB, statut: STATUTS.VALIDEE, saisiePar: "orga", updatedAt: serverTimestamp() });

// Une équipe propose un score ; validé directement si l'adversaire n'a pas de compte
export const proposerScore = (concoursId, partie, camp, scoreA, scoreB) => {
  const adverseConnecte = camp === "A" ? !!partie.uidB : !!partie.uidA;
  return updateDoc(refPartie(concoursId, partie.id), {
    scoreA,
    scoreB,
    saisiePar: camp,
    statut: adverseConnecte ? STATUTS.EN_ATTENTE : STATUTS.VALIDEE,
    updatedAt: serverTimestamp()
  });
};

// L'équipe adverse confirme le score proposé
export const confirmerScore = (concoursId, partie) =>
  updateDoc(refPartie(concoursId, partie.id), { statut: STATUTS.VALIDEE, updatedAt: serverTimestamp() });

export async function supprimerTournoi(concoursId, parties) {
  const batch = writeBatch(db);
  for (const p of parties) batch.delete(refPartie(concoursId, p.id));
  batch.delete(refTournoi(concoursId));
  await batch.commit();
}
