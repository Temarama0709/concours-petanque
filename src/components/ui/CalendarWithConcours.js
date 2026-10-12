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
      <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-sm font-semibold">
        <span>{date.getDate()}</span>
        {/* Un point jaune par jour de concours ; le nombre s'il y en a plusieurs */}
        <span
          aria-label={count ? `${count} concours` : undefined}
          className={`h-1.5 min-w-[6px] rounded-full text-[9px] leading-[6px] font-black text-navy ${count ? "bg-jaune" : "bg-transparent"} ${count > 1 ? "h-3 px-1 leading-3" : ""}`}
        >
          {count > 1 ? count : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full rounded-xl border-2 border-bord bg-white p-3">
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
