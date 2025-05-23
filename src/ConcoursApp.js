
import React,{ useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import CalendarWithConcours from './components/ui/CalendarWithConcours.js';
import { Input } from "./components/ui/input.js";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import MapConcours from "./MapConcours.js";

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

function ConcoursApp() {
  const [deleteMessage, setDeleteMessage] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [selectedDate, setSelectedDate] = useState(null);
  const [concoursList, setConcoursList] = useState([]);
  const [selectedConcours, setSelectedConcours] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    lieu: "",
    type: "officiel",
    ville: "",
    cp: ""
  });
  const [villeOptions, setVilleOptions] = useState([]);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [showLogin, setShowLogin] = useState(false);


  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "concours"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const concours = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setConcoursList(concours);
    });
    return () => unsubscribe();
  }, [db]);

  const concoursFiltres = concoursList.filter((c) => {
    const dateOk = !selectedDate || c.date === format(selectedDate, "yyyy-MM-dd");
    const typeOk = filtre === "tous" || c.type === filtre;
    return dateOk && typeOk;
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
      setVilleOptions([]);
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
      setShowLogin(false);        // masque le formulaire ✅
      setAdminPassword("");
    } else {
      alert("Mot de passe incorrect");
    }
  };

  const handleSupprimer = async (id) => {
    const confirmation = window.confirm("❌ Supprimer ce concours ?");
    if (!confirmation) return;
  
    try {
      await deleteDoc(doc(db, "concours", id));
      setDeleteMessage("✅ Concours supprimé avec succès !");
      setTimeout(() => setDeleteMessage(""), 3000);
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const handleValider = async (id) => {
    try {
      await updateDoc(doc(db, "concours", id), { valide: true });
    } catch (error) {
      console.error("Erreur validation:", error);
    }
  };

  return (
    
    <div className="min-h-screen bg-amber-50 p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center text-sky-700 mb-4">Concours de Pétanque</h1>
      
<div className="flex justify-between items-center mb-4">
  <Button variant="outline" onClick={() => setShowForm(!showForm)}>
    {showForm ? "Annuler" : "+ Proposer un concours"}
  </Button>

  {!adminMode ? (
    <Button variant="outline" onClick={() => setShowLogin(true)}>
      Connexion
    </Button>
  ) : (
    <Button variant="ghost" onClick={() => setAdminMode(false)}>
      Déconnexion
    </Button>
  )}
</div>
{showForm && (
        <div className="border p-4 rounded space-y-2 bg-white shadow">
          <Input placeholder="Nom du concours" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          <Input placeholder="Lieu" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
          <Input
            placeholder="Code postal"
            value={formData.cp}
            onChange={(e) => setFormData({ ...formData, cp: e.target.value })}
            onBlur={() => {
              if (formData.cp.length === 5) {
                fetch(`https://apicarto.ign.fr/api/codes-postaux/communes/${formData.cp}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.length) {
                      setVilleOptions(data.map(v => v.nomCommune));
                      setFormData(f => ({ ...f, ville: data[0].nomCommune }));
                    }
                  });
              }
            }}
          />
          {villeOptions.length > 0 ? (
            <select className="w-full border rounded px-2 py-1" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })}>
              <option value="">-- Choisir la ville --</option>
              {villeOptions.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <Input placeholder="Ville" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} />
          )}
          <select className="w-full border rounded px-2 py-1" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option value="officiel">Officiel</option>
            <option value="ouvert">Ouvert à tous</option>
          </select>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Button onClick={handleAddConcours}>Envoyer</Button>
        </div>
      )}

      {successMessage && <div className="text-green-600 text-sm text-center">{successMessage}</div>}
{showLogin && (
  <div className="bg-white border p-4 rounded shadow mb-4">
    <Input
      placeholder="Mot de passe admin"
      type="password"
      value={adminPassword}
      onChange={(e) => setAdminPassword(e.target.value)}
    />
    <div className="mt-2 flex gap-2">
      <Button onClick={handleAdminLogin}>Se connecter</Button>
      <Button variant="ghost" onClick={() => setShowLogin(false)}>Annuler</Button>
    </div>
  </div>
)}

    
      <div className="mb-4 w-full">
      <label className="block text-sm font-medium text-amber-700 mb-1 text-left">  </label>
 
  <select
    value={filtre}
    onChange={(e) => setFiltre(e.target.value)}
    className="border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
  >
    <option value="tous">Tous les concours</option>
    <option value="officiel">Officiels</option>
    <option value="ouvert">Ouverts à tous</option>
  </select>
</div>

  <CalendarWithConcours
  selectedDate={selectedDate}
  setSelectedDate={setSelectedDate}
  concoursList={concoursList}
  />

    
      <div className="text-center">
        <Button variant="outline" onClick={() => setShowMap(!showMap)}>
          {showMap ? "Masquer la carte" : "Voir sur la carte"}
        </Button>
      </div>

      {showMap && <MapConcours concoursList={concoursList} />}

      <div className="mt-4">

     
        
      {selectedDate && (
        <button onClick={() => setSelectedDate(null)} className="mt-2 bg-gray-200 px-2 py-1 rounded">
          Réinitialiser la date
        </button>
      )}
      </div>

      
      <table className="w-full text-sm mt-4 border border-gray-200 rounded overflow-hidden shadow-sm table-fixed">
  <thead className="bg-sky-200 text-sky-800">
    <tr>
      <th className="px-1 py-1 w-[25%] text-left border-b">Date</th>
      <th className="px-1 py-1 w-[25%] text-left border-b">Lieu</th>
      <th className="px-1 py-1 w-[15%] text-left border-b">Type</th>
      <th className="px-1 py-1 w-[15%] text-right border-b">Actions</th>
    </tr>
  </thead>
  <tbody>
    {concoursFiltres
      .filter(c => c.valide === true)
      .map((concours, index) => (
        <tr
          key={concours.id}
          className={`${
            index % 2 === 0 ? "bg-white" : "bg-blue-50"
          } hover:bg-green-100 border-t`}
        >
          <td className="px-1 py-1 text-left ">{concours.date}</td>
          <td className="px-1 py-1 text-left ">{concours.ville}</td>
          <td className="px-1 py-1 text-left ">{concours.type}</td>
          <td className="px-1 py-1 text-right">
            {adminMode ? (
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => handleSupprimer(concours.id)}>Supprimer</Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConcours(concours)}
              >
                Voir
              </Button>
            )}
          </td>
        </tr>
      ))}
  </tbody>
</table>



{selectedConcours && (
  <div className="border p-4 mt-4 rounded shadow bg-white space-y-2">
    <h2 className="text-xl font-bold text-sky-700">{selectedConcours.title}</h2>
    <p>📅 {selectedConcours.date}</p>
    <p>📍 {selectedConcours.lieu}, {selectedConcours.cp} {selectedConcours.ville}</p>
    <p>🏷️ Type : {selectedConcours.type}</p>
    <Button variant="ghost" className="mt-2" onClick={() => setSelectedConcours(null)}>
      Fermer
    </Button>
  </div>
)}

      {adminMode && (
  <AdminPanel
    concoursList={concoursList}
    handleValider={handleValider}
    handleSupprimer={handleSupprimer}
  />
)}
    
    </div>
    
  );
}
function AdminPanel({ concoursList, handleValider, handleSupprimer }) {

  
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-bold text-sky-700">Propositions à valider</h2>
      {concoursList.filter(c => c.valide === false).map((c) => (
        
        <Card key={c.id}>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-600">{c.date} - {c.lieu}</p>
            <p className="text-sm">{c.cp} {c.ville}</p>
            <p className="text-sm text-gray-600">{c.type}</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={() => handleValider(c.id)}>Valider</Button>
              <Button variant="destructive" onClick={() => handleSupprimer(c.id)}>Supprimer</Button>
            </div>
          </CardContent>
        </Card>
       
      ))}
      
      {concoursList.filter(c => c.valide === false).length === 0 && (
        <p className="text-sm text-gray-500">Aucune proposition en attente.</p>
      )}
      
      

    </div>
  );
}


export default ConcoursApp;
