jest.mock("../utils/firebase.js", () => ({ functions: {} }));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));

// Le réglage REACT_APP_PAIEMENT est lu au chargement du module : on recharge tout pour chaque cas
function rendre(paiement) {
  process.env.REACT_APP_PAIEMENT = paiement;
  let html;
  jest.isolateModules(() => {
    const React = require("react");
    const { renderToString } = require("react-dom/server");
    const AchatCredits = require("./AchatCredits.js").default;
    html = renderToString(React.createElement(AchatCredits));
  });
  return html;
}

test("paiement activé : les deux offres et le total", () => {
  const html = rendre("on");
  expect(html).toContain("Pack 10 concours");
  expect(html).toContain("1,60 € le concours");
  expect(html).toContain("2 € le concours");
  expect(html).toMatch(/Payer 16\s€ · 10 concours/);
});

test("paiement masqué : rien n'est affiché", () => {
  expect(rendre("")).toBe("");
});
