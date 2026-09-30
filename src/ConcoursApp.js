import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import CalendarWithConcours from "./components/ui/CalendarWithConcours.js";
import { Input } from "./components/ui/input.js";
import MapConcours from "./MapConcours.js";
import { db, auth } from "./firebase.js";
import { downloadIcs, formatLong, formatShort, toKey, todayKey } from "./lib/dates.js";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

const TYPE_LABELS = { officiel: "Officiel", ouvert: "Ouvert à tous" };
const EMPTY_FORM = { title: "", date: "", lieu: "", type: "officiel", ville: "", cp: "" };

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

function ConcoursApp() {
  const [flash, setFlash] = useState(null); // { type: "success" | "error", text }
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [afficherPasses, setAfficherPasses] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [concoursList, setConcoursList] = useState([]);
  const [propositions, setPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcours, setSelectedConcours] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [villeOptions, setVilleOptions] = useState([]);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  };

  // Authentification : un utilisateur est admin s'il possède un document admins/{uid}
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "admins", u.uid));
        setIsAdmin(snap.exists());
      } catch {
        setIsAdmin(false);
      }
    });
  }, []);

  // Concours validés (lecture publique)
  useEffect(() => {
    const q = query(collection(db, "concours"), where("valide", "==", true));
    return onSnapshot(
      q,
      (snapshot) => {
        setConcoursList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDate));
        setLoading(false);
      },
      (error) => {
        console.error("Erreur de chargement:", error);
        setLoading(false);
        showFlash("error", "Impossible de charger les concours. Vérifiez votre connexion.");
      }
    );
  }, []);

  // Propositions en attente (admins uniquement)
  useEffect(() => {
    if (!isAdmin) {
      setPropositions([]);
      return;
    }
    const q = query(collection(db, "concours"), where("valide", "==", false));
    return onSnapshot(
      q,
      (snapshot) => setPropositions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDate)),
      (error) => console.error("Erreur propositions:", error)
    );
  }, [isAdmin]);

  const concoursFiltres = useMemo(() => {
    const today = todayKey();
    const terme = recherche.trim().toLowerCase();
    return concoursList.filter((c) => {
      if (selectedDate) {
        if (c.date !== toKey(selectedDate)) return false;
      } else if (!afficherPasses && c.date < today) {
        return false;
      }
      if (filtre !== "tous" && c.type !== filtre) return false;
      if (terme) {
        const texte = `${c.title} ${c.lieu} ${c.ville}`.toLowerCase();
        // "13" trouve tout le département, "13400" le code postal exact
        if (!texte.includes(terme) && !(c.cp || "").startsWith(terme)) return false;
      }
      return true;
    });
  }, [concoursList, selectedDate, afficherPasses, filtre, recherche]);

  const updateForm = (champ, valeur) => setFormData((f) => ({ ...f, [champ]: valeur }));

  const chercherVilles = async (cp) => {
    if (!/^\d{5}$/.test(cp)) return;
    try {
      const res = await fetch(`https://apicarto.ign.fr/api/codes-postaux/communes/${cp}`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      const villes = [...new Set(data.map((v) => v.nomCommune))];
      setVilleOptions(villes);
      if (villes.length) setFormData((f) => ({ ...f, ville: villes[0] }));
    } catch {
      setVilleOptions([]); // on laisse la saisie manuelle de la ville
    }
  };

  const handleAddConcours = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v.trim()]));
    if (Object.values(data).some((v) => !v)) {
      setFormError("Tous les champs sont obligatoires.");
      return;
    }
    if (!/^\d{5}$/.test(data.cp)) {
      setFormError("Le code postal doit contenir 5 chiffres.");
      return;
    }
    if (data.date < todayKey()) {
      setFormError("La date du concours est déjà passée.");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "concours"), {
        ...data,
        valide: false,
        createdAt: serverTimestamp()
      });
      setFormData(EMPTY_FORM);
      setVilleOptions([]);
      setShowForm(false);
      setFormError("");
      showFlash("success", "Concours proposé avec succès ! En attente de validation.");
    } catch (error) {
      console.error("Erreur lors de l'ajout du concours:", error);
      setFormError("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setSending(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, login.email.trim(), login.password);
      setShowLogin(false);
      setLogin({ email: "", password: "" });
    } catch {
      setLoginError("Email ou mot de passe incorrect.");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("❌ Supprimer ce concours ?")) return;
    try {
      await deleteDoc(doc(db, "concours", id));
      if (selectedConcours?.id === id) setSelectedConcours(null);
      showFlash("success", "✅ Concours supprimé avec succès !");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showFlash("error", "La suppression a échoué.");
    }
  };

  const handleValider = async (id) => {
    try {
      await updateDoc(doc(db, "concours", id), { valide: true });
    } catch (error) {
      console.error("Erreur validation:", error);
      showFlash("error", "La validation a échoué.");
    }
  };

  const itineraire = (c) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lieu}, ${c.cp} ${c.ville}`)}`;

  return (
    <div className="min-h-screen bg-amber-50 p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center text-sky-700 mb-4">Concours de Pétanque</h1>

      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "+ Proposer un concours"}
        </Button>

        {!user ? (
          <Button variant="ghost" onClick={() => setShowLogin(!showLogin)}>
            Connexion
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => signOut(auth)}>
            Déconnexion
          </Button>
        )}
      </div>

      {showLogin && !user && (
        <form onSubmit={handleAdminLogin} className="bg-white border p-4 rounded shadow space-y-2">
          <Input
            type="email"
            placeholder="Email admin"
            autoComplete="username"
            value={login.email}
            onChange={(e) => setLogin({ ...login, email: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <div className="flex gap-2">
            <Button type="submit">Se connecter</Button>
            <Button variant="ghost" onClick={() => setShowLogin(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {user && !isAdmin && (
        <p className="text-sm text-center text-stone-600">
          Connecté en tant que {user.email}, mais ce compte n'a pas les droits administrateur.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleAddConcours} className="border p-4 rounded space-y-2 bg-white shadow">
          <Input placeholder="Nom du concours" maxLength={120} value={formData.title} onChange={(e) => updateForm("title", e.target.value)} />
          <Input type="date" min={todayKey()} value={formData.date} onChange={(e) => updateForm("date", e.target.value)} />
          <Input placeholder="Lieu (boulodrome, adresse…)" maxLength={200} value={formData.lieu} onChange={(e) => updateForm("lieu", e.target.value)} />
          <Input
            placeholder="Code postal"
            inputMode="numeric"
            maxLength={5}
            value={formData.cp}
            onChange={(e) => {
              const cp = e.target.value.replace(/\D/g, "");
              updateForm("cp", cp);
              if (cp.length === 5) chercherVilles(cp);
              else setVilleOptions([]);
            }}
          />
          {villeOptions.length > 0 ? (
            <select className="w-full border rounded px-2 py-2" value={formData.ville} onChange={(e) => updateForm("ville", e.target.value)}>
              {villeOptions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <Input placeholder="Ville" maxLength={100} value={formData.ville} onChange={(e) => updateForm("ville", e.target.value)} />
          )}
          <select className="w-full border rounded px-2 py-2" value={formData.type} onChange={(e) => updateForm("type", e.target.value)}>
            <option value="officiel">Officiel</option>
            <option value="ouvert">Ouvert à tous</option>
          </select>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Button type="submit" disabled={sending}>{sending ? "Envoi…" : "Envoyer"}</Button>
        </form>
      )}

      {flash && (
        <div className={`text-sm text-center ${flash.type === "error" ? "text-red-600" : "text-green-600"}`} role="status">
          {flash.text}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          aria-label="Type de concours"
          className="border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <option value="tous">Tous</option>
          <option value="officiel">Officiels</option>
          <option value="ouvert">Ouverts à tous</option>
        </select>
        <Input
          type="search"
          placeholder="Ville, CP ou département"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <CalendarWithConcours
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        concoursList={concoursList}
      />

      <div className="flex justify-between items-center flex-wrap gap-2">
        {selectedDate ? (
          <Button variant="ghost" onClick={() => setSelectedDate(null)}>
            ✕ {formatLong(toKey(selectedDate))}
          </Button>
        ) : (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={afficherPasses} onChange={(e) => setAfficherPasses(e.target.checked)} />
            Afficher les concours passés
          </label>
        )}
        <Button variant="outline" onClick={() => setShowMap(!showMap)}>
          {showMap ? "Masquer la carte" : "Voir sur la carte"}
        </Button>
      </div>

      {showMap && <MapConcours concoursList={concoursFiltres} />}

      <table className="w-full text-sm mt-4 border border-gray-200 rounded overflow-hidden shadow-sm table-fixed">
        <thead className="bg-sky-200 text-sky-800">
          <tr>
            <th className="px-1 py-1 w-[28%] text-left border-b">Date</th>
            <th className="px-1 py-1 text-left border-b">Ville</th>
            <th className="px-1 py-1 w-[22%] text-left border-b">Type</th>
            <th className="px-1 py-1 w-[18%] text-right border-b"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {concoursFiltres.map((concours, index) => (
            <tr
              key={concours.id}
              onClick={() => setSelectedConcours(concours)}
              className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50"} ${
                concours.date < todayKey() ? "text-stone-400" : ""
              } hover:bg-green-100 border-t cursor-pointer`}
            >
              <td className="px-1 py-1 text-left capitalize">{formatShort(concours.date)}</td>
              <td className="px-1 py-1 text-left truncate">{concours.ville}</td>
              <td className="px-1 py-1 text-left">{TYPE_LABELS[concours.type] || concours.type}</td>
              <td className="px-1 py-1 text-right">
                <Button size="sm" variant="ghost">Voir</Button>
              </td>
            </tr>
          ))}
          {!loading && concoursFiltres.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-stone-500 bg-white">
                Aucun concours ne correspond à votre recherche.
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-stone-500 bg-white">Chargement…</td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedConcours && (
        <div className="border p-4 mt-4 rounded shadow bg-white space-y-2">
          <h2 className="text-xl font-bold text-sky-700">{selectedConcours.title}</h2>
          <p className="capitalize">📅 {formatLong(selectedConcours.date)}</p>
          <p>📍 {selectedConcours.lieu}, {selectedConcours.cp} {selectedConcours.ville}</p>
          <p>🏷️ {TYPE_LABELS[selectedConcours.type] || selectedConcours.type}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => downloadIcs(selectedConcours)}>
              🔔 Ajouter à mon agenda
            </Button>
            <a
              href={itineraire(selectedConcours)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl font-semibold px-2 py-1 text-xs border border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              🧭 Itinéraire
            </a>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={() => handleSupprimer(selectedConcours.id)}>
                Supprimer
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedConcours(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <AdminPanel
          propositions={propositions}
          handleValider={handleValider}
          handleSupprimer={handleSupprimer}
        />
      )}
    </div>
  );
}

function AdminPanel({ propositions, handleValider, handleSupprimer }) {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-bold text-sky-700">
        Propositions à valider {propositions.length > 0 && `(${propositions.length})`}
      </h2>
      {propositions.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-600 capitalize">{formatLong(c.date)} - {c.lieu}</p>
            <p className="text-sm">{c.cp} {c.ville}</p>
            <p className="text-sm text-gray-600">{TYPE_LABELS[c.type] || c.type}</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={() => handleValider(c.id)}>Valider</Button>
              <Button variant="destructive" onClick={() => handleSupprimer(c.id)}>Supprimer</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {propositions.length === 0 && (
        <p className="text-sm text-gray-500">Aucune proposition en attente.</p>
      )}
    </div>
  );
}

export default ConcoursApp;
