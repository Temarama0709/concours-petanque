import {
  repartitionPoules, composerPoules, partiesInitialesPoule, partiesSuivantesPoule, classementPoule,
  premierTourFinale, tourSuivantFinale, champion, attributionTerrains, scoreValide, vainqueur, STATUTS
} from "../tournoi.js";

// Générateur pseudo-aléatoire reproductible
const graine = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const equipes = (n, clubs = []) => Array.from({ length: n }, (_, i) => ({ id: `e${i + 1}`, club: clubs[i] || "" }));
const jouer = (p, a, b) => ({ ...p, scoreA: a, scoreB: b, statut: STATUTS.VALIDEE });

test("répartition des poules", () => {
  expect(repartitionPoules(16)).toEqual({ poulesDe4: 4, poulesDe3: 0 });
  expect(repartitionPoules(10)).toEqual({ poulesDe4: 1, poulesDe3: 2 });
  expect(repartitionPoules(7)).toEqual({ poulesDe4: 1, poulesDe3: 1 });
  expect(repartitionPoules(6)).toEqual({ poulesDe4: 0, poulesDe3: 2 });
  expect(repartitionPoules(5)).toBeNull();
  expect(repartitionPoules(4)).toBeNull();
});

test("composer les poules : toutes les équipes, une seule fois", () => {
  for (const n of [6, 7, 9, 10, 13, 16, 23, 64]) {
    const poules = composerPoules(equipes(n), graine(n));
    const ids = poules.flatMap((p) => p.equipes);
    expect(ids).toHaveLength(n);
    expect(new Set(ids).size).toBe(n);
    poules.forEach((p) => expect([3, 4]).toContain(p.equipes.length));
  }
});

test("composer les poules : clubs séparés quand c'est possible", () => {
  const clubs = ["Annecy", "Annecy", "Annecy", "Annecy", "Cluses", "Cluses", "Thônes", "Thônes", "", "", "", "", "", "", "", ""];
  const liste = equipes(16, clubs);
  const club = Object.fromEntries(liste.map((e) => [e.id, e.club]));
  const poules = composerPoules(liste, graine(7));
  for (const p of poules) {
    const cs = p.equipes.map((id) => club[id]).filter(Boolean);
    expect(new Set(cs).size).toBe(cs.length);
  }
});

test("poule de 4 : gagnants / perdants / barrage puis 2 qualifiés", () => {
  const poule = { nom: "A", equipes: ["a", "b", "c", "d"] };
  let ps = partiesInitialesPoule(poule).map((p, i) => ({ ...p, id: `t1-${i}` }));
  expect(ps.map((p) => [p.equipeA, p.equipeB])).toEqual([["a", "b"], ["c", "d"]]);
  expect(partiesSuivantesPoule(poule, ps)).toEqual([]);
  ps = [jouer(ps[0], 13, 5), jouer(ps[1], 7, 13)]; // a et d gagnent
  const t2 = partiesSuivantesPoule(poule, ps);
  expect(t2.map((p) => [p.libelle, p.equipeA, p.equipeB])).toEqual([["Gagnants", "a", "d"], ["Perdants", "b", "c"]]);
  ps = [...ps, jouer(t2[0], 13, 11), jouer(t2[1], 2, 13)]; // a gagne les gagnants, c gagne les perdants
  const t3 = partiesSuivantesPoule(poule, ps);
  expect(t3.map((p) => [p.libelle, p.equipeA, p.equipeB])).toEqual([["Barrage", "d", "c"]]);
  expect(classementPoule(poule, ps).termine).toBe(false);
  ps = [...ps, jouer(t3[0], 13, 9)];
  const cl = classementPoule(poule, ps);
  expect(cl.termine).toBe(true);
  expect(cl.qualifies).toEqual(["a", "d"]);
  expect(partiesSuivantesPoule(poule, ps)).toEqual([]);
});

test("poule de 3 : tous contre tous, départage au goal-average", () => {
  const poule = { nom: "B", equipes: ["x", "y", "z"] };
  const ps = partiesInitialesPoule(poule);
  expect(ps).toHaveLength(3);
  const joues = [jouer(ps[0], 13, 10), jouer(ps[1], 13, 2), jouer(ps[2], 4, 13)]; // x>y, y>z, z>x : 1 victoire chacun
  const cl = classementPoule(poule, joues);
  expect(cl.termine).toBe(true);
  // diff : x +3-9=-6, y -3+11=+8, z -11+9=-2
  expect(cl.qualifies).toEqual(["y", "z"]);
});

test("tableau final : exempts, pas deux équipes de la même poule, jusqu'au champion", () => {
  const origine = (id) => id.slice(0, 1); // "A1" vient de la poule A
  const tetes = ["A1", "B1", "C1"];
  const autres = ["A2", "B2", "C2"];
  let ps = premierTourFinale(tetes, autres, origine, graine(3)).map((p, i) => ({ ...p, id: `f1-${i}` }));
  expect(ps).toHaveLength(4); // tableau de 8 : 2 exempts
  expect(ps.filter((p) => p.equipeB == null)).toHaveLength(2);
  ps.filter((p) => p.equipeB != null).forEach((p) => expect(origine(p.equipeA)).not.toBe(origine(p.equipeB)));
  expect(ps[0].libelle).toBe("Quart de finale");
  ps = ps.map((p) => (p.equipeB == null ? p : jouer(p, 13, 6)));
  const demis = tourSuivantFinale(ps);
  expect(demis).toHaveLength(2);
  expect(demis[0].libelle).toBe("Demi-finale");
  const demisJouees = demis.map((p, i) => ({ ...jouer(p, 13, 8), id: `f2-${i}` }));
  const finale = tourSuivantFinale([...ps, ...demisJouees]);
  expect(finale).toHaveLength(1);
  expect(finale[0].libelle).toBe("Finale");
  const tout = [...ps, ...demisJouees, { ...jouer(finale[0], 11, 13), id: "f3" }];
  expect(champion(tout)).toBe(finale[0].equipeB);
  expect(tourSuivantFinale(tout)).toEqual([]);
});

test("élimination directe à 5 équipes", () => {
  const ps = premierTourFinale(["a", "b", "c", "d", "e"], [], () => null, graine(11));
  expect(ps).toHaveLength(4);
  expect(ps.filter((p) => p.equipeB == null)).toHaveLength(3);
  expect(ps.flatMap((p) => [p.equipeA, p.equipeB]).filter(Boolean).sort()).toEqual(["a", "b", "c", "d", "e"]);
  expect(vainqueur(ps.find((p) => p.equipeB == null))).toBeTruthy();
});

test("attribution des terrains", () => {
  const ps = [
    { id: "1", phase: "poule", poule: "A", tour: 1, ordre: 1, equipeA: "a", equipeB: "b", terrain: 1, statut: STATUTS.A_JOUER },
    { id: "2", phase: "poule", poule: "A", tour: 1, ordre: 2, equipeA: "c", equipeB: "d", terrain: 2, statut: STATUTS.VALIDEE },
    { id: "3", phase: "poule", poule: "B", tour: 1, ordre: 1, equipeA: "e", equipeB: "f", terrain: null, statut: STATUTS.A_JOUER },
    { id: "4", phase: "poule", poule: "B", tour: 1, ordre: 2, equipeA: "g", equipeB: "h", terrain: null, statut: STATUTS.A_JOUER },
    { id: "5", phase: "finale", poule: null, tour: 1, ordre: 1, equipeA: "i", equipeB: null, terrain: null, statut: STATUTS.VALIDEE }
  ];
  expect(attributionTerrains(ps, 3)).toEqual([{ id: "3", terrain: 2 }, { id: "4", terrain: 3 }]);
  expect(attributionTerrains(ps, 2)).toEqual([{ id: "3", terrain: 2 }]);
});

test("scores valides", () => {
  expect(scoreValide(13, 7)).toBe(true);
  expect(scoreValide(13, 13)).toBe(false);
  expect(scoreValide(12, 7)).toBe(false);
  expect(scoreValide(11, 4, 11)).toBe(true);
  expect(scoreValide(13.5, 2)).toBe(false);
});
