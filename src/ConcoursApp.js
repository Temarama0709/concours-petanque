
import React,{ useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import CalendarWithConcours from './components/ui/CalendarWithConcours.js';
import LiveStream from "./components/ui/LiveStream.js";
import { Input } from "./components/ui/input.js";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import MapConcours from "./MapConcours.js";
import { parse } from "date-fns";
import { fr } from "date-fns/locale";
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
    format: "doublette",
    prix: "" ,
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
  const handleAfficheUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
  
      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { apikey: "helloworld" }, // clé publique gratuite
        body: new URLSearchParams({
          base64Image: `data:${file.type};base64,${base64}`,
          language: "fre"
        })
      });
  
      const data = await res.json();
      const text = data?.ParsedResults?.[0]?.ParsedText || "";
  
      console.log("Texte OCR extrait :", text);
  
      // Extraction avec protection
      const title = /concours.*pétanque/i.test(text) ? "Concours Pétanque" : "Concours";
      const dateStr = text.match(/(\d{1,2} \w+ 202\d)/i)?.[1] || "";
  
      let formDate = "";
      try {
        const parsedDate = parse(dateStr, "d MMMM yyyy", new Date(), { locale: fr });
        formDate = parsedDate.toISOString().slice(0, 10);
      } catch (err) {
        console.warn("Date invalide :", dateStr);
      }
  
      const ville = text.match(/(?:à|au)\s+([A-ZÉÈÂ].+)/i)?.[1]?.split("\n")[0] || "";
      const cpMatch = text.match(/\b(0[1-9]|[1-8][0-9]|9[0-5])[0-9]{3}\b/);
      const cp = cpMatch ? cpMatch[0] : "";
  
      setFormData(f => ({
        ...f,
        title,
        date: formDate || f.date,
        ville: ville || f.ville,
        cp: cp || f.cp
      }));
  
      alert("✅ Champs remplis automatiquement !");
    };
    reader.readAsDataURL(file);
  };
  const [departementFiltre, setDepartementFiltre] = useState([]);


  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "concours"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const concours = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setConcoursList(concours);
    });
    return () => unsubscribe();
  }, [db]);

  const concoursFiltres = concoursList.filter(c => {
    if (filtre !== "tous" && c.type !== filtre) return false;
    if (selectedDate && c.date !== format(selectedDate, "yyyy-MM-dd")) return false;
    if (departementFiltre.length > 0 && !departementFiltre.some(dep => c.cp.startsWith(dep))) return false;
    return true;
  });
  
  

  const handleReminder = (concours) => {
    alert(`Rappel activé pour : ${concours.title} le ${concours.date}`);
  };

  const handleAddConcours = async () => {
    if (!formData.title || !formData.date || !formData.lieu || !formData.type || !formData.ville || !formData.cp || !formData.format || !formData.prix) {
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
  const [showLive, setShowLive] = useState(false);


  return (
    
    <div className="min-h-screen bg-amber-50 p-4 max-w-md mx-auto space-y-4">
  <h1 className="text-4xl font-extrabold text-center text-yellow-700 uppercase tracking-wide drop-shadow-md">
  Concours Pétanque
</h1>
<p className="text-center text-sm text-gray-600 italic mt-1">
  Calendrier & inscriptions faciles
</p>

      
<div className="flex justify-between items-center mb-4">
  <Button variant="outline" onClick={() => setShowForm(!showForm)}>
    {showForm ? "Annuler" : "+ Proposer un concours"}
  </Button>
  {showLive && <LiveStream onClose={() => setShowLive(false)} />}

<Button onClick={() => setShowLive(true)} className="bg-blue-300 text-white">
  🎥 Démarrer un live
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
          <Input placeholder="Adresse" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
          <input
  type="text"
  placeholder="CP : ex (74000)"
  value={formData.cp}
  onChange={(e) => {
    const value = e.target.value;
    setFormData({ ...formData, cp: value });

    // Déclencher le fetch avec value (pas formData.cp)
    if (value.length === 5) {
      fetch(`https://apicarto.ign.fr/api/codes-postaux/communes/${value}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.length > 0) {
            const villes = data.map(v => v.nomCommune);
            setVilleOptions(villes);
            setFormData(f => ({ ...f, ville: villes[0] }));
          } else {
            setVilleOptions([]);
          }
        })
        .catch(() => setVilleOptions([]));
    } else {
      setVilleOptions([]);
    }
  }}
  className="border px-2 py-1 rounded w-full"
/>
{/* Type d'équipe */}
<div className="mb-2">

  <select
    
    value={formData.format}
    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
    className="border px-2 py-1 rounded w-full"
  >
   
    <option value="Tete a tete Senior">Tete a tete Senior</option>
    <option value="Doublette Senior">Doublette Senior</option>
    <option value="Triplette Senior">Triplette Senior</option>
    <option value="Tete a tete Feminin">Tete a tete Feminin</option>
    <option value="Doublette Feminin">Doublette Feminin</option>
    <option value="Triplette Feminin">Triplette Feminin</option>
  </select>
</div>

{/* Prix d'inscription */}
<div className="mb-2">

  <input
    type="number"
    min="0"
    value={formData.prix}
    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
    className="border px-2 py-1 rounded w-full"
    placeholder="Tarif par équipes"
  />
</div>

          {villeOptions.length > 0 ? (
            <select className="w-full border rounded px-2 py-1" 
            value={formData.ville} 
            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}>
              <option value="">-- Choisir la ville --</option>
              {villeOptions.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <Input placeholder="Ville"
            value={formData.ville} 
            onChange={(e) => setFormData({ ...formData, ville: e.target.value })} />
          )}

          <select className="w-full border rounded px-2 py-1" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option value="officiel">Officiel</option>
            <option value="ouvert">Ouvert à tous</option>
          </select>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Button onClick={handleAddConcours}>Envoyer</Button>
          <label className="block text-sm font-medium text-stone-700">Télécharger une affiche</label>
  <input
    type="file"
    accept="image/*,.pdf"
    onChange={handleAfficheUpload}
    className="block w-full text-sm text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
  />
        
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

    
<div className="flex flex-wrap gap-4 mb-4"> 
    <div className="flex-1 min-w-[120px]">   {/* Filtre Type */}   {/* Filtre Département */}

    <select
      value={filtre}
      onChange={(e) => setFiltre(e.target.value)}
      className="border border-stone-300 rounded px-3 py-2 w-full bg-amber-100 text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
    >
      <option value="tous">Tous les concours</option>
      <option value="officiel">Officiels</option>
      <option value="ouvert">Ouverts à tous</option>
    </select>
</div>


  <MultiSelectDepartement
  departementFiltre={departementFiltre}
  setDepartementFiltre={setDepartementFiltre}
/>



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
import { Menu } from '@headlessui/react';

function MultiSelectDepartement({ departementFiltre, setDepartementFiltre }) {
  const DEPARTEMENTS = [
    { code: "01", nom: "Ain" },
    { code: "69", nom: "Rhône" },
    { code: "74", nom: "Haute-Savoie" },
    { code: "38", nom: "Isère" }
  ];

  const toggleDepartement = (code) => {
    setDepartementFiltre((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm">
        📍 Départements
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        {DEPARTEMENTS.map((dep) => (
          <Menu.Item key={dep.code}>
            {({ active }) => (
              <div
                className={`flex items-center gap-2 px-4 py-2 ${active ? 'bg-amber-100' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={departementFiltre.includes(dep.code)}
                  onChange={() => toggleDepartement(dep.code)}
                />
                <span>{dep.code} - {dep.nom}</span>
              </div>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}


export default ConcoursApp;
