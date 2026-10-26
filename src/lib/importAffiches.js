import { unzipSync, strFromU8 } from "fflate";

// Import en masse d'affiches : images choisies une par une, ou export d'une
// discussion WhatsApp (.zip « avec médias »). Pour chaque image on garde la date
// de publication (pour deviner l'année d'une date « samedi 12 juillet ») et,
// pour WhatsApp, le texte du message qui accompagnait l'image.

const IMAGE = /\.(jpe?g|png|webp)$/i;
const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Date de publication lue dans le nom du fichier :
// IMG-20261020-WA0012.jpg (Android), 00000012-PHOTO-2026-10-20-14-32-10.jpg (iPhone),
// « WhatsApp Image 2026-10-20 at 14.32.10.jpeg » (WhatsApp Web)
export function dateDuNom(nom) {
  const m = nom.match(/(20\d\d)-?(0[1-9]|1[0-2])-?(0[1-9]|[12]\d|3[01])/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// Début d'un message dans _chat.txt : « 20/10/2026 14:32 - » ou « [20/10/2026 14:32:10] »
const DEBUT_MESSAGE = /^‎?\[?\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?/;

// Associe à chaque image le texte du message qui l'accompagne : { "IMG-…jpg": "texte" }
export function legendesWhatsApp(chat) {
  const messages = [];
  for (const ligne of chat.split(/\r?\n/)) {
    if (DEBUT_MESSAGE.test(ligne) || !messages.length) messages.push(ligne.replace(DEBUT_MESSAGE, ""));
    else messages[messages.length - 1] += `\n${ligne}`;
  }
  const legendes = {};
  for (const message of messages) {
    const fichiers = message.match(/[\w.-]+\.(?:jpe?g|png|webp)/gi);
    if (!fichiers) continue;
    const texte = message
      .replace(/^[^:\n]{1,60}:\s*/, "") // auteur
      .replace(/[‎<]*(?:pièce jointe|attached)\s*:\s*[^>\n]*>?/gi, "")
      .replace(/[\w.-]+\.(?:jpe?g|png|webp)\s*(?:\((?:fichier joint|file attached)\))?/gi, "")
      .trim();
    fichiers.forEach((f) => { legendes[f] = texte; });
  }
  return legendes;
}

// Liste des images à lire : [{ nom, fichier, datePublication, legende }]
export async function extraireImages(fichiers) {
  const images = [];
  for (const fichier of fichiers) {
    if (/\.zip$/i.test(fichier.name) || fichier.type === "application/zip") {
      const contenu = unzipSync(new Uint8Array(await fichier.arrayBuffer()), {
        filter: (f) => IMAGE.test(f.name) || /\.txt$/i.test(f.name)
      });
      const chat = Object.keys(contenu).find((n) => /\.txt$/i.test(n));
      const legendes = chat ? legendesWhatsApp(strFromU8(contenu[chat])) : {};
      Object.keys(contenu)
        .filter((n) => IMAGE.test(n) && !n.startsWith("__MACOSX"))
        .sort()
        .forEach((chemin) => {
          const nom = chemin.split("/").pop();
          const type = TYPES[nom.split(".").pop().toLowerCase()];
          images.push({
            nom,
            fichier: new File([contenu[chemin]], nom, { type }),
            datePublication: dateDuNom(nom),
            legende: legendes[nom] || ""
          });
        });
    } else if (fichier.type.startsWith("image/")) {
      images.push({
        nom: fichier.name,
        fichier,
        datePublication: dateDuNom(fichier.name) || (fichier.lastModified ? new Date(fichier.lastModified) : null),
        legende: ""
      });
    }
  }
  // Une même image choisie deux fois
  const vues = new Set();
  return images.filter((i) => {
    const cle = `${i.nom}|${i.fichier.size}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}
