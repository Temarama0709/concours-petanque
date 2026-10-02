import React, { useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { FORMAT_LABELS } from "../lib/formats.js";
import { formatShort, todayKey } from "../lib/dates.js";
import { analyserTableau, cleConcours, completerCodesPostaux, lireTexte } from "../lib/importCalendrier.js";

const DEPARTEMENTS = [
  { code: "74", nom: "Haute-Savoie" },
  { code: "01", nom: "Ain" },
  { code: "38", nom: "Isère" },
  { code: "69", nom: "Rhône" },
  { code: "", nom: "Autre / plusieurs" }
];

// Import en masse d'un calendrier officiel (Excel, CSV ou copier-coller),
// réservé aux admins. Les concours importés sont directement validés.
export default function ImportCalendrier({ concoursExistants, onTermine }) {
  const [departement, setDepartement] = useState("74");
  const [texte, setTexte] = useState("");
  const [analyse, setAnalyse] = useState(null); // { concours, erreurs }
  const [inclurePasses, setInclurePasses] = useState(false);
  const [etat, setEtat] = useState(""); // "", "analyse", "import"
  const [message, setMessage] = useState(null);

  const analyser = async (rows) => {
    setEtat("analyse");
    setMessage(null);
    try {
      const resultat = analyserTableau(rows, { departement });
      await completerCodesPostaux(resultat.concours, departement);
      const existants = new Set(concoursExistants.map(cleConcours));
      const vus = new Set();
      resultat.concours.forEach((c) => {
        const cle = cleConcours(c);
        c.doublon = existants.has(cle) || vus.has(cle);
        vus.add(cle);
      });
      setAnalyse(resultat);
    } catch (error) {
      console.error("Analyse du calendrier:", error);
      setMessage({ type: "error", text: "Impossible de lire ce fichier." });
    } finally {
      setEtat("");
    }
  };

  const handleFichier = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (/\.xlsx$/i.test(file.name)) {
      const { readSheet } = await import("read-excel-file/browser");
      analyser(await readSheet(file));
    } else if (/\.xls$/i.test(file.name)) {
      setMessage({ type: "error", text: "Ancien format Excel (.xls) : ouvrez-le dans Excel et enregistrez-le en .xlsx ou .csv." });
    } else {
      analyser(lireTexte(await file.text()));
    }
  };

  const aImporter = (analyse?.concours || []).filter(
    (c) => !c.doublon && (inclurePasses || c.date >= todayKey())
  );

  const importer = async () => {
    setEtat("import");
    setMessage(null);
    try {
      // Firestore limite un lot à 500 écritures
      for (let i = 0; i < aImporter.length; i += 400) {
        const batch = writeBatch(db);
        aImporter.slice(i, i + 400).forEach(({ title, date, lieu, type, format, prix, ville, cp }) => {
          batch.set(doc(collection(db, "concours")), {
            title, date, lieu, type, format, prix, ville, cp,
            valide: true,
            source: "import",
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
      setMessage({ type: "success", text: `✅ ${aImporter.length} concours importés.` });
      setAnalyse(null);
      setTexte("");
      onTermine?.();
    } catch (error) {
      console.error("Import du calendrier:", error);
      setMessage({ type: "error", text: "L'import a échoué (droits admin ? règles Firestore publiées ?)." });
    } finally {
      setEtat("");
    }
  };

  const nbPasses = (analyse?.concours || []).filter((c) => !c.doublon && c.date < todayKey()).length;
  const nbDoublons = (analyse?.concours || []).filter((c) => c.doublon).length;

  return (
    <div className="border rounded bg-white shadow p-4 space-y-3">
      <h2 className="text-lg font-bold text-sky-700">Importer un calendrier officiel</h2>
      <p className="text-sm text-stone-600">
        Fichier Excel (.xlsx) ou CSV, ou tableau copié-collé (depuis Excel, un site web…).
        La première ligne doit contenir les titres des colonnes, dont au moins <b>Date</b> et <b>Ville</b>
        (ou Commune). Colonnes reconnues en plus : Nom, Club, Lieu, CP, Catégorie/Format, Tarif, Heure.
      </p>

      <label className="flex items-center gap-2 text-sm">
        Département :
        <select value={departement} onChange={(e) => setDepartement(e.target.value)} className="border rounded px-2 py-1">
          {DEPARTEMENTS.map((d) => (
            <option key={d.code} value={d.code}>{d.code ? `${d.code} - ${d.nom}` : d.nom}</option>
          ))}
        </select>
      </label>

      <input
        type="file"
        accept=".xlsx,.xls,.csv,.txt"
        onChange={handleFichier}
        disabled={!!etat}
        className="block w-full text-sm text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
      />

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={4}
        placeholder={"…ou collez le tableau ici, par exemple :\nDate\tVille\tCatégorie\tClub\n12/07/2026\tAnnecy\tDoublette\tPétanque Annécienne"}
        className="w-full border rounded px-2 py-1 text-sm font-mono"
      />
      <Button variant="outline" disabled={!texte.trim() || !!etat} onClick={() => analyser(lireTexte(texte))}>
        Analyser le texte collé
      </Button>

      {etat === "analyse" && <p className="text-sm text-sky-700">Analyse en cours…</p>}

      {analyse && (
        <div className="space-y-2">
          <p className="text-sm">
            <b>{analyse.concours.length}</b> concours reconnus
            {nbDoublons > 0 && ` · ${nbDoublons} déjà présents (ignorés)`}
            {nbPasses > 0 && ` · ${nbPasses} déjà passés`}
          </p>
          {nbPasses > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inclurePasses} onChange={(e) => setInclurePasses(e.target.checked)} />
              Importer aussi les concours passés
            </label>
          )}
          {analyse.erreurs.length > 0 && (
            <details className="text-sm text-red-600">
              <summary>{analyse.erreurs.length} ligne(s) ignorée(s)</summary>
              <ul className="list-disc pl-5">
                {analyse.erreurs.map((err) => <li key={err}>{err}</li>)}
              </ul>
            </details>
          )}
          <div className="max-h-72 overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-sky-100 sticky top-0">
                <tr>
                  <th className="text-left px-1">Date</th>
                  <th className="text-left px-1">Ville</th>
                  <th className="text-left px-1">Format</th>
                  <th className="text-left px-1">Tarif</th>
                </tr>
              </thead>
              <tbody>
                {analyse.concours.map((c, i) => (
                  <tr
                    key={i}
                    title={c.title}
                    className={`border-t ${c.doublon || (!inclurePasses && c.date < todayKey()) ? "text-stone-400 line-through" : ""}`}
                  >
                    <td className="px-1 capitalize">{formatShort(c.date)}</td>
                    <td className="px-1">
                      {c.cp} {c.ville}
                      {c.cpApproximatif && <span title="Code postal non trouvé" className="text-amber-600"> ⚠</span>}
                    </td>
                    <td className="px-1">{FORMAT_LABELS[c.format] || c.format}</td>
                    <td className="px-1">{c.prix != null ? `${c.prix} €` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button disabled={!aImporter.length || !!etat} onClick={importer}>
              {etat === "import" ? "Import…" : `Importer ${aImporter.length} concours`}
            </Button>
            <Button variant="ghost" onClick={() => setAnalyse(null)}>Annuler</Button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
      )}
    </div>
  );
}
