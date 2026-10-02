import { analyserTableau, lireTexte, lireDate, lireFormat } from "../importCalendrier.js";

test("dates dans différents formats", () => {
  expect(lireDate("12/07/2026")).toBe("2026-07-12");
  expect(lireDate("samedi 1er août 2026")).toBe("2026-08-01");
  expect(lireDate("2026-07-12")).toBe("2026-07-12");
  expect(lireDate(46215)).toBe("2026-07-12");
  expect(lireDate(new Date(Date.UTC(2026, 6, 12)))).toBe("2026-07-12");
  expect(lireDate("")).toBe("");
});

test("formats", () => {
  expect(lireFormat("Doublette")).toBe("Doublette Senior");
  expect(lireFormat("Triplette Vétérans")).toBe("Triplette Veteran");
  expect(lireFormat("Tête à tête Féminin")).toBe("Tete a tete Feminin");
  expect(lireFormat("Doublette mixte")).toBe("Doublette Mixte");
  expect(lireFormat("Jeu provençal")).toBe("Autre");
});

test("copier-coller avec tabulations et colonnes dans le désordre", () => {
  const texte = "Calendrier CD74\nVille\tDate\tCatégorie\tClub\tCP\n" +
    "Annecy\t12/07/2026\tDoublette\tPétanque Annécienne\t74000\n" +
    "\t13/07/2026\tTriplette\tX\t\n" +
    "74300 Cluses\t14/07/2026\tTriplette Vétérans\tAB Cluses\t";
  const { concours, erreurs, colonnes } = analyserTableau(lireTexte(texte));
  expect(colonnes.ville).toBe(0);
  expect(colonnes.date).toBe(1);
  expect(concours).toHaveLength(2);
  expect(concours[0]).toMatchObject({ date: "2026-07-12", ville: "Annecy", cp: "74000", format: "Doublette Senior", type: "officiel" });
  expect(concours[1]).toMatchObject({ ville: "Cluses", cp: "74300", format: "Triplette Veteran" });
  expect(erreurs[0]).toMatch(/Ligne 4/);
});

test("CSV point-virgule avec guillemets", () => {
  const rows = lireTexte('Date;Nom du concours;Commune;Tarif\n12/07/2026;"Grand prix; édition 3";Thônes;10 €');
  const { concours } = analyserTableau(rows, { departement: "74" });
  expect(concours[0]).toMatchObject({ title: "Grand prix; édition 3", ville: "Thônes", prix: 10, cp: "74000", cpApproximatif: true });
});

test("lignes lues dans un fichier Excel", () => {
  const rows = [
    ["CALENDRIER 2026 - CD74", null, null, null, null],
    ["Date", "Club organisateur", "Commune", "Catégorie", "Mise"],
    [new Date(Date.UTC(2026, 10, 7)), "Pétanque Annécienne", "Annecy", "Doublette", "10 €"],
    [new Date(Date.UTC(2026, 10, 8)), "AB Cluses", "74300 Cluses", "Triplette Vétérans", 15]
  ];
  const { concours, erreurs } = analyserTableau(rows, { departement: "74" });
  expect(erreurs).toEqual([]);
  expect(concours[0]).toMatchObject({
    date: "2026-11-07", ville: "Annecy", cp: "74000", cpApproximatif: true,
    format: "Doublette Senior", prix: 10, lieu: "Pétanque Annécienne",
    title: "Doublette Senior – Pétanque Annécienne"
  });
  expect(concours[1]).toMatchObject({ date: "2026-11-08", ville: "Cluses", cp: "74300", cpApproximatif: false, format: "Triplette Veteran", prix: 15 });
});
