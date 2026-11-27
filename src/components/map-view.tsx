"use client";
// Leaflet + OpenStreetMap (free, no API key). Import with next/dynamic and ssr:false:
//   const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export type Pin = {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
};

export default function MapView({
  pins,
  center = [31.55, 74.34] as [number, number],
  zoom = 11,
}: {
  pins: Pin[];
  center?: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-80 w-full rounded-lg"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{ color: "#2563eb", fillOpacity: 0.8 }}
        >
          <Popup>{p.name}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
