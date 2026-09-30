import React, { useState } from "react";
import { auth } from "./firebase";


import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";

export default function ConnexionForm({ setUser, setAdminMode, onCancel }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setMessage("Champs requis.");
      return;
    }

    try {
      let userCredential;
      if (isSignup) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setMessage("✅ Compte créé avec succès !");
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setMessage("✅ Connexion réussie !");
      }

      setUser(userCredential.user);

      // 🔐 Mode admin si adresse contient "admin" ou mot de passe spécial
      if (email.includes("admin") || password === "admin123") {
        setAdminMode(true);
      }

    } catch (error) {
      console.error(error);
      setMessage("❌ Erreur : " + error.message);
    }
  };

  return (
    <div className="bg-white border rounded shadow p-4 max-w-sm space-y-2">
      <h2 className="text-lg font-bold text-center text-sky-600">
        {isSignup ? "Créer un compte" : "Connexion"}
      </h2>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
     
      <Button onClick={handleAuth}>
        {isSignup ? "S'inscrire" : "Se connecter"}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
      Annuler
      </Button>
      <Button variant="ghost" onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? "Déjà un compte ? Connexion" : "Pas encore de compte ? Créer un compte"}
      </Button>
      

      {message && <p className="text-sm text-center text-gray-600">{message}</p>}
    </div>
  );
}
