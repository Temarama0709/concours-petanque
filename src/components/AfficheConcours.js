import React, { useEffect, useState } from "react";
import { chargerAffiche } from "../lib/affiches.js";

// Miniature de l'affiche d'un concours ; un clic l'affiche en grand.
export default function AfficheConcours({ concours }) {
  const [image, setImage] = useState(null);
  const [etat, setEtat] = useState("chargement");
  const [plein, setPlein] = useState(false);

  useEffect(() => {
    if (!concours.affiche) return;
    let annule = false;
    setEtat("chargement");
    chargerAffiche(concours.id)
      .then((img) => {
        if (annule) return;
        setImage(img);
        setEtat(img ? "ok" : "absente");
      })
      .catch(() => !annule && setEtat("erreur"));
    return () => {
      annule = true;
    };
  }, [concours.id, concours.affiche]);

  if (!concours.affiche || etat === "absente") return null;
  if (etat === "chargement") return <p className="text-sm text-stone-500">Chargement de l'affiche…</p>;
  if (etat === "erreur") return <p className="text-sm text-red-600">Affiche indisponible.</p>;

  return (
    <>
      <button type="button" onClick={() => setPlein(true)} className="block" title="Voir l'affiche en grand">
        <img src={image} alt={`Affiche : ${concours.title}`} className="max-h-64 rounded border shadow-sm" />
      </button>
      {plein && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPlein(false)}
          role="dialog"
          aria-label="Affiche en grand"
        >
          <img src={image} alt={`Affiche : ${concours.title}`} className="max-h-full max-w-full rounded shadow-lg" />
          <button type="button" className="absolute top-4 right-4 bg-white rounded-full w-9 h-9 text-lg" aria-label="Fermer">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
