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
        className={`h-11 px-4 rounded-[10px] text-sm font-bold whitespace-nowrap ${departementFiltre.length ? "bg-navy text-white" : "bg-fond text-navy hover:bg-bord"}`}
      >
        Départements{departementFiltre.length > 0 && ` (${departementFiltre.length})`}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-lg border-2 border-bord z-20 py-1">
          {DEPARTEMENTS.map((dep) => (
            <label key={dep.code} className="flex items-center gap-2 px-4 py-2.5 hover:bg-fond cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-navy"
                checked={departementFiltre.includes(dep.code)}
                onChange={() => toggleDepartement(dep.code)}
              />
              <span>{dep.code} - {dep.nom}</span>
            </label>
          ))}
          {departementFiltre.length > 0 && (
            <button type="button" onClick={() => setDepartementFiltre([])} className="w-full text-left px-4 py-2.5 text-sm font-bold text-navy hover:bg-fond">
              Tout effacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
