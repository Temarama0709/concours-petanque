// Moteur du tournoi : composition des poules, enchaînement des parties,
// classements et tableau final. Fonctions pures (aucun accès à Firestore).
//
// Une partie : { id, phase: "poule" | "finale", poule, tour, ordre, libelle,
//   equipeA, equipeB (null = exempt), scoreA, scoreB, statut: "a_jouer" | "en_attente" | "validee" }

export const STATUTS = { A_JOUER: "a_jouer", EN_ATTENTE: "en_attente", VALIDEE: "validee" };

export function melanger(liste, aleatoire = Math.random) {
  const t = [...liste];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

const NOMS_POULES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const nomPoule = (i) => (i < 26 ? NOMS_POULES[i] : NOMS_POULES[Math.floor(i / 26) - 1] + NOMS_POULES[i % 26]);

// Nombre de poules de 4 et de 3 pour n équipes (null si les poules sont impossibles)
export function repartitionPoules(n) {
  const poulesDe3 = (4 - (n % 4)) % 4;
  if (n < 6 || poulesDe3 * 3 > n) return null;
  return { poulesDe4: (n - poulesDe3 * 3) / 4, poulesDe3 };
}

// Répartit les équipes en poules en séparant au mieux les équipes d'un même club.
// equipes : [{ id, club }] → [{ nom, equipes: [id] }]
export function composerPoules(equipes, aleatoire = Math.random) {
  const rep = repartitionPoules(equipes.length);
  if (!rep) return null;
  const tailles = [...Array(rep.poulesDe4).fill(4), ...Array(rep.poulesDe3).fill(3)];
  const poules = tailles.map((taille, i) => ({ nom: nomPoule(i), taille, equipes: [] }));

  // Les clubs les plus représentés d'abord, puis distribution en tournant sur les poules
  const parClub = new Map();
  for (const e of melanger(equipes, aleatoire)) {
    const cle = (e.club || "").trim().toLowerCase() || `__${e.id}`;
    if (!parClub.has(cle)) parClub.set(cle, []);
    parClub.get(cle).push(e);
  }
  const ordre = [...parClub.values()].sort((a, b) => b.length - a.length).flat();
  let i = Math.floor(aleatoire() * poules.length);
  for (const e of ordre) {
    // prochaine poule non pleine, en évitant si possible une poule ayant déjà ce club
    const libres = poules.map((_, k) => (i + k) % poules.length).filter((k) => poules[k].equipes.length < poules[k].taille);
    const club = (e.club || "").trim().toLowerCase();
    const sansClub = libres.find((k) => !club || !poules[k].equipes.some((x) => (x.club || "").trim().toLowerCase() === club));
    const k = sansClub ?? libres[0];
    poules[k].equipes.push(e);
    i = (k + 1) % poules.length;
  }
  return poules.map((p) => ({ nom: p.nom, equipes: melanger(p.equipes, aleatoire).map((e) => e.id) }));
}

export function vainqueur(p) {
  if (p.equipeB == null) return p.equipeA; // exempt
  if (p.statut !== STATUTS.VALIDEE) return null;
  return p.scoreA > p.scoreB ? p.equipeA : p.equipeB;
}
export function perdant(p) {
  if (p.equipeB == null || p.statut !== STATUTS.VALIDEE) return null;
  return p.scoreA > p.scoreB ? p.equipeB : p.equipeA;
}

const partie = (champs) => ({ scoreA: null, scoreB: null, terrain: null, statut: STATUTS.A_JOUER, ...champs });

// Parties du début de poule
export function partiesInitialesPoule(poule) {
  const [a, b, c, d] = poule.equipes;
  const base = { phase: "poule", poule: poule.nom };
  if (poule.equipes.length === 4) {
    return [
      partie({ ...base, tour: 1, ordre: 1, libelle: "Tour 1", equipeA: a, equipeB: b }),
      partie({ ...base, tour: 1, ordre: 2, libelle: "Tour 1", equipeA: c, equipeB: d })
    ];
  }
  // Poule de 3 : chaque équipe rencontre les deux autres
  return [
    partie({ ...base, tour: 1, ordre: 1, libelle: "Partie 1", equipeA: a, equipeB: b }),
    partie({ ...base, tour: 2, ordre: 1, libelle: "Partie 2", equipeA: b, equipeB: c }),
    partie({ ...base, tour: 3, ordre: 1, libelle: "Partie 3", equipeA: a, equipeB: c })
  ];
}

const duTour = (parties, tour) => parties.filter((p) => p.tour === tour).sort((x, y) => x.ordre - y.ordre);
const toutesValidees = (ps) => ps.length > 0 && ps.every((p) => p.statut === STATUTS.VALIDEE);

// Parties à créer pour faire avancer une poule de 4 ([] si rien à créer)
export function partiesSuivantesPoule(poule, partiesPoule) {
  if (poule.equipes.length !== 4) return [];
  const base = { phase: "poule", poule: poule.nom };
  const t1 = duTour(partiesPoule, 1);
  const t2 = duTour(partiesPoule, 2);
  const t3 = duTour(partiesPoule, 3);
  if (toutesValidees(t1) && t2.length === 0) {
    return [
      partie({ ...base, tour: 2, ordre: 1, libelle: "Gagnants", equipeA: vainqueur(t1[0]), equipeB: vainqueur(t1[1]) }),
      partie({ ...base, tour: 2, ordre: 2, libelle: "Perdants", equipeA: perdant(t1[0]), equipeB: perdant(t1[1]) })
    ];
  }
  if (toutesValidees(t2) && t3.length === 0) {
    return [partie({ ...base, tour: 3, ordre: 1, libelle: "Barrage", equipeA: perdant(t2[0]), equipeB: vainqueur(t2[1]) })];
  }
  return [];
}

// Classement d'une poule : [{ equipe, victoires, pour, contre, diff }] trié, plus les qualifiés
export function classementPoule(poule, partiesPoule) {
  const stats = new Map(poule.equipes.map((id) => [id, { equipe: id, victoires: 0, joues: 0, pour: 0, contre: 0 }]));
  for (const p of partiesPoule) {
    if (p.statut !== STATUTS.VALIDEE || p.equipeB == null) continue;
    const a = stats.get(p.equipeA);
    const b = stats.get(p.equipeB);
    if (!a || !b) continue;
    a.joues++; b.joues++;
    a.pour += p.scoreA; a.contre += p.scoreB;
    b.pour += p.scoreB; b.contre += p.scoreA;
    if (p.scoreA > p.scoreB) a.victoires++; else b.victoires++;
  }
  const lignes = [...stats.values()].map((s) => ({ ...s, diff: s.pour - s.contre }));

  if (poule.equipes.length === 4) {
    const gagnants = partiesPoule.find((p) => p.tour === 2 && p.ordre === 1);
    const barrage = partiesPoule.find((p) => p.tour === 3);
    const premier = gagnants ? vainqueur(gagnants) : null;
    const second = barrage ? vainqueur(barrage) : null;
    const rang = (id) => (id === premier ? 0 : id === second ? 1 : 2);
    lignes.sort((x, y) => rang(x.equipe) - rang(y.equipe) || y.victoires - x.victoires || y.diff - x.diff || y.pour - x.pour);
    const termine = !!(premier && second);
    return { lignes, termine, qualifies: termine ? [premier, second] : [] };
  }
  lignes.sort((x, y) => y.victoires - x.victoires || y.diff - x.diff || y.pour - x.pour);
  const termine = toutesValidees(partiesPoule) && partiesPoule.length === 3;
  return { lignes, termine, qualifies: termine ? [lignes[0].equipe, lignes[1].equipe] : [] };
}

const LIBELLES_FINALE = { 1: "Finale", 2: "Demi-finale", 4: "Quart de finale", 8: "Huitième de finale" };
export const libelleFinale = (nbParties) => LIBELLES_FINALE[nbParties] || `1/${nbParties} de finale`;

// Premier tour du tableau final.
// tetes : équipes à placer en premier (1ers de poule, exempts en priorité) ; autres : le reste.
// origine(id) : poule d'origine, pour éviter deux équipes de la même poule au premier tour.
export function premierTourFinale(tetes, autres, origine = () => null, aleatoire = Math.random) {
  const q = tetes.length + autres.length;
  if (q < 2) return [];
  let taille = 1;
  while (taille < q) taille *= 2;
  const nbParties = taille / 2;
  let exempts = taille - q;
  const t = melanger(tetes, aleatoire);
  let a = melanger(autres, aleatoire);
  const paires = [];
  // Exempts : d'abord les têtes de série, puis les autres si nécessaire
  while (exempts > 0 && (t.length || a.length)) {
    paires.push([t.length ? t.shift() : a.shift(), null]);
    exempts--;
  }
  // Têtes de série contre les autres, en évitant la même poule d'origine
  while (t.length && a.length) {
    const e = t.shift();
    const k = a.findIndex((x) => origine(x) == null || origine(x) !== origine(e));
    const idx = k >= 0 ? k : 0;
    paires.push([e, a[idx]]);
    a = a.filter((_, i) => i !== idx);
  }
  // Ce qui reste (que des têtes de série ou que des autres) se rencontre entre soi
  const reste = [...t, ...a];
  while (reste.length >= 2) paires.push([reste.shift(), reste.shift()]);
  // Les exempts répartis dans le tableau : alterner parties jouées et exempts
  const jouees = paires.filter((p) => p[1] != null);
  const libres = paires.filter((p) => p[1] == null);
  const ordre = [];
  while (jouees.length || libres.length) {
    if (libres.length) ordre.push(libres.shift());
    if (jouees.length) ordre.push(jouees.shift());
  }
  const libelle = libelleFinale(nbParties);
  return ordre.map(([x, y], i) =>
    partie({
      phase: "finale",
      poule: null,
      tour: 1,
      ordre: i + 1,
      libelle,
      equipeA: x,
      equipeB: y,
      ...(y == null ? { statut: STATUTS.VALIDEE } : {})
    })
  );
}

// Tour suivant du tableau final ([] si le tour en cours n'est pas terminé ou si c'était la finale)
export function tourSuivantFinale(partiesFinale) {
  if (!partiesFinale.length) return [];
  const dernier = Math.max(...partiesFinale.map((p) => p.tour));
  const tour = duTour(partiesFinale, dernier);
  if (tour.length < 2 || !toutesValidees(tour)) return [];
  const libelle = libelleFinale(tour.length / 2);
  const suivantes = [];
  for (let i = 0; i + 1 < tour.length; i += 2) {
    suivantes.push(
      partie({ phase: "finale", poule: null, tour: dernier + 1, ordre: i / 2 + 1, libelle, equipeA: vainqueur(tour[i]), equipeB: vainqueur(tour[i + 1]) })
    );
  }
  return suivantes;
}

export function champion(partiesFinale) {
  if (!partiesFinale.length) return null;
  const dernier = Math.max(...partiesFinale.map((p) => p.tour));
  const tour = duTour(partiesFinale, dernier);
  return tour.length === 1 && tour[0].equipeB != null ? vainqueur(tour[0]) : null;
}

// Terrains libres attribués aux parties prêtes à jouer qui n'en ont pas encore.
// Retourne [{ id, terrain }]
export function attributionTerrains(parties, nbTerrains) {
  const occupes = new Set(parties.filter((p) => p.terrain != null && p.statut !== STATUTS.VALIDEE).map((p) => p.terrain));
  const libres = [];
  for (let t = 1; t <= nbTerrains; t++) if (!occupes.has(t)) libres.push(t);
  const enAttente = parties
    .filter((p) => p.terrain == null && p.statut !== STATUTS.VALIDEE && p.equipeA != null && p.equipeB != null)
    .sort((x, y) => (x.phase === y.phase ? 0 : x.phase === "poule" ? -1 : 1) || x.tour - y.tour || String(x.poule).localeCompare(String(y.poule)) || x.ordre - y.ordre);
  return enAttente.slice(0, libres.length).map((p, i) => ({ id: p.id, terrain: libres[i] }));
}

// Score valide : entiers différents, le gagnant atteint le score de fin de partie
export function scoreValide(a, b, pointsGagnants = 13) {
  return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a !== b && Math.max(a, b) === pointsGagnants;
}
