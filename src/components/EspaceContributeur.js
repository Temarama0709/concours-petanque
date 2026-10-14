import React, { useEffect, useState } from "react";
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import AchatCredits, { PAIEMENT_ACTIF } from "./AchatCredits.js";

// Affiché à la place du formulaire de publication quand la personne ne peut pas
// (encore) publier : pas connectée, pas contributrice, ou plus de crédit.
export default function EspaceContributeur({ user, contributeur, onConnexion }) {
  const [demande, setDemande] = useState(undefined); // undefined = chargement, null = aucune
  const [form, setForm] = useState({ nom: "", club: "", telephone: "", message: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "demandes", user.uid),
      (snap) => setDemande(snap.exists() ? snap.data() : null),
      () => setDemande(null)
    );
  }, [user]);

  const cadre = "bg-white border-2 border-bord rounded-xl p-4 space-y-3";

  if (!user) {
    return (
      <div className={cadre}>
        <h2 className="text-[15px] font-black uppercase tracking-wider">Publier un concours</h2>
        <p className="text-sm text-ardoise">
          La publication est réservée aux organisateurs disposant d'un compte contributeur.
          Connectez-vous ou créez un compte, puis faites votre demande.
        </p>
        <Button variant="navy" onClick={onConnexion}>Se connecter / créer un compte</Button>
      </div>
    );
  }

  if (contributeur) {
    return (
      <div className={cadre}>
        <h2 className="text-[15px] font-black uppercase tracking-wider">Plus de crédit</h2>
        <p className="text-sm text-ardoise">
          Chaque concours publié utilise 1 crédit, et votre compte n'en a plus.
          {!PAIEMENT_ACTIF && " Contactez l'administrateur pour en obtenir."}
        </p>
        <AchatCredits />
      </div>
    );
  }

  if (demande === undefined) return <p className="text-sm text-ardoise">Chargement…</p>;

  if (demande) {
    return (
      <div className={cadre}>
        <h2 className="text-[15px] font-black uppercase tracking-wider">Demande envoyée</h2>
        <p className="text-sm text-ardoise">
          Votre demande de compte contributeur est en attente. Vous pourrez publier dès qu'elle sera acceptée.
        </p>
        <AchatCredits />
        <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db, "demandes", user.uid))}>Annuler ma demande</Button>
      </div>
    );
  }

  const envoyer = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return setErreur("Indiquez votre nom.");
    if (!/^[0-9 +.]{6,20}$/.test(form.telephone.trim())) return setErreur("Indiquez un numéro de téléphone valide.");
    setErreur("");
    setEnvoi(true);
    try {
      await setDoc(doc(db, "demandes", user.uid), {
        email: user.email,
        nom: form.nom.trim(),
        club: form.club.trim(),
        telephone: form.telephone.trim(),
        message: form.message.trim(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Demande contributeur:", error);
      setErreur("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (cle) => ({ value: form[cle], onChange: (e) => setForm((f) => ({ ...f, [cle]: e.target.value })) });

  return (
    <div className="space-y-4">
    {PAIEMENT_ACTIF && (
    <div className={cadre}>
      <h2 className="text-[15px] font-black uppercase tracking-wider">Publier vos concours</h2>
      <p className="text-sm text-ardoise">
        Vos concours sont publiés immédiatement et vous recevez les inscriptions par e-mail.
        Chaque concours publié utilise 1 crédit.
      </p>
      <AchatCredits />
    </div>
    )}
    <form onSubmit={envoyer} className={cadre}>
      <h2 className="text-[15px] font-black uppercase tracking-wider">
        {PAIEMENT_ACTIF ? "Club partenaire ?" : "Devenir contributeur"}
      </h2>
      <p className="text-sm text-ardoise">
        {PAIEMENT_ACTIF
          ? "Vous pouvez aussi demander un compte contributeur à l'administrateur."
          : "Les contributeurs publient leurs concours directement, reçoivent les inscriptions par e-mail et gèrent le concours (tirage, poules, terrains, scores). Faites votre demande : l'administrateur l'examine rapidement."}
      </p>
      <Input aria-label="Nom" placeholder="Nom et prénom" autoComplete="name" maxLength={80} {...champ("nom")} />
      <Input aria-label="Club ou association" placeholder="Club ou association (facultatif)" maxLength={80} {...champ("club")} />
      <Input type="tel" aria-label="Téléphone" placeholder="Téléphone" autoComplete="tel" maxLength={20} {...champ("telephone")} />
      <textarea
        aria-label="Message"
        placeholder="Message (facultatif) : combien de concours par an, etc."
        maxLength={500}
        rows={3}
        className="w-full px-3 py-2 bg-fond text-navy placeholder:text-ardoise border-2 border-transparent rounded-[10px] focus:outline-none focus:border-jaune"
        {...champ("message")}
      />
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <Button type="submit" variant="navy" disabled={envoi} className="w-full">{envoi ? "Envoi…" : "Envoyer ma demande"}</Button>
    </form>
    </div>
  );
}
