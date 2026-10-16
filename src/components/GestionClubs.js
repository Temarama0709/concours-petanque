import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { DEPARTEMENTS_CLUBS, nomDepartement, useClubs } from "../lib/clubs.js";

const CHAMP = "h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";
const VIDE = { nom: "", adresse: "", telephone: "", responsable: "" };

// Contacts des clubs (téléphone, responsable) : collection "clubsPrives", lisible par les admins seulement
function useContactsClubs() {
  const [contacts, setContacts] = useState({});
  useEffect(
    () => onSnapshot(collection(db, "clubsPrives"), (s) => setContacts(Object.fromEntries(s.docs.map((d) => [d.id, d.data()]))), () => setContacts({})),
    []
  );
  return contacts;
}

// Enregistre un club : partie publique (clubs) + contact privé (clubsPrives), même identifiant
function enregistrerClub(id, departement, f, creation) {
  const batch = writeBatch(db);
  const ref = id ? doc(db, "clubs", id) : doc(collection(db, "clubs"));
  batch.set(ref, {
    nom: f.nom.trim().slice(0, 80),
    adresse: f.adresse.trim().slice(0, 200),
    ville: "",
    departement,
    ...(creation ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(doc(db, "clubsPrives", ref.id), {
    telephone: f.telephone.trim().slice(0, 20),
    responsable: f.responsable.trim().slice(0, 80),
    updatedAt: serverTimestamp()
  });
  return batch.commit();
}

function FormulaireClub({ initial = VIDE, libelle, onValider, onAnnuler }) {
  const [f, setF] = useState(initial);
  const [erreur, setErreur] = useState("");
  const champ = (cle, extra = {}) => ({ value: f[cle], onChange: (e) => setF((x) => ({ ...x, [cle]: e.target.value })), ...extra });
  const valider = async (e) => {
    e.preventDefault();
    if (!f.nom.trim()) return setErreur("Indiquez le nom du club.");
    if (f.telephone.trim() && !/^[0-9 +.]{6,20}$/.test(f.telephone.trim())) return setErreur("Le numéro de téléphone n'est pas valide.");
    setErreur("");
    try {
      await onValider(f);
      setF(VIDE);
    } catch (error) {
      console.error("Club:", error);
      setErreur("L'enregistrement a échoué.");
    }
  };
  return (
    <form onSubmit={valider} className="rounded-xl bg-fond p-3 space-y-2">
      <Input className="bg-white" aria-label="Nom du club" placeholder="Nom du club" maxLength={80} {...champ("nom")} />
      <Input className="bg-white" aria-label="Adresse" placeholder="Adresse (boulodrome, siège…)" maxLength={200} {...champ("adresse")} />
      <div className="grid grid-cols-2 gap-2">
        <Input className="bg-white" type="tel" aria-label="Téléphone" placeholder="Téléphone" maxLength={20} {...champ("telephone")} />
        <Input className="bg-white" aria-label="Responsable" placeholder="Responsable" maxLength={80} {...champ("responsable")} />
      </div>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">{libelle}</Button>
        {onAnnuler && <Button size="sm" variant="ghost" onClick={onAnnuler}>Annuler</Button>}
      </div>
    </form>
  );
}

// Panneau admin : table des clubs par département (nom, adresse, téléphone, responsable)
export default function GestionClubs() {
  const clubs = useClubs();
  const contacts = useContactsClubs();
  const [departement, setDepartement] = useState(DEPARTEMENTS_CLUBS[0].code);
  const [ouvert, setOuvert] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [edition, setEdition] = useState(null);
  const [liste, setListe] = useState("");

  const duDepartement = (clubs || []).filter((c) => c.departement === departement);
  const existe = (n) => duDepartement.some((c) => c.nom.toLowerCase() === n.trim().toLowerCase());

  // Collage depuis un tableur : « Nom ; Adresse ; Téléphone ; Responsable » (seul le nom est obligatoire)
  const importer = async () => {
    const lignes = liste.split("\n").map((l) => l.split(/[;\t]/).map((x) => x.trim())).filter(([n]) => n && !existe(n));
    for (const [nom, adresse = "", telephone = "", responsable = ""] of lignes) {
      await enregistrerClub(null, departement, { nom, adresse, telephone: /^[0-9 +.]{6,20}$/.test(telephone) ? telephone : "", responsable }, true);
    }
    setListe("");
  };

  const retirer = async (c) => {
    if (!window.confirm(`Retirer le club « ${c.nom} » de la liste ?`)) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, "clubs", c.id));
    batch.delete(doc(db, "clubsPrives", c.id));
    await batch.commit();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-black uppercase tracking-wider">Clubs ({clubs ? clubs.length : "…"})</h2>
        <Button size="sm" variant="ghost" onClick={() => setOuvert(!ouvert)}>{ouvert ? "Fermer" : "Voir la table des clubs"}</Button>
      </div>
      {ouvert && (
        <div className="space-y-3">
          <select aria-label="Département" className={`${CHAMP} w-full`} value={departement} onChange={(e) => { setDepartement(e.target.value); setEdition(null); }}>
            {DEPARTEMENTS_CLUBS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} · {d.nom} ({(clubs || []).filter((c) => c.departement === d.code).length} clubs)
              </option>
            ))}
          </select>

          {ajout ? (
            <FormulaireClub
              libelle="Ajouter le club"
              onValider={async (f) => {
                if (existe(f.nom)) throw new Error("existe");
                await enregistrerClub(null, departement, f, true);
                setAjout(false);
              }}
              onAnnuler={() => setAjout(false)}
            />
          ) : (
            <Button size="sm" onClick={() => setAjout(true)}>+ Ajouter un club ({nomDepartement(departement)})</Button>
          )}

          <div className="overflow-x-auto border-2 border-bord rounded-[10px]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="text-left px-2 py-1.5">Club</th>
                  <th className="text-left px-2 py-1.5">Adresse</th>
                  <th className="text-left px-2 py-1.5">Téléphone</th>
                  <th className="text-left px-2 py-1.5">Responsable</th>
                  <th className="px-2 py-1.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {duDepartement.map((c) => {
                  const contact = contacts[c.id] || {};
                  if (edition === c.id) {
                    return (
                      <tr key={c.id} className="border-t border-bord">
                        <td colSpan={5} className="p-2">
                          <FormulaireClub
                            initial={{ nom: c.nom, adresse: c.adresse || "", telephone: contact.telephone || "", responsable: contact.responsable || "" }}
                            libelle="Enregistrer"
                            onValider={async (f) => {
                              // Un club de la liste intégrée garde son identifiant : les comptes qui l'ont choisi restent liés
                              await enregistrerClub(c.id, departement, f, !!c.integre);
                              setEdition(null);
                            }}
                            onAnnuler={() => setEdition(null)}
                          />
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={c.id} className="border-t border-bord align-top">
                      <td className="px-2 py-1.5 font-bold">{c.nom}</td>
                      <td className="px-2 py-1.5">{c.adresse || <span className="text-ardoise">—</span>}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {contact.telephone ? <a href={`tel:${contact.telephone.replace(/\s/g, "")}`}>{contact.telephone}</a> : <span className="text-ardoise">—</span>}
                      </td>
                      <td className="px-2 py-1.5">{contact.responsable || <span className="text-ardoise">—</span>}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEdition(c.id)}>Modifier</Button>
                        {!c.integre && <Button size="sm" variant="ghost" onClick={() => retirer(c)}>Retirer</Button>}
                      </td>
                    </tr>
                  );
                })}
                {duDepartement.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-3 text-ardoise">Aucun club pour ce département. Les joueurs peuvent quand même indiquer leur club à la main.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ardoise">Le téléphone et le responsable ne sont visibles que par les administrateurs.</p>

          <details className="text-sm">
            <summary className="cursor-pointer font-bold">Coller une liste depuis un tableur ({nomDepartement(departement)})</summary>
            <div className="space-y-2 pt-2">
              <textarea
                rows={5}
                value={liste}
                onChange={(e) => setListe(e.target.value)}
                placeholder={"Une ligne par club, colonnes séparées par des points-virgules ou des tabulations :\nNom ; Adresse ; Téléphone ; Responsable"}
                className="w-full px-3 py-2 bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune font-mono text-sm"
              />
              <Button size="sm" variant="navy" onClick={importer}>Ajouter ces clubs</Button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
