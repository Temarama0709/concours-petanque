jest.mock("../../utils/firebase.js", () => ({ db: {} }));
import { analyserLicencies, cleLicencie, resteDu } from "../club.js";

test("import d'une liste de licenciés (titres reconnus, lignes vides ignorées)", () => {
  const { licencies, erreur } = analyserLicencies([
    ["Liste des licenciés 2027"],
    ["NOM", "Prénom", "N° Licence", "Tél. portable", "E-mail", "Date de naissance"],
    ["DUPONT", "Jean", "07412345", "06 12 34 56 78", "Jean@Exemple.fr", "12/03/1960"],
    ["", "", "", "", "", ""]
  ]);
  expect(erreur).toBe("");
  expect(licencies).toHaveLength(1);
  expect(licencies[0]).toMatchObject({
    nom: "DUPONT", prenom: "Jean", licence: "07412345", telephone: "06 12 34 56 78", email: "jean@exemple.fr", naissance: "1960-03-12", actif: true
  });
});

test("import sans colonne Nom", () => {
  expect(analyserLicencies([["Prénom", "Ville"], ["Jean", "Annecy"]]).erreur).toMatch(/Nom/);
});

test("reste dû et clé de doublon", () => {
  expect(resteDu({ paiements: [{ montant: 45, paye: false }, { montant: 20, paye: true }, { montant: 18.5, paye: false }] })).toBe(63.5);
  expect(cleLicencie({ nom: "Dupont", prenom: "Jean", licence: "" })).toBe(cleLicencie({ nom: "DUPONT", prenom: "jean", licence: "" }));
});
