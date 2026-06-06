"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface WaterPoint {
  latitude?: number;
  longitude?: number;
  predicted_risk?: number;
  risk_score?: number;
  clean_adm1?: string;
  clean_adm2?: string;
  clean_adm3?: string;
  water_source_clean?: string;
  status_clean?: string;
}

const RISK_LABELS: Record<number, string> = {
  0: "Safe Quality",
  1: "Low Risk",
  2: "Medium Risk",
  3: "High Risk",
};

interface Props {
  points: WaterPoint[];
  riskColors: Record<number, string>;
}

export default function LeafletMap({ points, riskColors }: Props) {
  // Fix Leaflet default icon path in Next.js bundling context
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl:       "/leaflet/marker-icon.png",
      shadowUrl:     "/leaflet/marker-shadow.png",
    });
  }, []);

  // Kenya center
  const center: [number, number] = [0.0236, 37.9062];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      className="leaflet-container"
    >
      {/* CartoDB Positron — clean, light tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {points.map((point, i) => {
        if (typeof point.latitude !== "number" || typeof point.longitude !== "number") return null;
        const tier  = point.predicted_risk ?? 0;
        const color = riskColors[tier] ?? "#2d6a4f";
        const qualityScore = point.risk_score != null
          ? typeof point.risk_score === "number" && point.risk_score <= 1
            ? (point.risk_score * 100).toFixed(1)
            : point.risk_score.toFixed(1)
          : "N/A";

        return (
          <CircleMarker
            key={i}
            center={[point.latitude, point.longitude]}
            radius={5}
            pathOptions={{
              fillColor: color,
              color: color,
              weight: 1,
              opacity: 0.85,
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="text-xs min-w-[160px]">
                <p className="font-bold text-sm text-forest-900 mb-1">
                  {point.water_source_clean ?? "Water Point"}
                </p>
                {point.clean_adm2 && (
                  <p className="text-forest-700">
                    {[point.clean_adm3, point.clean_adm2, point.clean_adm1]
                      .filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="mt-1">
                  <span className="font-semibold">Status:</span>{" "}
                  {point.status_clean ?? "Unknown"}
                </p>
                <p>
                  <span className="font-semibold">Risk Tier:</span>{" "}
                  <span style={{ color }}>{RISK_LABELS[tier] ?? "Unknown"}</span>
                </p>
                <p>
                  <span className="font-semibold">Quality Score:</span>{" "}
                  {qualityScore}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
