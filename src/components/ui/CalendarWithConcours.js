
import React from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

const getConcoursCountPerDay = (concoursList) => {
  const map = {};
  concoursList.forEach(c => {
    if (c.date) {
      map[c.date] = (map[c.date] || 0) + 1;
    }
  });
  return map;
};


export default function CalendarWithConcours({ selectedDate, setSelectedDate, concoursList = [] }) {

  const concoursParJour = concoursList.reduce((acc, c) => {
    const key = format(new Date(c.date), "yyyy-MM-dd");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const renderDay = (date) => {
    const key = format(date, "yyyy-MM-dd");
    const count = concoursParJour[key] || 0;

    return (
      <div className="relative w-full h-full flex items-center justify-center text-sm font-medium">
        <div>{date.getDate()}</div>
        {count > 0 && (
          <span className="absolute top-1 right-1 text-[10px] bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center z-10 shadow border border-white">
            {count}
          </span>
        )}
      </div>
    );
  };
  const concoursPerDay = getConcoursCountPerDay(concoursList);

  return (
    <div className="w-full max-w-md mx-auto mt-2 rounded border bg-white shadow p-4">
<DayPicker
  selected={selectedDate}
  onDayClick={setSelectedDate}
  modifiersClassNames={{
    selected: "bg-sky-500 text-white"
  }}
  className="rounded-md border bg-white p-4"
  showOutsideDays
  components={{
    DayContent: (date) => {
      const dateStr = format(date.date, "yyyy-MM-dd");
      const count = concoursPerDay[dateStr] || 0;
  
      return (
        <div className="relative w-full h-full flex justify-center items-center">
          <div>{date.date.getDate()}</div>
          {count > 0 && (
            <span className="absolute top-0 right-0 text-[10px] bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
      );
    }
  }}
  
/>

    </div>
  );
}
