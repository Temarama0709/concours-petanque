import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { OFFRES, formatEuros } from "../lib/offres.js";

// Choix d'une offre puis redirection vers la page de paiement sécurisée de Stripe
// Achat en ligne activé seulement quand Stripe est branché :
// mettre REACT_APP_PAIEMENT=on dans le fichier .env, puis npm run deploy
export const PAIEMENT_ACTIF = process.env.REACT_APP_PAIEMENT === "on";

export default function AchatCredits() {
  if (!PAIEMENT_ACTIF) return null; // achats masqués
  return <FormulaireAchat />;
}

function FormulaireAchat() {
  const [offreId, setOffreId] = useState("pack10");
  const [quantite, setQuantite] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const offre = OFFRES.find((o) => o.id === offreId);
  const quantiteMax = offre.id === "unite" ? 9 : 5;
  const total = offre.prix * quantite;
  const credits = offre.credits * quantite;

  const choisir = (id) => {
    setOffreId(id);
    setQuantite(1);
  };

  const payer = async () => {
    setErreur("");
    setEnvoi(true);
    try {
      const { data } = await httpsCallable(functions, "creerPaiement")({ offre: offre.id, quantite });
      window.location.assign(data.url);
    } catch (error) {
      console.error("Paiement:", error);
      setErreur("Le paiement n'a pas pu démarrer. Réessayez dans un instant.");
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Offre">
        {OFFRES.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === offreId}
            onClick={() => choisir(o.id)}
            className={`rounded-xl border-2 p-3 text-left ${o.id === offreId ? "border-jaune bg-jaune-clair" : "border-bord hover:bg-fond"}`}
          >
            <span className="block text-xs font-bold uppercase tracking-wide text-ardoise">{o.titre}</span>
            <span className="block text-2xl font-black">{formatEuros(o.prix)}</span>
            <span className="block text-xs text-ardoise">{o.detail}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">Quantité</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" aria-label="Moins" disabled={quantite <= 1} onClick={() => setQuantite((q) => q - 1)}>−</Button>
          <span className="w-6 text-center font-black" aria-live="polite">{quantite}</span>
          <Button size="sm" variant="outline" aria-label="Plus" disabled={quantite >= quantiteMax} onClick={() => setQuantite((q) => q + 1)}>+</Button>
        </div>
      </div>
      <Button className="w-full" disabled={envoi} onClick={payer}>
        {envoi ? "Ouverture du paiement…" : `Payer ${formatEuros(total)} · ${credits} concours`}
      </Button>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <p className="text-xs text-ardoise">Paiement par carte sécurisé par Stripe. Les crédits sont ajoutés à votre compte dès le paiement confirmé.</p>
    </div>
  );
}
