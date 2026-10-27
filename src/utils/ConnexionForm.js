import React, { useState } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import ChoixClub from "../components/ChoixClub.js";
import { LienConfidentialite } from "../components/Confidentialite.js";
import { AFFILIATION_VIDE, enregistrerProfil, erreurAffiliation, useClubs } from "../lib/clubs.js";

// Les droits admin ne dépendent plus de l'email ni du mot de passe saisis :
// ils sont décidés par les règles Firestore (UID autorisé ou droit "admin").
export default function ConnexionForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [affiliation, setAffiliation] = useState(AFFILIATION_VIDE);
  const clubs = useClubs();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage("Champs requis.");
      return;
    }
    if (isSignup && erreurAffiliation(affiliation)) {
      setMessage("❌ " + erreurAffiliation(affiliation));
      return;
    }
    try {
      if (isSignup) {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await enregistrerProfil(user, affiliation, clubs || []);
        } catch (error) {
          console.error("Profil:", error); // le compte existe : le club pourra être indiqué plus tard
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onSuccess?.();
    } catch (error) {
      const messages = {
        "auth/invalid-credential": "Email ou mot de passe incorrect.",
        "auth/wrong-password": "Email ou mot de passe incorrect.",
        "auth/user-not-found": "Email ou mot de passe incorrect.",
        "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
        "auth/weak-password": "Le mot de passe doit faire au moins 6 caractères.",
        "auth/invalid-email": "Email invalide."
      };
      setMessage("❌ " + (messages[error.code] || "Erreur de connexion, réessayez."));
    }
  };

  return (
    <form onSubmit={handleAuth} className="bg-white border-2 border-bord rounded-xl p-4 space-y-3">
      <h2 className="text-[15px] font-black uppercase tracking-wider">
        {isSignup ? "Créer un compte" : "Connexion"}
      </h2>
      <Input
        type="email"
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        autoComplete={isSignup ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {isSignup && <ChoixClub valeur={affiliation} onChange={setAffiliation} />}
      {isSignup && (
        <p className="text-xs text-ardoise">
          En créant un compte, vous acceptez la <LienConfidentialite>politique de confidentialité</LienConfidentialite>.
        </p>
      )}
      {message && <p className="text-sm font-semibold text-red-700">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{isSignup ? "S'inscrire" : "Se connecter"}</Button>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={() => { setIsSignup(!isSignup); setMessage(""); }}>
        {isSignup ? "Déjà un compte ? Connexion" : "Pas encore de compte ? Créer un compte"}
      </Button>
    </form>
  );
}
