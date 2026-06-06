import type { Metadata } from "next";
import AnalysisClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "Water Point Data Analysis",
  description: "Explore and analyze water point datasets, functional status, regional risk scores, and temporal quality trends in Kenya.",
};

export default function AnalysisPage() {
  return <AnalysisClient />;
}
