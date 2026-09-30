import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useMemo } from "react";
import L from "leaflet";
import { formatLong } from "./lib/dates.js";

// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Cache des coordonnées (en mémoire + localStorage) : Nominatim limite à
// 1 requête/seconde, on évite donc de redemander une adresse déjà connue.
const CACHE_KEY = "geocode-cache-v1";
let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
} catch {
  cache = {};
}
const saveCache = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const addressOf = (c) => `${c.lieu}, ${c.cp} ${c.ville}, France`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  if (address in cache) return cache[address];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=fr`
  );
  const data = await res.json();
  let coords = data[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
  if (!coords) {
    // Le lieu exact est introuvable : on se rabat sur la ville.
    const cityOnly = address.split(", ").slice(1).join(", ");
    await sleep(1100);
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityOnly)}&format=json&limit=1&countrycodes=fr`
    );
    const data2 = await res2.json();
    coords = data2[0] ? [parseFloat(data2[0].lat), parseFloat(data2[0].lon)] : null;
  }
  cache[address] = coords;
  saveCache();
  return coords;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 12);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

export default function MapConcours({ concoursList }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCoords = async () => {
      setLoading(true);
      const result = [];
      for (const c of concoursList) {
        const address = addressOf(c);
        const needsNetwork = !(address in cache);
        try {
          const coords = await geocode(address);
          if (coords) result.push({ ...c, lat: coords[0], lon: coords[1] });
        } catch {
          // réseau indisponible : on ignore ce concours
        }
        if (cancelled) return;
        setLocations([...result]);
        if (needsNetwork) await sleep(1100);
      }
      if (!cancelled) setLoading(false);
    };
    fetchCoords();
    return () => {
      cancelled = true;
    };
  }, [concoursList]);

  const points = useMemo(() => locations.map((c) => [c.lat, c.lon]), [locations]);

  return (
    <div className="w-full h-[400px] mt-4 rounded shadow overflow-hidden relative">
      {loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 text-xs px-2 py-1 rounded shadow">
          Localisation des concours…
        </div>
      )}
      <MapContainer center={[46.6, 2.5]} zoom={5} scrollWheelZoom={false} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {locations.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lon]}>
            <Popup>
              <strong>{c.title}</strong><br />
              {formatLong(c.date)}<br />
              {c.lieu}, {c.cp} {c.ville}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
