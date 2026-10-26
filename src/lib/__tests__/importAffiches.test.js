import { zipSync, strToU8 } from "fflate";
import { dateDuNom, extraireImages, legendesWhatsApp } from "../importAffiches.js";

test("date de publication lue dans le nom du fichier", () => {
  expect(dateDuNom("IMG-20261020-WA0012.jpg")).toEqual(new Date(2026, 9, 20));
  expect(dateDuNom("00000012-PHOTO-2026-10-20-14-32-10.jpg")).toEqual(new Date(2026, 9, 20));
  expect(dateDuNom("WhatsApp Image 2026-10-20 at 14.32.10.jpeg")).toEqual(new Date(2026, 9, 20));
  expect(dateDuNom("affiche.jpg")).toBeNull();
});

test("légendes d'un export WhatsApp (Android et iPhone)", () => {
  const android =
    "20/10/2026 14:30 - Jean Dupont: Bonjour à tous\n" +
    "20/10/2026 14:32 - Jean Dupont: IMG-20261020-WA0012.jpg (fichier joint)\n" +
    "Concours samedi 7 novembre à Cluses, doublette 10€\n" +
    "20/10/2026 14:40 - Marie: IMG-20261020-WA0013.jpg (fichier joint)\n";
  expect(legendesWhatsApp(android)).toEqual({
    "IMG-20261020-WA0012.jpg": "Concours samedi 7 novembre à Cluses, doublette 10€",
    "IMG-20261020-WA0013.jpg": ""
  });
  const iphone = "[20/10/2026 14:32:10] Jean Dupont: ‎<pièce jointe : 00000012-PHOTO-2026-10-20-14-32-10.jpg>\n";
  expect(legendesWhatsApp(iphone)).toEqual({ "00000012-PHOTO-2026-10-20-14-32-10.jpg": "" });
});

test("images d'un .zip WhatsApp, avec légende ; autres fichiers ignorés", async () => {
  const zip = zipSync({
    "_chat.txt": strToU8("20/10/2026 14:32 - Jean: IMG-20261020-WA0012.jpg (fichier joint)\nTriplette à Thônes\n"),
    "IMG-20261020-WA0012.jpg": new Uint8Array([1, 2, 3]),
    "PTT-20261020-WA0001.opus": new Uint8Array([4])
  });
  const fichier = new File([zip], "Discussion WhatsApp.zip", { type: "application/zip" });
  fichier.arrayBuffer = async () => zip.buffer; // jsdom ne fournit pas arrayBuffer()
  const images = await extraireImages([fichier]);
  expect(images).toHaveLength(1);
  expect(images[0]).toMatchObject({ nom: "IMG-20261020-WA0012.jpg", legende: "Triplette à Thônes", datePublication: new Date(2026, 9, 20) });
  expect(images[0].fichier.type).toBe("image/jpeg");
});
