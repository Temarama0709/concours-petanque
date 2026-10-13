import { renderToString } from "react-dom/server";
import AchatCredits from "./AchatCredits.js";

jest.mock("../utils/firebase.js", () => ({ functions: {} }));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));

test("l'écran d'achat affiche les deux offres et le total", () => {
  const html = renderToString(<AchatCredits />);
  expect(html).toContain("Pack 10 concours");
  expect(html).toContain("1,60 € le concours");
  expect(html).toContain("2 € le concours");
  expect(html).toMatch(/Payer 16\s€ · 10 concours/);
});
