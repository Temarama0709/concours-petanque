import { format, isValid, parse } from "date-fns";
import { fr } from "date-fns/locale";

// Lit le texte d'une affiche (image ou PDF) avec OCR.space et en extrait
// les informations utiles pour pré-remplir le formulaire.
// "helloworld" est la clé de démonstration gratuite (limitée) d'OCR.space.
export async function lireAffiche(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: "helloworld" },
    body: new URLSearchParams({
      base64Image: base64,
      language: "fre",
      ...(file.type === "application/pdf" ? { filetype: "PDF" } : {})
    })
  });
  const data = await res.json();
  const text = data?.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";
  if (!text.trim()) throw new Error("Aucun texte trouvé sur l'affiche.");

  const title = /concours.*pétanque/i.test(text) ? "Concours Pétanque" : "";

  let date = "";
  const dateStr = text.match(/(\d{1,2}(?:er)?\s+[a-zéû]+\s+20\d\d)/i)?.[1]?.replace(/(\d)er/, "$1");
  if (dateStr) {
    const parsed = parse(dateStr.toLowerCase(), "d MMMM yyyy", new Date(), { locale: fr });
    // format() garde la date locale (toISOString décalerait d'un jour en France)
    if (isValid(parsed)) date = format(parsed, "yyyy-MM-dd");
  }

  const ville = text.match(/(?:à|au)\s+([A-ZÉÈÂ][^\n]+)/)?.[1]?.trim() || "";
  const cp = text.match(/\b(0[1-9]|[1-8][0-9]|9[0-5])[0-9]{3}\b/)?.[0] || "";

  let formatConcours = "";
  const categorie = /f[ée]minin/i.test(text) ? "Feminin" : "Senior";
  if (/t[êe]te.{0,3}[àa].{0,3}t[êe]te/i.test(text)) formatConcours = `Tete a tete ${categorie}`;
  else if (/doublette/i.test(text)) formatConcours = `Doublette ${categorie}`;
  else if (/triplette/i.test(text)) formatConcours = `Triplette ${categorie}`;

  return { title, date, ville, cp, format: formatConcours };
}
