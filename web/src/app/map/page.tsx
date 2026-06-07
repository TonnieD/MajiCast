import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Water Point Risk Map",
  description: "Interactive map of water point contamination risk scores across Kenya.",
};

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-parchment flex items-center justify-center text-forest-600">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  return <MapClient />;
}
