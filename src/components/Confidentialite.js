import React, { useState } from "react";
import { IconX } from "./ui/icons.js";

// Adresse affichée pour exercer ses droits (à remplir) ; vide : « l'administrateur du site »
export const EMAIL_CONTACT = "";

// Lien « Confidentialité » qui ouvre la politique de confidentialité
export function LienConfidentialite({ className = "underline underline-offset-2", children = "Confidentialité" }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={(e) => { e.preventDefault(); setOuvert(true); }}>{children}</button>
      {ouvert && <Confidentialite onFermer={() => setOuvert(false)} />}
    </>
  );
}

const Titre = ({ children }) => <h3 className="font-black uppercase tracking-wider text-[13px] pt-2">{children}</h3>;

export default function Confidentialite({ onFermer }) {
  const contact = EMAIL_CONTACT
    ? <a className="underline font-bold" href={`mailto:${EMAIL_CONTACT}`}>{EMAIL_CONTACT}</a>
    : "l'administrateur du site";
  return (
    <div className="fixed inset-0 z-[1000] bg-navy/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confidentialité"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white text-navy rounded-t-xl sm:rounded-xl p-4 space-y-2 max-h-[85vh] overflow-y-auto text-sm leading-relaxed"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-black uppercase tracking-wider">Confidentialité</h2>
          <button type="button" aria-label="Fermer" onClick={onFermer} className="w-11 h-11 rounded-[10px] bg-fond flex items-center justify-center"><IconX /></button>
        </div>
        <p>
          Concours Pétanque est un calendrier de concours de pétanque géré bénévolement. Voici les
          informations personnelles que l'application enregistre, pourquoi, et comment les supprimer.
        </p>

        <Titre>Ce qui est enregistré</Titre>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Votre compte</b> : e-mail et mot de passe (chiffré, jamais visible), et si vous l'indiquez, votre club et votre département.</li>
          <li><b>Les inscriptions à un concours</b> : noms des joueurs, club, téléphone et/ou e-mail de contact.</li>
          <li><b>Les concours publiés</b> : informations du concours, affiche, et l'e-mail de l'organisateur qui reçoit les inscriptions.</li>
          <li><b>Les demandes de compte contributeur</b> : nom, club, téléphone.</li>
          <li><b>Les notifications</b> reçues dans l'application (inscription validée…).</li>
        </ul>

        <Titre>Qui voit quoi</Titre>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les concours, leurs affiches et le nombre d'équipes inscrites sont publics.</li>
          <li>Le téléphone et l'e-mail d'une inscription ne sont visibles que par l'organisateur du concours et l'administrateur.</li>
          <li>Le jour du concours, les noms des joueurs apparaissent dans le tableau public (poules, parties, scores).</li>
          <li>L'e-mail de l'organisateur n'est jamais affiché.</li>
        </ul>

        <Titre>Pourquoi</Titre>
        <p>
          Uniquement pour faire fonctionner l'application : publier les concours, gérer les inscriptions et
          le déroulement des concours, et vous prévenir quand votre inscription est validée. Aucune donnée
          n'est vendue ni utilisée pour de la publicité. Il n'y a pas de cookie publicitaire ni de mesure d'audience.
        </p>

        <Titre>Où sont les données</Titre>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les données sont hébergées par Google (Firebase).</li>
          <li>Les affiches lues automatiquement sont envoyées au service OCR.space, uniquement pour en lire le texte.</li>
          <li>Les codes postaux sont recherchés auprès du service public geo.api.gouv.fr.</li>
        </ul>

        <Titre>Combien de temps</Titre>
        <p>
          Les inscriptions sont conservées tant que le concours est en ligne et supprimées avec lui.
          Votre compte est conservé jusqu'à ce que vous le supprimiez.
        </p>

        <Titre>Vos droits</Titre>
        <p>
          Vous pouvez consulter, corriger ou supprimer vos données. Pour supprimer votre compte et vos
          inscriptions, connectez-vous puis ouvrez <b>Mon compte → Supprimer mon compte</b>. Vous pouvez aussi
          annuler une inscription dans <b>Mes inscriptions</b>. Pour toute autre demande, contactez {contact}.
          En cas de désaccord, vous pouvez saisir la CNIL (cnil.fr).
        </p>
      </div>
    </div>
  );
}
