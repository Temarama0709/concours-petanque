import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar({ selected, onSelect, className = "" }) {
  return (
    <div className={className}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        className="rounded border p-2 bg-white shadow"
      />
    </div>
  );
}