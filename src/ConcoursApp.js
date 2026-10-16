import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import CalendarWithConcours from "./components/ui/CalendarWithConcours.js";
import { Input } from "./components/ui/input.js";
import MultiSelectDepartement from "./components/ui/MultiSelectDepartement.js";
import MapConcours from "./MapConcours.js";
import ImportCalendrier from "./components/ImportCalendrier.js";
import CommuneFields from "./components/CommuneFields.js";
import AfficheConcours from "./components/AfficheConcours.js";
import InscriptionForm from "./components/InscriptionForm.js";
import InscriptionsAdmin from "./components/InscriptionsAdmin.js";
import EspaceContributeur from "./components/EspaceContributeur.js";
import GestionContributeurs from "./components/GestionContributeurs.js";
import AchatCredits, { PAIEMENT_ACTIF } from "./components/AchatCredits.js";
import EcranTournoi from "./components/tournoi/EcranTournoi.js";
import MonClub, { useProfil } from "./components/MonClub.js";
import ChoixClub from "./components/ChoixClub.js";
import { AFFILIATION_VIDE, erreurAffiliation, useClubs } from "./lib/clubs.js";
import GestionClubs from "./components/GestionClubs.js";
import { compresserAffiche } from "./lib/affiches.js";
import { EMAIL_VALIDE, FORMATS, FORMAT_LABELS } from "./lib/formats.js";
import { db, auth } from "./utils/firebase.js";
import ConnexionForm from "./utils/ConnexionForm.js";
import { extraireInfos, lireAffiche } from "./lib/ocrAffiche.js";
import { ADMIN_UIDS } from "./admins.js";
import { dateBloc, downloadIcs, formatLong, toKey, todayKey } from "./lib/dates.js";
import {
  IconBell, IconBoule, IconCalendar, IconEuro, IconList, IconLogout, IconMap, IconPin, IconPlus, IconRoute, IconSearch, IconTag, IconUser, IconX
} from "./components/ui/icons.js";

import {
  collection,
  updateDoc,
  doc,
  writeBatch,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const TYPE_LABELS = { officiel: "Officiel", ouvert: "Ouvert à tous" };
const FILTRES_TYPE = [
  { valeur: "tous", label: "Tous" },
  { valeur: "officiel", label: "Officiels" },
  { valeur: "ouvert", label: "Ouverts à tous" }
];
const CHAMP_SELECT = "w-full h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";

function BadgeType({ type }) {
  const style = type === "officiel" ? "bg-navy text-white" : "bg-jaune-clair text-jaune-texte";
  return (
    <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

const aUnPrix = (c) => c.prix != null && c.prix !== "";

const normaliser = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// Concours organisé par le club de la personne (même club de la liste, ou même nom)
const estDuClub = (c, profil) =>
  (profil.clubId && c.clubId === profil.clubId) || (!!c.clubNom && normaliser(c.clubNom) === normaliser(profil.clubNom));
const EMPTY_FORM = { title: "", date: "", lieu: "", type: "officiel", format: "", prix: "", ville: "", cp: "", email: "" };

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
  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);
  const [achatOuvert, setAchatOuvert] = useState(false);
  const [ecranTournoi, setEcranTournoi] = useState(null); // { concours, gestion }
  const [monClubOuvert, setMonClubOuvert] = useState(false);
  const [clubOrga, setClubOrga] = useState({ ...AFFILIATION_VIDE, affilie: true });
  const [filtreMonClub, setFiltreMonClub] = useState(false);
  const clubs = useClubs();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [lectureAffiche, setLectureAffiche] = useState(false);
  const [afficheFichier, setAfficheFichier] = useState(null);
  const [afficheApercu, setAfficheApercu] = useState("");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contributeur, setContributeur] = useState(null); // document contributeurs/{uid}, ou null
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

  // Retour de la page de paiement Stripe
  useEffect(() => {
    const paiement = new URLSearchParams(window.location.search).get("paiement");
    if (!paiement) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (paiement === "ok") showFlash("success", "Paiement reçu, merci ! Vos crédits apparaissent dans quelques secondes.");
    else showFlash("error", "Paiement annulé : aucun montant n'a été débité.");
  }, []);

  // Compte contributeur de la personne connectée (crédits, accès illimité)
  useEffect(() => {
    if (!user) {
      setContributeur(null);
      return;
    }
    return onSnapshot(
      doc(db, "contributeurs", user.uid),
      (snap) => setContributeur(snap.exists() ? snap.data() : null),
      () => setContributeur(null)
    );
  }, [user]);

  const { profil, charge: profilCharge } = useProfil(user);

  // Profil minimal créé à la première connexion (le compte apparaît alors dans la liste des utilisateurs de l'admin)
  useEffect(() => {
    if (!user || !profilCharge || profil) return;
    setDoc(doc(db, "utilisateurs", user.uid), {
      email: user.email || "",
      affilie: false,
      departement: "",
      clubId: "",
      clubNom: "",
      clubAVerifier: false,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch((e) => console.error("Profil:", e));
  }, [user, profil, profilCharge]);

  // Publier : admin, ou contributeur avec un accès illimité ou au moins 1 crédit
  const peutPublier = isAdmin || (!!contributeur && (contributeur.illimite || (contributeur.credits || 0) > 0));

  // Le club du compte sert par défaut de club organisateur
  useEffect(() => {
    if (showForm && profil?.affilie) {
      setClubOrga((c) =>
        c.clubId ? c : { affilie: true, departement: profil.departement || AFFILIATION_VIDE.departement, clubId: profil.clubId || "autre", clubAutre: profil.clubId ? "" : profil.clubNom || "" }
      );
    }
  }, [showForm, profil]);

  // L'e-mail du compte sert par défaut d'e-mail organisateur
  useEffect(() => {
    if (showForm && user?.email) setFormData((f) => (f.email ? f : { ...f, email: user.email }));
  }, [showForm, user]);

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
      if (filtreMonClub && profil?.affilie && !estDuClub(c, profil)) return false;
      if (terme) {
        const texte = `${c.title} ${c.lieu} ${c.ville}`.toLowerCase();
        // "13" trouve tout le département, "13400" le code postal exact
        if (!texte.includes(terme) && !(c.cp || "").startsWith(terme)) return false;
      }
      return true;
    });
  }, [concoursList, selectedDate, afficherPasses, filtre, departementFiltre, recherche, filtreMonClub, profil]);

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

  const choisirAffiche = (file) => {
    if (afficheApercu) URL.revokeObjectURL(afficheApercu);
    // Seules les images sont conservées ; un PDF sert uniquement à remplir le formulaire
    const estImage = file?.type.startsWith("image/");
    setAfficheFichier(estImage ? file : null);
    setAfficheApercu(estImage ? URL.createObjectURL(file) : "");
  };

  const traiterAffiche = async (file) => {
    choisirAffiche(file);
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
    const { email, ...data } = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v.trim()]));
    if (Object.values(data).some((v) => !v)) {
      setFormError("Tous les champs sont obligatoires.");
      return;
    }
    // L'e-mail de l'organisateur reçoit les inscriptions ; facultatif pour un admin
    if (!email && !isAdmin) {
      setFormError("Indiquez votre e-mail pour recevoir les inscriptions.");
      return;
    }
    if (email && !EMAIL_VALIDE.test(email)) {
      setFormError("L'adresse e-mail n'est pas valide.");
      return;
    }
    if (!/^\d{5}$/.test(data.cp)) {
      setFormError("Le code postal doit contenir 5 chiffres.");
      return;
    }
    // Un concours officiel est organisé par un club
    const officiel = data.type === "officiel";
    if (officiel && erreurAffiliation(clubOrga)) {
      setFormError(clubOrga.clubId ? "Indiquez le nom du club organisateur." : "Choisissez le club organisateur.");
      return;
    }
    const clubChoisi = officiel && clubOrga.clubId !== "autre" ? (clubs || []).find((c) => c.id === clubOrga.clubId) : null;
    const club = officiel ? { clubId: clubChoisi ? clubChoisi.id : "", clubNom: clubChoisi ? clubChoisi.nom : clubOrga.clubAutre.trim() } : {};
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
      let image = null;
      if (afficheFichier) {
        try {
          image = await compresserAffiche(afficheFichier);
        } catch (error) {
          console.error("Compression de l'affiche:", error);
          setFormError("Impossible d'enregistrer cette affiche. Retirez-la ou choisissez une autre image.");
          return;
        }
      }
      if (!peutPublier) {
        setFormError("Votre compte ne permet pas de publier.");
        return;
      }
      // Concours et affiche sont écrits ensemble (même identifiant)
      const batch = writeBatch(db);
      const ref = doc(collection(db, "concours"));
      batch.set(ref, {
        ...data,
        ...club,
        prix,
        // Admins et contributeurs publient directement
        valide: true,
        source: isAdmin ? "admin" : "contributeur",
        ...(isAdmin ? {} : { auteur: user.uid }),
        ...(image ? { affiche: true } : {}),
        ...(email ? { inscriptions: true } : {}),
        createdAt: serverTimestamp()
      });
      // L'e-mail reste privé : document séparé, lisible seulement par les admins et le serveur
      if (email) batch.set(doc(db, "contacts", ref.id), { email, createdAt: serverTimestamp() });
      if (image) batch.set(doc(db, "affiches", ref.id), { image, createdAt: serverTimestamp() });
      // Un contributeur sans accès illimité utilise 1 crédit (vérifié par les règles Firestore)
      if (!isAdmin && !contributeur.illimite) {
        batch.update(doc(db, "contributeurs", user.uid), {
          credits: contributeur.credits - 1,
          dernierConcours: ref.id,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      setFormData(EMPTY_FORM);
      choisirAffiche(null);
      setShowForm(false);
      setFormError("");
      showFlash("success", "Concours publié !");
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
      const batch = writeBatch(db);
      batch.delete(doc(db, "concours", id));
      batch.delete(doc(db, "affiches", id));
      batch.delete(doc(db, "contacts", id));
      const inscrits = await getDocs(query(collection(db, "inscriptions"), where("concoursId", "==", id)));
      inscrits.forEach((d) => batch.delete(d.ref));
      await batch.commit();
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

  useEffect(() => setInscriptionOuverte(false), [selectedConcours?.id]);

  // Échap ferme la fiche du concours
  useEffect(() => {
    if (!selectedConcours || ecranTournoi) return;
    const fermer = (e) => e.key === "Escape" && setSelectedConcours(null);
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [selectedConcours, ecranTournoi]);

  const boutonHeader = "w-11 h-11 shrink-0 rounded-[10px] border-[1.5px] border-navy-line flex items-center justify-center hover:bg-navy-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-jaune";

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white">
      <header className="bg-navy text-white px-5 pt-6 pb-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-jaune text-navy flex items-center justify-center">
              <IconBoule size={22} />
            </div>
            <div>
              <h1 className="text-[22px] leading-none font-black uppercase tracking-wide">Concours Pétanque</h1>
              <p className="text-[13px] text-navy-soft mt-1">Calendrier &amp; inscriptions faciles</p>
            </div>
          </div>
          {!user ? (
            <button type="button" aria-label="Connexion" title="Connexion" onClick={() => setShowLogin(!showLogin)} className={boutonHeader}>
              <IconUser />
            </button>
          ) : (
            <button type="button" aria-label="Déconnexion" title="Déconnexion" onClick={() => signOut(auth)} className={boutonHeader}>
              <IconLogout />
            </button>
          )}
        </div>
        {user && (
          <p className="text-[13px] text-navy-soft">
            Connecté : {user.email}
            {isAdmin
              ? " · admin"
              : contributeur && (contributeur.illimite ? " · contributeur" : ` · ${contributeur.credits || 0} crédit${(contributeur.credits || 0) > 1 ? "s" : ""}`)}
            {" · "}
            <button type="button" className="underline decoration-jaune underline-offset-2 text-white" onClick={() => setMonClubOuvert(!monClubOuvert)}>
              {profil?.affilie ? profil.clubNom : "Indiquer mon club"}
            </button>
          </p>
        )}
        {user && monClubOuvert && <MonClub user={user} profil={profil} onFermer={() => setMonClubOuvert(false)} />}
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="w-full h-[50px] rounded-[10px] bg-jaune text-navy font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-jaune-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {showForm ? <IconX size={18} /> : <IconPlus size={18} />}
          {showForm ? "Annuler" : "Publier un concours"}
        </button>
      </header>

      <nav className="flex border-b-2 border-bord" aria-label="Type de concours">
        {FILTRES_TYPE.map((f) => (
          <button
            key={f.valeur}
            type="button"
            aria-pressed={filtre === f.valeur}
            onClick={() => setFiltre(f.valeur)}
            className={`flex-1 h-12 -mb-[2px] text-sm border-y-[3px] border-t-transparent ${
              filtre === f.valeur ? "border-b-jaune font-bold text-navy" : "border-b-transparent font-semibold text-ardoise hover:text-navy"
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <main className="px-5 py-4 space-y-4">
        {showLogin && !user && (
          <ConnexionForm onSuccess={() => setShowLogin(false)} onCancel={() => setShowLogin(false)} />
        )}

        {showForm && !peutPublier && (
          <EspaceContributeur
            user={user}
            contributeur={contributeur}
            onConnexion={() => {
              setShowForm(false);
              setShowLogin(true);
            }}
          />
        )}

        {showForm && peutPublier && (
          <form onSubmit={handleAddConcours} className="bg-white border-2 border-bord rounded-xl p-4 space-y-3">
            <h2 className="text-[15px] font-black uppercase tracking-wider">Publier un concours</h2>
            {!isAdmin && contributeur && !contributeur.illimite && (
              <div className="rounded-[10px] bg-fond px-3 py-2 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <b>{contributeur.credits}</b> crédit{contributeur.credits > 1 ? "s" : ""} restant{contributeur.credits > 1 ? "s" : ""} · cette publication en utilise 1
                  </span>
                  {PAIEMENT_ACTIF && (
                    <Button size="sm" variant="ghost" onClick={() => setAchatOuvert(!achatOuvert)}>
                      {achatOuvert ? "Fermer" : "Acheter"}
                    </Button>
                  )}
                </div>
                {achatOuvert && <AchatCredits />}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="affiche" className="block text-sm font-bold">
                Affiche <span className="font-normal text-ardoise">(remplit le formulaire automatiquement)</span>
              </label>
              <input
                id="affiche"
                type="file"
                accept="image/*,.pdf"
                onChange={handleAfficheUpload}
                disabled={lectureAffiche}
                className="block w-full text-sm text-ardoise file:mr-3 file:h-10 file:px-4 file:rounded-[10px] file:border-0 file:text-sm file:font-bold file:bg-jaune-clair file:text-navy hover:file:bg-jaune"
              />
            </div>
            {lectureAffiche && <p className="text-sm font-semibold">Lecture de l'affiche…</p>}
            {afficheApercu && (
              <div className="flex items-start gap-3">
                <img src={afficheApercu} alt="Affiche choisie" className="h-28 rounded-lg border-2 border-bord" />
                <div className="text-sm text-ardoise space-y-1">
                  <p>L'affiche sera enregistrée avec le concours.</p>
                  <Button variant="ghost" size="sm" onClick={() => choisirAffiche(null)}>Retirer l'affiche</Button>
                </div>
              </div>
            )}
            <Input placeholder="Nom du concours" aria-label="Nom du concours" maxLength={120} value={formData.title} onChange={(e) => updateForm("title", e.target.value)} />
            <Input type="date" aria-label="Date" min={todayKey()} value={formData.date} onChange={(e) => updateForm("date", e.target.value)} />
            <Input placeholder="Lieu (boulodrome, adresse…)" aria-label="Lieu" maxLength={200} value={formData.lieu} onChange={(e) => updateForm("lieu", e.target.value)} />
            <CommuneFields
              cp={formData.cp}
              ville={formData.ville}
              onChange={({ cp, ville }) => setFormData((f) => ({ ...f, cp, ville }))}
            />
            <select aria-label="Format" className={CHAMP_SELECT} value={formData.format} onChange={(e) => updateForm("format", e.target.value)}>
              <option value="">Format (ex : doublette)</option>
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
              aria-label="Tarif par équipe"
              value={formData.prix}
              onChange={(e) => updateForm("prix", e.target.value)}
            />
            <div className="space-y-1">
              <Input
                type="email"
                aria-label="E-mail de l'organisateur"
                placeholder={isAdmin ? "E-mail de l'organisateur (facultatif)" : "E-mail de l'organisateur (reçoit les inscriptions)"}
                autoComplete="email"
                maxLength={200}
                value={formData.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />
              <p className="text-xs text-ardoise">Jamais affiché sur le site. Vous recevrez un e-mail à chaque inscription.</p>
            </div>
            <select aria-label="Type" className={CHAMP_SELECT} value={formData.type} onChange={(e) => updateForm("type", e.target.value)}>
              <option value="officiel">Officiel</option>
              <option value="ouvert">Ouvert à tous</option>
            </select>
            {formData.type === "officiel" && (
              <ChoixClub valeur={clubOrga} onChange={setClubOrga} question={false} legende="Club organisateur" />
            )}
            {formError && <p className="text-red-700 text-sm font-semibold">{formError}</p>}
            <Button type="submit" disabled={sending} className="w-full">{sending ? "Envoi…" : "Envoyer"}</Button>
          </form>
        )}

        {flash && (
          <div
            role="status"
            className={`text-sm font-semibold rounded-[10px] px-3 py-2 ${flash.type === "error" ? "bg-red-50 text-red-800" : "bg-jaune-clair text-navy"}`}
          >
            {flash.text}
          </div>
        )}

        <div className="flex gap-2">
          <label className="flex-1 h-11 flex items-center gap-2 px-3 bg-fond rounded-[10px] text-ardoise border-2 border-transparent focus-within:border-jaune">
            <IconSearch size={18} />
            <input
              type="search"
              aria-label="Rechercher"
              placeholder="Ville, code postal, nom…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-transparent text-navy placeholder:text-ardoise focus:outline-none"
            />
          </label>
          <button
            type="button"
            aria-label={showMap ? "Afficher la liste" : "Voir sur la carte"}
            title={showMap ? "Afficher la liste" : "Voir sur la carte"}
            aria-pressed={showMap}
            onClick={() => setShowMap(!showMap)}
            className={`w-11 h-11 shrink-0 rounded-[10px] flex items-center justify-center ${showMap ? "bg-navy text-white" : "bg-fond text-navy hover:bg-bord"}`}
          >
            {showMap ? <IconList /> : <IconMap />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <MultiSelectDepartement
            departementFiltre={departementFiltre}
            setDepartementFiltre={setDepartementFiltre}
          />
          {profil?.affilie && (
            <button
              type="button"
              aria-pressed={filtreMonClub}
              onClick={() => setFiltreMonClub(!filtreMonClub)}
              className={`h-11 px-4 rounded-[10px] text-sm font-bold max-w-full truncate ${filtreMonClub ? "bg-navy text-white" : "bg-fond text-navy hover:bg-bord"}`}
              title={`Concours organisés par ${profil.clubNom}`}
            >
              Mon club · {profil.clubNom}
            </button>
          )}
        </div>

        <CalendarWithConcours
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          concoursList={concoursList}
        />

        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-[15px] font-black uppercase tracking-wider">
            {selectedDate ? <span className="capitalize">{formatLong(toKey(selectedDate))}</span> : "Concours à venir"}
          </h2>
          {selectedDate ? (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
              <IconX size={16} /> Toutes les dates
            </Button>
          ) : (
            <label className="flex items-center gap-2 text-sm text-ardoise">
              <input type="checkbox" className="w-4 h-4 accent-navy" checked={afficherPasses} onChange={(e) => setAfficherPasses(e.target.checked)} />
              Concours passés
            </label>
          )}
        </div>

        {showMap && <MapConcours concoursList={concoursFiltres} />}

        <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">
          {concoursFiltres.map((concours) => {
            const bloc = dateBloc(concours.date);
            return (
              <li key={concours.id}>
                <button
                  type="button"
                  onClick={() => setSelectedConcours(concours)}
                  className={`w-full flex items-center gap-3 py-3 text-left hover:bg-fond focus:outline-none focus-visible:bg-fond ${
                    concours.date < todayKey() ? "opacity-60" : ""
                  }`}
                >
                  <div className="w-[50px] h-[54px] shrink-0 rounded-lg bg-navy text-white flex flex-col items-center justify-center">
                    <span className="text-xl font-black leading-none">{bloc.num}</span>
                    <span className="text-[11px] font-bold text-jaune">{bloc.mois}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-bold truncate">{concours.ville}</p>
                    <p className="text-[13px] text-ardoise truncate">
                      {[bloc.jour, FORMAT_LABELS[concours.format] || concours.format, concours.clubNom || concours.lieu].filter(Boolean).join(" · ")}
                    </p>
                    <BadgeType type={concours.type} />
                  </div>
                  {aUnPrix(concours) && <span className="font-black shrink-0">{concours.prix} €</span>}
                </button>
              </li>
            );
          })}
          {!loading && concoursFiltres.length === 0 && (
            <li className="py-6 text-center text-ardoise">Aucun concours ne correspond à votre recherche.</li>
          )}
          {loading && <li className="py-6 text-center text-ardoise">Chargement…</li>}
        </ul>

        {isAdmin && (
          <AdminPanel
            propositions={propositions}
            concoursList={concoursList}
            handleValider={handleValider}
            handleSupprimer={handleSupprimer}
          />
        )}
      </main>

      {ecranTournoi && (
        <EcranTournoi
          concours={ecranTournoi.concours}
          gestion={ecranTournoi.gestion}
          uid={user?.uid || null}
          onFermer={() => setEcranTournoi(null)}
        />
      )}

      {selectedConcours && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end justify-center" onClick={() => setSelectedConcours(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-concours"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <BadgeType type={selectedConcours.type} />
                <h2 id="titre-concours" className="text-xl font-black leading-tight">{selectedConcours.title}</h2>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setSelectedConcours(null)}
                className="w-11 h-11 shrink-0 rounded-[10px] bg-fond flex items-center justify-center hover:bg-bord"
              >
                <IconX />
              </button>
            </div>
            <ul className="space-y-2">
              <li className="flex gap-3"><IconCalendar className="shrink-0 text-ardoise" /><span className="capitalize">{formatLong(selectedConcours.date)}</span></li>
              <li className="flex gap-3"><IconPin className="shrink-0 text-ardoise" /><span>{selectedConcours.lieu}, {selectedConcours.cp} {selectedConcours.ville}</span></li>
              {selectedConcours.format && (
                <li className="flex gap-3"><IconTag className="shrink-0 text-ardoise" /><span>{FORMAT_LABELS[selectedConcours.format] || selectedConcours.format}</span></li>
              )}
              {selectedConcours.clubNom && (
                <li className="flex gap-3"><IconBoule className="shrink-0 text-ardoise" /><span>Organisé par <b>{selectedConcours.clubNom}</b></span></li>
              )}
              {aUnPrix(selectedConcours) && (
                <li className="flex gap-3"><IconEuro className="shrink-0 text-ardoise" /><span>{selectedConcours.prix} € par équipe</span></li>
              )}
            </ul>
            <AfficheConcours concours={selectedConcours} />
            {selectedConcours.inscriptions && selectedConcours.date >= todayKey() && (
              inscriptionOuverte ? (
                <InscriptionForm concours={selectedConcours} user={user} clubParDefaut={profil?.affilie ? profil.clubNom : ""} onTermine={() => setInscriptionOuverte(false)} />
              ) : (
                <Button className="w-full" onClick={() => setInscriptionOuverte(true)}>S'inscrire à ce concours</Button>
              )
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="navy" onClick={() => downloadIcs(selectedConcours)}>
                <IconBell size={18} /> Agenda
              </Button>
              <a
                href={itineraire(selectedConcours)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] text-sm font-bold bg-jaune text-navy hover:bg-jaune-dark"
              >
                <IconRoute size={18} /> Itinéraire
              </a>
            </div>
            {selectedConcours.inscriptions && (
              <Button variant="navy" className="w-full" onClick={() => setEcranTournoi({ concours: selectedConcours, gestion: false })}>
                Suivre le concours · poules, terrains, scores
              </Button>
            )}
            {(isAdmin || (user && selectedConcours.auteur === user.uid)) && (
              <Button variant="outline" className="w-full" onClick={() => setEcranTournoi({ concours: selectedConcours, gestion: true })}>
                Gérer le concours · équipes, pointage, tirage
              </Button>
            )}
            {(isAdmin || (user && selectedConcours.auteur === user.uid)) && selectedConcours.inscriptions && (
              <InscriptionsAdmin concoursId={selectedConcours.id} />
            )}
            {(isAdmin || (user && selectedConcours.auteur === user.uid)) && (
              <Button variant="destructive" className="w-full" onClick={() => handleSupprimer(selectedConcours.id)}>
                Supprimer ce concours
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ propositions, concoursList, handleValider, handleSupprimer }) {
  return (
    <section className="pt-4 space-y-4" aria-label="Administration">
      <GestionContributeurs />

      <GestionClubs />

      <ImportCalendrier concoursExistants={[...concoursList, ...propositions]} />

      <h2 className="text-[15px] font-black uppercase tracking-wider">
        Anciennes propositions à valider {propositions.length > 0 && `(${propositions.length})`}
      </h2>
      {propositions.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-2">
            <BadgeType type={c.type} />
            <h3 className="font-bold">{c.title}</h3>
            <p className="text-sm text-ardoise capitalize">{formatLong(c.date)} · {c.lieu}</p>
            <p className="text-sm">{c.cp} {c.ville}</p>
            <p className="text-sm text-ardoise">
              {[FORMAT_LABELS[c.format] || c.format, aUnPrix(c) && `${c.prix} €`].filter(Boolean).join(" · ")}
            </p>
            <AfficheConcours concours={c} />
            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleValider(c.id)}>Valider</Button>
              <Button variant="destructive" onClick={() => handleSupprimer(c.id)}>Supprimer</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {propositions.length === 0 && (
        <p className="text-sm text-ardoise">Aucune proposition en attente.</p>
      )}
    </section>
  );
}

export default ConcoursApp;
