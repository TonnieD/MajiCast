"use client";

import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";

type SensorResult = { risk_score: number; verdict: "Safe" | "Action Required" } | null;

// WHO / Kenya water quality reference ranges
const REFERENCE = {
  pH:   { min: 6.5, max: 8.5, unit: "",      label: "pH Level" },
  TEMP: { min: 15,  max: 25,  unit: "°C",    label: "Temperature" },
  EC:   { min: 100, max: 800, unit: " µS/cm",label: "Electrical Conductivity" },
};

function inRange(val: number, ref: { min: number; max: number }) {
  return val >= ref.min && val <= ref.max;
}

export default function SensorClient() {
  const [pH,   setPH]   = useState(7.0);
  const [TEMP, setTEMP] = useState(22.0);
  const [EC,   setEC]   = useState(350.0);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<SensorResult>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_INFERENCE_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/predict/sensor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pH, TEMP, EC }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail ?? `API error ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  // Normalise each reading to 0-100 for the radar chart
  const radarData = [
    { metric: "pH",   value: Math.min(100, Math.max(0, ((pH - 0) / 14) * 100)) },
    { metric: "Temp", value: Math.min(100, Math.max(0, ((TEMP - 0) / 40) * 100)) },
    { metric: "EC",   value: Math.min(100, Math.max(0, ((EC - 0) / 1000) * 100)) },
    { metric: "Risk", value: result ? result.risk_score * 100 : 0 },
  ];

  const safe = result?.verdict === "Safe";

  return (
    <div className="min-h-screen bg-parchment">
      <div className="page-header">
        <div className="max-w-4xl mx-auto">
          <p className="text-earth-300 text-sm font-semibold tracking-widest uppercase mb-1">Anomaly Detection</p>
          <h1>Cheap Sensor Detection</h1>
          <p>Enter cheap-sensor readings to predict water quality anomalies via IsolationForest.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Left: Inputs ─────────────────────────────────────────── */}
          <div className="panel space-y-6">
            <h2 className="text-xl font-display font-bold text-forest-900">Sensor Readings</h2>

            {(Object.entries(REFERENCE) as [keyof typeof REFERENCE, typeof REFERENCE[keyof typeof REFERENCE]][]).map(
              ([key, ref]) => {
                const val = key === "pH" ? pH : key === "TEMP" ? TEMP : EC;
                const ok  = inRange(val, ref);
                return (
                  <div key={key}>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="field-label" htmlFor={`input-${key}`}>{ref.label}</label>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? "badge-safe" : "badge-medium"} badge-base`}>
                        {ok ? "Normal" : "Out of range"}
                      </span>
                    </div>
                    <input
                      id={`input-${key}`}
                      type="number"
                      step={key === "pH" ? 0.1 : key === "TEMP" ? 0.5 : 10}
                      min={key === "pH" ? 0 : key === "TEMP" ? 0 : 0}
                      max={key === "pH" ? 14 : key === "TEMP" ? 100 : 10000}
                      className="field-input"
                      value={val}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        if (isNaN(n)) return;
                        if (key === "pH")   setPH(n);
                        if (key === "TEMP") setTEMP(n);
                        if (key === "EC")   setEC(n);
                      }}
                    />
                    <p className="text-xs text-forest-600 mt-1">
                      WHO range: {ref.min}–{ref.max}{ref.unit} · Current: {val.toFixed(key === "EC" ? 0 : 1)}{ref.unit}
                    </p>
                  </div>
                );
              }
            )}

            <button
              id="sensor-submit-btn"
              className="btn-primary w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Analysing…" : "Run Anomaly Detection"}
            </button>

            {error && (
              <div className="result-unsafe text-sm text-[#7a1f1f]">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* ── Right: Radar + Result ─────────────────────────────────── */}
          <div className="space-y-5">
            <div className="panel">
              <h2 className="text-lg font-display font-bold text-forest-900 mb-4">Sensor Profile</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
                    <PolarGrid stroke="#d4b87a33" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#1a3a2a", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#2d6a4f" fill="#2d6a4f" fillOpacity={0.2} />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {result && (
              <div id="sensor-result" className={safe ? "result-safe" : "result-unsafe"}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1"
                   style={{ color: safe ? "#2d6a4f" : "#7a1f1f" }}>
                  Anomaly Detection Result
                </p>
                <p className="text-2xl font-display font-bold mb-2"
                   style={{ color: safe ? "#2d6a4f" : "#7a1f1f" }}>
                  {result.verdict}
                </p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 bg-white bg-opacity-60 rounded-lg h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${result.risk_score * 100}%`,
                        background: result.risk_score > 0.5 ? "#7a1f1f" : "#2d6a4f",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold" style={{ color: safe ? "#2d6a4f" : "#7a1f1f" }}>
                    {(result.risk_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs mt-2 opacity-75">
                  {safe
                    ? "Readings are within normal parameters."
                    : "One or more readings are anomalous. Consider retesting or escalating."}
                </p>
              </div>
            )}

            {/* Reference table */}
            <div className="panel">
              <h2 className="text-base font-display font-bold text-forest-900 mb-3">Reference Ranges</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-earth-200">
                    <th className="text-left py-1.5 text-forest-700 font-semibold">Parameter</th>
                    <th className="text-right py-1.5 text-forest-700 font-semibold">Min</th>
                    <th className="text-right py-1.5 text-forest-700 font-semibold">Max</th>
                    <th className="text-right py-1.5 text-forest-700 font-semibold">Current</th>
                    <th className="text-right py-1.5 text-forest-700 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(REFERENCE) as [keyof typeof REFERENCE, typeof REFERENCE[keyof typeof REFERENCE]][]).map(([k, ref]) => {
                    const val = k === "pH" ? pH : k === "TEMP" ? TEMP : EC;
                    const ok  = inRange(val, ref);
                    return (
                      <tr key={k} className="border-b border-earth-100">
                        <td className="py-2 font-medium text-forest-900">{ref.label}</td>
                        <td className="py-2 text-right text-forest-600">{ref.min}{ref.unit}</td>
                        <td className="py-2 text-right text-forest-600">{ref.max}{ref.unit}</td>
                        <td className="py-2 text-right font-semibold text-forest-900">{val.toFixed(1)}{ref.unit}</td>
                        <td className="py-2 text-right">
                          <span className={`badge-base ${ok ? "badge-safe" : "badge-medium"}`}>
                            {ok ? "OK" : "High"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <footer className="site-footer">2025 MajiCast. WHO water quality guidelines applied.</footer>
    </div>
  );
}
