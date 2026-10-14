import React, { useMemo } from "react";
import PartieCarte from "./PartieCarte.js";
import { STATUTS, champion, classementPoule } from "../../lib/tournoi.js";

const triParties = (x, y) => x.tour - y.tour || x.ordre - y.ordre;

// Affichage du tournoi : votre partie, poules (classement + parties), tableau final
export default function TableauTournoi({ concoursId, tournoi, parties, mode = "public", uid = null }) {
  const equipesParId = useMemo(() => Object.fromEntries(tournoi.equipes.map((e) => [e.id, e])), [tournoi.equipes]);
  const nom = (id) => {
    const e = equipesParId[id];
    return e ? `${e.numero}. ${e.nom}` : "…";
  };
  const camp = (p) => (uid && p.uidA === uid ? "A" : uid && p.uidB === uid ? "B" : null);
  const carte = (p) => (
    <PartieCarte
      key={p.id}
      concoursId={concoursId}
      partie={p}
      nom={nom}
      mode={mode}
      monCamp={mode === "orga" ? null : camp(p)}
      nbTerrains={tournoi.nbTerrains}
      pointsGagnants={tournoi.pointsGagnants}
    />
  );

  const mesParties = mode !== "orga" && uid ? parties.filter((p) => camp(p) && p.equipeB != null).sort(triParties) : [];
  const enCours = mesParties.filter((p) => p.statut !== STATUTS.VALIDEE);
  const monEquipe = uid ? tournoi.equipes.find((e) => e.uid === uid) : null;
  const finale = parties.filter((p) => p.phase === "finale");
  const gagnant = champion(finale);
  const toursFinale = [...new Set(finale.map((p) => p.tour))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {gagnant && (
        <div className="rounded-xl bg-jaune p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider">Vainqueur du concours</p>
          <p className="text-xl font-black">{nom(gagnant)}</p>
        </div>
      )}

      {monEquipe && (
        <section className="space-y-2">
          <h3 className="text-[15px] font-black uppercase tracking-wider">Votre équipe : {nom(monEquipe.id)}</h3>
          {enCours.length ? enCours.map(carte) : <p className="text-sm text-ardoise">Aucune partie à jouer pour l'instant.</p>}
        </section>
      )}

      {toursFinale.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[15px] font-black uppercase tracking-wider">Phase finale</h3>
          {toursFinale.map((t) => {
            const ps = finale.filter((p) => p.tour === t).sort(triParties);
            return (
              <div key={t} className="space-y-2">
                <p className="text-sm font-bold text-ardoise">{ps[0]?.libelle}</p>
                {ps.map(carte)}
              </div>
            );
          })}
        </section>
      )}

      {tournoi.poules?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[15px] font-black uppercase tracking-wider">Poules</h3>
          {tournoi.poules.map((poule) => {
            const ps = parties.filter((p) => p.phase === "poule" && p.poule === poule.nom).sort(triParties);
            const { lignes, termine, qualifies } = classementPoule(poule, ps);
            return (
              <div key={poule.nom} className="rounded-xl border-2 border-bord overflow-hidden">
                <div className="bg-navy text-white px-3 py-2 flex justify-between">
                  <span className="font-black uppercase tracking-wider">Poule {poule.nom}</span>
                  {termine && <span className="text-sm text-jaune font-bold">Terminée</span>}
                </div>
                <table className="w-full text-sm">
                  <thead className="text-ardoise">
                    <tr>
                      <th className="text-left px-3 py-1 font-semibold">Équipe</th>
                      <th className="px-1 font-semibold" title="Victoires">V</th>
                      <th className="px-1 font-semibold" title="Points marqués moins points encaissés">+/−</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l) => (
                      <tr key={l.equipe} className={`border-t border-bord ${qualifies.includes(l.equipe) ? "font-bold" : ""}`}>
                        <td className="px-3 py-1.5">
                          {nom(l.equipe)}
                          {qualifies.includes(l.equipe) && <span className="ml-1 text-xs bg-jaune text-navy rounded px-1">Qualifiée</span>}
                        </td>
                        <td className="text-center">{l.victoires}</td>
                        <td className="text-center">{l.joues ? (l.diff > 0 ? `+${l.diff}` : l.diff) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 space-y-2 border-t-2 border-bord">{ps.map(carte)}</div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
