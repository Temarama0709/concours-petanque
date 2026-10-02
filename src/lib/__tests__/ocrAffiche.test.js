import { extraireInfos } from "../ocrAffiche.js";

test("texte d'affiche classique", () => {
  const infos = extraireInfos(
    "GRAND CONCOURS DE PÉTANQUE\nSamedi 18 juillet 2026\nDOUBLETTE MIXTE\nOuvert à tous\nBoulodrome municipal\n74100 Annemasse\nInscription 10 € par équipe"
  );
  expect(infos).toMatchObject({
    title: "Concours de pétanque", date: "2026-07-18", cp: "74100", ville: "Annemasse",
    format: "Doublette Mixte", prix: "10", type: "ouvert"
  });
});

test("date sans année : prochaine occurrence", () => {
  const infos = extraireInfos("Concours pétanque le samedi 12 juillet à Thônes, triplette", new Date(2026, 9, 2));
  expect(infos.date).toBe("2027-07-12");
  expect(infos.ville).toBe("Thônes");
  expect(infos.format).toBe("Triplette Senior");
});

test("texte sans information", () => {
  expect(extraireInfos("Bonjour à tous")).toMatchObject({ date: "", cp: "", format: "", prix: "", type: "" });
});
