import React from "react";
import { STATUTS_INSCRIPTION, statutDe, useMesInscriptions } from "../lib/inscriptions.js";
import { formatShort, todayKey } from "../lib/dates.js";

// Inscriptions de la personne connectée, avec leur statut (en attente, validée, refusée)
export default function MesInscriptions({ user, concoursList, onOuvrir }) {
  const mes = useMesInscriptions(user);
  const parId = Object.fromEntries(concoursList.map((c) => [c.id, c]));
  const aVenir = mes.filter((i) => parId[i.concoursId] && parId[i.concoursId].date >= todayKey());
  if (!aVenir.length) return null;
  return (
    <section className="rounded-xl border-2 border-bord p-3 space-y-2" aria-label="Mes inscriptions">
      <h2 className="text-[15px] font-black uppercase tracking-wider">Mes inscriptions</h2>
      <ul className="space-y-2">
        {aVenir.map((i) => {
          const c = parId[i.concoursId];
          const [libelle, style] = STATUTS_INSCRIPTION[statutDe(i)];
          return (
            <li key={i.id}>
              <button type="button" onClick={() => onOuvrir(c)} className="w-full flex items-center justify-between gap-2 text-left hover:bg-fond rounded-[10px] p-1">
                <span className="min-w-0">
                  <span className="block font-bold truncate">{c.title}</span>
                  <span className="block text-sm text-ardoise capitalize">{formatShort(c.date)} · {c.ville}</span>
                </span>
                <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${style}`}>{libelle}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
