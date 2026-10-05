import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import CalendarWithConcours from "./components/ui/CalendarWithConcours.js";
import { Input } from "./components/ui/input.js";
import MultiSelectDepartement from "./components/ui/MultiSelectDepartement.js";
import MapConcours from "./MapConcours.js";
import ImportCalendrier from "./components/ImportCalendrier.js";
import CommuneFields from "./components/CommuneFields.js";
import { FORMATS, FORMAT_LABELS } from "./lib/formats.js";
import { db, auth } from "./utils/firebase.js";
import ConnexionForm from "./utils/ConnexionForm.js";
import { extraireInfos, lireAffiche } from "./lib/ocrAffiche.js";
import { ADMIN_UIDS } from "./admins.js";
import { downloadIcs, formatLong, formatShort, toKey, todayKey } from "./lib/dates.js";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const TYPE_LABELS = { officiel: "Officiel", ouvert: "Ouvert à tous" };
const EMPTY_FORM = { title: "", date: "", lieu: "", type: "officiel", format: "", prix: "", ville: "", cp: "" };

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

function ConcoursApp() {
  const [flash, setFlash] = useState(null); // { type: "success" | "error", text }
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [departementFiltre, setDepartementFiltre] = useState([]);
  const [afficherPasses, setAfficherPasses] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [concoursList, setConcoursList] = useState([]);
  const [propositions, setPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcours, setSelectedConcours] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [lectureAffiche, setLectureAffiche] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  };

  // Authentification : admin si l'UID est dans ADMIN_UIDS ou si le compte a le droit "admin"
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        return;
      }
      if (ADMIN_UIDS.includes(u.uid)) {
        setIsAdmin(true);
        return;
      }
      try {
        const token = await u.getIdTokenResult();
        setIsAdmin(token.claims.admin === true);
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
      if (departementFiltre.length > 0 && !departementFiltre.some((dep) => (c.cp || "").startsWith(dep))) return false;
      if (terme) {
        const texte = `${c.title} ${c.lieu} ${c.ville}`.toLowerCase();
        // "13" trouve tout le département, "13400" le code postal exact
        if (!texte.includes(terme) && !(c.cp || "").startsWith(terme)) return false;
      }
      return true;
    });
  }, [concoursList, selectedDate, afficherPasses, filtre, departementFiltre, recherche]);

  const updateForm = (champ, valeur) => setFormData((f) => ({ ...f, [champ]: valeur }));

  // Remplit les champs vides ou reconnus à partir des infos d'une affiche
  const appliquerInfos = (infos) => {
    setFormData((f) => ({
      ...f,
      title: infos.title || f.title,
      date: infos.date || f.date,
      ville: infos.ville || f.ville,
      cp: infos.cp || f.cp,
      format: infos.format || f.format,
      prix: infos.prix || f.prix,
      type: infos.type || f.type
    }));
  };

  const traiterAffiche = async (file) => {
    setLectureAffiche(true);
    setFormError("");
    try {
      appliquerInfos(await lireAffiche(file));
      showFlash("success", "✅ Champs remplis depuis l'affiche : vérifiez-les avant d'envoyer.");
    } catch (error) {
      console.error("Lecture de l'affiche:", error);
      setFormError("Impossible de lire l'affiche. Remplissez les champs à la main.");
    } finally {
      setLectureAffiche(false);
    }
  };

  const handleAfficheUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) traiterAffiche(file);
  };

  // Affiche partagée depuis une autre application (Android) : le service
  // worker l'a déposée dans le cache "partage" puis a ouvert /?partage=1
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("partage")) return;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        const cache = await caches.open("partage");
        const [repAffiche, repTexte] = await Promise.all([cache.match("/partage/affiche"), cache.match("/partage/texte")]);
        await Promise.all([cache.delete("/partage/affiche"), cache.delete("/partage/texte")]);
        setShowForm(true);
        const texte = repTexte ? await repTexte.text() : "";
        if (texte) appliquerInfos(extraireInfos(texte));
        if (repAffiche) {
          const blob = await repAffiche.blob();
          await traiterAffiche(new File([blob], "affiche", { type: blob.type }));
        } else {
          setFormError(
            "Seul un lien a été partagé, pas l'image. Dans Facebook, ouvrez l'affiche, enregistrez-la, " +
              "puis partagez-la depuis votre galerie photo."
          );
        }
      } catch (error) {
        console.error("Partage:", error);
      }
    })();
    // À faire une seule fois, au chargement de la page
  }, []);

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
    const prix = Number(data.prix.replace(",", "."));
    if (!Number.isFinite(prix) || prix < 0 || prix > 10000) {
      setFormError("Le tarif doit être un nombre positif.");
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
        prix,
        // Un concours ajouté par un admin est publié directement
        valide: isAdmin,
        ...(isAdmin ? { source: "admin" } : {}),
        createdAt: serverTimestamp()
      });
      setFormData(EMPTY_FORM);
      setShowForm(false);
      setFormError("");
      showFlash("success", isAdmin ? "Concours publié !" : "Concours proposé avec succès ! En attente de validation.");
    } catch (error) {
      console.error("Erreur lors de l'ajout du concours:", error);
      setFormError("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setSending(false);
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
      <div className="mb-4">
        <h1 className="text-4xl font-extrabold text-center text-yellow-700 uppercase tracking-wide drop-shadow-md">
          Concours Pétanque
        </h1>
        <p className="text-center text-sm text-gray-600 italic mt-1">
          Calendrier & inscriptions faciles
        </p>
      </div>

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
        <ConnexionForm onSuccess={() => setShowLogin(false)} onCancel={() => setShowLogin(false)} />
      )}

      {user && (
        <p className="text-sm text-center text-stone-600">
          Connecté : {user.email}{isAdmin && " (admin)"}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleAddConcours} className="border p-4 rounded space-y-2 bg-white shadow">
          <label className="block text-sm font-medium text-stone-700">
            Télécharger une affiche <span className="font-normal text-stone-500">(remplit le formulaire automatiquement)</span>
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleAfficheUpload}
            disabled={lectureAffiche}
            className="block w-full text-sm text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
          />
          {lectureAffiche && <p className="text-sm text-sky-700">Lecture de l'affiche…</p>}
          <Input placeholder="Nom du concours" maxLength={120} value={formData.title} onChange={(e) => updateForm("title", e.target.value)} />
          <Input type="date" min={todayKey()} value={formData.date} onChange={(e) => updateForm("date", e.target.value)} />
          <Input placeholder="Lieu (boulodrome, adresse…)" maxLength={200} value={formData.lieu} onChange={(e) => updateForm("lieu", e.target.value)} />
          <CommuneFields
            cp={formData.cp}
            ville={formData.ville}
            onChange={({ cp, ville }) => setFormData((f) => ({ ...f, cp, ville }))}
          />
          <select className="w-full border rounded px-2 py-2" value={formData.format} onChange={(e) => updateForm("format", e.target.value)}>
            <option value="">-- Format du concours (ex : doublette) --</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
          <Input
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            placeholder="Tarif par équipe (€)"
            value={formData.prix}
            onChange={(e) => updateForm("prix", e.target.value)}
          />
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
          className="flex-1 border border-stone-300 rounded px-3 py-2 bg-amber-100 text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <option value="tous">Tous</option>
          <option value="officiel">Officiels</option>
          <option value="ouvert">Ouverts à tous</option>
        </select>
        <MultiSelectDepartement
          departementFiltre={departementFiltre}
          setDepartementFiltre={setDepartementFiltre}
        />
      </div>
      <Input
        type="search"
        placeholder="Rechercher : ville, code postal, nom…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

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
          <p>🏷️ {TYPE_LABELS[selectedConcours.type] || selectedConcours.type}
            {selectedConcours.format && ` · ${FORMAT_LABELS[selectedConcours.format] || selectedConcours.format}`}
          </p>
          {selectedConcours.prix != null && selectedConcours.prix !== "" && (
            <p>💶 {selectedConcours.prix} € par équipe</p>
          )}
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
          concoursList={concoursList}
          handleValider={handleValider}
          handleSupprimer={handleSupprimer}
        />
      )}
    </div>
  );
}

function AdminPanel({ propositions, concoursList, handleValider, handleSupprimer }) {
  return (
    <div className="mt-8 space-y-4">
      <ImportCalendrier concoursExistants={[...concoursList, ...propositions]} />

      <h2 className="text-lg font-bold text-sky-700">
        Propositions à valider {propositions.length > 0 && `(${propositions.length})`}
      </h2>
      {propositions.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-600 capitalize">{formatLong(c.date)} - {c.lieu}</p>
            <p className="text-sm">{c.cp} {c.ville}</p>
            <p className="text-sm text-gray-600">
              {TYPE_LABELS[c.type] || c.type}
              {c.format && ` · ${FORMAT_LABELS[c.format] || c.format}`}
              {c.prix != null && c.prix !== "" && ` · ${c.prix} €`}
            </p>
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
