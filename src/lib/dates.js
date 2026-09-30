import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// Les dates sont stockées au format "yyyy-MM-dd". parseISO les lit en heure
// locale (contrairement à new Date("yyyy-MM-dd") qui les lit en UTC).
export function parseDate(value) {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function toKey(date) {
  return format(date, "yyyy-MM-dd");
}

export function todayKey() {
  return toKey(new Date());
}

export function formatLong(value) {
  const d = parseDate(value);
  return d ? format(d, "EEEE d MMMM yyyy", { locale: fr }) : value;
}

export function formatShort(value) {
  const d = parseDate(value);
  return d ? format(d, "EEE d MMM", { locale: fr }) : value;
}

// Fichier .ics pour ajouter le concours à l'agenda du téléphone (rappel).
export function downloadIcs(concours) {
  const d = parseDate(concours.date);
  if (!d) return;
  const start = format(d, "yyyyMMdd");
  const end = format(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), "yyyyMMdd");
  const esc = (s = "") => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Concours Petanque//FR",
    "BEGIN:VEVENT",
    `UID:${concours.id}@petanque-concours`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(concours.title)}`,
    `LOCATION:${esc(`${concours.lieu}, ${concours.cp} ${concours.ville}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(concours.title)} demain`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `concours-${concours.date}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
