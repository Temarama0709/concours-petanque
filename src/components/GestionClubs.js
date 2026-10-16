import React, { useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { DEPARTEMENTS_CLUBS, nomDepartement, useClubs } from "../lib/clubs.js";
import { CLUBS_PAR_DEFAUT } from "../lib/clubsParDefaut.js";

const CHAMP = "h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";

// Panneau admin : liste des clubs proposés à la création de compte
export default function GestionClubs() {
  const clubs = useClubs();
  const [departement, setDepartement] = useState(DEPARTEMENTS_CLUBS[0].code);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [liste, setListe] = useState("");
  const [ouvert, setOuvert] = useState(false);

  const existe = (n, dep) => (clubs || []).some((c) => c.departement === dep && c.nom.toLowerCase() === n.toLowerCase());

  const ajouter = async (e) => {
    e.preventDefault();
    const n = nom.trim();
    if (!n || existe(n, departement)) return;
    setNom("");
    setVille("");
    await addDoc(collection(db, "clubs"), { nom: n, ville: ville.trim(), departement, createdAt: serverTimestamp() });
  };

  // Collage d'une liste : un club par ligne, « Nom du club ; Ville » (la ville est facultative)
  const importer = async () => {
    const lignes = liste
      .split("\n")
      .map((l) => l.split(/[;\t]/).map((x) => x.trim()))
      .filter(([n]) => n && !existe(n, departement));
    if (!lignes.length) return;
    const batch = writeBatch(db);
    for (const [n, v = ""] of lignes) batch.set(doc(collection(db, "clubs")), { nom: n.slice(0, 80), ville: v.slice(0, 60), departement, createdAt: serverTimestamp() });
    await batch.commit();
    setListe("");
  };

  // Liste fournie dans le code (lib/clubsParDefaut.js) : seuls les clubs absents sont ajoutés
  const manquants = (CLUBS_PAR_DEFAUT[departement] || []).filter((n) => !existe(n, departement));
  const importerParDefaut = async () => {
    const batch = writeBatch(db);
    for (const n of manquants) batch.set(doc(collection(db, "clubs")), { nom: n, ville: "", departement, createdAt: serverTimestamp() });
    await batch.commit();
  };

  const retirer = (c) => {
    if (window.confirm(`Retirer le club « ${c.nom} » de la liste ?`)) deleteDoc(doc(db, "clubs", c.id));
  };

  const duDepartement = (clubs || []).filter((c) => c.departement === departement);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-black uppercase tracking-wider">Clubs ({clubs ? clubs.length : "…"})</h2>
        <Button size="sm" variant="ghost" onClick={() => setOuvert(!ouvert)}>{ouvert ? "Fermer" : "Gérer la liste"}</Button>
      </div>
      {ouvert && (
        <div className="space-y-3">
          <select aria-label="Département" className={`${CHAMP} w-full`} value={departement} onChange={(e) => setDepartement(e.target.value)}>
            {DEPARTEMENTS_CLUBS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} · {d.nom} ({(clubs || []).filter((c) => c.departement === d.code).length} clubs)
              </option>
            ))}
          </select>
          {clubs && manquants.length > 0 && (
            <Button className="w-full" onClick={importerParDefaut}>
              Importer les {manquants.length} clubs de {nomDepartement(departement)}
            </Button>
          )}
          <form onSubmit={ajouter} className="grid grid-cols-[1fr_110px_auto] gap-2">
            <Input aria-label="Nom du club" placeholder="Nom du club" maxLength={80} value={nom} onChange={(e) => setNom(e.target.value)} />
            <Input aria-label="Ville" placeholder="Ville" maxLength={60} value={ville} onChange={(e) => setVille(e.target.value)} />
            <Button type="submit" size="sm">Ajouter</Button>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer font-bold">Coller une liste de clubs ({nomDepartement(departement)})</summary>
            <div className="space-y-2 pt-2">
              <textarea
                rows={5}
                value={liste}
                onChange={(e) => setListe(e.target.value)}
                placeholder={"Un club par ligne, la ville après un point-virgule :\nPétanque Club Exemple ; Annecy"}
                className="w-full px-3 py-2 bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune font-mono text-sm"
              />
              <Button size="sm" variant="navy" onClick={importer}>Ajouter ces clubs</Button>
            </div>
          </details>
          {duDepartement.length === 0 ? (
            <p className="text-sm text-ardoise">Aucun club pour ce département. Les joueurs peuvent quand même indiquer leur club à la main.</p>
          ) : (
            <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord max-h-72 overflow-auto">
              {duDepartement.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-sm"><b>{c.nom}</b>{c.ville && <span className="text-ardoise"> · {c.ville}</span>}</span>
                  <Button size="sm" variant="ghost" onClick={() => retirer(c)}>Retirer</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
