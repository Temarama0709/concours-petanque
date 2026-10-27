import React, { useState } from "react";
import { IconHelp, IconX } from "./ui/icons.js";

// Bouton ou lien qui ouvre l'aide
export function BoutonAide({ className, children, ...props }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOuvert(true)} {...props}>
        {children || <IconHelp />}
      </button>
      {ouvert && <Aide onFermer={() => setOuvert(false)} />}
    </>
  );
}

const Section = ({ titre, children, ouverte }) => (
  <details open={ouverte} className="group rounded-[10px] border-2 border-bord open:border-jaune">
    <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-3 font-black uppercase tracking-wider text-[13px]">
      {titre}
      <span aria-hidden="true" className="inline-block text-lg leading-none group-open:rotate-45 transition-transform">+</span>
    </summary>
    <div className="px-3 pb-3 space-y-2">{children}</div>
  </details>
);
const Etapes = ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>;
const Puces = ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>;
const SousTitre = ({ children }) => <p className="font-bold pt-1">{children}</p>;
const Astuce = ({ children }) => <p className="rounded-[10px] bg-jaune-clair px-3 py-2">💡 {children}</p>;

export default function Aide({ onFermer }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-navy/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aide"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white text-navy rounded-t-xl sm:rounded-xl p-4 space-y-3 max-h-[88vh] overflow-y-auto text-sm leading-relaxed"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-black uppercase tracking-wider">Aide</h2>
          <button type="button" aria-label="Fermer" onClick={onFermer} className="w-11 h-11 rounded-[10px] bg-fond flex items-center justify-center"><IconX /></button>
        </div>

        <Section titre="📱 Ajouter l'application sur mon téléphone">
          <SousTitre>Android (Chrome)</SousTitre>
          <Etapes>
            <li>Ouvrez <b>petanque-concours.web.app</b> dans <b>Chrome</b>.</li>
            <li>Touchez le menu <b>⋮</b> en haut à droite.</li>
            <li>Touchez <b>Installer l'application</b> (ou <b>Ajouter à l'écran d'accueil</b>).</li>
            <li>L'icône <b>Concours Pétanque</b> apparaît avec vos autres applications.</li>
          </Etapes>
          <SousTitre>iPhone (Safari)</SousTitre>
          <Etapes>
            <li>Ouvrez <b>petanque-concours.web.app</b> dans <b>Safari</b> (pas dans Chrome ni Facebook).</li>
            <li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li>
            <li>Faites défiler et touchez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li>
          </Etapes>
          <Astuce>Ouvrez le lien depuis Chrome ou Safari : depuis Facebook ou WhatsApp, le bouton d'installation n'apparaît pas.</Astuce>
        </Section>

        <Section titre="🔎 Trouver un concours et s'inscrire">
          <Etapes>
            <li>Choisissez un jour dans le calendrier, ou cherchez une ville. Les filtres permettent de n'afficher que les concours <b>officiels</b>, <b>ouverts à tous</b>, d'un <b>département</b> ou de <b>mon club</b>.</li>
            <li>Touchez un concours pour voir sa fiche : affiche, lieu, tarif, <b>Itinéraire</b>, <b>Agenda</b>.</li>
            <li>Si les inscriptions sont ouvertes, touchez <b>S'inscrire à ce concours</b>, indiquez les joueurs et un téléphone ou un e-mail.</li>
            <li>Votre inscription est <b>en attente</b> jusqu'à ce que l'organisateur la valide. Si vous êtes connecté, la <b>cloche</b> 🔔 vous prévient dès qu'elle est validée.</li>
          </Etapes>
          <Astuce>Connecté, vous retrouvez vos inscriptions dans <b>Mes inscriptions</b>, où vous pouvez aussi les annuler.</Astuce>
        </Section>

        <Section titre="📝 Publier un concours">
          <SousTitre>1. Obtenir le droit de publier (une seule fois)</SousTitre>
          <Etapes>
            <li>Créez un compte : bouton <b>Connexion</b> en haut, puis <b>Créer un compte</b>.</li>
            <li>Touchez <b>Publier un concours</b> et remplissez <b>Devenir contributeur</b> (nom, club, téléphone).</li>
            <li>L'administrateur valide votre demande : le bouton <b>Publier un concours</b> ouvre alors le formulaire.</li>
          </Etapes>
          <SousTitre>2. Publier</SousTitre>
          <Etapes>
            <li>Touchez <b>Publier un concours</b>.</li>
            <li>Ajoutez l'<b>affiche</b> si vous en avez une : l'application la lit et remplit les champs toute seule. Vérifiez-les.</li>
            <li>Complétez : nom, date, lieu, code postal et ville, type (officiel ou ouvert à tous), format, tarif.</li>
            <li>Laissez cochée <b>Je suis l'organisateur de ce concours</b> pour gérer les inscriptions. Indiquez alors l'e-mail qui reçoit les inscriptions et, si besoin, le <b>nombre maximum d'équipes</b> (ex. 64).</li>
            <li>Décochez-la si vous publiez simplement pour informer : pas d'inscriptions en ligne.</li>
            <li>Touchez <b>Envoyer</b> : le concours est visible tout de suite.</li>
          </Etapes>
          <Astuce>Sur Android, depuis Facebook ou WhatsApp : ouvrez l'affiche, touchez <b>Partager</b> puis <b>Concours Pétanque</b>. Le formulaire s'ouvre avec l'affiche déjà lue.</Astuce>
        </Section>

        <Section titre="🏆 Gérer mon concours">
          <SousTitre>Avant le concours : les inscriptions</SousTitre>
          <Puces>
            <li>Ouvrez la fiche de votre concours : la partie <b>À valider</b> liste les nouvelles inscriptions. Touchez <b>Valider</b> ou <b>Refuser</b> ; la personne est prévenue.</li>
            <li>Dans <b>Organisation</b>, changez le <b>nombre maximum d'équipes</b>. Une fois la limite atteinte, le concours affiche <b>Complet</b>.</li>
            <li>Pour une équipe inscrite par téléphone ou au comptoir : <b>Gérer le concours</b> → <b>Ajouter une équipe</b>. Elle est validée d'office.</li>
          </Puces>
          <SousTitre>Le jour du concours</SousTitre>
          <Etapes>
            <li>Touchez <b>Gérer le concours · équipes, pointage, tirage</b>.</li>
            <li><b>Pointage</b> : cochez les équipes présentes (ou <b>Tout cocher</b>). Seules les équipes validées et cochées participent au tirage.</li>
            <li>Choisissez la <b>formule</b> : <b>poules puis phase finale</b> (poules de 4, 2 qualifiés par poule) ou <b>élimination directe</b>. Indiquez le <b>nombre de terrains</b> et si les parties se jouent en 13 ou 11 points.</li>
            <li>Touchez <b>Lancer le tirage</b> : les poules et les terrains sont attribués automatiquement, les clubs sont séparés autant que possible.</li>
            <li>Les scores arrivent au fil des parties (voir ci-dessous). Vous pouvez saisir ou <b>corriger</b> n'importe quel score.</li>
            <li>Quand les poules sont terminées, touchez <b>Lancer la phase finale</b>, jusqu'à la finale et au vainqueur.</li>
          </Etapes>
          <Astuce>Une erreur au tirage ? <b>Annuler le tirage</b> efface les parties et les scores ; le pointage des équipes est gardé, vous pouvez relancer le tirage.</Astuce>
          <Astuce>Affichez <b>Suivre le concours</b> sur un écran ou partagez le lien : tout le monde voit les poules, les terrains et les résultats en direct.</Astuce>
        </Section>

        <Section titre="🎯 Saisir les scores (joueurs)">
          <Puces>
            <li>Inscrivez-vous en étant <b>connecté</b> : votre équipe est reliée à votre compte.</li>
            <li>Dans la fiche du concours, touchez <b>Suivre le concours</b> : votre prochaine partie et votre terrain s'affichent.</li>
            <li>Après la partie, touchez <b>Saisir le score</b>. Si l'équipe adverse a aussi un compte, elle doit <b>Confirmer</b> ; sinon le score est validé tout de suite.</li>
            <li>Un désaccord ? Touchez <b>Non, corriger</b>, ou voyez l'organisateur, qui peut toujours corriger.</li>
          </Puces>
        </Section>

        <Section titre="❓ Questions fréquentes">
          <Puces>
            <li><b>Je ne reçois pas d'alerte</b> : ouvrez la cloche 🔔 et touchez <b>Activer les alertes</b>. Les alertes arrivent quand l'application est ouverte.</li>
            <li><b>Indiquer ou changer mon club</b> : touchez le lien du club sous votre e-mail, en haut.</li>
            <li><b>Annuler une inscription</b> : <b>Mes inscriptions</b> → <b>Annuler</b>.</li>
            <li><b>Supprimer mon compte</b> : <b>Mon compte</b> → <b>Supprimer mon compte</b>.</li>
          </Puces>
        </Section>
      </div>
    </div>
  );
}
