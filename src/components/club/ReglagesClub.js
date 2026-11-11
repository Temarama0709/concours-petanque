import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../utils/firebase.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { lireTexte } from "../../lib/importCalendrier.js";
import {
  LICENCIE_VIDE, ajouterGestionnaire, ajouterLicencie, analyserLicencies, cleLicencie, exporterCSV, importerLicencies,
  retirerGestionnaire, useComptesDuClub
} from "../../lib/club.js";

const cadre = "rounded-xl border-2 border-bord p-4 space-y-3";
const titre = "text-[15px] font-black uppercase tracking-wider";

export default function ReglagesClub({ gestion, licencies, isAdmin, user, onOuvrir }) {
  return (
    <div className="space-y-4">
      <ImportLicencies gestion={gestion} licencies={licencies} />
      <div className={cadre}>
        <h3 className={titre}>Exporter</h3>
        <p className="text-sm text-ardoise">Toute la liste dans un fichier qui s'ouvre avec Excel : coordonnées, reste dû, commentaires.</p>
        <Button variant="outline" disabled={!licencies.length} onClick={() => exporterCSV(licencies, gestion.clubNom)}>Télécharger la liste (Excel)</Button>
      </div>
      <ComptesAffilies gestion={gestion} licencies={licencies} onOuvrir={onOuvrir} />
      <Gestionnaires gestion={gestion} isAdmin={isAdmin} user={user} />
    </div>
  );
}

// Import d'une liste de licenciés (Excel, CSV ou copier-coller) ; les doublons sont ignorés
function ImportLicencies({ gestion, licencies }) {
  const [texte, setTexte] = useState("");
  const [analyse, setAnalyse] = useState(null);
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const analyser = (rows) => {
    setMessage(null);
    const { licencies: lus, erreur } = analyserLicencies(rows);
    if (erreur) return setMessage({ type: "error", text: erreur });
    const existants = new Set(licencies.map(cleLicencie));
    const vus = new Set();
    setAnalyse(lus.map((l) => {
      const cle = cleLicencie(l);
      const doublon = existants.has(cle) || vus.has(cle);
      vus.add(cle);
      return { ...l, doublon };
    }));
  };

  const handleFichier = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        analyser(await readSheet(file));
      } else if (/\.xls$/i.test(file.name)) {
        setMessage({ type: "error", text: "Ancien format Excel (.xls) : ouvrez-le dans Excel et enregistrez-le en .xlsx." });
      } else analyser(lireTexte(await file.text()));
    } catch (error) {
      console.error("Import licenciés:", error);
      setMessage({ type: "error", text: "Impossible de lire ce fichier." });
    }
  };

  const aImporter = (analyse || []).filter((l) => !l.doublon);
  const importer = async () => {
    setEnvoi(true);
    try {
      await importerLicencies(gestion.id, aImporter.map(({ doublon, ...l }) => l));
      setMessage({ type: "success", text: `✅ ${aImporter.length} licencié(s) importé(s).` });
      setAnalyse(null);
      setTexte("");
    } catch (error) {
      console.error("Import licenciés:", error);
      setMessage({ type: "error", text: "L'import a échoué." });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className={cadre}>
      <h3 className={titre}>Importer une liste</h3>
      <p className="text-sm text-ardoise">
        Fichier Excel (.xlsx) ou CSV, ou tableau copié-collé. La première ligne doit contenir les titres des colonnes,
        dont au moins <b>Nom</b>. Colonnes reconnues en plus : Prénom, Licence, Catégorie, Téléphone, E-mail, Adresse,
        Date de naissance. Les licenciés déjà présents (même n° de licence, ou même nom et prénom) sont ignorés.
      </p>
      <input type="file" accept=".xlsx,.xls,.csv,.txt" aria-label="Fichier des licenciés" onChange={handleFichier} disabled={envoi}
        className="block w-full text-sm text-ardoise file:mr-3 file:h-10 file:px-4 file:rounded-[10px] file:border-0 file:text-sm file:font-bold file:bg-jaune-clair file:text-navy hover:file:bg-jaune" />
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} aria-label="Liste collée"
        placeholder={"…ou collez le tableau ici, par exemple :\nNom\tPrénom\tLicence\tTéléphone\nDUPONT\tJean\t07412345\t06 12 34 56 78"}
        className="w-full bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune px-3 py-2 text-sm font-mono" />
      <Button variant="outline" disabled={!texte.trim()} onClick={() => analyser(lireTexte(texte))}>Analyser le texte collé</Button>
      {analyse && (
        <div className="space-y-2">
          <p className="text-sm"><b>{analyse.length}</b> licencié(s) lu(s){analyse.length !== aImporter.length && ` · ${analyse.length - aImporter.length} déjà présent(s), ignoré(s)`}.</p>
          <ul className="max-h-60 overflow-auto text-sm border-2 border-bord rounded-[10px] divide-y divide-bord">
            {analyse.map((l, i) => (
              <li key={i} className={`px-2 py-1 ${l.doublon ? "line-through text-ardoise" : ""}`}>
                <b>{l.nom}</b> {l.prenom} {l.licence && `· ${l.licence}`} {l.telephone && `· ${l.telephone}`}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button disabled={!aImporter.length || envoi} onClick={importer}>{envoi ? "Import…" : `Importer ${aImporter.length} licencié(s)`}</Button>
            <Button variant="ghost" onClick={() => setAnalyse(null)}>Annuler</Button>
          </div>
        </div>
      )}
      {message && <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>}
    </div>
  );
}

// Comptes de l'application qui ont choisi ce club : à relier ou ajouter aux licenciés
function ComptesAffilies({ gestion, licencies, onOuvrir }) {
  const comptes = useComptesDuClub(gestion.id);
  const relies = new Set(licencies.map((l) => l.uid).filter(Boolean));
  const emails = new Set(licencies.map((l) => (l.email || "").toLowerCase()).filter(Boolean));
  const nonRelies = comptes.filter((c) => !relies.has(c.uid));

  const ajouter = async (c) => {
    const existant = licencies.find((l) => (l.email || "").toLowerCase() === c.email);
    if (existant) return onOuvrir(existant);
    const ref = await ajouterLicencie(gestion.id, { ...LICENCIE_VIDE, nom: c.email.split("@")[0], email: c.email, uid: c.uid });
    onOuvrir({ ...LICENCIE_VIDE, nom: c.email.split("@")[0], email: c.email, uid: c.uid, id: ref.id });
  };

  return (
    <div className={cadre}>
      <h3 className={titre}>Membres inscrits sur l'application</h3>
      <p className="text-sm text-ardoise">
        Les personnes qui ont indiqué <b>{gestion.clubNom}</b> comme club dans leur compte ({comptes.length}).
      </p>
      {nonRelies.length === 0 ? (
        <p className="text-sm">{comptes.length ? "Toutes ont une fiche de licencié." : "Personne pour l'instant."}</p>
      ) : (
        <ul className="space-y-2">
          {nonRelies.map((c) => (
            <li key={c.uid} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{c.email}</span>
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => ajouter(c)}>
                {emails.has(c.email) ? "Voir la fiche" : "Créer sa fiche"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Qui peut gérer ce club : l'admin ajoute ou retire des gestionnaires
function Gestionnaires({ gestion, isAdmin, user }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [comptes, setComptes] = useState([]);
  const ids = gestion.gestionnaires || [];
  const cleIds = ids.join(",");

  useEffect(() => {
    if (!isAdmin || !cleIds) {
      setComptes([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "utilisateurs"), where("__name__", "in", cleIds.split(",").slice(0, 10))),
      (s) => setComptes(s.docs.map((d) => ({ uid: d.id, email: d.data().email }))),
      () => setComptes([])
    );
  }, [isAdmin, cleIds]);

  const ajouter = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await ajouterGestionnaire(gestion.id, gestion, email);
      setMessage(`${email} peut maintenant gérer ce club.`);
      setEmail("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className={cadre}>
      <h3 className={titre}>Gestionnaires du club</h3>
      <p className="text-sm text-ardoise">
        Seuls l'administrateur et les gestionnaires voient cette page. Les licenciés n'y ont pas accès.
      </p>
      {!isAdmin ? (
        <p className="text-sm">{ids.length} gestionnaire(s). Pour en ajouter ou en retirer, demandez à l'administrateur.</p>
      ) : (
        <>
          {ids.length === 0 && <p className="text-sm">Aucun gestionnaire : vous seul (admin) gérez ce club.</p>}
          <ul className="space-y-1">
            {ids.map((uid) => (
              <li key={uid} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{comptes.find((c) => c.uid === uid)?.email || uid}{uid === user.uid && " (vous)"}</span>
                <Button size="sm" variant="ghost" onClick={() => retirerGestionnaire(gestion.id, gestion, uid)}>Retirer</Button>
              </li>
            ))}
          </ul>
          <form onSubmit={ajouter} className="flex gap-2">
            <Input type="email" aria-label="E-mail du gestionnaire" placeholder="E-mail du compte à ajouter" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" size="sm" className="shrink-0 h-11">Ajouter</Button>
          </form>
        </>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
