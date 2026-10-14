import React, { useState } from "react";
import { Button } from "../ui/button.js";
import { STATUTS, scoreValide } from "../../lib/tournoi.js";
import { changerTerrain, confirmerScore, proposerScore, scoreOrganisateur } from "../../lib/tournoiFirestore.js";

const BADGES = {
  [STATUTS.A_JOUER]: ["À jouer", "bg-fond text-navy"],
  [STATUTS.EN_ATTENTE]: ["Score à confirmer", "bg-jaune-clair text-jaune-texte"],
  [STATUTS.VALIDEE]: ["Terminée", "bg-navy text-white"]
};

function SaisieScore({ nomA, nomB, initialA, initialB, pointsGagnants, libelle, onValider, onAnnuler }) {
  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const champ = "w-16 h-11 text-center text-lg font-black bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";
  const valider = async (e) => {
    e.preventDefault();
    const na = Number(a);
    const nb = Number(b);
    if (!scoreValide(na, nb, pointsGagnants)) {
      setErreur(`Score invalide : l'équipe gagnante doit avoir ${pointsGagnants} points.`);
      return;
    }
    setErreur("");
    setEnvoi(true);
    try {
      await onValider(na, nb);
    } catch (error) {
      console.error("Score:", error);
      setErreur("L'enregistrement a échoué.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <form onSubmit={valider} className="space-y-2 pt-1">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <label htmlFor="score-a" className="text-sm truncate">{nomA}</label>
        <input id="score-a" type="number" inputMode="numeric" min="0" max={pointsGagnants} className={champ} value={a} onChange={(e) => setA(e.target.value)} />
        <label htmlFor="score-b" className="text-sm truncate">{nomB}</label>
        <input id="score-b" type="number" inputMode="numeric" min="0" max={pointsGagnants} className={champ} value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={envoi}>{envoi ? "Envoi…" : libelle}</Button>
        {onAnnuler && <Button size="sm" variant="ghost" onClick={onAnnuler}>Annuler</Button>}
      </div>
    </form>
  );
}

// mode : "public" | "orga" ; monCamp : "A" | "B" | null (équipe de la personne connectée)
export default function PartieCarte({ concoursId, partie, nom, mode = "public", monCamp = null, nbTerrains = 0, pointsGagnants = 13 }) {
  const [edition, setEdition] = useState(false);
  const p = partie;
  const exempt = p.equipeB == null;
  const [badge, styleBadge] = BADGES[p.statut] || BADGES[STATUTS.A_JOUER];
  const gagneA = p.statut === STATUTS.VALIDEE && !exempt && p.scoreA > p.scoreB;
  const gagneB = p.statut === STATUTS.VALIDEE && !exempt && p.scoreB > p.scoreA;
  const afficheScore = p.scoreA != null && (p.statut !== STATUTS.A_JOUER);
  const nomA = nom(p.equipeA);
  const nomB = exempt ? "Exempt" : nom(p.equipeB);

  const ligne = (n, score, gagne, moi) => (
    <div className={`flex items-center justify-between gap-2 ${gagne ? "font-black" : ""}`}>
      <span className={`truncate ${moi ? "underline decoration-jaune decoration-2 underline-offset-4" : ""}`}>{n}</span>
      <span className="shrink-0 w-8 text-right text-lg font-black">{afficheScore ? score : ""}</span>
    </div>
  );

  // Actions selon qui regarde
  let actions = null;
  if (!exempt && mode === "orga") {
    actions = edition ? (
      <SaisieScore
        nomA={nomA}
        nomB={nomB}
        initialA={p.scoreA}
        initialB={p.scoreB}
        pointsGagnants={pointsGagnants}
        libelle="Valider le score"
        onValider={async (a, b) => {
          await scoreOrganisateur(concoursId, p.id, a, b);
          setEdition(false);
        }}
        onAnnuler={() => setEdition(false)}
      />
    ) : (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant={p.statut === STATUTS.VALIDEE ? "ghost" : "default"} onClick={() => setEdition(true)}>
          {p.statut === STATUTS.VALIDEE ? "Corriger" : p.statut === STATUTS.EN_ATTENTE ? "Vérifier le score" : "Saisir le score"}
        </Button>
        {p.statut === STATUTS.EN_ATTENTE && (
          <Button size="sm" variant="navy" onClick={() => scoreOrganisateur(concoursId, p.id, p.scoreA, p.scoreB)}>Valider</Button>
        )}
        {p.statut !== STATUTS.VALIDEE && nbTerrains > 0 && (
          <label className="flex items-center gap-1 text-sm text-ardoise ml-auto">
            Terrain
            <select
              className="h-9 px-2 bg-fond rounded-[10px] text-navy"
              value={p.terrain ?? ""}
              onChange={(e) => changerTerrain(concoursId, p.id, e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">—</option>
              {Array.from({ length: nbTerrains }, (_, i) => i + 1).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        )}
      </div>
    );
  } else if (!exempt && monCamp && p.statut !== STATUTS.VALIDEE) {
    const aConfirmer = p.statut === STATUTS.EN_ATTENTE && p.saisiePar !== monCamp;
    if (aConfirmer && !edition) {
      actions = (
        <div className="space-y-2 pt-1">
          <p className="text-sm">L'équipe adverse a saisi ce score. Est-il juste ?</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => confirmerScore(concoursId, p)}>Confirmer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEdition(true)}>Non, corriger</Button>
          </div>
        </div>
      );
    } else if (p.statut === STATUTS.EN_ATTENTE && !edition) {
      actions = (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-sm text-ardoise">En attente de confirmation par l'équipe adverse.</p>
          <Button size="sm" variant="ghost" onClick={() => setEdition(true)}>Modifier</Button>
        </div>
      );
    } else {
      actions = (
        <SaisieScore
          nomA={nomA}
          nomB={nomB}
          initialA={p.scoreA}
          initialB={p.scoreB}
          pointsGagnants={pointsGagnants}
          libelle="Envoyer le score"
          onValider={async (a, b) => {
            await proposerScore(concoursId, p, monCamp, a, b);
            setEdition(false);
          }}
          onAnnuler={edition ? () => setEdition(false) : null}
        />
      );
    }
  }

  return (
    <div className={`rounded-xl border-2 p-3 space-y-1 ${monCamp ? "border-jaune" : "border-bord"}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold uppercase tracking-wide text-ardoise">
          {p.libelle}{p.poule ? ` · Poule ${p.poule}` : ""}
        </span>
        {exempt ? (
          <span className="font-bold text-ardoise">Qualifiée d'office</span>
        ) : (
          <span className={`font-bold px-1.5 py-0.5 rounded ${styleBadge}`}>{badge}</span>
        )}
      </div>
      {ligne(nomA, p.scoreA, gagneA || exempt, monCamp === "A")}
      {ligne(nomB, p.scoreB, gagneB, monCamp === "B")}
      {!exempt && p.statut !== STATUTS.VALIDEE && (
        <p className="text-sm font-bold">{p.terrain ? `Terrain ${p.terrain}` : "Terrain : en attente d'un terrain libre"}</p>
      )}
      {actions}
    </div>
  );
}
