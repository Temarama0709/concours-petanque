import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { EMAIL_VALIDE, joueursParEquipe } from "../lib/formats.js";

// Inscription d'une équipe à un concours. L'organisateur est prévenu par
// e-mail (fonction notifierInscription côté serveur).
export default function InscriptionForm({ concours, user, clubParDefaut = "", onTermine }) {
  const nb = joueursParEquipe(concours.format);
  const [joueurs, setJoueurs] = useState(Array(nb).fill(""));
  const [club, setClub] = useState(clubParDefaut);
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [accord, setAccord] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const envoyer = async (e) => {
    e.preventDefault();
    const noms = joueurs.map((j) => j.trim()).filter(Boolean);
    const tel = telephone.trim();
    if (!noms.length) return setErreur("Indiquez au moins le nom d'un joueur.");
    if (!tel && !email.trim()) return setErreur("Indiquez un téléphone ou un e-mail pour que l'organisateur puisse vous joindre.");
    if (tel && !/^[0-9 +.]{6,20}$/.test(tel)) return setErreur("Le numéro de téléphone n'est pas valide.");
    if (email.trim() && !EMAIL_VALIDE.test(email.trim())) return setErreur("L'adresse e-mail n'est pas valide.");
    if (!accord) return setErreur("Cochez la case pour accepter la transmission à l'organisateur.");
    setErreur("");
    setEnvoi(true);
    try {
      await addDoc(collection(db, "inscriptions"), {
        concoursId: concours.id,
        joueurs: noms,
        club: club.trim(),
        telephone: tel,
        email: email.trim(),
        // Compte de la personne qui inscrit l'équipe : lui permet de saisir les scores
        uid: user?.uid || null,
        createdAt: serverTimestamp()
      });
      setEnvoye(true);
    } catch (error) {
      console.error("Inscription:", error);
      setErreur("L'inscription a échoué. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  if (envoye) {
    return (
      <div className="rounded-xl bg-jaune-clair p-4 space-y-2" role="status">
        <p className="font-black">Inscription envoyée !</p>
        <p className="text-sm">
          L'organisateur a été prévenu{email.trim() ? " et une confirmation vous a été envoyée par e-mail" : ""}.
          {user ? "Le jour du concours, vous pourrez saisir vos scores depuis « Suivre le concours »." : ""}
        </p>
        <Button variant="navy" size="sm" onClick={onTermine}>Fermer</Button>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="rounded-xl border-2 border-bord p-4 space-y-3">
      <h3 className="text-[15px] font-black uppercase tracking-wider">S'inscrire</h3>
      {joueurs.map((nom, i) => (
        <Input
          key={i}
          aria-label={`Joueur ${i + 1}`}
          placeholder={nb === 1 ? "Nom et prénom" : `Joueur ${i + 1} : nom et prénom`}
          autoComplete={i === 0 ? "name" : "off"}
          maxLength={80}
          value={nom}
          onChange={(e) => setJoueurs((js) => js.map((j, k) => (k === i ? e.target.value : j)))}
        />
      ))}
      <Input aria-label="Club" placeholder="Club (facultatif)" maxLength={80} value={club} onChange={(e) => setClub(e.target.value)} />
      <Input
        type="tel"
        aria-label="Téléphone"
        placeholder="Téléphone"
        autoComplete="tel"
        maxLength={20}
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
      />
      <Input
        type="email"
        aria-label="E-mail"
        placeholder="E-mail"
        autoComplete="email"
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <p className="text-xs text-ardoise">Téléphone ou e-mail obligatoire (au moins l'un des deux).</p>
      {!user && (
        <p className="text-xs bg-jaune-clair text-navy rounded-[10px] px-3 py-2">
          Astuce : connectez-vous avant de vous inscrire pour pouvoir saisir vos scores le jour du concours.
        </p>
      )}
      <label className="flex items-start gap-2 text-sm text-ardoise">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-navy" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
        J'accepte que ces informations soient transmises à l'organisateur pour gérer mon inscription, et que les noms des joueurs apparaissent dans le tableau du concours.
      </label>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={envoi} className="flex-1">{envoi ? "Envoi…" : "Envoyer l'inscription"}</Button>
        <Button variant="ghost" onClick={onTermine}>Annuler</Button>
      </div>
    </form>
  );
}
