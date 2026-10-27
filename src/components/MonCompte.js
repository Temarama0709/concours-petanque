import React, { useState } from "react";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { LienConfidentialite } from "./Confidentialite.js";
import { supprimerMonCompte } from "../lib/compte.js";

// Mon compte : confidentialité et suppression du compte (droit à l'effacement)
export default function MonCompte({ user, onFermer }) {
  const [confirmation, setConfirmation] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const supprimer = async (e) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await supprimerMonCompte(user, motDePasse);
    } catch (error) {
      console.error("Suppression du compte:", error);
      setErreur(
        ["auth/invalid-credential", "auth/wrong-password"].includes(error.code)
          ? "Mot de passe incorrect."
          : "La suppression n'a pas abouti. Réessayez, ou contactez l'administrateur."
      );
      setEnvoi(false);
    }
  };

  return (
    <div className="bg-white text-navy border-2 border-bord rounded-xl p-4 space-y-3" aria-label="Mon compte">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-black uppercase tracking-wider">Mon compte</h2>
        <Button size="sm" variant="ghost" onClick={onFermer}>Fermer</Button>
      </div>
      <p className="text-sm">Connecté avec <b>{user.email}</b>.</p>
      <p className="text-sm">
        Ce que l'application enregistre sur vous : <LienConfidentialite className="underline underline-offset-2 font-bold">politique de confidentialité</LienConfidentialite>.
      </p>
      {!confirmation ? (
        <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setConfirmation(true)}>Supprimer mon compte</Button>
      ) : (
        <form onSubmit={supprimer} className="rounded-[10px] border-2 border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-sm font-bold">Supprimer définitivement votre compte ?</p>
          <p className="text-sm">
            Vos inscriptions, notifications, votre club et vos crédits seront effacés. Les concours que vous
            avez publiés restent en ligne. Cette action est irréversible.
          </p>
          <Input type="password" aria-label="Mot de passe" placeholder="Votre mot de passe, pour confirmer" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!motDePasse || envoi} className="bg-red-700 text-white hover:bg-red-800">
              {envoi ? "Suppression…" : "Supprimer définitivement"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setConfirmation(false); setMotDePasse(""); setErreur(""); }}>Annuler</Button>
          </div>
        </form>
      )}
    </div>
  );
}
