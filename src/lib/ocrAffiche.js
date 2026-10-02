import { lireDate } from "./importCalendrier.js";

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
      scale: "true",
      ...(file.type === "application/pdf" ? { filetype: "PDF" } : {})
    })
  });
  const data = await res.json();
  const text = data?.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";
  if (!text.trim()) throw new Error("Aucun texte trouvé sur l'affiche.");
  return extraireInfos(text);
}

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

// Extrait date, lieu, format, tarif… d'un texte libre : texte lu sur une
// affiche, ou texte d'une publication partagée depuis Facebook.
export function extraireInfos(text, aujourdhui = new Date()) {
  const plat = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  let date = lireDate(text);
  if (!date) {
    // "samedi 12 juillet" sans année : prochaine occurrence de cette date
    const m = plat.match(/\b(\d{1,2})(?:er)?\s+(janv|fevr|mars|avri|mai|juin|juil|aout|sept|octo|nove|dece)[a-z]*/);
    if (m) {
      const mois = MOIS.findIndex((x) => x.startsWith(m[2]));
      let annee = aujourdhui.getFullYear();
      const candidate = new Date(annee, mois, Number(m[1]));
      if (candidate < new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())) annee++;
      date = `${annee}-${String(mois + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }

  // "74300 Cluses" est plus fiable que "à Cluses"
  let cp = "";
  let ville = "";
  const cpVille = text.match(/\b((?:0[1-9]|[1-8]\d|9[0-5])\d{3})\s+([A-ZÉÈÂÎ][A-Za-zÀ-ÿ' -]{1,40})/);
  if (cpVille) {
    cp = cpVille[1];
    ville = cpVille[2].trim();
  } else {
    cp = text.match(/\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/)?.[0] || "";
    ville = text.match(/(?:^|\s)(?:à|au)\s+([A-ZÉÈÂÎ][A-Za-zÀ-ÿ' -]{1,40})/)?.[1]?.trim() || "";
  }

  let equipe = "";
  if (/tete.{0,3}a.{0,3}tete/.test(plat)) equipe = "Tete a tete";
  else if (/doublette/.test(plat)) equipe = "Doublette";
  else if (/triplette/.test(plat)) equipe = "Triplette";
  let categorie = "Senior";
  if (/feminin|dames/.test(plat)) categorie = "Feminin";
  else if (/mixte/.test(plat)) categorie = "Mixte";
  else if (/veteran/.test(plat)) categorie = "Veteran";
  else if (/jeunes|junior|cadet|minime/.test(plat)) categorie = "Jeunes";
  if (categorie === "Mixte" && equipe === "Tete a tete") categorie = "Senior";
  const formatConcours = equipe ? `${equipe} ${categorie}` : "";

  const prix = plat.match(/(\d+(?:[.,]\d+)?)\s*(?:€|euros?\b)/)?.[1]?.replace(",", ".") || "";

  let type = "";
  if (/ouvert a tous|non licencie|sans licence|amical|tout public/.test(plat)) type = "ouvert";
  else if (/officiel|licencies|ffpjp|qualificatif|championnat/.test(plat)) type = "officiel";

  const title = /concours/.test(plat) && /petanque/.test(plat) ? "Concours de pétanque" : "";

  return { title, date, ville, cp, format: formatConcours, prix, type };
}
