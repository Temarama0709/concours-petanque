import React, { useEffect, useState } from "react";
import { ecouterTournoi } from "../../lib/tournoiFirestore.js";
import GestionTournoi from "./GestionTournoi.js";
import TableauTournoi from "./TableauTournoi.js";
import { IconX } from "../ui/icons.js";

// Écran plein : suivi du concours (tout le monde) ou gestion (organisateur)
export default function EcranTournoi({ concours, gestion, uid, onFermer }) {
  const [etat, setEtat] = useState(null);

  useEffect(() => ecouterTournoi(concours.id, setEtat), [concours.id]);
  useEffect(() => {
    const fermer = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [onFermer]);

  return (
    <div className="fixed inset-0 z-[1200] bg-white overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titre-tournoi">
      <div className="max-w-md mx-auto">
        <header className="sticky top-0 z-10 bg-navy text-white px-5 py-4 flex items-center gap-3">
          <button type="button" aria-label="Fermer" onClick={onFermer} className="w-11 h-11 shrink-0 rounded-[10px] border-[1.5px] border-navy-line flex items-center justify-center hover:bg-navy-dark">
            <IconX />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-navy-soft uppercase tracking-wider font-bold">{gestion ? "Gestion du concours" : "Suivi du concours"}</p>
            <h2 id="titre-tournoi" className="font-black truncate">{concours.title}</h2>
          </div>
        </header>
        <div className="px-5 py-4">
          {!etat ? (
            <p className="text-ardoise">Chargement…</p>
          ) : gestion ? (
            <GestionTournoi concours={concours} tournoi={etat.tournoi} parties={etat.parties} />
          ) : etat.tournoi ? (
            <TableauTournoi concoursId={concours.id} tournoi={etat.tournoi} parties={etat.parties} uid={uid} />
          ) : (
            <p className="text-ardoise">Le tirage n'a pas encore eu lieu. Revenez le jour du concours !</p>
          )}
        </div>
      </div>
    </div>
  );
}
