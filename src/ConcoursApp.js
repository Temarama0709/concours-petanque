import { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Calendar } from "./components/ui/calendar";
import { Input } from "./components/ui/input";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4-G44Gl2Et0twI_xq7TxGJIZWEPXHrUo",
  authDomain: "petanque-concours.firebaseapp.com",
  projectId: "petanque-concours",
  storageBucket: "petanque-concours.appspot.com",
  messagingSenderId: "648075631175",
  appId: "1:648075631175:web:812f2b919c8f6bf8a02f62",
  measurementId: "G-KG2Q0YRXM1"
};

let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization error", error);
}

let db;
try {
  db = getFirestore(app);
} catch (error) {
  console.error("Firestore not available", error);
}

import MapConcours from "./MapConcours";

export default function ConcoursApp() {
  const [filtre, setFiltre] = useState("tous");
  const [selectedDate, setSelectedDate] = useState(null);
  const [concoursList, setConcoursList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    lieu: "",
    type: "officiel",
    ville: "",
    cp: ""
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "concours"), where("valide", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const concours = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setConcoursList(concours);
    });
    return () => unsubscribe();
  }, [db]);

  const concoursFiltres = concoursList.filter((c) => {
    if (filtre !== "tous" && c.type !== filtre) return false;
    if (selectedDate && c.date !== format(selectedDate, "yyyy-MM-dd")) return false;
    return true;
  });

  const handleReminder = (concours) => {
    alert(`Rappel activé pour : ${concours.title} le ${concours.date}`);
  };

  const handleAddConcours = async () => {
    if (!formData.title || !formData.date || !formData.lieu || !formData.type || !formData.ville || !formData.cp) {
      setFormError("Tous les champs sont obligatoires.");
      return;
    }
    try {
      await addDoc(collection(db, "concours"), {
        ...formData,
        valide: false
      });
      setFormData({ title: "", date: "", lieu: "", type: "officiel", ville: "", cp: "" });
      setShowForm(false);
      setFormError("");
      setSuccessMessage("Concours proposé avec succès ! En attente de validation.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erreur lors de l'ajout du concours:", error);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === "admin123") {
      setAdminMode(true);
    } else {
      alert("Mot de passe incorrect");
    }
  };

  const handleValider = async (id) => {
    try {
      await updateDoc(doc(db, "concours", id), { valide: true });
    } catch (error) {
      console.error("Erreur validation:", error);
    }
  };

  const handleSupprimer = async (id) => {
    try {
      await deleteDoc(doc(db, "concours", id));
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center text-sky-700 mb-4">Concours de Pétanque</h1>

      <div className="flex justify-center gap-2 flex-wrap">
        <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={() => setFiltre("tous")}>Tous</Button>
        <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={() => setFiltre("officiel")}>Officiels</Button>
        <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={() => setFiltre("ouvert")}>Ouverts à tous</Button>
      </div>

      <div className="text-center mt-2">
        <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "+ Proposer un concours"}
        </Button>
      </div>

      {showForm && (
        <div className="border p-4 rounded space-y-2 bg-white shadow">
          <Input placeholder="Nom du concours" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          <Input placeholder="Lieu" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
          <Input placeholder="Code postal" value={formData.cp} onChange={(e) => setFormData({ ...formData, cp: e.target.value })} />
          <Input placeholder="Ville" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} />
          <select className="w-full border rounded px-2 py-1 bg-white shadow" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option value="officiel">Officiel</option>
            <option value="ouvert">Ouvert à tous</option>
          </select>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={handleAddConcours}>Envoyer</Button>
        </div>
      )}

      {successMessage && <div className="text-green-600 text-sm text-center">{successMessage}</div>}

      <div className="text-center">
        <Button variant="outline" onClick={() => setShowMap(!showMap)}>
          {showMap ? "Masquer la carte" : "Voir sur la carte"}
        </Button>
      </div>

      {showMap && <MapConcours concoursList={concoursList} />}

      <div className="mt-4">
        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border w-full bg-white shadow" />
        {selectedDate && (
          <Button variant="ghost" className="mt-2" onClick={() => setSelectedDate(null)}>
            Réinitialiser la date
          </Button>
        )}
      </div>

      {concoursFiltres.map((concours) => (
        <Card key={concours.id} className="bg-stone-100 mt-4 shadow-md">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{concours.title}</h2>
                <p className="text-sm text-gray-600">{concours.date}</p>
                <p className="text-sm">{concours.lieu}</p>
                <p className="text-sm text-gray-700">{concours.cp} {concours.ville}</p>
                <span className="text-xs uppercase bg-orange-200 text-orange-900 px-2 py-1 rounded inline-block mt-1">{concours.type}</span>
              </div>
              <button onClick={() => handleReminder(concours)} title="Activer un rappel">
                <Bell className="w-5 h-5 text-gray-600 hover:text-yellow-500" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!adminMode && (
        <div className="mt-8 text-center">
          <Input className="bg-white shadow-md" placeholder="Mot de passe admin" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          <Button className="mt-2 bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={handleAdminLogin}>Connexion admin</Button>
        </div>
      )}

      {adminMode && db && <AdminPanel db={db} onValider={handleValider} onSupprimer={handleSupprimer} />}
      </div>
  );
  function AdminPanel({ db, onValider, onSupprimer }) {
    const [propositions, setPropositions] = useState([]);
  
    useEffect(() => {
      if (!db) return;
      const q = query(collection(db, "concours"), where("valide", "==", false));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const nonValides = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPropositions(nonValides);
      });
      return () => unsubscribe();
    }, [db]);
  
    return (
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-bold text-sky-700">Propositions à valider</h2>
        {propositions.map((c) => (
          <Card key={c.id} className="bg-stone-100 shadow">
            <CardContent className="p-4">
              <h3 className="font-semibold">{c.title}</h3>
              <p className="text-sm text-gray-600">{c.date} - {c.lieu}</p>
              <p className="text-sm">{c.cp} {c.ville}</p>
              <div className="flex gap-2 mt-2">
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold" onClick={() => onValider(c.id)}>Valider</Button>
                <Button className="bg-red-500 hover:bg-red-600 text-white font-bold" variant="destructive" onClick={() => onSupprimer(c.id)}>Supprimer</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {propositions.length === 0 && <p className="text-sm text-gray-500">Aucune proposition en attente.</p>}
      </div>
    );
  }
  
}
