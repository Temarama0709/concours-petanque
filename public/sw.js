// Service worker : reçoit les affiches partagées depuis une autre application
// (bouton « Partager » d'Android → Concours Pétanque), voir share_target dans manifest.json.
const CACHE_PARTAGE = "partage";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/partager") return;

  event.respondWith(
    (async () => {
      const data = await event.request.formData();
      const cache = await caches.open(CACHE_PARTAGE);
      const fichier = data.getAll("affiche").find((f) => f && f.size);
      if (fichier) {
        await cache.put("/partage/affiche", new Response(fichier, { headers: { "Content-Type": fichier.type } }));
      }
      const texte = ["title", "text", "url"].map((k) => data.get(k)).filter(Boolean).join("\n");
      if (texte) await cache.put("/partage/texte", new Response(texte));
      // L'application lit ensuite ce cache au chargement de /?partage=1
      return Response.redirect("/?partage=1", 303);
    })()
  );
});
