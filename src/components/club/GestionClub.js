import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { IconX } from "../ui/icons.js";
import FicheLicencie from "./FicheLicencie.js";
import ReglagesClub from "./ReglagesClub.js";
import { useClubs } from "../../lib/clubs.js";
import { configurerClub, euros, resteDu, useLicencies } from "../../lib/club.js";

const sansAccents = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CHAMP_SELECT = "w-full h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";

// Écran plein « Gestion du club » : licenciés, commentaires, paiements en attente.
// Réservé à l'admin et aux gestionnaires du club (règles Firestore).
export default function GestionClub({ user, isAdmin, clubsGeres, onFermer }) {
  const [clubId, setClubId] = useState(clubsGeres[0]?.id || "");
  const tousLesClubs = useClubs();
  const gestion = clubsGeres.find((c) => c.id === clubId);

  useEffect(() => {
    if (!clubId && clubsGeres[0]) setClubId(clubsGeres[0].id);
  }, [clubId, clubsGeres]);
  useEffect(() => {
    const fermer = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [onFermer]);

  // L'admin peut choisir n'importe quel club ; les autres seulement ceux qu'ils gèrent
  const choix = isAdmin
    ? [...clubsGeres, ...(tousLesClubs || []).filter((c) => !clubsGeres.some((g) => g.id === c.id)).map((c) => ({ id: c.id, clubNom: c.nom, nonConfigure: true }))]
    : clubsGeres;
  const clubChoisi = choix.find((c) => c.id === clubId);

  return (
    <div className="fixed inset-0 z-[1200] bg-white overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titre-club">
      <div className="max-w-2xl mx-auto">
        <header className="sticky top-0 z-10 bg-navy text-white px-5 py-4 flex items-center gap-3">
          <button type="button" aria-label="Fermer" onClick={onFermer} className="w-11 h-11 shrink-0 rounded-[10px] border-[1.5px] border-navy-line flex items-center justify-center hover:bg-navy-dark">
            <IconX />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-navy-soft uppercase tracking-wider font-bold">Gestion du club</p>
            <h2 id="titre-club" className="font-black truncate">{clubChoisi?.clubNom || "Choisissez un club"}</h2>
          </div>
        </header>
        <div className="px-5 py-4 space-y-4">
          {choix.length > 1 && (
            <select aria-label="Club" className={CHAMP_SELECT} value={clubId} onChange={(e) => setClubId(e.target.value)}>
              {!clubId && <option value="">Choisissez un club…</option>}
              {clubsGeres.length > 0 && (
                <optgroup label="Clubs gérés">
                  {clubsGeres.map((c) => <option key={c.id} value={c.id}>{c.clubNom}</option>)}
                </optgroup>
              )}
              {isAdmin && (
                <optgroup label="Autres clubs (gestion à activer)">
                  {choix.filter((c) => c.nonConfigure).map((c) => <option key={c.id} value={c.id}>{c.clubNom}</option>)}
                </optgroup>
              )}
            </select>
          )}
          {clubChoisi?.nonConfigure && (
            <div className="rounded-xl border-2 border-bord p-4 space-y-2">
              <p className="text-sm">La gestion n'est pas encore activée pour <b>{clubChoisi.clubNom}</b>.</p>
              <Button onClick={() => configurerClub({ id: clubChoisi.id, nom: clubChoisi.clubNom })}>Activer la gestion de ce club</Button>
            </div>
          )}
          {gestion && <ContenuClub key={gestion.id} gestion={gestion} user={user} isAdmin={isAdmin} />}
        </div>
      </div>
    </div>
  );
}

function ContenuClub({ gestion, user, isAdmin }) {
  const licencies = useLicencies(gestion.id);
  const [onglet, setOnglet] = useState("licencies");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous"); // tous | attente | inactifs
  const [fiche, setFiche] = useState(null); // licencié ouvert, ou {} pour un nouveau

  const liste = useMemo(() => {
    const r = sansAccents(recherche.trim());
    return (licencies || []).filter((l) => {
      if (filtre === "tous" && l.actif === false) return false;
      if (filtre === "inactifs" && l.actif !== false) return false;
      if (filtre === "attente" && resteDu(l) <= 0) return false;
      return !r || sansAccents(`${l.nom} ${l.prenom} ${l.licence} ${l.telephone} ${l.email}`).includes(r);
    });
  }, [licencies, recherche, filtre]);

  if (!licencies) return <p className="text-ardoise">Chargement…</p>;
  const actifs = licencies.filter((l) => l.actif !== false);
  const enAttente = licencies.filter((l) => resteDu(l) > 0);
  const totalDu = enAttente.reduce((s, l) => s + resteDu(l), 0);
  const ficheAJour = fiche?.id ? licencies.find((l) => l.id === fiche.id) || null : fiche;

  const onglets = [["licencies", "Licenciés"], ["reglages", "Import, export, accès"]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-navy text-white p-3">
          <p className="text-2xl font-black">{actifs.length}</p>
          <p className="text-xs uppercase tracking-wider text-navy-soft font-bold">Licenciés actifs</p>
        </div>
        <button type="button" onClick={() => { setOnglet("licencies"); setFiltre("attente"); }} className="rounded-xl bg-jaune text-navy p-3 text-left">
          <p className="text-2xl font-black">{euros(totalDu)}</p>
          <p className="text-xs uppercase tracking-wider font-bold">En attente · {enAttente.length} pers.</p>
        </button>
      </div>

      <div className="flex border-b-2 border-bord" role="tablist">
        {onglets.map(([id, libelle]) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}
            className={`flex-1 h-11 text-sm font-bold -mb-[2px] ${onglet === id ? "border-b-[3px] border-jaune" : "text-ardoise"}`}>
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "reglages" ? (
        <ReglagesClub gestion={gestion} licencies={licencies} isAdmin={isAdmin} user={user} onOuvrir={setFiche} />
      ) : (
        <>
          <div className="flex gap-2">
            <Input aria-label="Rechercher un licencié" placeholder="Nom, licence, téléphone…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <Button className="shrink-0" onClick={() => setFiche({})}>+ Ajouter</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[["tous", `Actifs (${actifs.length})`], ["attente", `Paiement en attente (${enAttente.length})`], ["inactifs", `Inactifs (${licencies.length - actifs.length})`]].map(([id, libelle]) => (
              <button key={id} type="button" onClick={() => setFiltre(id)}
                className={`h-9 px-3 rounded-[10px] text-sm font-bold border-2 ${filtre === id ? "border-jaune bg-jaune-clair" : "border-bord text-ardoise"}`}>
                {libelle}
              </button>
            ))}
          </div>
          {licencies.length === 0 && (
            <p className="text-sm text-ardoise">
              Aucun licencié pour l'instant. Ajoutez-les un par un avec <b>+ Ajouter</b>, ou importez votre liste (Excel)
              dans l'onglet <b>Import, export, accès</b>.
            </p>
          )}
          <ul className="divide-y-2 divide-bord border-y-2 border-bord">
            {liste.map((l) => {
              const du = resteDu(l);
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => setFiche(l)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-fond">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold truncate">{l.nom.toUpperCase()} {l.prenom}</span>
                      <span className="block text-sm text-ardoise truncate">
                        {[l.licence && `Licence ${l.licence}`, l.categorie, l.telephone, (l.commentaires || []).length > 0 && `💬 ${l.commentaires.length}`].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    {du > 0 && <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-jaune-clair text-jaune-texte">{euros(du)} dû</span>}
                    {l.actif === false && <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-fond text-ardoise">Inactif</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {licencies.length > 0 && liste.length === 0 && <p className="text-sm text-ardoise">Aucun licencié ne correspond.</p>}
        </>
      )}

      {fiche && (
        <FicheLicencie
          key={fiche.id || "nouveau"}
          clubId={gestion.id}
          licencie={ficheAJour || fiche}
          auteur={user.email}
          onFermer={() => setFiche(null)}
          onCree={(l) => setFiche(l)}
        />
      )}
    </div>
  );
}
