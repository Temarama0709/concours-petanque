import React from "react";
import { Input } from "./ui/input.js";
import { DEPARTEMENTS_CLUBS, useClubs } from "../lib/clubs.js";

const CHAMP = "w-full h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";

// Affilié à un club ou non ; si oui : département puis club (ou saisie libre)
export default function ChoixClub({ valeur, onChange }) {
  const clubs = useClubs();
  const maj = (champs) => onChange({ ...valeur, ...champs });
  const duDepartement = (clubs || []).filter((c) => c.departement === valeur.departement);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold mb-1">Êtes-vous licencié dans un club ?</legend>
      <div className="grid grid-cols-2 gap-2">
        {[
          [true, "Oui, affilié à un club"],
          [false, "Non, pas de club"]
        ].map(([oui, libelle]) => (
          <label
            key={libelle}
            className={`flex items-center gap-2 rounded-[10px] border-2 px-3 py-2 text-sm cursor-pointer ${
              valeur.affilie === oui ? "border-jaune bg-jaune-clair font-bold" : "border-bord"
            }`}
          >
            <input type="radio" name="affilie" className="accent-navy" checked={valeur.affilie === oui} onChange={() => maj({ affilie: oui })} />
            {libelle}
          </label>
        ))}
      </div>

      {valeur.affilie && (
        <div className="space-y-2">
          <select
            aria-label="Département du club"
            className={CHAMP}
            value={valeur.departement}
            onChange={(e) => maj({ departement: e.target.value, clubId: "", clubAutre: "" })}
          >
            {DEPARTEMENTS_CLUBS.map((d) => (
              <option key={d.code} value={d.code}>{d.code} · {d.nom}</option>
            ))}
          </select>
          <select aria-label="Club" className={CHAMP} value={valeur.clubId} onChange={(e) => maj({ clubId: e.target.value })}>
            <option value="">{clubs === null ? "Chargement des clubs…" : "Choisissez votre club"}</option>
            {duDepartement.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}{c.ville ? ` (${c.ville})` : ""}</option>
            ))}
            <option value="autre">Mon club n'est pas dans la liste</option>
          </select>
          {valeur.clubId === "autre" && (
            <Input
              aria-label="Nom du club"
              placeholder="Nom de votre club"
              maxLength={80}
              value={valeur.clubAutre}
              onChange={(e) => maj({ clubAutre: e.target.value })}
            />
          )}
        </div>
      )}
    </fieldset>
  );
}
