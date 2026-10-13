import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../utils/firebase.js";

// Liste des équipes inscrites à un concours (visible uniquement par les admins)
export default function InscriptionsAdmin({ concoursId }) {
  const [inscriptions, setInscriptions] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "inscriptions"), where("concoursId", "==", concoursId));
    return onSnapshot(
      q,
      (snap) =>
        setInscriptions(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
        ),
      () => setInscriptions([])
    );
  }, [concoursId]);

  if (!inscriptions) return <p className="text-sm text-ardoise">Chargement des inscriptions…</p>;

  return (
    <div className="space-y-2">
      <h3 className="text-[15px] font-black uppercase tracking-wider">
        Équipes inscrites ({inscriptions.length})
      </h3>
      {inscriptions.length === 0 ? (
        <p className="text-sm text-ardoise">Aucune inscription pour l'instant.</p>
      ) : (
        <ol className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">
          {inscriptions.map((ins, i) => (
            <li key={ins.id} className="py-2 text-sm">
              <p className="font-bold">
                {i + 1}. {ins.joueurs.join(" · ")}
              </p>
              <p className="text-ardoise">
                {[ins.club, ins.telephone, ins.email].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
