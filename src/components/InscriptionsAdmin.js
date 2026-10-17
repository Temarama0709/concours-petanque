import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { STATUTS_INSCRIPTION, recalerCompteur, refuserInscription, statutDe, validerInscription } from "../lib/inscriptions.js";

// Équipes inscrites à un concours, avec validation (organisateurs et admins)
export function useInscriptionsConcours(concoursId) {
  const [inscriptions, setInscriptions] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "inscriptions"), where("concoursId", "==", concoursId));
    return onSnapshot(
      q,
      (snap) => setInscriptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))),
      () => setInscriptions([])
    );
  }, [concoursId]);
  return inscriptions;
}

export function BoutonsValidation({ ins, concours }) {
  const statut = statutDe(ins);
  return (
    <div className="flex gap-2">
      {statut !== "validee" && <Button size="sm" onClick={() => validerInscription(ins, concours)}>Valider</Button>}
      {statut !== "refusee" && <Button size="sm" variant="ghost" onClick={() => refuserInscription(ins, concours)}>Refuser</Button>}
    </div>
  );
}

export default function InscriptionsAdmin({ concours, compteur }) {
  const inscriptions = useInscriptionsConcours(concours.id);

  // Compteur public d'accord avec la liste réelle (inscriptions plus anciennes que le compteur, etc.)
  useEffect(() => {
    if (inscriptions) recalerCompteur(concours.id, inscriptions, compteur)?.catch(() => {});
  }, [inscriptions, compteur, concours.id]);

  if (!inscriptions) return <p className="text-sm text-ardoise">Chargement des inscriptions…</p>;
  const enAttente = inscriptions.filter((i) => statutDe(i) === "en_attente");
  const autres = inscriptions.filter((i) => statutDe(i) !== "en_attente");

  const ligne = (ins, i) => {
    const [libelle, style] = STATUTS_INSCRIPTION[statutDe(ins)];
    return (
      <li key={ins.id} className="py-2 text-sm space-y-1">
        <div className="flex justify-between gap-2">
          <p className="font-bold">{i + 1}. {ins.joueurs.join(" · ")}</p>
          <span className={`shrink-0 self-start text-xs font-bold px-1.5 py-0.5 rounded ${style}`}>{libelle}</span>
        </div>
        <p className="text-ardoise">{[ins.club, ins.telephone, ins.email, ins.uid && "a l'application"].filter(Boolean).join(" · ")}</p>
        <BoutonsValidation ins={ins} concours={concours} />
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {enAttente.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-[15px] font-black uppercase tracking-wider">À valider ({enAttente.length})</h3>
          <ol className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-jaune">{enAttente.map(ligne)}</ol>
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-[15px] font-black uppercase tracking-wider">
          Équipes inscrites ({autres.filter((i) => statutDe(i) === "validee").length})
        </h3>
        {autres.length === 0 ? (
          <p className="text-sm text-ardoise">Aucune inscription validée pour l'instant.</p>
        ) : (
          <ol className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">{autres.map(ligne)}</ol>
        )}
      </div>
    </div>
  );
}
