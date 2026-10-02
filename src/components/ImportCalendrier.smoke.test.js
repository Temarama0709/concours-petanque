import { renderToString } from "react-dom/server";
import ImportCalendrier from "./ImportCalendrier.js";

jest.mock("../utils/firebase.js", () => ({ db: {} }));

test("l'écran d'import s'affiche", () => {
  const html = renderToString(<ImportCalendrier concoursExistants={[]} />);
  expect(html).toContain("Importer un calendrier officiel");
  expect(html).toContain("74 - Haute-Savoie");
});
