import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../utils/firebase.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import TableauTournoi from "./TableauTournoi.js";
import {
  attributionTerrains, champion, classementPoule, composerPoules, melanger, partiesInitialesPoule,
  partiesSuivantesPoule, premierTourFinale, repartitionPoules, tourSuivantFinale
} from "../../lib/tournoi.js";
import { attribuerTerrains, creerParties, enregistrerTirage, supprimerTournoi } from "../../lib/tournoiFirestore.js";
import { EMAIL_VALIDE, joueursParEquipe } from "../../lib/formats.js";
import { todayKey } from "../../lib/dates.js";
import { STATUTS_INSCRIPTION, ajouterEquipeOrganisateur, statutDe, supprimerInscription } from "../../lib/inscriptions.js";
import { BoutonsValidation } from "../InscriptionsAdmin.js";

const titre = "text-[15px] font-black uppercase tracking-wider";

// Pointage des équipes, tirage, puis déroulement du concours (réservé à l'organisateur)
export default function GestionTournoi({ concours, tournoi, parties }) {
  if (!tournoi) return <PreparationTirage concours={concours} />;
  return <DeroulementTournoi concours={concours} tournoi={tournoi} parties={parties} />;
}

function PreparationTirage({ concours }) {
  const [inscriptions, setInscriptions] = useState(null);
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

  // Seules les inscriptions validées peuvent être pointées et participer au tirage
  const presentes = (inscriptions || []).filter((i) => i.presente && statutDe(i) === "validee");
  const validees = (inscriptions || []).filter((i) => statutDe(i) === "validee");
  const poulesPossibles = !!repartitionPoules(presentes.length);
  const formatEffectif = format === "poules" && !poulesPossibles ? "elimination" : format;

  const basculer = (i) => updateDoc(doc(db, "inscriptions", i.id), { presente: !i.presente });
  const toutPointer = () => validees.filter((i) => !i.presente).forEach(basculer);

  const retirer = (i) => {
    if (window.confirm(`Retirer l'équipe « ${i.joueurs.join(" / ")} » ?`)) supprimerInscription(i);
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
          <h3 className={titre}>Équipes ({presentes.length}/{validees.length} présentes)</h3>
          {validees.some((i) => !i.presente) && <Button size="sm" variant="ghost" onClick={toutPointer}>Tout cocher</Button>}
        </div>
        <p className="text-sm text-ardoise">
          Le jour du concours, cochez les équipes présentes : seules elles participent au tirage.
        </p>
        {inscriptions.length === 0 && <p className="text-sm text-ardoise">Aucune inscription pour l'instant.</p>}
        <ul className="divide-y-[1.5px] divide-bord border-y-[1.5px] border-bord">
          {inscriptions.map((i) => {
            const statut = statutDe(i);
            const [libelle, style] = STATUTS_INSCRIPTION[statut];
            return (
            <li key={i.id} className={`flex items-start gap-2 ${statut === "refusee" ? "opacity-60" : ""}`}>
              <label className={`flex-1 min-w-0 flex items-start gap-3 py-2 ${statut === "validee" ? "cursor-pointer" : ""}`}>
                <input type="checkbox" className="mt-1 w-5 h-5 accent-navy" disabled={statut !== "validee"} checked={!!i.presente && statut === "validee"} onChange={() => basculer(i)} />
                <span className="min-w-0 space-y-1">
                  <span className="block font-bold">{i.joueurs.join(" / ")}</span>
                  <span className="block text-sm text-ardoise">
                    {[i.club, i.telephone, i.email, i.surPlace && "ajoutée par l'organisateur", i.uid && "a l'application"].filter(Boolean).join(" · ")}
                  </span>
                  {statut !== "validee" && <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${style}`}>{libelle}</span>}
                  {statut !== "validee" && <BoutonsValidation ins={i} concours={concours} />}
                </span>
              </label>
              <Button size="sm" variant="ghost" className="mt-1 shrink-0" aria-label={`Retirer ${i.joueurs.join(" / ")}`} onClick={() => retirer(i)}>
                Retirer
              </Button>
            </li>
            );
          })}
        </ul>
        <AjoutEquipe concours={concours} />
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

// L'organisateur inscrit une équipe lui-même (par téléphone, à l'avance ou sur place)
function AjoutEquipe({ concours }) {
  const nb = joueursParEquipe(concours.format);
  const vide = { joueurs: Array(nb).fill(""), club: "", telephone: "", email: "" };
  const [form, setForm] = useState(vide);
  const jourJ = concours.date <= todayKey();
  const [presente, setPresente] = useState(jourJ);
  const [erreur, setErreur] = useState("");

  const ajouter = async (e) => {
    e.preventDefault();
    const joueurs = form.joueurs.map((j) => j.trim()).filter(Boolean);
    const telephone = form.telephone.trim();
    const email = form.email.trim();
    if (!joueurs.length) return setErreur("Indiquez au moins le nom d'un joueur.");
    if (telephone && !/^[0-9 +.]{6,20}$/.test(telephone)) return setErreur("Le numéro de téléphone n'est pas valide.");
    if (email && !EMAIL_VALIDE.test(email)) return setErreur("L'adresse e-mail n'est pas valide.");
    setErreur("");
    // Formulaire vidé tout de suite : on peut saisir l'équipe suivante sans attendre le serveur
    const saisie = form;
    setForm(vide);
    try {
      await ajouterEquipeOrganisateur(concours.id, {
        joueurs,
        club: saisie.club.trim(),
        telephone,
        email,
        uid: null,
        presente
      });
    } catch (error) {
      console.error("Ajout d'équipe:", error);
      setForm(saisie);
      setErreur("L'ajout a échoué. Réessayez.");
    }
  };

  const champ = (cle) => ({ value: form[cle], onChange: (e) => setForm((f) => ({ ...f, [cle]: e.target.value })) });

  return (
    <form onSubmit={ajouter} className="rounded-xl bg-fond p-3 space-y-2">
      <p className="text-sm font-bold">Ajouter une équipe</p>
      {form.joueurs.map((nom, k) => (
        <Input
          key={k}
          className="bg-white"
          aria-label={`Joueur ${k + 1}`}
          placeholder={nb === 1 ? "Nom et prénom" : `Joueur ${k + 1} : nom et prénom`}
          maxLength={80}
          value={nom}
          onChange={(e) => setForm((f) => ({ ...f, joueurs: f.joueurs.map((j, x) => (x === k ? e.target.value : j)) }))}
        />
      ))}
      <Input className="bg-white" aria-label="Club" placeholder="Club (facultatif)" maxLength={80} {...champ("club")} />
      <div className="grid grid-cols-2 gap-2">
        <Input className="bg-white" type="tel" aria-label="Téléphone" placeholder="Téléphone (facultatif)" maxLength={20} {...champ("telephone")} />
        <Input className="bg-white" type="email" aria-label="E-mail" placeholder="E-mail (facultatif)" maxLength={200} {...champ("email")} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-4 h-4 accent-navy" checked={presente} onChange={(e) => setPresente(e.target.checked)} />
        Équipe présente (pointée pour le tirage)
      </label>
      {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
      <Button type="submit" size="sm" variant="navy">Ajouter l'équipe</Button>
    </form>
  );
}
