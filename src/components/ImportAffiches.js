import React, { useRef, useState } from "react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import CommuneFields from "./CommuneFields.js";
import { FORMATS, FORMAT_LABELS } from "../lib/formats.js";
import { formatShort, todayKey } from "../lib/dates.js";
import { compresserAffiche } from "../lib/affiches.js";
import { extraireInfos, lireTexteAffiche } from "../lib/ocrAffiche.js";
import { cleConcours, completerCodesPostaux } from "../lib/importCalendrier.js";
import { extraireImages } from "../lib/importAffiches.js";

const CHAMP_SELECT = "w-full h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";
const DEPARTEMENTS = [
  { code: "74", nom: "Haute-Savoie" },
  { code: "01", nom: "Ain" },
  { code: "", nom: "Autre / plusieurs" }
];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const estComplet = (c) =>
  !!(c.title && c.date && c.lieu && c.ville && /^\d{5}$/.test(c.cp) && c.type && FORMATS.includes(c.format));

// Champs manquants, en clair, pour guider la correction
const manquants = (c) =>
  [
    !c.date && "date",
    !c.lieu && "lieu",
    (!c.ville || !/^\d{5}$/.test(c.cp)) && "ville / code postal",
    !c.type && "type",
    !FORMATS.includes(c.format) && "format"
  ].filter(Boolean);

// Import en masse d'affiches (images ou export .zip d'un groupe WhatsApp), réservé aux admins :
// chaque affiche est lue (OCR), l'admin vérifie la liste puis publie les concours avec leur affiche.
export default function ImportAffiches({ concoursExistants }) {
  const [departement, setDepartement] = useState("74");
  const [brouillons, setBrouillons] = useState([]);
  const [progression, setProgression] = useState(null); // { fait, total }
  const [publication, setPublication] = useState(false);
  const [message, setMessage] = useState(null);
  const arret = useRef(false);

  const modifier = (id, changement) =>
    setBrouillons((liste) => liste.map((b) => (b.id === id ? { ...b, ...changement } : b)));
  const modifierChamps = (id, champs) =>
    setBrouillons((liste) => liste.map((b) => (b.id === id ? { ...b, champs: { ...b.champs, ...champs } } : b)));

  // Doublons : déjà dans l'application, ou deux affiches du même concours dans l'import
  const existants = new Set(concoursExistants.map(cleConcours));
  const statut = (b, liste) => {
    if (!b.champs.date) return {};
    const cle = cleConcours(b.champs);
    const avant = liste.slice(0, liste.indexOf(b)).some((x) => x.lu && x.champs.date && cleConcours(x.champs) === cle);
    return { passe: b.champs.date < todayKey(), doublon: existants.has(cle) || avant };
  };

  // Lit une affiche : compression (≤ 700 Ko, aussi requise par l'OCR gratuit), OCR, extraction
  const lire = async (b) => {
    modifier(b.id, { lu: false, erreur: "" });
    let image = b.image;
    try {
      image = image || (await compresserAffiche(b.fichier));
      modifier(b.id, { image });
    } catch {
      modifier(b.id, { lu: true, erreur: "Image illisible." });
      return;
    }
    let texte = "";
    let erreur = "";
    try {
      texte = await lireTexteAffiche(image);
    } catch (e) {
      erreur = /maximum|limit/i.test(e.message)
        ? "Lecture refusée (trop d'affiches d'un coup) : réessayez dans quelques minutes."
        : "Texte de l'affiche illisible : complétez à la main.";
    }
    const infos = extraireInfos(`${texte}\n${b.legende}`, b.datePublication || new Date());
    const champs = {
      title: infos.title || "Concours de pétanque",
      date: infos.date,
      lieu: infos.lieu,
      ville: infos.ville,
      cp: infos.cp,
      type: infos.type,
      format: infos.format,
      prix: infos.prix
    };
    if (champs.ville && !champs.cp) {
      const [c] = await completerCodesPostaux([{ ...champs, cpApproximatif: true }], departement);
      if (!c.cpApproximatif) Object.assign(champs, { cp: c.cp, ville: c.ville });
    }
    setBrouillons((liste) => {
      const maj = liste.map((x) => (x.id === b.id ? { ...x, champs, erreur, lu: true } : x));
      const courant = maj.find((x) => x.id === b.id);
      const { passe, doublon } = statut(courant, maj);
      return maj.map((x) => (x.id === b.id ? { ...x, choisi: estComplet(champs) && !passe && !doublon } : x));
    });
  };

  const handleFichiers = async (e) => {
    const fichiers = [...e.target.files];
    e.target.value = "";
    if (!fichiers.length) return;
    setMessage(null);
    let images;
    try {
      images = await extraireImages(fichiers);
    } catch (error) {
      console.error("Lecture des fichiers:", error);
      setMessage({ type: "error", text: "Impossible d'ouvrir ce fichier. Pour WhatsApp, choisissez le .zip de l'export." });
      return;
    }
    if (!images.length) {
      setMessage({ type: "error", text: "Aucune image trouvée dans ces fichiers." });
      return;
    }
    const nouveaux = images.map((img, i) => ({
      id: `${Date.now()}-${i}`,
      ...img,
      image: "",
      champs: {},
      lu: false,
      erreur: "",
      choisi: false
    }));
    setBrouillons((liste) => [...liste, ...nouveaux]);
    arret.current = false;
    setProgression({ fait: 0, total: nouveaux.length });
    for (let i = 0; i < nouveaux.length && !arret.current; i++) {
      await lire(nouveaux[i]);
      setProgression({ fait: i + 1, total: nouveaux.length });
      if (i < nouveaux.length - 1) await pause(1500); // l'OCR gratuit limite le rythme
    }
    setProgression(null);
  };

  const aPublier = brouillons.filter((b) => b.choisi && b.lu && estComplet(b.champs));

  const publier = async () => {
    setPublication(true);
    setMessage(null);
    let ok = 0;
    for (const b of aPublier) {
      const { title, date, lieu, ville, cp, type, format, prix } = b.champs;
      const n = parseFloat(String(prix).replace(",", "."));
      // Un envoi par concours : une affiche pèse jusqu'à 700 Ko
      const batch = writeBatch(db);
      const ref = doc(collection(db, "concours"));
      batch.set(ref, {
        title: title.trim(), date, lieu: lieu.trim(), ville: ville.trim(), cp, type, format,
        prix: Number.isFinite(n) && n >= 0 ? n : null,
        clubId: "", clubNom: "",
        valide: true,
        source: "admin",
        ...(b.image ? { affiche: true } : {}),
        createdAt: serverTimestamp()
      });
      if (b.image) batch.set(doc(db, "affiches", ref.id), { image: b.image, createdAt: serverTimestamp() });
      try {
        await batch.commit();
        ok++;
        setBrouillons((liste) => liste.filter((x) => x.id !== b.id));
      } catch (error) {
        console.error("Publication d'une affiche:", error);
        modifier(b.id, { erreur: "Publication refusée : vérifiez les champs." });
      }
    }
    setPublication(false);
    setMessage({ type: ok ? "success" : "error", text: ok ? `✅ ${ok} concours publiés avec leur affiche.` : "Aucun concours publié." });
  };

  const lus = brouillons.filter((b) => b.lu);

  return (
    <div className="border-2 border-bord rounded-xl bg-white p-4 space-y-3">
      <h2 className="text-[15px] font-black uppercase tracking-wider">Importer des affiches</h2>
      <p className="text-sm text-ardoise">
        Choisissez plusieurs affiches (images) d'un coup, ou l'export d'un groupe WhatsApp :
        dans le groupe, menu <b>⋮ → Plus → Exporter la discussion → Inclure les médias</b>, puis
        choisissez le fichier <b>.zip</b> obtenu. Chaque affiche est lue automatiquement : vérifiez
        la liste avant de publier.
      </p>

      <label className="flex items-center gap-2 text-sm">
        Département (pour retrouver les codes postaux) :
        <select value={departement} onChange={(e) => setDepartement(e.target.value)} className="h-10 px-2 bg-fond rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune">
          {DEPARTEMENTS.map((d) => (
            <option key={d.code} value={d.code}>{d.code ? `${d.code} - ${d.nom}` : d.nom}</option>
          ))}
        </select>
      </label>

      <input
        type="file"
        multiple
        accept="image/*,.zip,application/zip"
        aria-label="Affiches ou export WhatsApp"
        onChange={handleFichiers}
        disabled={!!progression || publication}
        className="block w-full text-sm text-ardoise file:mr-3 file:h-10 file:px-4 file:rounded-[10px] file:border-0 file:text-sm file:font-bold file:bg-jaune-clair file:text-navy hover:file:bg-jaune"
      />

      {progression && (
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span>Lecture des affiches… {progression.fait} / {progression.total}</span>
          <Button size="sm" variant="ghost" onClick={() => { arret.current = true; }}>Arrêter</Button>
        </div>
      )}

      {lus.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm">
            <b>{lus.length}</b> affiche(s) lue(s) · <b>{aPublier.length}</b> cochée(s) pour publication.
            Les concours passés, déjà présents ou incomplets ne sont pas cochés.
          </p>
          <ul className="space-y-3">
            {brouillons.map((b) => (
              <Brouillon
                key={b.id}
                b={b}
                {...statut(b, brouillons)}
                onChamps={(champs) => modifierChamps(b.id, champs)}
                onChoisir={(choisi) => modifier(b.id, { choisi })}
                onRelire={() => lire(b)}
                onRetirer={() => setBrouillons((liste) => liste.filter((x) => x.id !== b.id))}
              />
            ))}
          </ul>
          <div className="flex gap-2 sticky bottom-2">
            <Button disabled={!aPublier.length || publication || !!progression} onClick={publier}>
              {publication ? "Publication…" : `Publier ${aPublier.length} concours`}
            </Button>
            <Button variant="ghost" disabled={publication} onClick={() => { arret.current = true; setBrouillons([]); }}>Tout effacer</Button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
      )}
    </div>
  );
}

function Brouillon({ b, passe, doublon, onChamps, onChoisir, onRelire, onRetirer }) {
  const [grande, setGrande] = useState(false);
  const c = b.champs;
  if (!b.lu) {
    return (
      <li className="flex items-center gap-3 rounded-[10px] border-2 border-bord p-2 text-sm text-ardoise">
        {b.image ? <img src={b.image} alt="" className="h-14 w-11 object-cover rounded" /> : <span className="h-14 w-11 rounded bg-fond" />}
        <span>{b.nom} · lecture…</span>
      </li>
    );
  }
  const complet = estComplet(c);
  const alerte = [passe && "concours passé", doublon && "déjà dans l'application", !complet && `à compléter : ${manquants(c).join(", ")}`].filter(Boolean);
  return (
    <li className={`rounded-[10px] border-2 p-3 space-y-2 ${b.choisi ? "border-jaune" : "border-bord"}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setGrande(!grande)} aria-label="Agrandir l'affiche" className="shrink-0">
          {b.image ? <img src={b.image} alt={`Affiche ${b.nom}`} className="h-24 w-[72px] object-cover rounded border-2 border-bord" /> : <span className="block h-24 w-[72px] rounded bg-fond" />}
        </button>
        <div className="flex-1 min-w-0 space-y-1 text-sm">
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" className="w-5 h-5 accent-navy" checked={b.choisi} disabled={!complet} onChange={(e) => onChoisir(e.target.checked)} />
            <span><span className="capitalize">{c.date ? formatShort(c.date) : "Date ?"}</span> · {c.ville || "Ville ?"}</span>
          </label>
          <p className="text-ardoise">{[FORMAT_LABELS[c.format], c.prix && `${c.prix} €`].filter(Boolean).join(" · ")}</p>
          {b.legende && <p className="text-xs text-ardoise italic line-clamp-2" title={b.legende}>« {b.legende} »</p>}
          {alerte.length > 0 && <p className="text-xs font-bold text-jaune-texte">{alerte.join(" · ")}</p>}
          {b.erreur && <p className="text-xs text-red-600">{b.erreur}</p>}
        </div>
      </div>
      {grande && b.image && <img src={b.image} alt={`Affiche ${b.nom} en grand`} className="w-full rounded border-2 border-bord" />}
      <details>
        <summary className="text-sm font-bold cursor-pointer">Vérifier / corriger</summary>
        <div className="space-y-2 pt-2">
          <Input aria-label="Nom du concours" placeholder="Nom du concours" maxLength={120} value={c.title || ""} onChange={(e) => onChamps({ title: e.target.value })} />
          <Input type="date" aria-label="Date" value={c.date || ""} onChange={(e) => onChamps({ date: e.target.value })} />
          <Input aria-label="Lieu" placeholder="Lieu (boulodrome, adresse…)" maxLength={200} value={c.lieu || ""} onChange={(e) => onChamps({ lieu: e.target.value })} />
          <CommuneFields cp={c.cp || ""} ville={c.ville || ""} onChange={({ cp, ville }) => onChamps({ cp, ville })} />
          <select aria-label="Type" className={CHAMP_SELECT} value={c.type || ""} onChange={(e) => onChamps({ type: e.target.value })}>
            <option value="">Type ?</option>
            <option value="officiel">Officiel</option>
            <option value="ouvert">Ouvert à tous</option>
          </select>
          <select aria-label="Format" className={CHAMP_SELECT} value={c.format || ""} onChange={(e) => onChamps({ format: e.target.value })}>
            <option value="">Format ?</option>
            {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
          <Input type="number" min="0" step="0.5" aria-label="Tarif par équipe" placeholder="Tarif par équipe (€)" value={c.prix || ""} onChange={(e) => onChamps({ prix: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onRelire}>Relire l'affiche</Button>
            <Button size="sm" variant="ghost" onClick={onRetirer}>Retirer de la liste</Button>
          </div>
        </div>
      </details>
    </li>
  );
}
