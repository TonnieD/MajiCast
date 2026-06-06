import type { Metadata } from "next";
import SensorClient from "./SensorClient";

export const metadata: Metadata = {
  title: "Cheap Sensor Anomaly Detection",
  description: "Detect water quality anomalies using pH, temperature, and electrical conductivity sensor readings.",
};

export default function SensorPage() {
  return <SensorClient />;
}
