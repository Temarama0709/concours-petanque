import React, { useState } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";

// Les droits admin ne dépendent plus de l'email ni du mot de passe saisis :
// ils sont décidés par les règles Firestore (UID autorisé ou droit "admin").
export default function ConnexionForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage("Champs requis.");
      return;
    }
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
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
    <form onSubmit={handleAuth} className="bg-white border rounded shadow p-4 space-y-2">
      <h2 className="text-lg font-bold text-center text-sky-600">
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
      {message && <p className="text-sm text-center text-red-600">{message}</p>}
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
