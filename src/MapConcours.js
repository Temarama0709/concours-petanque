import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import L from "leaflet";

// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

export default function MapConcours({ concoursList }) {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchCoords = async () => {
      const coords = await Promise.all(
        concoursList.map(async (c) => {
          const query = encodeURIComponent(`${c.lieu}, ${c.cp} ${c.ville}`);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
            const data = await res.json();
            if (data[0]) {
              return {
                ...c,
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
              };
            }
          } catch {
            return null;
          }
        })
      );
      setLocations(coords.filter(Boolean));
    };

    fetchCoords();
  }, [concoursList]);

  return (
    <div className="w-full h-[400px] mt-4 rounded shadow overflow-hidden">
      <MapContainer center={[46.2, 5.7]} zoom={9} scrollWheelZoom={false} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((c, i) => (
          <Marker key={i} position={[c.lat, c.lon]}>
            <Popup>
              <strong>{c.title}</strong><br />
              {c.date}<br />
              {c.lieu}, {c.cp} {c.ville}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
