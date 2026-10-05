import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input.js";
import { communesParCodePostal, communesParNom } from "../lib/communes.js";

const memeNom = (a, b) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

// Champs « Code postal » + « Ville » liés :
// - un code postal complet propose ses communes (remplie d'office s'il n'y en a qu'une) ;
// - une ville tapée propose les communes correspondantes, et en choisir une remplit le code postal.
export default function CommuneFields({ cp, ville, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const derniereSaisie = useRef("");

  // Code postal complet (saisi, ou lu sur une affiche) → communes
  useEffect(() => {
    if (!/^\d{5}$/.test(cp)) return;
    let annule = false;
    communesParCodePostal(cp).then((communes) => {
      if (annule || !communes.length) return;
      if (communes.some((c) => memeNom(c.nom, ville))) return; // ville déjà cohérente
      if (communes.length === 1) {
        onChange({ cp, ville: communes[0].nom });
        setOuvert(false);
      } else {
        setSuggestions(communes);
        setOuvert(true);
      }
    });
    return () => {
      annule = true;
    };
    // Volontairement déclenché seulement quand le code postal change
  }, [cp]); // eslint-disable-line

  // Ville tapée → suggestions (après une courte pause de frappe)
  const handleVille = (valeur) => {
    onChange({ cp, ville: valeur });
    derniereSaisie.current = valeur;
    if (valeur.trim().length < 2) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    setRecherche(true);
    setTimeout(async () => {
      if (derniereSaisie.current !== valeur) return;
      const communes = await communesParNom(valeur);
      if (derniereSaisie.current !== valeur) return;
      setRecherche(false);
      setSuggestions(communes);
      setOuvert(communes.length > 0);
    }, 250);
  };

  const choisir = (commune) => {
    onChange({ cp: commune.cp, ville: commune.nom });
    setSuggestions([]);
    setOuvert(false);
  };

  // En quittant le champ : si la ville tapée correspond exactement à une seule commune, on remplit le CP
  const handleBlurVille = () => {
    // Fermeture immédiate : le choix d'une suggestion se fait au mousedown, avant la perte du focus
    setOuvert(false);
    const exactes = suggestions.filter((c) => memeNom(c.nom, ville));
    if (!cp && exactes.length === 1) onChange({ cp: exactes[0].cp, ville: exactes[0].nom });
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Code postal"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        value={cp}
        onChange={(e) => onChange({ cp: e.target.value.replace(/\D/g, ""), ville })}
      />
      <div className="relative">
        <Input
          placeholder="Ville"
          autoComplete="off"
          maxLength={100}
          value={ville}
          onChange={(e) => handleVille(e.target.value)}
          onFocus={() => suggestions.length && setOuvert(true)}
          onBlur={handleBlurVille}
          role="combobox"
          aria-expanded={ouvert}
          aria-autocomplete="list"
        />
        {recherche && ville.trim().length >= 2 && (
          <span className="absolute right-3 top-2 text-xs text-stone-400">…</span>
        )}
        {ouvert && suggestions.length > 0 && (
          <ul role="listbox" className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black/5">
            {suggestions.map((c) => (
              <li key={`${c.nom}-${c.cp}`} role="option" aria-selected={memeNom(c.nom, ville) && c.cp === cp}>
                <button
                  type="button"
                  // onMouseDown plutôt que onClick : passe avant la perte du focus du champ
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(c);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-amber-100"
                >
                  {c.nom} <span className="text-stone-500">— {c.cp}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
