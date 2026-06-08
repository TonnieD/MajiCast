import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Water Point Risk Map",
  description: "Interactive map of water point contamination risk scores across Kenya.",
};

const RiskMap = dynamic(
  () => import("@/components/map/RiskMap"),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

export default function MapPage() {
  return <RiskMap />;
}
