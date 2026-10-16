import React, { useEffect, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Card, CardContent } from "./ui/card.js";
import { Input } from "./ui/input.js";
import { ADMIN_UIDS } from "../admins.js";

// Panneau admin : demandes de compte contributeur et gestion des crédits
export default function GestionContributeurs() {
  const [demandes, setDemandes] = useState([]);
  const [contributeurs, setContributeurs] = useState([]);
  const [creditsInitiaux, setCreditsInitiaux] = useState({});
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const trier = (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    const stop1 = onSnapshot(collection(db, "demandes"), (s) => setDemandes(s.docs.map((d) => ({ uid: d.id, ...d.data() })).sort(trier)));
    const stop2 = onSnapshot(collection(db, "contributeurs"), (s) => setContributeurs(s.docs.map((d) => ({ uid: d.id, ...d.data() })).sort(trier)));
    const stop3 = onSnapshot(collection(db, "utilisateurs"), (s) =>
      setUtilisateurs(s.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.email || "").localeCompare(b.email || "")))
    );
    return () => {
      stop1();
      stop2();
      stop3();
    };
  }, []);

  const accepter = async (d, illimite) => {
    const credits = Math.max(0, parseInt(creditsInitiaux[d.uid] ?? "1", 10) || 0);
    const batch = writeBatch(db);
    batch.set(doc(db, "contributeurs", d.uid), {
      email: d.email,
      nom: d.nom,
      club: d.club || "",
      telephone: d.telephone || "",
      credits: illimite ? 0 : credits,
      illimite,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.delete(doc(db, "demandes", d.uid));
    await batch.commit();
  };

  // Donner directement le rôle contributeur à un compte (sans demande)
  const nommer = (u, illimite) => {
    const credits = Math.max(0, parseInt(creditsInitiaux[u.uid] ?? "1", 10) || 0);
    const batch = writeBatch(db);
    batch.set(doc(db, "contributeurs", u.uid), {
      email: u.email || "",
      nom: "",
      club: u.clubNom || "",
      telephone: "",
      credits: illimite ? 0 : credits,
      illimite,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    if (demandes.some((d) => d.uid === u.uid)) batch.delete(doc(db, "demandes", u.uid));
    return batch.commit();
  };

  const ajouterCredits = (c, n) =>
    updateDoc(doc(db, "contributeurs", c.uid), { credits: Math.max(0, (c.credits || 0) + n), updatedAt: serverTimestamp() });

  const basculerIllimite = (c) =>
    updateDoc(doc(db, "contributeurs", c.uid), { illimite: !c.illimite, updatedAt: serverTimestamp() });

  const retirer = (c) => {
    if (window.confirm(`Retirer le compte contributeur de ${c.nom || c.email} ?`)) deleteDoc(doc(db, "contributeurs", c.uid));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-black uppercase tracking-wider">
        Demandes de compte contributeur {demandes.length > 0 && `(${demandes.length})`}
      </h2>
      {demandes.length === 0 && <p className="text-sm text-ardoise">Aucune demande en attente.</p>}
      {demandes.map((d) => (
        <Card key={d.uid}>
          <CardContent className="space-y-2">
            <p className="font-bold">{d.nom}{d.club && ` · ${d.club}`}</p>
            <p className="text-sm text-ardoise">{d.email} · {d.telephone}</p>
            {d.message && <p className="text-sm italic">« {d.message} »</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-sm">
                Crédits
                <input
                  type="number"
                  min="0"
                  className="w-16 h-9 px-2 bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune"
                  value={creditsInitiaux[d.uid] ?? "1"}
                  onChange={(e) => setCreditsInitiaux((c) => ({ ...c, [d.uid]: e.target.value }))}
                />
              </label>
              <Button size="sm" onClick={() => accepter(d, false)}>Accepter</Button>
              <Button size="sm" variant="navy" onClick={() => accepter(d, true)}>Accès illimité</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteDoc(doc(db, "demandes", d.uid))}>Refuser</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <h2 className="text-[15px] font-black uppercase tracking-wider">Contributeurs ({contributeurs.length})</h2>
      {contributeurs.length === 0 && <p className="text-sm text-ardoise">Aucun contributeur pour l'instant.</p>}
      <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">
        {contributeurs.map((c) => (
          <li key={c.uid} className="py-3 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">{c.nom || c.email}{c.club && ` · ${c.club}`}</p>
                <p className="text-sm text-ardoise truncate">{c.email}</p>
              </div>
              <span className="shrink-0 font-black">{c.illimite ? "Illimité" : `${c.credits || 0} crédit${(c.credits || 0) > 1 ? "s" : ""}`}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {!c.illimite && (
                <>
                  <Button size="sm" variant="outline" onClick={() => ajouterCredits(c, 1)}>+1</Button>
                  <Button size="sm" variant="outline" onClick={() => ajouterCredits(c, 5)}>+5</Button>
                  <Button size="sm" variant="outline" onClick={() => ajouterCredits(c, -1)} disabled={!c.credits}>−1</Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => basculerIllimite(c)}>{c.illimite ? "Passer aux crédits" : "Rendre illimité"}</Button>
              <Button size="sm" variant="ghost" onClick={() => retirer(c)}>Retirer</Button>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="text-[15px] font-black uppercase tracking-wider">Utilisateurs ({utilisateurs.length})</h2>
      <p className="text-sm text-ardoise">
        Donnez un rôle à n'importe quel compte, sans attendre de demande. Les comptes apparaissent ici après leur première connexion.
      </p>
      <Input type="search" aria-label="Rechercher un utilisateur" placeholder="Rechercher : e-mail ou club" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord max-h-96 overflow-auto">
        {utilisateurs
          .filter((u) => `${u.email} ${u.clubNom}`.toLowerCase().includes(recherche.trim().toLowerCase()))
          .map((u) => {
            const c = contributeurs.find((x) => x.uid === u.uid);
            const admin = ADMIN_UIDS.includes(u.uid);
            const role = admin ? "Admin" : c ? (c.illimite ? "Contributeur · illimité" : `Contributeur · ${c.credits || 0} crédit${(c.credits || 0) > 1 ? "s" : ""}`) : "Joueur";
            return (
              <li key={u.uid} className="py-2 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{u.email || u.uid}</p>
                    <p className="text-sm text-ardoise truncate">{u.affilie ? u.clubNom : "Sans club"}{u.clubAVerifier ? " (club à vérifier)" : ""}</p>
                  </div>
                  <span className={`shrink-0 self-start text-xs font-bold px-1.5 py-0.5 rounded ${admin || c ? "bg-navy text-white" : "bg-fond text-navy"}`}>{role}</span>
                </div>
                {!admin && !c && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      Crédits
                      <input
                        type="number"
                        min="0"
                        className="w-14 h-9 px-2 bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune"
                        value={creditsInitiaux[u.uid] ?? "1"}
                        onChange={(e) => setCreditsInitiaux((x) => ({ ...x, [u.uid]: e.target.value }))}
                      />
                    </label>
                    <Button size="sm" onClick={() => nommer(u, false)}>Rendre contributeur</Button>
                    <Button size="sm" variant="navy" onClick={() => nommer(u, true)}>Illimité</Button>
                  </div>
                )}
                {!admin && c && (
                  <Button size="sm" variant="ghost" onClick={() => retirer(c)}>Retirer le rôle contributeur</Button>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
