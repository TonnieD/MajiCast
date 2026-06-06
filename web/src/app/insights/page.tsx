import type { Metadata } from "next";
import InsightsClient from "./InsightsClient";

export const metadata: Metadata = {
  title: "Quick Insights and Reports",
  description: "Water quality risk distribution by district and latest contamination alerts for Kenya.",
};

export default function InsightsPage() {
  return <InsightsClient />;
}
