import React, { useState } from "react";

const DEPARTEMENTS = [
  { code: "01", nom: "Ain" },
  { code: "69", nom: "Rhône" },
  { code: "74", nom: "Haute-Savoie" },
  { code: "38", nom: "Isère" }
];

export default function MultiSelectDepartement({ departementFiltre, setDepartementFiltre }) {
  const [open, setOpen] = useState(false);

  const toggleDepartement = (code) => {
    setDepartementFiltre((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm whitespace-nowrap"
      >
        📍 Départements{departementFiltre.length > 0 && ` (${departementFiltre.length})`}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-20 py-1">
          {DEPARTEMENTS.map((dep) => (
            <label key={dep.code} className="flex items-center gap-2 px-4 py-2 hover:bg-amber-100 cursor-pointer">
              <input
                type="checkbox"
                checked={departementFiltre.includes(dep.code)}
                onChange={() => toggleDepartement(dep.code)}
              />
              <span>{dep.code} - {dep.nom}</span>
            </label>
          ))}
          {departementFiltre.length > 0 && (
            <button type="button" onClick={() => setDepartementFiltre([])} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
              Tout effacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
