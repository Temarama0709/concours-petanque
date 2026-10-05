import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase.js";

// Les affiches sont stockées dans Firestore (collection "affiches", même
// identifiant que le concours), sous forme d'image JPEG compressée en base64.
// Un document Firestore est limité à 1 Mo : on vise moins de 700 000 caractères.
const TAILLE_MAX = 700000;

const lireDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Réduit l'image (côté le plus long ≤ 1400 px) et la compresse en JPEG
// jusqu'à ce qu'elle tienne dans un document Firestore.
export async function compresserAffiche(file) {
  const image = await createImageBitmap(file);
  let cote = 1400;
  for (let essai = 0; essai < 6; essai++) {
    const echelle = Math.min(1, cote / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // fond blanc pour les PNG transparents
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const qualite = essai < 3 ? 0.8 - essai * 0.1 : 0.6;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualite));
    const dataUrl = await lireDataUrl(blob);
    if (dataUrl.length <= TAILLE_MAX) return dataUrl;
    if (essai >= 2) cote = Math.round(cote * 0.75);
  }
  throw new Error("Affiche trop lourde, même compressée.");
}

const cache = new Map();

export function chargerAffiche(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      getDoc(doc(db, "affiches", id))
        .then((snap) => (snap.exists() ? snap.data().image : null))
        .catch((error) => {
          cache.delete(id);
          throw error;
        })
    );
  }
  return cache.get(id);
}
