import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../../utils/firebase.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import TableauTournoi from "./TableauTournoi.js";
import {
  attributionTerrains, champion, classementPoule, composerPoules, melanger, partiesInitialesPoule,
  partiesSuivantesPoule, premierTourFinale, repartitionPoules, tourSuivantFinale
} from "../../lib/tournoi.js";
import { attribuerTerrains, creerParties, enregistrerTirage, supprimerTournoi } from "../../lib/tournoiFirestore.js";

const titre = "text-[15px] font-black uppercase tracking-wider";

// Pointage des équipes, tirage, puis déroulement du concours (réservé à l'organisateur)
export default function GestionTournoi({ concours, tournoi, parties }) {
  if (!tournoi) return <PreparationTirage concours={concours} />;
  return <DeroulementTournoi concours={concours} tournoi={tournoi} parties={parties} />;
}

function PreparationTirage({ concours }) {
  const [inscriptions, setInscriptions] = useState(null);
  const [ajout, setAjout] = useState({ joueurs: "", club: "" });
  const [format, setFormat] = useState("poules");
  const [nbTerrains, setNbTerrains] = useState(8);
  const [pointsGagnants, setPointsGagnants] = useState(13);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "inscriptions"), where("concoursId", "==", concours.id));
    return onSnapshot(
      q,
      (s) => setInscriptions(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))),
      () => setInscriptions([])
    );
  }, [concours.id]);

  const presentes = (inscriptions || []).filter((i) => i.presente);
  const poulesPossibles = !!repartitionPoules(presentes.length);
  const formatEffectif = format === "poules" && !poulesPossibles ? "elimination" : format;

  const basculer = (i) => updateDoc(doc(db, "inscriptions", i.id), { presente: !i.presente });
  const toutPointer = () => (inscriptions || []).filter((i) => !i.presente).forEach(basculer);

  const ajouterSurPlace = async (e) => {
    e.preventDefault();
    const joueurs = ajout.joueurs.split(/[,/\n]/).map((j) => j.trim()).filter(Boolean).slice(0, 4);
    if (!joueurs.length) return;
    await addDoc(collection(db, "inscriptions"), {
      concoursId: concours.id,
      joueurs,
      club: ajout.club.trim(),
      telephone: "",
      email: "",
      uid: null,
      surPlace: true,
      presente: true,
      createdAt: serverTimestamp()
    });
    setAjout({ joueurs: "", club: "" });
  };

  const lancer = async () => {
    if (presentes.length < 2) return setErreur("Il faut au moins 2 équipes présentes.");
    if (!window.confirm(`Lancer le tirage avec ${presentes.length} équipes ? Les équipes ne pourront plus être modifiées.`)) return;
    setErreur("");
    setEnvoi(true);
    try {
      const numeros = melanger(presentes);
      const equipes = numeros.map((i, k) => ({ id: i.id, numero: k + 1, nom: i.joueurs.join(" / "), club: i.club || "", uid: i.uid || null }));
      let poules = [];
      let partiesTirage;
      if (formatEffectif === "poules") {
        poules = composerPoules(equipes);
        partiesTirage = poules.flatMap(partiesInitialesPoule);
      } else {
        partiesTirage = premierTourFinale(equipes.map((e) => e.id), []);
      }
      await enregistrerTirage(concours.id, { format: formatEffectif, nbTerrains: Number(nbTerrains), pointsGagnants: Number(pointsGagnants), equipes, poules, parties: partiesTirage });
    } catch (error) {
      console.error("Tirage:", error);
      setErreur("Le tirage a échoué. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!inscriptions) return <p className="text-ardoise">Chargement des inscriptions…</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className={titre}>Pointage ({presentes.length}/{inscriptions.length} présentes)</h3>
          {inscriptions.some((i) => !i.presente) && <Button size="sm" variant="ghost" onClick={toutPointer}>Tout cocher</Button>}
        </div>
        <p className="text-sm text-ardoise">Cochez les équipes présentes : seules elles participent au tirage.</p>
        {inscriptions.length === 0 && <p className="text-sm text-ardoise">Aucune inscription pour l'instant.</p>}
        <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">
          {inscriptions.map((i) => (
            <li key={i.id}>
              <label className="flex items-start gap-3 py-2 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 accent-navy" checked={!!i.presente} onChange={() => basculer(i)} />
                <span className="min-w-0">
                  <span className="block font-bold">{i.joueurs.join(" / ")}</span>
                  <span className="block text-sm text-ardoise">
                    {[i.club, i.telephone, i.email, i.surPlace && "inscrite sur place", i.uid && "a l'application"].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <form onSubmit={ajouterSurPlace} className="rounded-xl bg-fond p-3 space-y-2">
          <p className="text-sm font-bold">Inscrire une équipe sur place</p>
          <Input className="bg-white" aria-label="Joueurs" placeholder="Joueurs, séparés par des virgules" value={ajout.joueurs} onChange={(e) => setAjout((a) => ({ ...a, joueurs: e.target.value }))} />
          <Input className="bg-white" aria-label="Club" placeholder="Club (facultatif)" value={ajout.club} onChange={(e) => setAjout((a) => ({ ...a, club: e.target.value }))} />
          <Button type="submit" size="sm" variant="navy">Ajouter et pointer</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className={titre}>Tirage</h3>
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold mb-1">Formule</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="format" className="mt-1 accent-navy" checked={format === "poules"} onChange={() => setFormat("poules")} />
            <span>
              <b>Poules puis phase finale</b> : poules de 4 (gagnants, perdants, barrage), 2 qualifiés par poule.
              {!poulesPossibles && presentes.length > 0 && <span className="block text-jaune-texte">Il faut au moins 6 équipes pour faire des poules : élimination directe à la place.</span>}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="format" className="mt-1 accent-navy" checked={format === "elimination"} onChange={() => setFormat("elimination")} />
            <span><b>Élimination directe</b> dès le premier tour.</span>
          </label>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold space-y-1">
            <span className="block">Nombre de terrains</span>
            <Input type="number" min="1" max="200" value={nbTerrains} onChange={(e) => setNbTerrains(e.target.value)} />
          </label>
          <label className="text-sm font-bold space-y-1">
            <span className="block">Parties en</span>
            <select className="w-full h-11 px-3 bg-fond rounded-[10px]" value={pointsGagnants} onChange={(e) => setPointsGagnants(e.target.value)}>
              <option value={13}>13 points</option>
              <option value={11}>11 points</option>
            </select>
          </label>
        </div>
        {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
        <Button className="w-full" disabled={envoi || presentes.length < 2} onClick={lancer}>
          {envoi ? "Tirage…" : `Lancer le tirage (${presentes.length} équipes)`}
        </Button>
      </section>
    </div>
  );
}

function DeroulementTournoi({ concours, tournoi, parties }) {
  const [erreur, setErreur] = useState("");
  const poulesFinies = useMemo(
    () => tournoi.poules.map((poule) => classementPoule(poule, parties.filter((p) => p.phase === "poule" && p.poule === poule.nom))),
    [tournoi.poules, parties]
  );
  const finale = parties.filter((p) => p.phase === "finale");
  const toutesPoulesFinies = tournoi.poules.length > 0 && poulesFinies.every((c) => c.termine);
  const gagnant = champion(finale);

  // Déroulement automatique tant que cet écran est ouvert : tours suivants et terrains libres
  useEffect(() => {
    const aCreer = [];
    tournoi.poules.forEach((poule) => {
      aCreer.push(...partiesSuivantesPoule(poule, parties.filter((p) => p.phase === "poule" && p.poule === poule.nom)));
    });
    aCreer.push(...tourSuivantFinale(finale));
    const champs = gagnant && tournoi.statut !== "termine" ? { statut: "termine" } : null;
    if (aCreer.length || champs) creerParties(concours.id, tournoi, aCreer, champs).catch((e) => setErreur(e.message));
    const terrains = attributionTerrains(parties, tournoi.nbTerrains);
    if (terrains.length) attribuerTerrains(concours.id, terrains).catch((e) => setErreur(e.message));
    // eslint-disable-next-line
  }, [parties, tournoi]);

  const lancerFinale = async () => {
    const origine = {};
    const premiers = [];
    const seconds = [];
    tournoi.poules.forEach((poule, k) => {
      const [p1, p2] = poulesFinies[k].qualifies;
      premiers.push(p1);
      seconds.push(p2);
      origine[p1] = poule.nom;
      origine[p2] = poule.nom;
    });
    await creerParties(concours.id, tournoi, premierTourFinale(premiers, seconds, (id) => origine[id]), { statut: "finale" });
  };

  const annuler = async () => {
    if (!window.confirm("Annuler le tirage ? Toutes les parties et tous les scores seront effacés.")) return;
    await supprimerTournoi(concours.id, parties);
  };

  const aJouer = parties.filter((p) => p.equipeB != null && p.statut !== "validee").length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-fond p-3 text-sm space-y-1">
        <p>
          <b>{tournoi.equipes.length} équipes</b> · {tournoi.format === "poules" ? `${tournoi.poules.length} poules` : "élimination directe"} ·{" "}
          {tournoi.nbTerrains} terrains · parties en {tournoi.pointsGagnants}
        </p>
        <p className="text-ardoise">
          {gagnant ? "Concours terminé." : `${aJouer} partie${aJouer > 1 ? "s" : ""} en cours ou à jouer. `}
          {!gagnant && "Les tours suivants et les terrains libres sont attribués automatiquement tant que cet écran est ouvert."}
        </p>
      </div>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      {toutesPoulesFinies && finale.length === 0 && (
        <Button className="w-full" onClick={lancerFinale}>Lancer la phase finale ({tournoi.poules.length * 2} équipes)</Button>
      )}
      <TableauTournoi concoursId={concours.id} tournoi={tournoi} parties={parties} mode="orga" />
      <Button variant="destructive" size="sm" onClick={annuler}>Annuler le tirage</Button>
    </div>
  );
}
