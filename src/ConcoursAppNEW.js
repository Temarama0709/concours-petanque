
import React, { useState } from "react";
import CalendarWithConcours from "./CalendarWithConcours";
import { format } from "date-fns";

function ConcoursApp() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [filtre, setFiltre] = useState("tous");

  const [concoursList] = useState([
    { id: 1, title: "Concours A", date: "2024-04-25", lieu: "Ville A", type: "officiel" },
    { id: 2, title: "Concours B", date: "2024-04-26", lieu: "Ville B", type: "ouvert" },
    { id: 3, title: "Concours C", date: "2024-04-25", lieu: "Ville C", type: "officiel" },
    { id: 4, title: "Concours D", date: "2024-04-27", lieu: "Ville D", type: "ouvert" }
  ]);

  const concoursFiltres = concoursList.filter(c => {
    const typeOk = filtre === "tous" || c.type?.toLowerCase() === filtre.toLowerCase();
    const dateOk = !selectedDate || c.date === format(selectedDate, "yyyy-MM-dd");
    return typeOk && dateOk;
  });

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-sky-700">Concours de Pétanque</h1>

      {/* Selecteur de type */}
      <div className="mb-4 w-full">
        <label className="block text-sm font-medium text-amber-700 mb-1 text-left">
          Type de concours
        </label>
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="w-full max-w-xs border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <option value="tous">Tous les concours</option>
          <option value="officiel">Officiels</option>
          <option value="ouvert">Ouverts à tous</option>
        </select>
      </div>

      {/* Calendrier */}
      <CalendarWithConcours
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        concoursList={concoursList}
      />

      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mt-2 bg-gray-200 px-2 py-1 rounded text-sm"
        >
          Réinitialiser la date
        </button>
      )}

      {/* Liste filtrée */}
      <div className="mt-4 space-y-2">
        {concoursFiltres.length === 0 ? (
          <p className="text-gray-500 text-center">Aucun concours pour ce filtre</p>
        ) : (
          concoursFiltres.map((c) => (
            <div key={c.id} className="border rounded p-2 shadow bg-white">
              <h2 className="font-semibold">{c.title}</h2>
              <p className="text-sm text-gray-600">{c.date} – {c.lieu} ({c.type})</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConcoursApp;
