"use client";

import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WaterPoint {
  clean_adm2: string;
  risk_score?: number;
  predicted_risk?: number;
  [key: string]: unknown;
}

const RISK_LABELS: Record<number, string> = {
  0: "Safe Quality",
  1: "Low Risk",
  2: "Medium Risk",
  3: "High Risk",
};

const RISK_COLORS: Record<number, string> = {
  0: "#00FF00",
  1: "#FFFF00",
  2: "#FFA500",
  3: "#FF0000",
};

const ALERTS = [
  { type: "Microbial contamination",  location: "Kiambiu area",   time: "2h ago" },
  { type: "High turbidity levels",    location: "Industrial zone", time: "3h ago" },
  { type: "Chemical levels elevated", location: "Industrial zone", time: "1d ago" },
];

const REPORTS = [
  { title: "Water Quality Trends",     area: "Urban Areas",  date: "Jul 15" },
  { title: "Regional Analysis",        area: "East Africa",  date: "Jun 30" },
  { title: "Infrastructure Assessment",area: "CBD Systems",  date: "Jun 22" },
];

export default function InsightsClient() {
  const [data, setData]             = useState<WaterPoint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<string>("");

  useEffect(() => {
    fetch("/api/data")
      .then(r => r.json())
      .then((res: { success: boolean; data: WaterPoint[] }) => {
        if (res.success && res.data) {
          setData(res.data);
          const locs = [...new Set(res.data.map(r => r.clean_adm2).filter(Boolean))].sort();
          if (locs.length) setSelectedLoc(locs[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const locations = useMemo(
    () => [...new Set(data.map(r => r.clean_adm2).filter(Boolean))].sort(),
    [data]
  );

  const filtered = useMemo(
    () => data.filter(r => r.clean_adm2 === selectedLoc),
    [data, selectedLoc]
  );

  const riskCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    filtered.forEach(r => {
      const score = r.predicted_risk ?? r.risk_score ?? 0;
      const tier = typeof score === "number" && score <= 3 ? Math.round(score) : 0;
      if (tier in counts) counts[tier]++;
    });
    return counts;
  }, [filtered]);

  const pieData = Object.entries(riskCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: RISK_LABELS[Number(k)], value: v, tier: Number(k) }));

  return (
    <div className="min-h-screen bg-parchment">
      <div className="page-header">
        <div className="max-w-5xl mx-auto">
          <p className="text-earth-300 text-sm font-semibold tracking-widest uppercase mb-1">Overview</p>
          <h1>Quick Insights and Reports</h1>
          <p>A snapshot of current water safety across Kenya&apos;s districts.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-forest-600">Loading data…</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Left: Quick Insights ──────────────────────────────────── */}
            <div className="lg:col-span-2 panel space-y-5">
              <h2 className="text-xl font-display font-bold text-forest-900">Quick Insights</h2>

              <div>
                <label className="field-label" htmlFor="location-select">Select District</label>
                <select
                  id="location-select"
                  className="field-input max-w-xs"
                  value={selectedLoc}
                  onChange={e => setSelectedLoc(e.target.value)}
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {selectedLoc && (
                <>
                  <div>
                    <p className="text-sm font-semibold text-forest-800 mb-2">
                      {selectedLoc} — Risk Score Summary
                    </p>
                    <p className="text-xs text-forest-600 mb-3">
                      {filtered.length} monitoring station{filtered.length !== 1 ? "s" : ""} active
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(RISK_LABELS).map(([tier, label]) => (
                        <div key={tier} className="rounded-lg p-3 text-center"
                          style={{ background: `${RISK_COLORS[Number(tier)]}18`, border: `1.5px solid ${RISK_COLORS[Number(tier)]}40` }}>
                          <p className="text-2xl font-bold" style={{ color: RISK_COLORS[Number(tier)] }}>
                            {riskCounts[Number(tier)]}
                          </p>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: RISK_COLORS[Number(tier)] }}>
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {pieData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {pieData.map(entry => (
                              <Cell key={entry.name} fill={RISK_COLORS[entry.tier]} />
                            ))}
                          </Pie>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Tooltip formatter={(v: any) => [`${v} points`, ""]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Right: Alerts + Reports ───────────────────────────────── */}
            <div className="space-y-6">
              <div className="panel">
                <h2 className="text-lg font-display font-bold text-forest-900 mb-4">Latest Alerts</h2>
                <div className="space-y-4">
                  {ALERTS.map((a, i) => (
                    <div key={i} className="border-l-2 border-risk-high pl-3">
                      <p className="text-sm font-semibold text-forest-900">{a.type}</p>
                      <p className="text-xs text-earth-600 mt-0.5">{a.location} · {a.time}</p>
                    </div>
                  ))}
                </div>
                <button className="btn-primary w-full mt-5 text-sm">View All Alerts</button>
              </div>

              <div className="panel">
                <h2 className="text-lg font-display font-bold text-forest-900 mb-4">Reports</h2>
                <div className="space-y-4">
                  {REPORTS.map((r, i) => (
                    <div key={i} className="border-l-2 border-earth-400 pl-3">
                      <p className="text-sm font-semibold text-forest-900">{r.title}</p>
                      <p className="text-xs text-earth-600 mt-0.5">{r.area} · {r.date}</p>
                    </div>
                  ))}
                </div>
                <button className="btn-primary w-full mt-5 text-sm">View All Reports</button>
              </div>
            </div>

          </div>
        )}
      </div>
      <footer className="site-footer">2025 MajiCast. Data sourced from WPDx and other public datasets.</footer>
    </div>
  );
}
