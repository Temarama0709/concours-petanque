import React, { useEffect, useState } from "react";
import { arrayRemove, arrayUnion, collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { EMAIL_VALIDE } from "../lib/formats.js";

// Fiche du concours, partie organisateur : limite d'équipes, ouverture des inscriptions,
// et (admin) co-organisateurs
export default function OrganisationConcours({ concours, inscrites, user, isAdmin }) {
  const [max, setMax] = useState(concours.maxEquipes ? String(concours.maxEquipes) : "");
  const [message, setMessage] = useState("");
  const [emailOrga, setEmailOrga] = useState(user?.email || "");
  const [nouvelOrga, setNouvelOrga] = useState("");
  const [organisateurs, setOrganisateurs] = useState([]);

  useEffect(() => setMax(concours.maxEquipes ? String(concours.maxEquipes) : ""), [concours.maxEquipes]);

  // Admin : e-mails des co-organisateurs
  useEffect(() => {
    if (!isAdmin || !(concours.organisateurs || []).length) {
      setOrganisateurs([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "utilisateurs"), where("__name__", "in", concours.organisateurs.slice(0, 10))),
      (s) => setOrganisateurs(s.docs.map((d) => ({ uid: d.id, email: d.data().email }))),
      () => setOrganisateurs([])
    );
  }, [isAdmin, concours.organisateurs]);

  const enregistrerMax = async (e) => {
    e.preventDefault();
    const n = max.trim() === "" ? 0 : parseInt(max, 10);
    if (!Number.isInteger(n) || n < 0 || n > 1024) return setMessage("Indiquez un nombre d'équipes entre 1 et 1024, ou laissez vide pour illimité.");
    await updateDoc(doc(db, "concours", concours.id), { maxEquipes: n });
    setMessage(n ? `Limite enregistrée : ${n} équipes.` : "Plus de limite d'équipes.");
  };

  const ouvrirInscriptions = async () => {
    if (!EMAIL_VALIDE.test(emailOrga.trim())) return setMessage("Indiquez l'e-mail qui recevra les inscriptions.");
    const batch = writeBatch(db);
    batch.set(doc(db, "contacts", concours.id), { email: emailOrga.trim(), createdAt: serverTimestamp() });
    batch.update(doc(db, "concours", concours.id), { inscriptions: true });
    await batch.commit();
    setMessage("Les inscriptions en ligne sont ouvertes.");
  };

  const ajouterOrganisateur = async (e) => {
    e.preventDefault();
    const email = nouvelOrga.trim().toLowerCase();
    const trouves = await getDocs(query(collection(db, "utilisateurs"), where("email", "==", email)));
    if (trouves.empty) return setMessage(`Aucun compte avec l'e-mail ${email}. La personne doit d'abord créer son compte et se connecter une fois.`);
    await updateDoc(doc(db, "concours", concours.id), { organisateurs: arrayUnion(trouves.docs[0].id) });
    setNouvelOrga("");
    setMessage(`${email} est maintenant organisateur de ce concours.`);
  };

  const retirerOrganisateur = (uid) => updateDoc(doc(db, "concours", concours.id), { organisateurs: arrayRemove(uid) });

  return (
    <div className="rounded-xl border-2 border-bord p-3 space-y-3">
      <h3 className="text-[15px] font-black uppercase tracking-wider">Organisation</h3>
      <form onSubmit={enregistrerMax} className="flex items-end gap-2">
        <label className="flex-1 text-sm font-bold space-y-1">
          <span className="block">Nombre maximum d'équipes</span>
          <Input type="number" min="1" max="1024" inputMode="numeric" placeholder="Illimité" value={max} onChange={(e) => setMax(e.target.value)} />
        </label>
        <Button type="submit" size="sm" variant="navy">Enregistrer</Button>
      </form>
      <p className="text-sm text-ardoise">
        {inscrites} équipe{inscrites > 1 ? "s" : ""} inscrite{inscrites > 1 ? "s" : ""}{concours.maxEquipes ? ` sur ${concours.maxEquipes}` : ""}.
      </p>

      {!concours.inscriptions && (
        <div className="rounded-[10px] bg-fond p-3 space-y-2">
          <p className="text-sm font-bold">Inscriptions en ligne fermées</p>
          <Input type="email" className="bg-white" aria-label="E-mail qui reçoit les inscriptions" placeholder="E-mail qui reçoit les inscriptions" value={emailOrga} onChange={(e) => setEmailOrga(e.target.value)} />
          <Button size="sm" onClick={ouvrirInscriptions}>Ouvrir les inscriptions</Button>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-2">
          <p className="text-sm font-bold">Co-organisateurs</p>
          {organisateurs.length === 0 && <p className="text-sm text-ardoise">Aucun co-organisateur.</p>}
          <ul className="space-y-1">
            {organisateurs.map((o) => (
              <li key={o.uid} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{o.email}</span>
                <Button size="sm" variant="ghost" onClick={() => retirerOrganisateur(o.uid)}>Retirer</Button>
              </li>
            ))}
          </ul>
          <form onSubmit={ajouterOrganisateur} className="flex gap-2">
            <Input type="email" aria-label="E-mail du nouvel organisateur" placeholder="E-mail du compte à ajouter" value={nouvelOrga} onChange={(e) => setNouvelOrga(e.target.value)} />
            <Button type="submit" size="sm">Ajouter</Button>
          </form>
        </div>
      )}
      {message && <p className="text-sm font-semibold" role="status">{message}</p>}
    </div>
  );
}
