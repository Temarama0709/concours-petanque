// Recherche de communes via l'API officielle geo.api.gouv.fr (gratuite, sans clé).
const API = "https://geo.api.gouv.fr/communes";
const cache = new Map();

async function appeler(params) {
  const url = `${API}?${new URLSearchParams({ fields: "nom,codesPostaux,codeDepartement", ...params })}`;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => {
          cache.delete(url);
          return [];
        })
    );
  }
  return cache.get(url);
}

// Communes ayant ce code postal : [{ nom, cp }]
export async function communesParCodePostal(cp) {
  if (!/^\d{5}$/.test(cp)) return [];
  const data = await appeler({ codePostal: cp });
  return data.map((c) => ({ nom: c.nom, cp })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

// Communes dont le nom ressemble à la saisie, une ligne par code postal : [{ nom, cp, dep }]
export async function communesParNom(nom, limite = 8) {
  const saisie = nom.trim();
  if (saisie.length < 2) return [];
  const data = await appeler({ nom: saisie, boost: "population", limit: "10" });
  return data
    .flatMap((c) => (c.codesPostaux || []).map((cp) => ({ nom: c.nom, cp, dep: c.codeDepartement })))
    .slice(0, limite);
}
