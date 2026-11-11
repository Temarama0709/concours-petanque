import React, { useState } from "react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { IconX } from "../ui/icons.js";
import { formatShort, todayKey } from "../../lib/dates.js";
import {
  CATEGORIES_LICENCIE, LICENCIE_VIDE, ajouterLicencie, enregistrerLicencie, euros, nouveauCommentaire, nouveauPaiement,
  resteDu, supprimerLicencie
} from "../../lib/club.js";

const CHAMP_SELECT = "w-full h-11 px-3 bg-fond text-navy rounded-[10px] border-2 border-transparent focus:outline-none focus:border-jaune";
const titre = "text-[13px] font-black uppercase tracking-wider";
const dateHeure = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Fiche d'un licencié : coordonnées, commentaires, paiements.
// Commentaires et paiements sont enregistrés aussitôt ; les coordonnées avec « Enregistrer ».
export default function FicheLicencie({ clubId, licencie, auteur, onFermer, onCree }) {
  const [l, setL] = useState({ ...LICENCIE_VIDE, ...licencie });
  const [modifie, setModifie] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [paiement, setPaiement] = useState({ libelle: "", montant: "", echeance: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const nouveau = !l.id;

  const champ = (nom) => ({
    value: l[nom] || "",
    onChange: (e) => {
      setL({ ...l, [nom]: e.target.value });
      setModifie(true);
    }
  });

  const sauver = async (fiche) => {
    setErreur("");
    if (!fiche.nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return false;
    }
    setEnvoi(true);
    try {
      const propre = { ...fiche, nom: fiche.nom.trim(), prenom: fiche.prenom.trim(), email: fiche.email.trim().toLowerCase() };
      if (propre.id) await enregistrerLicencie(clubId, propre);
      else {
        const ref = await ajouterLicencie(clubId, propre);
        onCree({ ...propre, id: ref.id });
      }
      setModifie(false);
      return true;
    } catch (e) {
      console.error("Licencié:", e);
      setErreur("Enregistrement refusé : vérifiez les champs (texte trop long ?).");
      return false;
    } finally {
      setEnvoi(false);
    }
  };

  // Commentaires et paiements : enregistrés tout de suite pour une fiche existante
  const appliquer = async (changement) => {
    const fiche = { ...l, ...changement };
    setL(fiche);
    if (!nouveau) await sauver(fiche);
    else setModifie(true);
  };

  const ajouterCommentaire = (e) => {
    e.preventDefault();
    if (!commentaire.trim()) return;
    appliquer({ commentaires: [nouveauCommentaire(commentaire.slice(0, 2000), auteur), ...(l.commentaires || [])] });
    setCommentaire("");
  };

  const ajouterPaiement = (e) => {
    e.preventDefault();
    const montant = parseFloat(String(paiement.montant).replace(",", "."));
    if (!paiement.libelle.trim() || !Number.isFinite(montant) || montant <= 0) {
      setErreur("Indiquez un libellé et un montant pour le paiement.");
      return;
    }
    appliquer({ paiements: [...(l.paiements || []), nouveauPaiement({ ...paiement, libelle: paiement.libelle.slice(0, 80) })] });
    setPaiement({ libelle: "", montant: "", echeance: "" });
  };

  const basculerPaye = (p) =>
    appliquer({
      paiements: l.paiements.map((x) => (x.id === p.id ? { ...x, paye: !x.paye, payeLe: x.paye ? "" : todayKey() } : x))
    });

  const supprimer = async () => {
    if (!window.confirm(`Supprimer la fiche de ${l.prenom} ${l.nom} ? Ses commentaires et paiements seront effacés.`)) return;
    await supprimerLicencie(clubId, l.id);
    onFermer();
  };

  const fermer = () => {
    if (modifie && !window.confirm("Des modifications ne sont pas enregistrées. Fermer quand même ?")) return;
    onFermer();
  };

  const du = resteDu(l);
  return (
    <div className="fixed inset-0 z-[1300] bg-navy/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={fermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={nouveau ? "Nouveau licencié" : `Fiche de ${l.prenom} ${l.nom}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white text-navy rounded-t-xl sm:rounded-xl p-4 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-black uppercase tracking-wider truncate">{nouveau ? "Nouveau licencié" : `${l.nom} ${l.prenom}`}</h3>
          <button type="button" aria-label="Fermer la fiche" onClick={fermer} className="w-11 h-11 shrink-0 rounded-[10px] bg-fond flex items-center justify-center"><IconX /></button>
        </div>

        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label="Nom" placeholder="Nom *" maxLength={80} {...champ("nom")} />
            <Input aria-label="Prénom" placeholder="Prénom" maxLength={80} {...champ("prenom")} />
            <Input aria-label="N° de licence" placeholder="N° de licence" maxLength={20} {...champ("licence")} />
            <select aria-label="Catégorie" className={CHAMP_SELECT} {...champ("categorie")}>
              <option value="">Catégorie</option>
              {[...new Set([...CATEGORIES_LICENCIE, l.categorie].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input type="tel" aria-label="Téléphone" placeholder="Téléphone" maxLength={20} {...champ("telephone")} />
            <Input type="email" aria-label="E-mail" placeholder="E-mail" maxLength={200} {...champ("email")} />
          </div>
          <Input aria-label="Adresse" placeholder="Adresse" maxLength={200} {...champ("adresse")} />
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0">Né(e) le</span>
            <Input type="date" aria-label="Date de naissance" {...champ("naissance")} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="w-5 h-5 accent-navy" checked={l.actif !== false} onChange={(e) => { setL({ ...l, actif: e.target.checked }); setModifie(true); }} />
            Licencié actif cette saison
          </label>
          {l.uid && <p className="text-xs text-ardoise">Relié à un compte de l'application.</p>}
          {erreur && <p className="text-sm font-semibold text-red-700">{erreur}</p>}
          <div className="flex gap-2">
            <Button disabled={envoi || (!modifie && !nouveau)} onClick={() => sauver(l)}>
              {envoi ? "Enregistrement…" : nouveau ? "Créer la fiche" : "Enregistrer"}
            </Button>
            {!nouveau && <Button variant="ghost" className="text-red-700" onClick={supprimer}>Supprimer la fiche</Button>}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className={titre}>Paiements {du > 0 && <span className="text-jaune-texte">· {euros(du)} en attente</span>}</h4>
          {(l.paiements || []).length === 0 && <p className="text-sm text-ardoise">Aucun paiement enregistré.</p>}
          <ul className="space-y-2">
            {(l.paiements || []).map((p) => {
              const enRetard = !p.paye && p.echeance && p.echeance < todayKey();
              return (
                <li key={p.id} className={`flex items-center gap-2 rounded-[10px] border-2 p-2 ${p.paye ? "border-bord" : "border-jaune"}`}>
                  <label className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-navy shrink-0" checked={p.paye} onChange={() => basculerPaye(p)} aria-label={`${p.libelle} payé`} />
                    <span className="min-w-0">
                      <span className={`block font-bold truncate ${p.paye ? "line-through text-ardoise" : ""}`}>{p.libelle} · {euros(p.montant)}</span>
                      <span className={`block text-xs ${enRetard ? "text-red-700 font-bold" : "text-ardoise"}`}>
                        {p.paye
                          ? `Payé${p.payeLe ? ` le ${formatShort(p.payeLe)}` : ""}`
                          : p.echeance ? `${enRetard ? "En retard · " : ""}à régler avant le ${formatShort(p.echeance)}` : "En attente"}
                      </span>
                    </span>
                  </label>
                  <button type="button" aria-label={`Supprimer le paiement ${p.libelle}`} className="p-1 text-ardoise"
                    onClick={() => window.confirm(`Supprimer « ${p.libelle} » ?`) && appliquer({ paiements: l.paiements.filter((x) => x.id !== p.id) })}>
                    <IconX size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <form onSubmit={ajouterPaiement} className="rounded-[10px] bg-fond p-2 space-y-2">
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <Input className="bg-white" aria-label="Libellé du paiement" placeholder="Licence 2027, cotisation…" maxLength={80} value={paiement.libelle} onChange={(e) => setPaiement({ ...paiement, libelle: e.target.value })} />
              <Input className="bg-white" type="number" min="0" step="0.01" inputMode="decimal" aria-label="Montant" placeholder="€" value={paiement.montant} onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 text-sm">
                <span className="shrink-0">Avant le</span>
                <Input className="bg-white" type="date" aria-label="Échéance" value={paiement.echeance} onChange={(e) => setPaiement({ ...paiement, echeance: e.target.value })} />
              </label>
              <Button type="submit" size="sm" variant="navy">Ajouter</Button>
            </div>
          </form>
        </section>

        <section className="space-y-2">
          <h4 className={titre}>Commentaires</h4>
          <form onSubmit={ajouterCommentaire} className="flex gap-2">
            <Input aria-label="Nouveau commentaire" placeholder="Ajouter un commentaire…" maxLength={2000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            <Button type="submit" size="sm" variant="navy" className="shrink-0 h-11">Ajouter</Button>
          </form>
          <ul className="space-y-2">
            {(l.commentaires || []).map((c) => (
              <li key={c.id} className="rounded-[10px] bg-fond p-2 flex gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{c.texte}</p>
                  <p className="text-xs text-ardoise mt-1">{dateHeure(c.date)}{c.auteur ? ` · ${c.auteur}` : ""}</p>
                </div>
                <button type="button" aria-label="Supprimer le commentaire" className="p-1 text-ardoise self-start"
                  onClick={() => window.confirm("Supprimer ce commentaire ?") && appliquer({ commentaires: l.commentaires.filter((x) => x.id !== c.id) })}>
                  <IconX size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
