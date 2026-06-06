"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

// Leaflet must be loaded client-side only
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-parchment-200 rounded-panel text-forest-600 text-sm">
      Loading map…
    </div>
  ),
});

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

const RISK_COLORS: Record<number, string> = {
  0: "#2d6a4f",
  1: "#c4a35a",
  2: "#8b5e3c",
  3: "#7a1f1f",
};

export default function MapClient() {
  const [allData, setAllData]   = useState<WaterPoint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<number | "all">("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  useEffect(() => {
    fetch("/api/data")
      .then(r => r.json())
      .then((res: { success: boolean; data: WaterPoint[] }) => {
        if (res.success && res.data) {
          const valid = res.data.filter(
            r => typeof r.latitude === "number" && typeof r.longitude === "number"
              && r.latitude !== 0 && r.longitude !== 0
          );
          setAllData(valid);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(
    () => ["", ...new Set(allData.map(r => r.clean_adm1 ?? "").filter(Boolean))].sort(),
    [allData]
  );

  const displayed = useMemo(() => {
    let rows = allData;
    if (selectedRisk !== "all") rows = rows.filter(r => r.predicted_risk === selectedRisk);
    if (selectedRegion) rows = rows.filter(r => r.clean_adm1 === selectedRegion);
    return rows;
  }, [allData, selectedRisk, selectedRegion]);

  const riskCounts = useMemo(() => {
    const c: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    displayed.forEach(r => { if (typeof r.predicted_risk === "number") c[r.predicted_risk] = (c[r.predicted_risk] ?? 0) + 1; });
    return c;
  }, [displayed]);

  return (
    <div className="min-h-screen bg-parchment">
      <div className="page-header">
        <div className="max-w-full">
          <p className="text-earth-300 text-sm font-semibold tracking-widest uppercase mb-1">Spatial</p>
          <h1>Water Point Risk Map</h1>
          <p>Explore contamination risk across Kenya&apos;s water points on an interactive map.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 h-[calc(100vh-180px)] min-h-[600px]">

        {/* ── Sidebar controls ─────────────────────────────────────── */}
        <aside className="md:w-72 flex-shrink-0 space-y-4 overflow-y-auto">

          {/* Filters */}
          <div className="panel space-y-4">
            <h2 className="font-display font-bold text-forest-900">Filters</h2>

            <div>
              <label className="field-label" htmlFor="risk-filter">Risk Tier</label>
              <select
                id="risk-filter"
                className="field-input"
                value={selectedRisk === "all" ? "all" : selectedRisk}
                onChange={e => setSelectedRisk(e.target.value === "all" ? "all" : Number(e.target.value))}
              >
                <option value="all">All tiers</option>
                {Object.entries(RISK_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="region-filter">Region</label>
              <select
                id="region-filter"
                className="field-input"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
              >
                {regions.map(r => <option key={r} value={r}>{r || "All regions"}</option>)}
              </select>
            </div>

            <button
              id="reset-map-filters"
              className="btn-primary w-full text-sm"
              onClick={() => { setSelectedRisk("all"); setSelectedRegion(""); }}
            >
              Reset Filters
            </button>
          </div>

          {/* Stats */}
          <div className="panel">
            <h2 className="font-display font-bold text-forest-900 mb-3">Current View</h2>
            <p className="text-xs text-forest-600 mb-3">{displayed.length} water points shown</p>
            {Object.entries(RISK_LABELS).map(([tier, label]) => (
              <div key={tier} className="flex justify-between items-center py-1.5 border-b border-earth-100 last:border-0">
                <span className="text-xs font-medium text-forest-800">{label}</span>
                <span className="text-sm font-bold" style={{ color: RISK_COLORS[Number(tier)] }}>
                  {riskCounts[Number(tier)] ?? 0}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="panel">
            <h2 className="font-display font-bold text-forest-900 mb-3">Legend</h2>
            {Object.entries(RISK_LABELS).map(([tier, label]) => (
              <div key={tier} className="flex items-center gap-2.5 py-1.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[Number(tier)] }} />
                <span className="text-xs text-forest-800">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Map ──────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-panel overflow-hidden shadow-panel min-h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-parchment-200 text-forest-600">
              Loading data…
            </div>
          ) : (
            <LeafletMap points={displayed} riskColors={RISK_COLORS} />
          )}
        </div>
      </div>
    </div>
  );
}
