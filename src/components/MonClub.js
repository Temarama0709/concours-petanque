import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import ChoixClub from "./ChoixClub.js";
import { AFFILIATION_VIDE, enregistrerProfil, erreurAffiliation, useClubs } from "../lib/clubs.js";

// Profil de la personne connectée (utilisateurs/{uid}) : renvoie { profil, chargé }
export function useProfil(user) {
  const [etat, setEtat] = useState({ profil: null, charge: false });
  useEffect(() => {
    if (!user) {
      setEtat({ profil: null, charge: true });
      return;
    }
    setEtat({ profil: null, charge: false });
    return onSnapshot(
      doc(db, "utilisateurs", user.uid),
      (s) => setEtat({ profil: s.exists() ? s.data() : null, charge: true }),
      () => setEtat({ profil: null, charge: true })
    );
  }, [user]);
  return etat;
}

// Choisir ou modifier son club (pour les comptes créés avant l'option, ou après un changement de club)
export default function MonClub({ user, profil, onFermer }) {
  const clubs = useClubs();
  const [valeur, setValeur] = useState(
    profil
      ? {
          affilie: !!profil.affilie,
          departement: profil.departement || AFFILIATION_VIDE.departement,
          clubId: profil.clubId || (profil.affilie ? "autre" : ""),
          clubAutre: profil.clubId ? "" : profil.clubNom || ""
        }
      : AFFILIATION_VIDE
  );
  const [erreur, setErreur] = useState("");

  const enregistrer = async (e) => {
    e.preventDefault();
    const msg = erreurAffiliation(valeur);
    if (msg) return setErreur(msg);
    try {
      await enregistrerProfil(user, valeur, clubs || []);
      onFermer();
    } catch (error) {
      console.error("Profil:", error);
      setErreur("L'enregistrement a échoué.");
    }
  };

  return (
    <form onSubmit={enregistrer} className="bg-white text-navy border-2 border-bord rounded-xl p-4 space-y-3">
      <h2 className="text-[15px] font-black uppercase tracking-wider">Mon club</h2>
      <ChoixClub valeur={valeur} onChange={setValeur} />
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <Button type="submit">Enregistrer</Button>
        <Button variant="ghost" onClick={onFermer}>Annuler</Button>
      </div>
    </form>
  );
}
