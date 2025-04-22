
import React from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

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

  return (
    <div className="w-full max-w-md mx-auto mt-2 rounded border bg-white shadow p-4">
      <DayPicker
      
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
        }}
        dayContent={renderDay}
        showOutsideDays

        styles={{
          root: { width: '100%' },
          months: { display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)' },
          day: { width: '100%', aspectRatio: '1 / 1', padding: 0 }
        }}
      />
    </div>
  );
}
