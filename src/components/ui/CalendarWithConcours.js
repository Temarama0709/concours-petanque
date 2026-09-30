import React from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { parseDate, toKey } from "../../lib/dates.js";

export default function CalendarWithConcours({ selectedDate, setSelectedDate, concoursList = [] }) {
  const concoursParJour = concoursList.reduce((acc, c) => {
    const d = parseDate(c.date);
    if (!d) return acc;
    const key = toKey(d);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // react-day-picker v8 : le contenu d'un jour se personnalise via components.DayContent
  const DayContent = ({ date }) => {
    const count = concoursParJour[toKey(date)] || 0;
    return (
      <div className="relative w-full h-full flex items-center justify-center text-sm font-medium">
        <div>{date.getDate()}</div>
        {count > 0 && (
          <span className="absolute top-0 right-0 text-[10px] bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center z-10 shadow border border-white">
            {count}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto mt-2 rounded border bg-white shadow p-4">
      <DayPicker
        mode="single"
        locale={fr}
        selected={selectedDate}
        onSelect={setSelectedDate}
        components={{ DayContent }}
        showOutsideDays
        styles={{
          root: { width: "100%", margin: 0 },
          months: { display: "grid", gridTemplateColumns: "repeat(1, 1fr)" },
          table: { width: "100%", maxWidth: "none" },
          day: { width: "100%", aspectRatio: "1 / 1", padding: 0 }
        }}
      />
    </div>
  );
}
