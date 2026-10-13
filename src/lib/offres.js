// Offres de crédits (1 crédit = 1 concours publié). Les prix réellement facturés
// sont fixés côté serveur dans functions/index.js (OFFRES) : garder les deux identiques.
export const OFFRES = [
  { id: "unite", credits: 1, prix: 2, titre: "À l'unité", detail: "2 € le concours" },
  { id: "pack10", credits: 10, prix: 16, titre: "Pack 10 concours", detail: "1,60 € le concours" }
];

export const formatEuros = (n) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
