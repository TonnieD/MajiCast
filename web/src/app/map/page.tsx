import type { Metadata } from "next";
import MapClient from "./MapClient";

export const metadata: Metadata = {
  title: "Water Point Risk Map",
  description: "Interactive map of water point contamination risk scores across Kenya.",
};

export default function MapPage() {
  return <MapClient />;
}
